// frontend/src/pages/Unauthorized.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function Unauthorized() {
  const { logout, profile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center px-4 text-center">
      <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs font-medium text-slate-500 leading-relaxed">
          You are logged in as <span className="font-bold text-slate-700">{profile?.full_name || 'user'}</span> ({profile?.role || 'User'}), but this account is inactive or lacks access to this section.
        </p>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out & Switch Account</span>
        </button>
      </div>
    </div>
  );
}
