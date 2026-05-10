import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request) {
  try {
    const environment = getEnvironment();
    
    // Extract status from URL query parameters, default to 'active'
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'active';
    const statusList = statusParam.split(',');
    
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .in('status', statusList)
      .eq('environment', environment)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching jobs:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data: jobs }, { headers: corsHeaders });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const body = await req.json();
    
    const jobData = {
      ...body,
      environment
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select();

    if (error) {
      console.error('Supabase error creating job:', error);
      return NextResponse.json({ success: false, error: 'Failed to create job' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(req) {
  try {
    const environment = getEnvironment();
    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400, headers: corsHeaders });
    }

    // Try to handle both string and numeric IDs
    const numericId = !isNaN(id) ? Number(id) : id;
    
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', numericId)
      .eq('environment', environment)
      .select();

    if (error) {
      console.error('Supabase error updating job:', error);
      return NextResponse.json({ success: false, error: 'Failed to update job: ' + error.message }, { status: 500, headers: corsHeaders });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req) {
  try {
    const environment = getEnvironment();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400, headers: corsHeaders });
    }

    // Try to handle both string and numeric IDs
    const numericId = !isNaN(id) ? Number(id) : id;

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', numericId)
      .eq('environment', environment);

    if (error) {
      console.error('Supabase error deleting job:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete job' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('Internal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
