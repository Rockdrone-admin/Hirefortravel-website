import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../lib/supabase';
import { getCorsHeaders } from '../../../lib/cors';

export const dynamic = 'force-dynamic';

// Dynamic CORS handled inside functions

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const body = await req.json();
    
    // Required fields: event_type, source, page
    // Optional fields: metadata
    
    if (!body.event_type || !body.source || !body.page) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (event_type, source, page)' }, 
        { status: 400, headers: getCorsHeaders(req.headers.get('origin')) }
      );
    }
    
    const eventData = {
      event_type: body.event_type,
      source: body.source,
      page: body.page,
      metadata: body.metadata || {},
      environment
    };

    if (!supabase) {
      console.error('Supabase client not initialized. Check environment variables.');
      return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data, error } = await supabase
      .from('analytics_events')
      .insert([eventData])
      .select();

    if (error) {
      console.error('Supabase error creating analytics event:', error);
      return NextResponse.json({ success: false, error: 'Failed to record event' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    return NextResponse.json({ success: true, data }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    
    if (!supabase) {
      console.error('Supabase client not initialized. Check environment variables.');
      return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('environment', environment)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to recent 100 for now

    if (error) {
      console.error('Supabase error fetching events:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    return NextResponse.json({ success: true, data: events }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
