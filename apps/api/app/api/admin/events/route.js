import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../lib/supabase';
import { getCorsHeaders } from '../../../../lib/cors';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    const url = new URL(req.url);
    const entity_type = url.searchParams.get('entity_type');
    const entity_id = url.searchParams.get('entity_id');
    const user_id = url.searchParams.get('user_id');
    const event_type = url.searchParams.get('event_type');
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const sort_by = url.searchParams.get('sort_by') || 'created_at';
    const sort_order = url.searchParams.get('sort_order') || 'desc';

    let query = supabase
      .from('activity_events')
      .select('*', { count: 'exact' })
      .eq('environment', environment);

    if (category) {
      if (category === 'Jobs') {
        query = query.in('entity_type', ['JOB', 'job']);
      } else if (category === 'Companies') {
        query = query.in('entity_type', ['client_logo', 'logo', 'company', 'CLIENT_LOGO', 'LOGO', 'COMPANY']);
      } else if (category === 'Prospects') {
        query = query.in('entity_type', ['prospect', 'candidate', 'sourcing_run', 'PROSPECT', 'CANDIDATE', 'SOURCING_RUN']);
      } else if (category === 'Settings') {
        // Explicitly target Settings entity types or any other unclassified event types (catch-all)
        query = query.not('entity_type', 'in', '("JOB","job","client_logo","logo","company","CLIENT_LOGO","LOGO","COMPANY","prospect","candidate","sourcing_run","PROSPECT","CANDIDATE","SOURCING_RUN")');
      }
    } else if (entity_type) {
      query = query.eq('entity_type', entity_type);
    } else if (!event_type) {
      // Global View: exclude individual candidate matching noise
      query = query.not('event_type', 'eq', 'CANDIDATE_MATCHED');
    }
    
    if (entity_id) {
      query = query.eq('entity_id', entity_id);
    }
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (event_type) {
      query = query.eq('event_type', event_type);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,user_name.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Apply pagination range (0-indexed)
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: events, error, count } = await query;

    if (error) throw error;

    return NextResponse.json(
      { 
        success: true, 
        data: events,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }, 
      { headers: getCorsHeaders(req.headers.get('origin')) }
    );
  } catch (err) {
    console.error('Fetch events error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
