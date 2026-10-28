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
  ChevronRight
} from 'lucide-react';

export default function Navbar({ activeTab, onSelectTab }) {
  const { profile, logout, isAdmin, isSalesman } = useAuth();
  const { connected } = useWebSocket();
  const { totalUnits } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    { id: 'home', label: 'Home', icon: Home },
    { id: 'catalogue', label: 'Products', icon: PlusCircle },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: totalUnits > 0 ? totalUnits : null },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'performance', label: 'My Sales', icon: TrendingUp },
  ];

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'All Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'salesmen', label: 'Salesmen Staff', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : salesmanNavItems;

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Left: Menu Button & App Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:text-emerald-800 active:scale-95 transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-amber-300 text-emerald-950 rounded-lg flex items-center justify-center shadow-xs">
                <Package className="w-5 h-5 text-emerald-950" />
              </div>
              <div className="leading-tight">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Makhana Hub</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                    {isAdmin ? 'Admin' : 'Sales'}
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Inventory & Distribution ERP</p>
              </div>
            </div>
          </div>

          {/* Center (Desktop): Soft Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`px-3 py-2 text-xs font-bold transition rounded-lg flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 text-[11px] font-black bg-amber-400 text-slate-950 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Cart Button + Live Status + Profile */}
          <div className="flex items-center gap-2">
            {isSalesman && (
              <button
                type="button"
                onClick={() => handleTabClick('cart')}
                className={`relative px-3 py-2 rounded-lg border transition flex items-center gap-1.5 font-bold text-xs shadow-xs ${
                  activeTab === 'cart'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
                aria-label="View Cart"
              >
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline font-bold">Cart</span>
                {totalUnits > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-700 text-white text-[11px] font-black rounded-full">
                    {totalUnits}
                  </span>
                )}
              </button>
            )}

            {/* Petpooja POS Counter & Connection Status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-emerald-900 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-bold text-[11px] uppercase tracking-wider">{connected ? 'POS-01 LIVE' : 'SYNCING'}</span>
              <span className="text-slate-400">•</span>
              <span className="text-[11px] text-slate-600 font-medium truncate max-w-[110px]">{profile?.full_name?.split(' ')[0] || 'Cashier'}</span>
            </div>

            {/* User Profile & Direct Sign Out on Desktop */}
            {profile && (
              <div className="flex items-center gap-2">
                <div className="hidden xl:flex flex-col text-right leading-tight">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{profile.full_name}</span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">{profile.role}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="w-9 h-9 rounded-lg bg-slate-800 text-white font-bold text-sm flex items-center justify-center hover:bg-emerald-700 transition shadow-xs"
                  title={`${profile.full_name} (${profile.role}) - Open Menu`}
                >
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold text-xs uppercase transition shadow-xs"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Quick Navigation Bar (Sticky directly below header on small/tablet screens) */}
        <div className="lg:hidden flex border-t border-slate-200 bg-white overflow-x-auto text-xs font-bold divide-x divide-slate-100 shadow-none no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex-1 min-w-[76px] py-2.5 px-2 text-center whitespace-nowrap uppercase transition ${
                  isActive
                    ? 'bg-emerald-700 text-white font-black'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                    isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-200 text-amber-950'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Modern Slide-out Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden no-print">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <aside className="fixed inset-y-0 left-0 max-w-[320px] w-full bg-white shadow-2xl flex flex-col z-50 border-r border-slate-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-amber-300 text-emerald-950 rounded-lg flex items-center justify-center shadow-xs">
                  <Package className="w-5 h-5 text-emerald-950" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Makhana Hub</h2>
                  <p className="text-xs text-slate-500 font-medium">Enterprise ERP</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Info */}
            {profile && (
              <div className="p-4 bg-emerald-50/50 border-b border-slate-200 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-sm text-slate-900 block truncate">
                    {profile.full_name || 'Staff User'}
                  </span>
                  <span className="text-xs font-mono text-slate-600 block truncate mt-0.5">
                    {profile.phone || profile.email || 'Logged in'}
                  </span>
                </div>
                <div className="shrink-0 ml-2">
                  <RoleBadge role={profile.role} />
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-2 py-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isAdmin ? 'Administration Options' : 'Operations Menu'}
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
                    className={`w-full flex items-center justify-between p-3 text-sm font-bold text-left rounded-xl transition ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                          isActive ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-950'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 opacity-70" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Logout button */}
            <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-sm uppercase transition shadow-xs"
              >
                <LogOut className="w-5 h-5 text-rose-600" />
                <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
