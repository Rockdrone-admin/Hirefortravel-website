import { NextResponse } from 'next/server';
import { getEnvironment } from '../../../lib/supabase';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'HireForTravel API is running',
    environment: getEnvironment()
  });
}
