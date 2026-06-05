import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../lib/supabase';
import { getCorsHeaders } from '../../../lib/cors';
import { logCritical } from '@repo/logger';
import { requireAuth, logActivityEvent } from '../../../lib/auth';

// Dynamic CORS handled inside functions

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') || 'active';
    const statusList = statusParam.split(',');
    const isAdmin = searchParams.get('admin') === 'true';
    
    if (!supabase) {
      logCritical('Supabase client not initialized in API route');
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .in('status', statusList)
      .eq('environment', environment)
      .order('created_at', { ascending: false });

    if (error) {
      logCritical('Failed to fetch jobs from Supabase', { error });
      return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Server-side strip the internal company, competitor, and alternative titles details for public web-app queries to prevent crawler / Google Jobs indexing leak
    const returnedJobs = isAdmin ? jobs : (jobs || []).map(job => {
      const { real_company_name, competitors, alternative_titles, ...rest } = job;
      return rest;
    });

    return NextResponse.json({ success: true, data: returnedJobs }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_jobs');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const body = await req.json();
    
    const jobData = {
      ...body,
      environment
    };

    if (!supabase) {
      logCritical('Supabase client not initialized in API route');
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select();

    if (error) {
      logCritical('Failed to create job in Supabase', { error, jobData });
      return NextResponse.json({ success: false, error: 'Failed to create job' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Log Activity
    if (data && data[0]) {
      await logActivityEvent({
        user: authUser,
        event_type: 'JOB_CREATED',
        entity_type: 'JOB',
        entity_id: data[0].id,
        title: `Created job position: ${data[0].title}`,
        metadata: { company: data[0].company_name },
        environment
      });
    }

    return NextResponse.json({ success: true, data }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function PATCH(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_jobs');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Try to handle both string and numeric IDs
    const numericId = !isNaN(id) ? Number(id) : id;
    
    if (!supabase) {
      logCritical('Supabase client not initialized in API route');
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Fetch the current record first to perform field comparisons for activity events
    const { data: currentJob, error: fetchErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', numericId)
      .eq('environment', environment)
      .single();

    if (fetchErr || !currentJob) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', numericId)
      .eq('environment', environment)
      .select();

    if (error) {
      logCritical('Failed to update job in Supabase', { error, id, updates });
      return NextResponse.json({ success: false, error: 'Failed to update job: ' + error.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Log Activity
    if (data && data[0]) {
      const changes = [];
      for (const [key, val] of Object.entries(updates)) {
        const currentVal = currentJob[key];
        const hasChanged = String(currentVal ?? '') !== String(val ?? '');
        if (hasChanged) {
          changes.push({
            field: key,
            prev: currentVal === null || currentVal === undefined ? '' : String(currentVal),
            next: val === null || val === undefined ? '' : String(val)
          });
        }
      }

      if (changes.length > 0) {
        await logActivityEvent({
          user: authUser,
          event_type: 'JOB_UPDATED',
          entity_type: 'JOB',
          entity_id: data[0].id,
          title: `Updated job position: ${data[0].title}`,
          metadata: { changes },
          environment
        });
      }
    }

    return NextResponse.json({ success: true, data }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function DELETE(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_jobs');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Try to handle both string and numeric IDs
    const numericId = !isNaN(id) ? Number(id) : id;

    if (!supabase) {
      logCritical('Supabase client not initialized in API route');
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Fetch the job details first so we can log its name
    const { data: jobToDel } = await supabase
      .from('jobs')
      .select('title, company_name')
      .eq('id', numericId)
      .eq('environment', environment)
      .single();

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', numericId)
      .eq('environment', environment);

    if (error) {
      logCritical('Failed to delete job from Supabase', { error, id });
      return NextResponse.json({ success: false, error: 'Failed to delete job' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'JOB_DELETED',
      entity_type: 'JOB',
      entity_id: numericId,
      title: `Deleted job position: ${jobToDel?.title || `ID ${numericId}`}`,
      metadata: { company: jobToDel?.company_name },
      environment
    });

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
