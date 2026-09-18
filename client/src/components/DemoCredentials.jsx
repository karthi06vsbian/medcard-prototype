import React from 'react';
import { Key } from 'lucide-react';

const DemoCredentials = ({ email, password, onAutofill }) => {
  return (
    <div className="mt-6 bg-[#F5F9FF] border border-blue-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2.5 text-primary-700 font-semibold text-xs uppercase tracking-wider">
        <Key size={14} />
        <span>Demo Credentials</span>
      </div>
      <div className="space-y-1 mb-3.5 text-xs text-slate-600 font-mono">
        <div className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
          <span className="font-sans font-medium text-slate-500">Email:</span>
          <span className="font-semibold text-darknavy">{email}</span>
        </div>
        <div className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
          <span className="font-sans font-medium text-slate-500">Password:</span>
          <span className="font-semibold text-darknavy">{password}</span>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => onAutofill(email, password)}
        className="w-full py-2 bg-white border border-primary-200 rounded-lg text-primary-700 text-xs font-semibold hover:bg-primary-50 transition-colors shadow-2xs cursor-pointer"
      >
        Autofill Demo Login
      </button>
    </div>
  );
};

export default DemoCredentials;
