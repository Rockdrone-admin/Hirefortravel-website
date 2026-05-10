"use client";
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState('today');
  const [customDays, setCustomDays] = useState('14');
  const [data, setData] = useState({
    activeJobs: 0,
    sessionsInRange: 0,
    companyLeadsForm: 0,
    companyLeadsWhatsApp: 0,
    candidateLeadsForm: 0,
    candidateLeadsWhatsApp: 0,
    recentEvents: []
  });
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const rangeValue = timeRange === 'custom' ? customDays : timeRange;
        const response = await fetch(`${API_URL}/api/dashboard?range=${rangeValue}`);
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [timeRange, customDays]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(d);
  };

  const totalCompanyLeads = data.companyLeadsForm + data.companyLeadsWhatsApp;
  const totalCandidateLeads = data.candidateLeadsForm + data.candidateLeadsWhatsApp;
  const grandTotalLeads = totalCompanyLeads + totalCandidateLeads;

  // Simple percentage calculation for the chart
  const companyPct = grandTotalLeads > 0 ? (totalCompanyLeads / grandTotalLeads) * 100 : 0;
  const candidatePct = grandTotalLeads > 0 ? (totalCandidateLeads / grandTotalLeads) * 100 : 0;

  return (
    <main>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Overview</h1>
          <p className="text-sm text-gray-500">Real-time performance metrics for HireForTravel.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          {['today', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === range ? 'bg-green-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
          <div className={`flex items-center rounded-md overflow-hidden transition-all ${timeRange === 'custom' ? 'bg-green-700 text-white shadow-md' : 'text-gray-500'}`}>
            <button
              onClick={() => setTimeRange('custom')}
              className={`px-4 py-1.5 text-sm font-medium ${timeRange === 'custom' ? 'text-white' : 'hover:text-gray-800'}`}
            >
              Custom
            </button>
            {timeRange === 'custom' && (
              <div className="flex items-center pr-2">
                <input 
                  type="number" 
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-12 bg-green-800 text-white border-none text-center text-sm py-0.5 rounded focus:ring-1 focus:ring-white/50"
                  min="1"
                />
                <span className="ml-1 text-[10px] opacity-70">days</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md border-l-4 border-l-blue-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Unique Sessions</h3>
          <p className="text-4xl font-black text-gray-900 mb-1">{loading ? '-' : data.sessionsInRange.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Total visitors in period</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md border-l-4 border-l-purple-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Company Leads</h3>
          <p className="text-4xl font-black text-gray-900 mb-1">{loading ? '-' : totalCompanyLeads.toLocaleString()}</p>
          <p className="text-xs text-gray-400 font-medium">
            <span className="text-purple-600">{loading ? '-' : data.companyLeadsForm} Form</span> &bull; <span className="text-green-600">{loading ? '-' : data.companyLeadsWhatsApp} WhatsApp</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md border-l-4 border-l-orange-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Candidate Leads</h3>
          <p className="text-4xl font-black text-gray-900 mb-1">{loading ? '-' : totalCandidateLeads.toLocaleString()}</p>
          <p className="text-xs text-gray-400 font-medium">
            <span className="text-orange-600">{loading ? '-' : data.candidateLeadsForm} Form</span> &bull; <span className="text-green-600">{loading ? '-' : data.candidateLeadsWhatsApp} WhatsApp</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md border-l-4 border-l-green-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Jobs</h3>
          <p className="text-4xl font-black text-gray-900 mb-1">{loading ? '-' : data.activeJobs}</p>
          <p className="text-xs text-gray-400">Live on website</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Lead Breakdown Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Lead Breakdown</h2>
              <p className="text-sm text-gray-500">Distribution of company vs candidate leads.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900">{grandTotalLeads}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total Leads</p>
            </div>
          </div>

          <div className="space-y-8 flex-1 flex flex-col justify-center">
            {/* Company Row */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-bold text-gray-700">Company Leads</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{totalCompanyLeads} ({Math.round(companyPct)}%)</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${grandTotalLeads > 0 ? (data.companyLeadsForm / grandTotalLeads) * 100 : 0}%` }} 
                  className="h-full bg-purple-600 transition-all duration-1000"
                  title="Form Submissions"
                ></div>
                <div 
                  style={{ width: `${grandTotalLeads > 0 ? (data.companyLeadsWhatsApp / grandTotalLeads) * 100 : 0}%` }} 
                  className="h-full bg-purple-300 transition-all duration-1000"
                  title="WhatsApp Clicks"
                ></div>
              </div>
            </div>

            {/* Candidate Row */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-bold text-gray-700">Candidate Leads</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{totalCandidateLeads} ({Math.round(candidatePct)}%)</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${grandTotalLeads > 0 ? (data.candidateLeadsForm / grandTotalLeads) * 100 : 0}%` }} 
                  className="h-full bg-orange-600 transition-all duration-1000"
                  title="Form Submissions"
                ></div>
                <div 
                  style={{ width: `${grandTotalLeads > 0 ? (data.candidateLeadsWhatsApp / grandTotalLeads) * 100 : 0}%` }} 
                  className="h-full bg-orange-300 transition-all duration-1000"
                  title="WhatsApp Clicks"
                ></div>
              </div>
            </div>

            <div className="flex gap-6 pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1.5 rounded-full bg-gray-600"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Form Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1.5 rounded-full bg-gray-300"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">WhatsApp Leads</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events Feed */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-0 flex flex-col overflow-hidden h-[450px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Live Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <p className="text-gray-400 text-sm italic text-center py-10">Syncing activity...</p>
            ) : data.recentEvents.length === 0 ? (
              <p className="text-gray-400 text-sm italic text-center py-10">No recent activity found.</p>
            ) : (
              <ul className="space-y-4">
                {data.recentEvents.map((event) => (
                  <li key={event.id} className="flex gap-4">
                    <div className="mt-1">
                      {event.event_type === 'lead_submitted' ? (
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9 22 2z"/></svg>
                        </div>
                      ) : event.event_type === 'whatsapp_click' ? (
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7c.9 0 1.8.1 2.6.3"></path><path d="m11 9 3 3-3 3"></path></svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {event.event_type === 'lead_submitted' ? 'New Form Lead' : event.event_type === 'whatsapp_click' ? 'WhatsApp Click' : 'Page View'}
                        <span className="font-normal text-gray-500 ml-1 italic">({event.source})</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">{formatDate(event.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
