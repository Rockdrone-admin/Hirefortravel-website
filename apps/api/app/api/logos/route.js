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
      logCritical('Failed to fetch logos from Supabase', { error });
      return NextResponse.json({ success: false, error: 'Failed to fetch logos' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    return NextResponse.json({ success: true, data: logos }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function POST(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_companies');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

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
      logCritical('Failed to create logo in Supabase', { error, logoData });
      return NextResponse.json({ success: false, error: 'Failed to create logo' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const createdLogo = data && data[0];
    if (createdLogo) {
      await logActivityEvent({
        user: authUser,
        event_type: 'LOGO_CREATED',
        entity_type: 'client_logo',
        entity_id: createdLogo.id,
        title: `Added company logo for ${createdLogo.company_name}`,
        metadata: { company_name: createdLogo.company_name },
        environment
      });
    }

    return NextResponse.json({ success: true, data }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function PATCH(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_companies');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

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
      logCritical('Failed to update logo in Supabase', { error, id, updates });
      return NextResponse.json({ success: false, error: 'Failed to update logo' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const updatedLogo = data && data[0];
    if (updatedLogo) {
      const titleText = updates.is_visible !== undefined 
        ? `${updates.is_visible ? 'Showed' : 'Hidden'} company logo for ${updatedLogo.company_name}`
        : `Updated company logo for ${updatedLogo.company_name}`;

      // Exclude logo_url from logged updates metadata for security/cleanliness
      const { logo_url, logoUrl, ...loggedUpdates } = updates;

      await logActivityEvent({
        user: authUser,
        event_type: 'LOGO_UPDATED',
        entity_type: 'client_logo',
        entity_id: id,
        title: titleText,
        metadata: { company_name: updatedLogo.company_name, updates: loggedUpdates },
        environment
      });
    }

    return NextResponse.json({ success: true, data }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function DELETE(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_access_companies');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Logo ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Get logo details for logging before deleting
    const { data: logo } = await supabase
      .from('client_logos')
      .select('company_name')
      .eq('id', id)
      .eq('environment', environment)
      .maybeSingle();

    const companyName = logo?.company_name || 'Unknown Company';

    const { error } = await supabase
      .from('client_logos')
      .delete()
      .eq('id', id)
      .eq('environment', environment);

    if (error) {
      logCritical('Failed to delete logo from Supabase', { error, id });
      return NextResponse.json({ success: false, error: 'Failed to delete logo' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Log Activity Event
    await logActivityEvent({
      user: authUser,
      event_type: 'LOGO_DELETED',
      entity_type: 'client_logo',
      entity_id: id,
      title: `Deleted company logo for ${companyName}`,
      metadata: { company_name: companyName },
      environment
    });

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
