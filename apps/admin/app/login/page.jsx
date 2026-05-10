"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Hash the entered password using SHA-256
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Compare with the hardcoded hash for 'Shweta@6264'
      const targetHash = '9a66d95392500d074b8932463e2646c2415d7f722c1598460613276615b3c3c7';

      if (username === 'HireForTravel' && hashHex === targetHash) {
        // Set a simple cookie
        document.cookie = "hft_session=true; path=/; max-age=86400"; // 24 hours
        router.push('/');
        router.refresh();
      } else {
        setError('Invalid username or password');
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('An authentication error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 fixed inset-0 z-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-green-800">
            HireForTravel<span className="text-gray-400 font-normal">Admin</span>
          </h2>
          <p className="text-gray-500 mt-2 text-sm">Sign in to your account</p>
        </div>
        
        <form className="space-y-4" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" 
              placeholder="Username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500" 
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
