import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

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
    const formData = await req.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'logos';
    const path = formData.get('path') || `${Date.now()}-${file.name}`;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400, headers: corsHeaders });
    }

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({ success: true, url: publicUrl }, { headers: corsHeaders });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
