import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../../../../lib/supabase';
import { getCorsHeaders } from '../../../../../../lib/cors';
import { requireAuth, logActivityEvent } from '../../../../../../lib/auth';

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function GET(req) {
  try {
    const environment = getEnvironment();
    const { error: authError, status: authStatus } = await requireAuth('can_manage_ai_settings');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    if (!supabase) {
      return NextResponse.json({ success: true, data: [] }, { headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { data: versions, error } = await supabase
      .from('sourcing_prompt_versions')
      .select('*')
      .eq('environment', environment)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to retrieve sourcing prompt versions:', error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    return NextResponse.json({ success: true, data: versions }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Fetch prompt versions failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}

export async function DELETE(req) {
  try {
    const environment = getEnvironment();
    const { user: authUser, error: authError, status: authStatus } = await requireAuth('can_manage_ai_settings');
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: authStatus, headers: getCorsHeaders(req.headers.get('origin')) });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Version ID is required' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection not initialized' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    const { error } = await supabase
      .from('sourcing_prompt_versions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('environment', environment);

    if (error) {
      console.error('Failed to delete sourcing prompt version:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete version from database' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Log Activity
    await logActivityEvent({
      user: authUser,
      event_type: 'AI_SETTINGS_VERSION_DELETED',
      entity_type: 'AI_PROMPT_VERSION',
      entity_id: id,
      title: 'Deleted historical AI settings version',
      environment
    });

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Delete prompt version failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + err.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
