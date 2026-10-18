// frontend/src/pages/Unauthorized.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function Unauthorized() {
  const { logout, profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 text-center">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
      <p className="text-xs text-slate-500 max-w-sm mt-1">
        You are logged in as {profile?.full_name || 'user'} ({profile?.role || 'User'}), but this screen requires elevated administrator privileges.
      </p>
      <button
        onClick={logout}
        className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-800 transition"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out & Switch Account</span>
      </button>
    </div>
  );
}
