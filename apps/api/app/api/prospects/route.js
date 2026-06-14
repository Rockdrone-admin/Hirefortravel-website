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
    const minScore = searchParams.get('minScore');
    
    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Pagination parameters
    const limit = parseInt(searchParams.get('limit')) || 1000;
    const offset = parseInt(searchParams.get('offset')) || 0;

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Pre-filter prospects if needed (for nested checks like profile fields search, linkedin, email, phone)
    const needsProspectFilter = search || hasLinkedin || hasEmail || hasPhone;
    let filteredProspectIds = null;

    if (needsProspectFilter) {
      let pQuery = supabase
        .from('prospects')
        .select('id')
        .eq('environment', environment);

      if (search) {
        pQuery = pQuery.or(`name.ilike.%${search}%,latest_company.ilike.%${search}%,latest_title.ilike.%${search}%,functional_field.ilike.%${search}%,city.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      if (hasLinkedin) {
        pQuery = pQuery.not('linkedin_url', 'is', null);
      }
      if (hasEmail) {
        pQuery = pQuery.not('email', 'is', null);
      }
      if (hasPhone) {
        pQuery = pQuery.not('phone', 'is', null);
      }

      const { data: matchedProspects, error: pError } = await pQuery;
      if (pError) {
        console.error('Failed to pre-filter prospects:', pError);
      }
      filteredProspectIds = matchedProspects ? matchedProspects.map(p => p.id) : [];
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
      `, { count: 'exact' })
      .eq('environment', environment);

    // Apply filters
    if (stage) {
      const stages = stage.split(',');
      query = query.in('stage', stages);
    }
    if (jobId && jobId !== 'all') {
      query = query.eq('job_id', jobId);
    }
    if (owner && owner !== 'all') {
      query = query.eq('owner', owner);
    }
    if (activeParam !== null && activeParam !== undefined) {
      query = query.eq('active_flag', activeParam === 'true');
    }
    if (minScore) {
      query = query.gte('ai_score', parseInt(minScore));
    }

    // Apply the prospect-specific filters
    if (needsProspectFilter) {
      if (filteredProspectIds.length === 0) {
        if (search) {
          query = query.or(`human_notes.ilike.%${search}%,owner.ilike.%${search}%`);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else {
        if (search) {
          query = query.or(`prospect_id.in.(${filteredProspectIds.join(',')}),human_notes.ilike.%${search}%,owner.ilike.%${search}%`);
        } else {
          query = query.in('prospect_id', filteredProspectIds);
        }
      }
    }

    // Sorting
    if (sortBy === 'newest' || sortBy === 'created_at') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'score' || sortBy === 'ai_score') {
      query = query.order('ai_score', { ascending: sortOrder === 'asc', nullsFirst: false });
    } else if (sortBy === 'name') {
      query = query.order('name', { referencedTable: 'prospect', ascending: sortOrder === 'asc' });
    } else if (sortBy === 'experience') {
      query = query.order('total_experience', { referencedTable: 'prospect', ascending: sortOrder === 'asc' });
    } else if (sortBy === 'duration') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Pagination range
    query = query.range(offset, offset + limit - 1);

    // Perform the fetch
    const { data: matches, count, error } = await query;

    if (error) {
      console.error('Failed to query prospects:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch prospects' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Fetch stage counts for this environment to support tab counters
    const { data: countData } = await supabase
      .from('prospect_matches')
      .select('stage')
      .eq('environment', environment);

    const stageCounts = {};
    if (countData) {
      countData.forEach(m => {
        stageCounts[m.stage] = (stageCounts[m.stage] || 0) + 1;
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: matches || [], 
      count: count || 0,
      stageCounts
    }, { headers: getCorsHeaders(req.headers.get('origin')) });

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
