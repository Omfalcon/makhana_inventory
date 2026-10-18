// frontend/src/components/Navbar.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './Badge';
import { LogOut, Package, User } from 'lucide-react';

export default function Navbar() {
  const { profile, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      setLoggingOut(true);
      await logout();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-sm">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Makhana Hub</h1>
            <p className="text-xs text-slate-500 font-medium">Inventory & Sales</p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3">
          {profile && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{profile.full_name}</span>
              <div className="mt-0.5">
                <RoleBadge role={profile.role} />
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Log out"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-100 flex items-center gap-1.5 text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
