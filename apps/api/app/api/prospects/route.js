import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../lib/supabase';
import { getCorsHeaders } from '../../../lib/cors';
import { requireAuth, logActivityEvent } from '../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    const { error: authError, status: authStatus } = await requireAuth('can_access_prospects');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });
    const { searchParams } = new URL(req.url);

    // Retrieve Filter Parameters
    const stage = searchParams.get('stage');
    const jobId = searchParams.get('jobId');
    const owner = searchParams.get('owner');
    const search = searchParams.get('search');
    const hasLinkedin = searchParams.get('hasLinkedin') === 'true';
    const hasEmail = searchParams.get('hasEmail') === 'true';
    const hasPhone = searchParams.get('hasPhone') === 'true';
    const activeParam = searchParams.get('active');
    
    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Build the query joining prospect_matches, prospects, and jobs
    let query = supabase
      .from('prospect_matches')
      .select(`
        id,
        stage,
        ai_score,
        manual_score,
        ai_reasoning,
        human_notes,
        active_flag,
        primary_flag,
        owner,
        tags,
        followup_due_at,
        last_contacted_at,
        lifecycle_timestamps,
        created_at,
        prospect:prospect_id (
          id,
          name,
          email,
          phone,
          city,
          latest_title,
          latest_company,
          functional_field,
          total_experience,
          linkedin_url,
          source
        ),
        job:job_id (
          id,
          title,
          company_name
        )
      `)
      .eq('environment', environment);

    // Apply filters
    if (stage) {
      const stages = stage.split(',');
      query = query.in('stage', stages);
    }
    if (jobId) {
      query = query.eq('job_id', jobId);
    }
    if (owner) {
      query = query.eq('owner', owner);
    }
    if (activeParam !== null && activeParam !== undefined) {
      query = query.eq('active_flag', activeParam === 'true');
    }

    // Perform the fetch
    const { data: matches, error } = await query;

    if (error) {
      console.error('Failed to query prospects:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch prospects' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Fetch recent events to extract remarks for these prospects
    const prospectIds = matches ? [...new Set(matches.map(m => m.prospect_id))] : [];
    
    let activityMap = {};
    if (prospectIds.length > 0) {
      const { data: events } = await supabase
        .from('activity_events')
        .select('entity_id, title, description, metadata')
        .eq('entity_type', 'prospect')
        .in('entity_id', prospectIds.map(String))
        .eq('environment', environment);

      if (events) {
        events.forEach(e => {
          const pid = e.entity_id;
          if (!activityMap[pid]) activityMap[pid] = [];
          if (e.description) activityMap[pid].push(e.description);
          if (e.title) activityMap[pid].push(e.title);
          if (e.metadata && typeof e.metadata === 'object') {
            if (e.metadata.reason) activityMap[pid].push(String(e.metadata.reason));
          }
        });
      }
    }

    // Map matches with past_remarks
    const matchesWithRemarks = (matches || []).map(m => ({
      ...m,
      past_remarks: activityMap[String(m.prospect_id)] || []
    }));

    // Post-filtering & Sorting in JS for joined nested objects (resilient and fast for <1000 rows)
    let filteredMatches = matchesWithRemarks;

    if (search) {
      const s = search.toLowerCase();
      filteredMatches = filteredMatches.filter(m => {
        // 1. Basic profile info and location/contact fields
        const matchesProfile = 
          m.prospect?.name?.toLowerCase().includes(s) ||
          m.prospect?.latest_company?.toLowerCase().includes(s) ||
          m.prospect?.latest_title?.toLowerCase().includes(s) ||
          m.prospect?.functional_field?.toLowerCase().includes(s) ||
          m.prospect?.city?.toLowerCase().includes(s) ||
          m.prospect?.email?.toLowerCase().includes(s) ||
          m.prospect?.phone?.toLowerCase().includes(s);

        if (matchesProfile) return true;

        // 2. Search active or past remarks for this match
        const matchesCurrentRemarks = m.human_notes?.toLowerCase().includes(s);
        const matchesPastRemarks = Array.isArray(m.past_remarks) && m.past_remarks.some(r => r.toLowerCase().includes(s));
        if (matchesCurrentRemarks || matchesPastRemarks) return true;

        // 3. Search human_notes or past_remarks on ANY match for the same prospect
        const prospectId = m.prospect?.id;
        if (!prospectId) return false;
        
        const matchesRemarks = matchesWithRemarks.some(otherMatch => 
          otherMatch.prospect?.id === prospectId && 
          (
            otherMatch.human_notes?.toLowerCase().includes(s) ||
            (Array.isArray(otherMatch.past_remarks) && otherMatch.past_remarks.some(r => r.toLowerCase().includes(s)))
          )
        );

        return matchesRemarks;
      });
    }

    if (hasLinkedin) {
      filteredMatches = filteredMatches.filter(m => !!m.prospect?.linkedin_url);
    }
    if (hasEmail) {
      filteredMatches = filteredMatches.filter(m => !!m.prospect?.email);
    }
    if (hasPhone) {
      filteredMatches = filteredMatches.filter(m => !!m.prospect?.phone);
    }

    // Sorting
    filteredMatches.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'newest' || sortBy === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortBy === 'score' || sortBy === 'ai_score') {
        valA = a.ai_score || 0;
        valB = b.ai_score || 0;
      } else if (sortBy === 'name') {
        valA = a.prospect?.name || '';
        valB = b.prospect?.name || '';
      } else if (sortBy === 'experience') {
        valA = parseFloat(a.prospect?.total_experience) || 0;
        valB = parseFloat(b.prospect?.total_experience) || 0;
      } else {
        valA = a[sortBy] || '';
        valB = b[sortBy] || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return NextResponse.json({ success: true, data: filteredMatches }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('CRM prospects GET failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_prospects');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const body = await req.json();
    
    // Core parameters
    const { 
      name, email, phone, city, linkedinUrl, latestTitle, latestCompany, totalExperience, 
      jobId, stage, score, remarks, owner 
    } = body;

    if (!name || !jobId) {
      return NextResponse.json({ success: false, error: 'Name and jobId are required parameters' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Check if prospect exists already by linkedin URL
    let prospectId;
    if (linkedinUrl) {
      const { data: existing } = await supabase
        .from('prospects')
        .select('id')
        .eq('linkedin_url', linkedinUrl)
        .eq('environment', environment)
        .maybeSingle();

      if (existing) {
        prospectId = existing.id;
      }
    }

    // If prospect doesn't exist, create it
    if (!prospectId) {
      const dedupeHash = `${name.toLowerCase().replace(/\s/g, '')}-${(latestCompany || '').toLowerCase().replace(/\s/g, '')}`;
      
      const { data: prospect, error: pError } = await supabase
        .from('prospects')
        .insert([{
          name,
          email,
          phone,
          city,
          latest_title: latestTitle || '',
          latest_company: latestCompany || '',
          total_experience: totalExperience || '',
          linkedin_url: linkedinUrl || null,
          source: 'Manual Sourcing',
          dedupe_hash: dedupeHash,
          environment
        }])
        .select()
        .single();

      if (pError || !prospect) {
        console.error('Failed to manually insert prospect:', pError);
        return NextResponse.json({ success: false, error: 'Failed to create prospect profile' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
      }

      prospectId = prospect.id;
    }

    // Check if match already exists
    const { data: existingMatch } = await supabase
      .from('prospect_matches')
      .select('*')
      .eq('prospect_id', prospectId)
      .eq('job_id', jobId)
      .eq('environment', environment)
      .maybeSingle();

    if (existingMatch) {
      return NextResponse.json({ success: false, error: 'Prospect is already matched to this job position' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Insert into matches
    const { data: match, error: mError } = await supabase
      .from('prospect_matches')
      .insert([{
        prospect_id: prospectId,
        job_id: jobId,
        stage: stage || 'MATCHED',
        manual_score: score || null,
        human_notes: remarks || null,
        owner: owner || null,
        active_flag: stage !== 'ARCHIVED',
        environment
      }])
      .select()
      .single();

    if (mError) {
      console.error('Failed to create prospect match:', mError);
      return NextResponse.json({ success: false, error: 'Failed to map candidate to job position' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Insert audit log (legacy)
    await supabase
      .from('prospect_activities')
      .insert([{
        prospect_id: prospectId,
        job_id: jobId,
        changed_by: owner || 'Admin',
        activity_type: 'created',
        new_value: stage || 'MATCHED',
        metadata: {
          manual_score: score,
          remarks
        },
        environment
      }]);

    // Log Global Activity Event
    let jobTitle = 'Job Position';
    try {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', jobId)
        .maybeSingle();
      if (jobData) jobTitle = jobData.title;
    } catch (e) {
      console.warn('Failed to query job title:', e);
    }

    await logActivityEvent({
      user: authUser,
      event_type: 'CANDIDATE_CREATED',
      entity_type: 'prospect',
      entity_id: prospectId,
      title: `Manually added candidate ${name}`,
      description: remarks || null,
      metadata: { job_id: jobId, stage: stage || 'MATCHED', job_title: jobTitle, candidate_name: name },
      environment
    });

    return NextResponse.json({ success: true, data: match }, { headers: getCorsHeaders(req.headers.get('origin')) });

  } catch (err) {
    console.error('CRM manual POST failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
