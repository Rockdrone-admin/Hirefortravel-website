import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../lib/cors';
import { requireAuth, logActivityEvent } from '../../../../../lib/auth';
import { Client } from '@upstash/qstash';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_prospects');
    if (authError) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const body = await req.json();
    const { matchIds, reason, changedBy } = body;

    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json({ success: false, error: 'matchIds array is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Recruiter remarks are mandatory to refresh profile details' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // 1. Fetch enrichment scraper setting
    const { data: scraperSetting } = await supabase
      .from('sourcing_prompts')
      .select('instructions')
      .eq('prompt_type', 'enrichment_scraper')
      .eq('environment', environment)
      .maybeSingle();

    const scraperChoice = (scraperSetting && scraperSetting.instructions && scraperSetting.instructions[0]) || 'apify';

    const host = req.headers.get('host') || 'localhost:3002';
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
    const { searchParams } = new URL(req.url);
    const local = searchParams.get('local') === 'true' || isLocalHost;

    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashUrl = process.env.QSTASH_URL || 'https://qstash-eu-central-1.upstash.io';
    const qstash = qstashToken ? new Client({ token: qstashToken, baseUrl: qstashUrl }) : null;

    // Use current request headers to construct local/remote callback URL
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const apiBaseUrl = `${protocol}://${host}`;

    console.log(`[Profile Refresh Saga: Init] 🚀 Bulk refresh triggered for ${matchIds.length} candidate(s) | Environment: ${environment}`);
    console.log(`[Profile Refresh Saga: Init] Selected scraper configuration: "${scraperChoice}"`);

    // Loop through each match ID and dispatch background tasks
    for (const matchId of matchIds) {
      const idx = matchIds.indexOf(matchId);
      const payload = {
        matchId,
        reason: reason.trim(),
        changedBy: changedBy || authUser?.username || 'Admin',
        authUser,
        scraperChoice
      };

      // Stagger the calls to prevent concurrent rate limits and scraper exhaustion (e.g. Apify 32 actor runs limit)
      // Spacing out by 1 second naturally caps concurrency at ~20 (each scrape takes ~20s) and distributes Gemini calls.
      const staggerDelaySeconds = idx * 1; 

      if (local || !qstash) {
        console.log(`[Profile Refresh Saga: Init] [LocalDev] Scheduling background refresh for Match ID "${matchId}" (${idx + 1}/${matchIds.length}) with stagger delay of ${staggerDelaySeconds}s`);
        
        setTimeout(() => {
          fetch(`${apiBaseUrl}/api/prospects/sourcing/bulk-refresh/worker?local=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(err => console.error('[Profile Refresh Saga: Init] ❌ Local refresh worker dispatch failed:', err.message));
        }, staggerDelaySeconds * 1000);
      } else {
        console.log(`[Profile Refresh Saga: Init] [QStash] Scheduling background refresh task for Match ID "${matchId}" (${idx + 1}/${matchIds.length}) with stagger delay of ${staggerDelaySeconds}s`);
        
        // Publish background task to QStash with stagger delay
        await qstash.publishJSON({
          url: `${apiBaseUrl}/api/prospects/sourcing/bulk-refresh/worker`,
          body: payload,
          delay: staggerDelaySeconds
        }).catch(err => console.error('[Profile Refresh Saga: Init] ❌ QStash refresh worker dispatch failed:', err.message));
      }
    }

    // Log a single consolidated batch event on the global activity timeline immediately
    await logActivityEvent({
      user: authUser,
      event_type: 'UPDATE_CANDIDATE',
      entity_type: 'prospect', // keeps category as Prospects
      entity_id: null, // global timeline only
      title: `refreshed profiles for ${matchIds.length} prospects`,
      description: reason.trim(), // User provided remarks only
      metadata: { 
        scraper: scraperChoice
      },
      environment
    });

    console.log(`[Profile Refresh Saga: Init] ✅ Bulk refresh tasks successfully dispatched for ${matchIds.length} candidate(s).`);

    return NextResponse.json({ success: true, count: matchIds.length }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('[Profile Refresh Saga: Init] ❌ Bulk refresh pipeline failed:', err.message, err.stack);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
