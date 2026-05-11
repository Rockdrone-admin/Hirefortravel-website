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
    const range = searchParams.get('range') || 'today'; // today, 7d, 30d, or numeric days
    
    // Calculate start date based on range
    const startDate = new Date();
    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (!isNaN(parseInt(range))) {
      startDate.setDate(startDate.getDate() - parseInt(range));
    }
    const startDateISO = startDate.toISOString();
    
    // Run queries in parallel
    const [
      { count: activeJobsCount },
      { count: sessionsRangeCount },
      { count: companyLeadsFormCount },
      { count: companyLeadsWhatsAppCount },
      { count: candidateLeadsFormCount },
      { count: candidateLeadsWhatsAppCount },
      { data: recentEvents }
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('environment', environment),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'session_start').gte('created_at', startDateISO).eq('environment', environment),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'lead_submitted').eq('source', 'Company').gte('created_at', startDateISO).eq('environment', environment),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'whatsapp_click').eq('source', 'Company').gte('created_at', startDateISO).eq('environment', environment),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'lead_submitted').eq('source', 'Candidate').gte('created_at', startDateISO).eq('environment', environment),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'whatsapp_click').eq('source', 'Candidate').gte('created_at', startDateISO).eq('environment', environment),
      supabase.from('analytics_events').select('*').in('event_type', ['lead_submitted', 'whatsapp_click', 'session_start']).eq('environment', environment).order('created_at', { ascending: false }).limit(20)
    ]);

    const dashboardData = {
      activeJobs: activeJobsCount || 0,
      sessionsInRange: sessionsRangeCount || 0,
      companyLeadsForm: companyLeadsFormCount || 0,
      companyLeadsWhatsApp: companyLeadsWhatsAppCount || 0,
      candidateLeadsForm: candidateLeadsFormCount || 0,
      candidateLeadsWhatsApp: candidateLeadsWhatsAppCount || 0,
      recentEvents: recentEvents || []
    };

    return NextResponse.json({ success: true, data: dashboardData }, { headers: getCorsHeaders(req.headers.get('origin')) });
  } catch (err) {
    console.error('Dashboard aggregation error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getCorsHeaders(req.headers.get('origin')) });
  }
}
