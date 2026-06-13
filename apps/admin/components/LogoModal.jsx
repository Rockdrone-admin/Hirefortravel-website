"use client";
import { useState } from 'react';
import BaseModal from './BaseModal';

export default function LogoModal({ isOpen, onClose, onSave }) {
  const [dragActive, setDragActive] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a logo file first.");
      return;
    }

    try {
      setUploading(true);
      
      // 1. Upload the file to our API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'logos');
      formData.append('path', `clients/${Date.now()}-${file.name.replace(/\s+/g, '-')}`);

      const uploadRes = await fetch(`${API_URL}/api/upload`, { credentials: 'include', 
        method: 'POST',
        body: formData,
      });
      
      const uploadResult = await uploadRes.json();
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // 2. Pass the URL to the onSave handler
      await onSave({
        company_name: companyName,
        logo_url: uploadResult.url,
        alt_text: `${companyName} logo`,
        is_visible: true
      });

      // Reset state
      setCompanyName('');
      setFile(null);
    } catch (err) {
      console.error("Logo upload error:", err);
      alert("Failed to upload logo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Upload Client Logo"
      description="Add a new travel partner logo to the website banner."
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      }
      submitLabel={uploading ? 'Uploading...' : 'Start Upload'}
      cancelLabel="Cancel"
      loading={uploading}
      size="lg"
      formId="logo-form"
    >
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
        <input 
          type="text" 
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
          placeholder="e.g. Goibibo" 
          required 
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Logo SVG / Image</label>
        <div 
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${dragActive ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-300'}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); }}
          onClick={() => document.getElementById('logo-file-input').click()}
        >
          <input id="logo-file-input" type="file" className="hidden" accept=".svg,.png,.jpg,.jpeg" onChange={handleFileChange} />
          {file ? (
            <div className="text-center">
              <p className="text-sm font-bold text-green-700">Selected: {file.name}</p>
              <p className="text-xs text-gray-400 mt-1">Click to change</p>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p className="text-sm text-gray-600 text-center">
                <span className="font-bold text-green-700">Click to upload</span> or drag and drop<br />
                SVG, PNG or JPG (max. 500KB)
              </p>
            </>
          )}
        </div>
      </div>

      {uploading && (
        <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
          <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin"></div>
          Uploading logo to storage...
        </div>
      )}
      
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
        Tip: SVGs look sharpest on all devices.
      </div>
    </BaseModal>
  );
}
