import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DemoCredentials from '../../components/DemoCredentials';

const AmbulanceLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      if (user.role !== 'ambulance') {
        setError('This account is not an ambulance account.');
        return;
      }
      navigate('/ambulance/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F9FF] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100 shadow-xs">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="text-center">
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest">MediCard</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-darknavy">
            Ambulance Portal
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Emergency dispatch and instant medical responder access.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
              <p className="text-xs sm:text-sm font-medium text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="ambulance1@demo.com"
                className="appearance-none block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl placeholder-slate-400 text-darknavy bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="appearance-none block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl placeholder-slate-400 text-darknavy bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 transition duration-200 disabled:opacity-50 font-semibold text-sm shadow-sm"
              >
                {loading ? 'Authenticating...' : 'Sign In to Ambulance Dispatch'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <DemoCredentials 
              email="ambulance1@demo.com" 
              password="demo123" 
              onAutofill={(e, p) => { setEmail(e); setPassword(p); }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceLogin;
