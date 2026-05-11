import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
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
        { status: 400, headers: corsHeaders }
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
      return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 500, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from('analytics_events')
      .insert([eventData])
      .select();

    if (error) {
      console.error('Supabase error creating analytics event:', error);
      return NextResponse.json({ success: false, error: 'Failed to record event' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    
    if (!supabase) {
      console.error('Supabase client not initialized. Check environment variables.');
      return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 500, headers: corsHeaders });
    }

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('environment', environment)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to recent 100 for now

    if (error) {
      console.error('Supabase error fetching events:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data: events }, { headers: corsHeaders });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
