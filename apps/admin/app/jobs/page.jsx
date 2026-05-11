"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import JobModal from '../../components/JobModal';

export default function JobsManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  // Fetch jobs on load and when activeTab changes
  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const statusQuery = activeTab === 'active' ? 'active,inactive' : activeTab;
      const response = await fetch(`${API_URL}/api/jobs?status=${statusQuery}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) {
        setJobs(result.data);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (job) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const handleArchiveJob = async (id) => {
    if (!confirm("Are you sure you want to archive this job?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'archived' }),
      });
      const result = await response.json();
      if (result.success) {
        fetchJobs();
      } else {
        alert("Error archiving job: " + result.error);
      }
    } catch (err) {
      console.error("Error archiving job:", err);
    }
  };

  const handleUnarchiveJob = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'active' }),
      });
      const result = await response.json();
      if (result.success) {
        fetchJobs();
      } else {
        alert("Error unarchiving job: " + result.error);
      }
    } catch (err) {
      console.error("Error unarchiving job:", err);
    }
  };

  const handleToggleStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        fetchJobs();
      } else {
        alert(`Error setting to ${newStatus}: ` + result.error);
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleDuplicateJob = async (job) => {
    if (!confirm(`Duplicate "${job.title}"? The copy will be set to Inactive.`)) return;
    
    try {
      // Remove metadata from the original job
      const { id, created_at, environment, ...jobData } = job;
      
      // Set status to inactive for the copy
      const duplicateData = {
        ...jobData,
        status: 'inactive'
      };

      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      });
      const result = await response.json();
      if (result.success) {
        fetchJobs();
      } else {
        alert("Error duplicating job: " + result.error);
      }
    } catch (err) {
      console.error("Error duplicating job:", err);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm("PERMANENTLY delete this job? This cannot be undone.")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/jobs?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchJobs();
      } else {
        alert("Error deleting job: " + result.error);
      }
    } catch (err) {
      console.error("Error deleting job:", err);
    }
  };

  const handleSaveJob = async (jobData) => {
    try {
      const method = editingJob ? 'PATCH' : 'POST';
      const body = editingJob ? { id: editingJob.id, ...jobData } : jobData;

      const response = await fetch(`${API_URL}/api/jobs`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        setEditingJob(null);
        fetchJobs(); // Refresh the list
      } else {
        alert("Error saving job: " + result.error);
      }
    } catch (err) {
      console.error("Error saving job:", err);
      alert("Failed to save job. Check console for details.");
    }
  };

  return (
    <main>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Jobs Manager</h1>
        <button 
          onClick={() => { setEditingJob(null); setIsModalOpen(true); }}
          className="bg-green-700 text-white px-4 py-2 rounded-md font-medium hover:bg-green-800 transition-colors shadow-lg shadow-green-100 w-full sm:w-auto"
        >
          + Add New Job
        </button>
      </div>
      
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button 
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('active')}
        >
          Active / Inactive
        </button>
        <button 
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'archived' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived Jobs
        </button>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
              <th className="p-4 font-medium">Job Title</th>
              <th className="p-4 font-medium">Company</th>
              <th className="p-4 font-medium">Location</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">Loading jobs...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">No {activeTab} jobs found.</td></tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{job.title}</td>
                  <td className="p-4 text-gray-600">{job.company_name}</td>
                  <td className="p-4 text-gray-600">{job.location}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      job.status === 'active' ? 'bg-green-100 text-green-800' : 
                      job.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {activeTab === 'active' ? (
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => handleToggleStatus(job)}
                          className={`${job.status === 'active' ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'} font-medium text-sm`}
                          title={job.status === 'active' ? 'Set as Inactive' : 'Set as Active'}
                        >
                          {job.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDuplicateJob(job)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                        >
                          Duplicate
                        </button>
                        <button 
                          onClick={() => handleEditClick(job)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleArchiveJob(job.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Archive
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => handleEditClick(job)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleUnarchiveJob(job.id)}
                          className="text-green-600 hover:text-green-800 font-medium text-sm"
                        >
                          Unarchive
                        </button>
                        <button 
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Delete Permanent
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="md:hidden flex flex-col gap-4">
        {loading ? (
          <div className="p-10 text-center text-gray-400 italic bg-white rounded-xl border border-gray-200">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic bg-white rounded-xl border border-gray-200">No {activeTab} jobs found.</div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.company_name}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  job.status === 'active' ? 'bg-green-100 text-green-800' : 
                  job.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Location:</span> {job.location}
              </div>
              <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                {activeTab === 'active' ? (
                  <>
                    <button 
                      onClick={() => handleToggleStatus(job)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${job.status === 'active' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}
                    >
                      {job.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDuplicateJob(job)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700"
                    >
                      Duplicate
                    </button>
                    <button 
                      onClick={() => handleEditClick(job)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleArchiveJob(job.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700"
                    >
                      Archive
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleEditClick(job)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleUnarchiveJob(job.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700"
                    >
                      Unarchive
                    </button>
                    <button 
                      onClick={() => handleDeleteJob(job.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700"
                    >
                      Delete Permanent
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <JobModal 
        isOpen={isModalOpen} 
        job={editingJob}
        onClose={() => { setIsModalOpen(false); setEditingJob(null); }} 
        onSave={handleSaveJob}
      />
    </main>
  );
}
