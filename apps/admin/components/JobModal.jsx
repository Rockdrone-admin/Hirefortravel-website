"use client";
import { useState, useEffect } from 'react';

export default function JobModal({ isOpen, job, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    location: '',
    experience: '',
    salary: '',
    responsibilities: '',
    requirements: '',
    benefits: ''
  });

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        company_name: job.company_name || '',
        location: job.location || '',
        experience: job.experience || '',
        salary: job.salary || '',
        responsibilities: job.responsibilities ? job.responsibilities.join('\n') : '',
        requirements: job.requirements ? job.requirements.join('\n') : '',
        benefits: job.benefits ? job.benefits.join('\n') : ''
      });
    } else {
      setFormData({
        title: '',
        company_name: '',
        location: '',
        experience: '',
        salary: '',
        responsibilities: '',
        requirements: '',
        benefits: ''
      });
    }
  }, [job, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert textarea lines to arrays
    const formattedData = {
      ...formData,
      responsibilities: formData.responsibilities.split('\n').filter(line => line.trim() !== ''),
      requirements: formData.requirements.split('\n').filter(line => line.trim() !== ''),
      benefits: formData.benefits.split('\n').filter(line => line.trim() !== ''),
      status: job ? job.status : 'active'
    };
    onSave(formattedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{job ? 'Edit Job Opening' : 'Add New Job Opening'}</h2>
            <p className="text-sm text-gray-500">{job ? 'Update the details for this position.' : 'Fill in the details to post a new position on the website.'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="job-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                  placeholder="e.g. Travel Sales Executive" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                <input 
                  type="text" 
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                  placeholder="e.g. HireForTravel" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                  placeholder="e.g. Delhi, NCR" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Experience</label>
                <input 
                  type="text" 
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                  placeholder="e.g. 2-5 Years" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Salary Range</label>
                <input 
                  type="text" 
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                  placeholder="e.g. 4-6 LPA" 
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Key Responsibilities (One per line)</label>
              <textarea 
                value={formData.responsibilities}
                onChange={(e) => setFormData({...formData, responsibilities: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px]" 
                placeholder="Handle customer queries...&#10;Manage bookings..."
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Requirements (One per line)</label>
              <textarea 
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px]" 
                placeholder="Bachelor's degree...&#10;Excellent communication..."
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Benefits (One per line)</label>
              <textarea 
                value={formData.benefits}
                onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px]" 
                placeholder="Health insurance...&#10;Remote work options..."
                required
              ></textarea>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-all">
            Cancel
          </button>
          <button 
            type="submit" 
            form="job-form"
            className="px-6 py-2.5 rounded-lg font-bold text-white bg-green-700 hover:bg-green-800 shadow-lg shadow-green-200 transition-all"
          >
            Save Job Posting
          </button>
        </div>
      </div>
    </div>
  );
}
