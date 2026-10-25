// frontend/src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useCart } from '../context/CartContext';
import { RoleBadge } from './Badge';
import {
  Menu,
  X,
  Package,
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  Settings,
  Home,
  PlusCircle,
  Truck,
  TrendingUp,
  FileText,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function Navbar({ activeTab, onSelectTab }) {
  const { profile, logout, isAdmin, isSalesman } = useAuth();
  const { connected } = useWebSocket();
  const { totalUnits } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close drawer on Escape key or route change
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      setLoggingOut(true);
      setDrawerOpen(false);
      await logout();
    }
  };

  const handleTabClick = (tabId) => {
    if (onSelectTab) onSelectTab(tabId);
    setDrawerOpen(false);
  };

  const salesmanNavItems = [
    { id: 'home', label: 'Home Overview', icon: Home },
    { id: 'catalogue', label: 'Catalogue & Products', icon: PlusCircle },
    { id: 'cart', label: 'Sales Cart', icon: ShoppingCart, badge: totalUnits > 0 ? totalUnits : null },
    { id: 'orders', label: 'Orders & Receipts', icon: FileText },
    { id: 'deliveries', label: 'Dispatch & Deliveries', icon: Truck },
    { id: 'performance', label: 'Performance Analytics', icon: TrendingUp },
  ];

  const adminNavItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'All Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory & Audits', icon: Boxes },
    { id: 'salesmen', label: 'Salesmen Staff', icon: Users },
    { id: 'analytics', label: 'Sales Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Business Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : salesmanNavItems;

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs no-print select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-2">
          {/* Left: Hamburger Button & Brand */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="p-2 -ml-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
                <Package className="w-4.5 h-4.5" />
              </div>
              <div className="leading-tight">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Makhana Hub</span>
                  <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {isAdmin ? 'Admin' : 'Sales'}
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Inventory & Distribution ERP</p>
              </div>
            </div>
          </div>

          {/* Center (Desktop): Quick Horizontal Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 relative ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label.split(' ')[0]}</span>
                  {item.badge && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Quick Cart (Salesman) + Live Status + User */}
          <div className="flex items-center gap-2">
            {/* Quick Cart button for Salesman on mobile */}
            {isSalesman && (
              <button
                type="button"
                onClick={() => handleTabClick('cart')}
                className={`relative p-2 rounded-xl border transition flex items-center justify-center ${
                  activeTab === 'cart'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                aria-label="View Cart"
              >
                <ShoppingCart className="w-4.5 h-4.5" />
                {totalUnits > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                    {totalUnits}
                  </span>
                )}
              </button>
            )}

            {/* Connection Status */}
            <span
              title={connected ? 'Connected to live events' : 'Connecting to live events'}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600"
            >
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="hidden sm:inline">{connected ? 'Live' : 'Sync'}</span>
            </span>

            {/* User Avatar Circle */}
            {profile && (
              <div
                onClick={() => setDrawerOpen(true)}
                className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-slate-400 transition"
                title={`${profile.full_name} (${profile.role})`}
              >
                {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Hamburger Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden no-print">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 max-w-[310px] w-full bg-white shadow-2xl flex flex-col z-50 border-r border-slate-200 animate-in slide-in-from-left duration-250 ease-out">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 leading-tight">Makhana Hub</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Enterprise Management</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card inside Drawer */}
            {profile && (
              <div className="p-3.5 mx-3 mt-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-900 block truncate leading-tight">
                      {profile.full_name || 'Staff Member'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block truncate">
                      {profile.phone || profile.email || 'Authenticated User'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 ml-1">
                  <RoleBadge role={profile.role} />
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              <div className="px-2 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {isAdmin ? 'Administration' : 'Sales Operations'}
                </span>
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isActive ? 'text-white translate-x-0.5' : 'text-slate-300'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer / Logout */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>{loggingOut ? 'Signing out...' : 'Sign Out of Account'}</span>
              </button>

              <div className="text-center text-[10px] text-slate-400 font-mono">
                Makhana Hub ERP • Fast & Secured
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
