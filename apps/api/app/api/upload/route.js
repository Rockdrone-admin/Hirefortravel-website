import { NextResponse } from 'next/server';
import { getCorsHeaders } from '../../../lib/cors';
import { supabase } from '../../../lib/supabase';

// Dynamic CORS handled inside functions

export async function OPTIONS(req) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get('origin')) });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'logos';
    const path = formData.get('path') || `${Date.now()}-${file.name}`;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400, headers: getCorsHeaders(req.headers.get('origin')) });
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({ success: true, url: publicUrl }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
