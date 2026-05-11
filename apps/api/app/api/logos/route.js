import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../lib/supabase';
import { getCorsHeaders } from '../../../lib/cors';

// Dynamic CORS handled inside functions

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('all') === 'true';
    
    let query = supabase
      .from('client_logos')
      .select('*')
      .eq('environment', environment)
      .order('created_at', { ascending: true });

    if (!showAll) {
      query = query.eq('is_visible', true);
    }

    const { data: logos, error } = await query;
    console.log(`Logos fetch (showAll: ${showAll}):`, { count: logos?.length, firstFive: logos?.slice(0, 5).map(l => ({ id: l.id, vis: l.is_visible })) });

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch logos' }, { status: 500, headers: getCorsHeaders(request.headers.get('origin')) });
    }

    return NextResponse.json({ success: true, data: logos }, { headers: getCorsHeaders(request.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(request.headers.get('origin')) });
  }
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const body = await req.json();
    
    const logoData = {
      ...body,
      environment
    };

    const { data, error } = await supabase
      .from('client_logos')
      .insert([logoData])
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create logo' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    return NextResponse.json({ success: true, data }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
export async function PATCH(req) {
  try {
    const environment = getEnvironment();
    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Logo ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data, error } = await supabase
      .from('client_logos')
      .update(updates)
      .eq('id', id)
      .eq('environment', environment)
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update logo' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    return NextResponse.json({ success: true, data }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function DELETE(req) {
  try {
    const environment = getEnvironment();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Logo ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { error } = await supabase
      .from('client_logos')
      .delete()
      .eq('id', id)
      .eq('environment', environment);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete logo' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
