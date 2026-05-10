import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'HireForTravel API is running',
    environment: process.env.NODE_ENV
  });
}
