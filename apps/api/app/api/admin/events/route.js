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
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    let query = supabase
      .from('activity_events')
      .select('*')
      .eq('environment', environment)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }
    
    if (entity_id) {
      query = query.eq('entity_id', entity_id);
    }
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: events }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Fetch events error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
