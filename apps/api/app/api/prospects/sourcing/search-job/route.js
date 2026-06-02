import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../lib/cors';
import { Client } from '@upstash/qstash';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const body = await req.json();
    const { runId, jobId, strategyId, searchQuery, limit } = body;
    console.log(`[Sourcing Saga: Search] 🔍 Search step triggered | Run: ${runId} | Job: ${jobId} | Limit: ${limit || 25}`);
    const { searchParams } = new URL(req.url);
    const host = req.headers.get('host') || 'localhost:3002';
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
    const local = searchParams.get('local') === 'true' || isLocalHost || !process.env.QSTASH_TOKEN;

    if (!runId || !jobId || !searchQuery) {
      return NextResponse.json({ success: false, error: 'Missing parameters: runId, jobId, and searchQuery are required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const countryCode = body.countryCode || 'us';
    const citySynonyms = body.citySynonyms || [];
    const nearbyCities = body.nearbyCities || [];
    const countryName = body.countryName || '';

    // Set operational phase & progress: Phase 2 (Finding Candidates)
    global.sourcingRunPhases = global.sourcingRunPhases || {};
    global.sourcingRunProgress = global.sourcingRunProgress || {};
    global.sourcingRunPhases[runId] = "Scanning the talent market for matching professional profiles...";
    global.sourcingRunProgress[runId] = 40;

    // Update updated_at in DB to register activity and reset idle timer before starting discovery operations
    if (supabase) {
      await supabase
        .from('sourcing_runs')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', runId)
        .eq('environment', environment);
    }

    // Check if Bright Data Key is configured
    const brightDataKey = process.env.BRIGHTDATA_API_KEY;
    if (!brightDataKey) {
      return NextResponse.json({ success: false, error: 'BRIGHTDATA_API_KEY is not configured' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const apiBaseUrl = `${protocol}://${host}`;
    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashUrl = process.env.QSTASH_URL || 'https://qstash-eu-central-1.upstash.io';
    const qstash = qstashToken ? new Client({ token: qstashToken, baseUrl: qstashUrl }) : null;

    let totalDiscoveredCount = 0;
    let qualifiedCount = 0;
    const targetLimit = limit || 25;

    // Consolidated Broad Search Query Modifier: Merge city synonyms, suburban towns, and country
    const terms = [
      ...citySynonyms,
      ...nearbyCities,
      countryName
    ].filter(Boolean);

    const geoModifier = terms.length > 0 ? `(${terms.map(t => `"${t}"`).join(' OR ')})` : '';
    const broadQuery = geoModifier ? `${searchQuery} ${geoModifier}` : searchQuery;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(broadQuery)}&hl=en&gl=${countryCode}&num=50`;

    console.log(`[Sourcing Saga: Search] [Bright Data SERP API] Sending Request | Job: ${jobId} | Zone: serp_api1 | Scrape URL: "${searchUrl}"`);

    let results = [];
    try {
      const bdResponse = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${brightDataKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          zone: 'serp_api1',
          url: searchUrl,
          format: 'json'
        })
      });

      if (bdResponse.ok) {
        const responseEnvelope = await bdResponse.json();
        let searchData = responseEnvelope;
        if (responseEnvelope.body && typeof responseEnvelope.body === 'string') {
          try {
            searchData = JSON.parse(responseEnvelope.body);
          } catch (e) {
            console.error('[Bright Data SERP API] Failed to parse response envelope body string as JSON:', e.message);
          }
        } else if (responseEnvelope.body && typeof responseEnvelope.body === 'object') {
          searchData = responseEnvelope.body;
        }

        results = searchData.organic || searchData.organic_results || [];
        
        console.log(`[Sourcing Saga: Scraper] [Bright Data SERP API] Response Received | HTTP ${bdResponse.status} | Envelope Keys: [${Object.keys(responseEnvelope).join(', ')}] | Scraped Organic Results: ${results.length}`);
        
        if (results.length === 0) {
          console.warn(`[Sourcing Saga: Scraper] [Bright Data SERP API] ⚠️ Warning: 0 organic results returned. Full Response structure preview:`, JSON.stringify(searchData).substring(0, 1000));
        }
      } else {
        const errText = await bdResponse.text();
        console.error(`[Sourcing Saga: Scraper] [Bright Data SERP API] ❌ Request Failed | HTTP ${bdResponse.status} | Error Response:`, errText);
      }
    } catch (err) {
      console.error(`[Sourcing Saga: Scraper] [Bright Data SERP API] ❌ Network Fetch Exception:`, err.message, err.stack);
    }

    const linkedinProfiles = results
      .filter(item => item.link && item.link.includes('linkedin.com/in/'))
      .map(item => ({
        url: item.link.split('?')[0],
        snippet: item.snippet || item.title || ''
      }));

    console.log(`[Sourcing Saga: Search] Parsed ${results.length} Google search results -> Found ${linkedinProfiles.length} unique LinkedIn profiles.`);

    // De-duplicate local profiles list
    const uniqueUrlsMap = {};
    linkedinProfiles.forEach(p => {
      uniqueUrlsMap[p.url.toLowerCase()] = p;
    });
    const localUniqueProfiles = Object.values(uniqueUrlsMap);

    // Pre-Enrichment Deduplication: Batch query Supabase to bypass already matched prospects
    const targetUrls = localUniqueProfiles.map(p => p.url);
    let matchedUrlsToSkip = new Set();
    
    if (targetUrls.length > 0 && supabase) {
      try {
        const { data: existingMatches, error: matchErr } = await supabase
          .from('prospect_matches')
          .select('prospects!inner(linkedin_url)')
          .eq('job_id', jobId)
          .eq('environment', environment)
          .in('prospects.linkedin_url', targetUrls);
          
        if (!matchErr && existingMatches) {
          existingMatches.forEach(m => {
            if (m.prospects && m.prospects.linkedin_url) {
              matchedUrlsToSkip.add(m.prospects.linkedin_url.toLowerCase());
            }
          });
          console.log(`[Sourcing Saga: Dedupe] [Dedupe Batch] Found ${matchedUrlsToSkip.size} duplicate profiles already matched to job ${jobId} in DB. Bypassing them locally.`);
        }
      } catch (e) {
        console.warn('[Sourcing Saga: Dedupe] [Dedupe Batch] ⚠️ Failed to batch-query existing matches:', e.message);
      }
    }

    const targetProfiles = localUniqueProfiles.filter(p => !matchedUrlsToSkip.has(p.url.toLowerCase()));
    console.log(`[Sourcing Saga: Dedupe] [Dedupe Batch] Remaining unique profiles to enrich: ${targetProfiles.length} (out of ${localUniqueProfiles.length} original)`);

    if (targetProfiles.length > 0) {
      // Limit to targetLimit remaining candidates to prevent over-scraping
      const remainingLimit = targetLimit - qualifiedCount;
      const finalTargetProfiles = targetProfiles.slice(0, Math.max(5, remainingLimit));

      totalDiscoveredCount = finalTargetProfiles.length;

      // Process profiles in controlled batches of 2 (concurrency = 2)
      const concurrencyLimit = 2;
      for (let i = 0; i < finalTargetProfiles.length; i += concurrencyLimit) {
        const batch = finalTargetProfiles.slice(i, i + concurrencyLimit);
        console.log(`[Sourcing Saga: Search] Processing enrichment batch ${Math.floor(i / concurrencyLimit) + 1} of ${Math.ceil(finalTargetProfiles.length / concurrencyLimit)}...`);

        let batchQualifiedCount = 0;

        const batchPromises = batch.map(async (profile) => {
          const payload = {
            runId,
            jobId,
            strategyId, // Pass strategyId down
            linkedinUrl: profile.url,
            serpSnippet: profile.snippet
          };

          try {
            if (local || !qstash) {
              console.log(`[Sourcing Saga: Search] [LocalDev] Triggering enrichment locally for: ${profile.url}`);
              const enrichRes = await fetch(`${apiBaseUrl}/api/prospects/sourcing/enrich-prospect?local=true`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              if (enrichRes.ok) {
                const enrichResult = await enrichRes.json();
                if (enrichResult.success) {
                  // A score of >= 50 is considered high-scoring/qualified
                  if (enrichResult.score >= 50) {
                    qualifiedCount++;
                    batchQualifiedCount++;
                    console.log(`[Sourcing Saga: Search] Candidate qualified (score ${enrichResult.score} >= 50). Total qualified: ${qualifiedCount}`);
                  } else {
                    console.log(`[Sourcing Saga: Search] Candidate skipped (score ${enrichResult.score} < 50).`);
                  }
                }
              } else {
                console.error(`[Sourcing Saga: Search] ❌ Enrichment request failed for ${profile.url} (Status ${enrichRes.status})`);
              }
            } else {
              // Production QStash async publish
              console.log(`[Sourcing Saga: Search] [QStash] Publishing enrichment task for: ${profile.url}`);
              await qstash.publishJSON({
                url: `${apiBaseUrl}/api/prospects/sourcing/enrich-prospect`,
                body: payload
              });
              qualifiedCount += 0.5;
              batchQualifiedCount += 0.5;
            }
          } catch (err) {
            console.error(`[Sourcing Saga: Search] ❌ Failed to trigger enrichment for ${profile.url}:`, err.message, err.stack);
          }
        });

        await Promise.all(batchPromises);

        // Update strategy totals in database dynamically
        if (strategyId && supabase) {
          try {
            const { data: strat } = await supabase
              .from('sourcing_strategies')
              .select('total_discovered, high_score_count')
              .eq('id', strategyId)
              .single();
            
            if (strat) {
              await supabase
                .from('sourcing_strategies')
                .update({
                  total_discovered: (strat.total_discovered || 0) + batch.length,
                  high_score_count: (strat.high_score_count || 0) + Math.round(batchQualifiedCount)
                })
                .eq('id', strategyId);
            }
          } catch (e) {
            console.warn('[Sourcing Saga: Search] [Strategy Update] ⚠️ Failed to update sourcing_strategies totals:', e.message);
          }
        }

        // Delay 2.5 seconds between batches to maintain neat, sequential scraper calls and prevent 202 Accepted triggers
        if (i + concurrencyLimit < finalTargetProfiles.length) {
          console.log('[Sourcing Saga: Search] Delaying 2.5 seconds before next enrichment batch...');
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      discoveredCount: totalDiscoveredCount,
      qualifiedCount
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('[Sourcing Saga: Search] ❌ Job search pipeline step failed:', err.message, err.stack);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
