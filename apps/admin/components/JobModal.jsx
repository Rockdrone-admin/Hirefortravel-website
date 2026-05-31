"use client";
import { useState, useEffect } from 'react';

export default function JobModal({ isOpen, job, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    location: '',
    experience: '',
    salary: '',
    about_role: '',
    responsibilities: '',
    requirements: '',
    benefits: '',
    real_company_name: '',
    competitors: '',
    alternative_titles: '',
    number_of_openings: 1,
    notes: ''
  });

  const formatListForTextarea = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
    return arr.map(item => `• ${item.replace(/^\s*(?:[\u2022*-])\s*/, '').trim()}`).join('\n');
  };

  const cleanListForSave = (str) => {
    if (!str) return [];
    return str
      .split('\n')
      .map(line => line.replace(/^\s*(?:[\u2022*-])\s*/, '').trim())
      .filter(Boolean);
  };

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        company_name: job.company_name || '',
        location: job.location || '',
        experience: job.experience || '',
        salary: job.salary || '',
        about_role: job.about_role || '',
        responsibilities: formatListForTextarea(job.responsibilities),
        requirements: formatListForTextarea(job.requirements),
        benefits: formatListForTextarea(job.benefits),
        real_company_name: job.real_company_name || '',
        competitors: job.competitors ? job.competitors.join(', ') : '',
        alternative_titles: job.alternative_titles ? job.alternative_titles.join(', ') : '',
        number_of_openings: job.number_of_openings || 1,
        notes: formatListForTextarea(job.notes)
      });
    } else {
      setFormData({
        title: '',
        company_name: '',
        location: '',
        experience: '',
        salary: '',
        about_role: '',
        responsibilities: '',
        requirements: '',
        benefits: '',
        real_company_name: '',
        competitors: '',
        alternative_titles: '',
        number_of_openings: 1,
        notes: ''
      });
    }
  }, [job, isOpen]);

  if (!isOpen) return null;

  const handleListChange = (e, field) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleListFocus = (e, field) => {
    const val = e.target.value;
    if (!val.trim()) {
      setFormData(prev => ({ ...prev, [field]: '• ' }));
      const textarea = e.target;
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = 2;
      }, 0);
    }
  };

  const handleListKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Insert newline and bullet point at current cursor position
      const newValue = value.substring(0, start) + '\n• ' + value.substring(end);
      setFormData(prev => ({ ...prev, [field]: newValue }));

      // Reset selection position after React updates the DOM
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3; // length of '\n• ' is 3
      }, 0);
    }
  };

  const handleListBlur = (e, field) => {
    const val = e.target.value;
    const lines = val.split('\n');
    const formatted = lines
      .map(line => {
        const clean = line.replace(/^\s*(?:[\u2022*-])\s*/, '').trim();
        return clean ? `• ${clean}` : '';
      })
      .filter(Boolean)
      .join('\n');
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedData = {
      ...formData,
      responsibilities: cleanListForSave(formData.responsibilities),
      requirements: cleanListForSave(formData.requirements),
      benefits: cleanListForSave(formData.benefits),
      notes: cleanListForSave(formData.notes),
      competitors: formData.competitors ? formData.competitors.split(',').map(c => c.trim()).filter(Boolean) : [],
      alternative_titles: formData.alternative_titles ? formData.alternative_titles.split(',').map(t => t.trim()).filter(Boolean) : [],
      number_of_openings: parseInt(formData.number_of_openings, 10) || 1,
      status: job ? job.status : 'active'
    };
    onSave(formattedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{job ? 'Edit Job Opening' : 'Add New Job Opening'}</h2>
            <p className="text-sm text-gray-500">{job ? 'Update the details for this position.' : 'Fill in the details to post a new position on the website.'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company Type</label>
                <input 
                  type="text" 
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                  placeholder="e.g. Leading MICE Company" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">No. of Openings</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.number_of_openings}
                  onChange={(e) => setFormData({...formData, number_of_openings: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">About the role</label>
              <textarea 
                value={formData.about_role}
                onChange={(e) => setFormData({...formData, about_role: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px]" 
                placeholder="Briefly describe the role..."
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Special Notes (One per line, optional)</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => handleListChange(e, 'notes')}
                onFocus={(e) => handleListFocus(e, 'notes')}
                onKeyDown={(e) => handleListKeyDown(e, 'notes')}
                onBlur={(e) => handleListBlur(e, 'notes')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[80px]" 
                placeholder="• Night shift required...&#10;• Immediate joiner preferred..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Key Responsibilities (One per line)</label>
              <textarea 
                value={formData.responsibilities}
                onChange={(e) => handleListChange(e, 'responsibilities')}
                onFocus={(e) => handleListFocus(e, 'responsibilities')}
                onKeyDown={(e) => handleListKeyDown(e, 'responsibilities')}
                onBlur={(e) => handleListBlur(e, 'responsibilities')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px]" 
                placeholder="• Handle customer queries...&#10;• Manage bookings..."
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Requirements (One per line)</label>
              <textarea 
                value={formData.requirements}
                onChange={(e) => handleListChange(e, 'requirements')}
                onFocus={(e) => handleListFocus(e, 'requirements')}
                onKeyDown={(e) => handleListKeyDown(e, 'requirements')}
                onBlur={(e) => handleListBlur(e, 'requirements')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px]" 
                placeholder="• Bachelor's degree...&#10;• Excellent communication..."
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Benefits (One per line)</label>
              <textarea 
                value={formData.benefits}
                onChange={(e) => handleListChange(e, 'benefits')}
                onFocus={(e) => handleListFocus(e, 'benefits')}
                onKeyDown={(e) => handleListKeyDown(e, 'benefits')}
                onBlur={(e) => handleListBlur(e, 'benefits')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[100px]" 
                placeholder="• Health insurance...&#10;• Remote work options..."
                required
              ></textarea>
            </div>

            {/* For Internal Use Only (Optional) */}
            <div className="bg-green-50/50 p-4 rounded-xl border border-green-200/60 space-y-4 shadow-inner mt-8">
              <div className="flex items-center gap-2 text-green-800 font-bold text-xs uppercase tracking-wider">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                For Internal Use Only (Optional)
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                These details are strictly private/internal and are used exclusively by the AI matching workflow to target top candidates from competitors.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Real Company Name</label>
                  </div>
                  <input 
                    type="text" 
                    value={formData.real_company_name}
                    onChange={(e) => setFormData({...formData, real_company_name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none bg-white font-medium text-gray-800 text-sm transition-all" 
                    placeholder="e.g. Travel Bullz" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Competitor Companies</label>
                    <span className="text-[10px] font-medium text-gray-400 normal-case">(Comma-separated)</span>
                  </div>
                  <input 
                    type="text" 
                    value={formData.competitors}
                    onChange={(e) => setFormData({...formData, competitors: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none bg-white font-medium text-gray-800 text-sm transition-all" 
                    placeholder="e.g. MakeMyTrip, Agoda" 
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Alternative Titles</label>
                    <span className="text-[10px] font-medium text-gray-400 normal-case">(Comma-separated)</span>
                  </div>
                  <input 
                    type="text" 
                    value={formData.alternative_titles}
                    onChange={(e) => setFormData({...formData, alternative_titles: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none bg-white font-medium text-gray-800 text-sm transition-all" 
                    placeholder="e.g. Sales Executive, Travel Specialist" 
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-all w-full sm:w-auto">
            Cancel
          </button>
          <button 
            type="submit" 
            form="job-form"
            className="px-6 py-2.5 rounded-lg font-bold text-white bg-green-700 hover:bg-green-800 shadow-lg shadow-green-200 transition-all w-full sm:w-auto"
          >
            Save Job Posting
          </button>
        </div>
      </div>
    </div>
  );
}
