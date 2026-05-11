import { NextResponse } from 'next/server';
import { supabase, getEnvironment } from '../../../lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { username, password_hash } = await req.json();
    const environment = getEnvironment();

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database connection error' }, { status: 500, headers: corsHeaders });
    }

    // Check the admin_users table
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('password_hash', password_hash)
      .eq('environment', environment)
      .single();

    if (error || !user) {
      console.log(`Login failed for user: ${username} in ${environment} environment`);
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401, headers: corsHeaders });
    }

    // Login successful
    return NextResponse.json({ 
      success: true, 
      message: 'Login successful'
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
