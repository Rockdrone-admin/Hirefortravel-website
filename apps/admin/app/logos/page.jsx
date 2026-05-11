"use client";
import { useState, useEffect } from 'react';
import LogoModal from '../../components/LogoModal';

export default function LogosManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/logos?all=true`);
      const result = await response.json();
      if (result.success) {
        setLogos(result.data);
      }
    } catch (err) {
      console.error("Error fetching logos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLogo = async (logoData) => {
    try {
      // For now, we use a simple POST. In future, we might use FormData for files.
      const response = await fetch(`${API_URL}/api/logos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logoData),
      });
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        fetchLogos();
      } else {
        alert("Error saving logo: " + result.error);
      }
    } catch (err) {
      console.error("Error saving logo:", err);
    }
  };

  const handleToggleVisibility = async (id, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/logos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_visible: !currentStatus }),
      });
      const result = await response.json();
      if (result.success) {
        fetchLogos();
      }
    } catch (err) {
      console.error("Error toggling visibility:", err);
    }
  };

  const handleDeleteLogo = async (id) => {
    if (!confirm("Are you sure you want to delete this logo?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/logos?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchLogos();
      } else {
        alert("Error deleting logo: " + result.error);
      }
    } catch (err) {
      console.error("Error deleting logo:", err);
    }
  };

  return (
    <main>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Client Logos</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-green-700 text-white px-4 py-2 rounded-md font-medium hover:bg-green-800 transition-colors shadow-lg shadow-green-100 w-full sm:w-auto"
        >
          Upload Logo
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {loading ? (
          <div className="col-span-full py-10 text-center text-gray-400 italic">Loading logos...</div>
        ) : logos.length === 0 ? (
          <div className="col-span-full py-10 text-center text-gray-400 italic">No logos uploaded yet.</div>
        ) : (
          logos.map((logo) => (
            <div key={logo.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="h-20 flex items-center justify-center mb-4 w-full bg-gray-50 rounded border border-gray-100 overflow-hidden">
                <img src={logo.logo_url} alt={logo.alt_text} className="max-h-12 max-w-[80%] object-contain" />
              </div>
              <p className="font-medium text-sm mb-1 truncate w-full text-center">{logo.company_name}</p>
              <div className="flex items-center justify-between w-full mt-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={logo.is_visible} 
                    onChange={() => handleToggleVisibility(logo.id, logo.is_visible)} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">{logo.is_visible ? 'Visible' : 'Hidden'}</span>
                </label>
                <button 
                  onClick={() => handleDeleteLogo(logo.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <LogoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveLogo}
      />
    </main>
  );
}
