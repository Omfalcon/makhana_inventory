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
  Plus,
  Sparkles,
  User
} from 'lucide-react';

export default function Navbar({ activeTab, onSelectTab }) {
  const { profile, logout, isAdmin, isSalesman } = useAuth();
  const { connected } = useWebSocket();
  const { totalUnits } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setMobileProfileOpen(false);
      }
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
      setMobileProfileOpen(false);
      await logout();
    }
  };

  const handleTabClick = (tabId) => {
    if (onSelectTab) onSelectTab(tabId);
    setDrawerOpen(false);
    setMobileProfileOpen(false);
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
    { id: 'salesmen', label: 'Staff', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : salesmanNavItems;

  const salesmanMobileNav = {
    left: [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'orders', label: 'Orders', icon: FileText },
    ],
    center: { id: 'catalogue', label: 'New Order', icon: Plus },
    right: [
      { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: totalUnits > 0 ? totalUnits : null },
      { id: 'deliveries', label: 'Deliveries', icon: Truck },
    ]
  };

  const adminMobileNav = {
    left: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
    ],
    center: { id: 'inventory', label: 'Inventory', icon: Plus },
    right: [
      { id: 'salesmen', label: 'Staff', icon: Users },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ]
  };

  const mobileNav = isAdmin ? adminMobileNav : salesmanMobileNav;

  return (
    <>
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print select-none">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 h-16 xs:h-[70px] lg:h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand / Logo Section */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile-only menu button */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:text-emerald-800 active:scale-95 transition shrink-0 flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-4.5 h-4.5 fill-amber-300 text-amber-300" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Makhana<span className="text-emerald-700 font-extrabold ml-1">Hub</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full shrink-0">
                  {isAdmin ? 'Admin' : 'Sales'}
                </span>
              </div>
            </div>
          </div>

          {/* Center (Desktop): Sleek Centered Navigation Links (Reference Layout) */}
          <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 flex-1 max-w-2xl mx-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`relative py-1 text-sm font-bold transition-colors duration-150 flex items-center gap-1.5 group ${
                    isActive
                      ? 'text-emerald-800 font-extrabold'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <span className="tracking-tight">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[10px] font-black bg-amber-400 text-slate-950 rounded-full shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                  {/* Subtle active indicator bar */}
                  {isActive && (
                    <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-emerald-700 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: User Profile & Actions (Echoing 👤 Sign In & Register) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Salesman Quick Cart Button */}
            {isSalesman && (
              <button
                type="button"
                onClick={() => handleTabClick('cart')}
                className={`relative px-3 py-1.5 rounded-xl border text-xs font-bold transition hidden sm:flex items-center gap-1.5 shadow-2xs ${
                  activeTab === 'cart'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
                aria-label="View Cart"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden md:inline">Cart</span>
                {totalUnits > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-700 text-white text-[10px] font-black rounded-full">
                    {totalUnits}
                  </span>
                )}
              </button>
            )}

            {/* Live POS Status Indicator */}
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-900 shadow-2xs"
              title={connected ? "Realtime sync online" : "Syncing..."}
            >
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[10px] uppercase tracking-wider">{connected ? 'POS LIVE' : 'SYNC'}</span>
            </div>

            {/* User Profile (With Accent User Icon) */}
            {profile && (
              <div className="flex items-center gap-2">
                {/* Desktop User Section */}
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 stroke-[2.4]" />
                  </div>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                      {profile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {profile?.role}
                    </span>
                  </div>
                </div>

                {/* Mobile Profile Avatar Button */}
                <button
                  type="button"
                  onClick={() => setMobileProfileOpen(prev => !prev)}
                  className={`lg:hidden w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition shadow-2xs ${
                    mobileProfileOpen
                      ? 'bg-emerald-800 text-amber-300 ring-2 ring-emerald-500/50'
                      : 'bg-slate-800 text-white hover:bg-emerald-700'
                  }`}
                  aria-label="User Profile & Settings"
                >
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </button>

                {/* Desktop Sign Out Action Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-bold text-xs uppercase transition shadow-2xs"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>{loggingOut ? 'Leaving...' : 'Sign Out'}</span>
                </button>

                {/* Mobile Profile & Settings Dropdown */}
                {mobileProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-2xs lg:hidden"
                      onClick={() => setMobileProfileOpen(false)}
                    />

                    <div className="absolute right-3 top-16 w-72 xs:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-3 z-50 lg:hidden animate-fade-in text-slate-900">
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-center justify-between mb-2">
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

                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isAdmin) {
                              handleTabClick('settings');
                            } else {
                              handleTabClick('performance');
                            }
                            setMobileProfileOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-left font-bold text-xs xs:text-sm ${
                            activeTab === 'settings'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              activeTab === 'settings'
                                ? 'bg-emerald-800 text-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              <Settings className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="block leading-tight font-extrabold truncate">Settings</span>
                              <span className={`text-[10.5px] font-medium block truncate ${
                                activeTab === 'settings' ? 'text-emerald-100' : 'text-slate-500'
                              }`}>
                                {isAdmin ? 'Business GSTIN, Prefix & Details' : 'Account & Performance'}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-70 shrink-0 ml-1" />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              handleTabClick('salesmen');
                              setMobileProfileOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-left font-bold text-xs xs:text-sm ${
                              activeTab === 'salesmen'
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                activeTab === 'salesmen'
                                  ? 'bg-emerald-800 text-amber-300'
                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                <Users className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="block leading-tight font-bold truncate">Staff &amp; Accounts</span>
                                <span className={`text-[10.5px] font-medium block truncate ${
                                  activeTab === 'salesmen' ? 'text-emerald-100' : 'text-slate-500'
                                }`}>
                                  Manage salesman logins
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 opacity-70 shrink-0 ml-1" />
                          </button>
                        )}
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setMobileProfileOpen(false);
                            handleLogout();
                          }}
                          disabled={loggingOut}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs uppercase transition shadow-2xs"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation with Sculpted Center Notch */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(23,56,43,0.06)] no-print safe-bottom">
        {/* Sculpted Curved Notch for Center Button */}
        <div className="absolute -top-[27px] left-1/2 -translate-x-1/2 w-32 xs:w-36 h-7 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 140 28" className="w-full h-full" fill="none">
            <path
              d="M0 28 C25 28 35 6 48 6 C55 6 58 20 70 20 C82 20 85 6 92 6 C105 6 115 28 140 28"
              stroke="#E5E0D5"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M0 28 C25 28 35 6 48 6 C55 6 58 20 70 20 C82 20 85 6 92 6 C105 6 115 28 140 28 L140 30 L0 30 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>

        {/* Center Raised Circular Action Button */}
        <div className="absolute -top-4 xs:-top-5 left-1/2 -translate-x-1/2 z-50">
          <button
            type="button"
            onClick={() => handleTabClick(mobileNav.center.id)}
            className={`w-12 h-12 xs:w-13 xs:h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 shadow-lg ${
              activeTab === mobileNav.center.id
                ? 'bg-emerald-900 text-amber-300 ring-4 ring-emerald-400/40 shadow-emerald-950/40'
                : 'bg-emerald-800 hover:bg-emerald-700 text-amber-300 shadow-emerald-950/25 ring-4 ring-white'
            }`}
            aria-label={mobileNav.center.label}
            title={mobileNav.center.label}
          >
            <Plus className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 stroke-[2.4] xs:stroke-[2.6] text-amber-300" />
          </button>
        </div>

        {/* 4 Bottom Tabs (2 Left, 2 Right) */}
        <nav className="h-15 xs:h-16 px-1 xs:px-2 sm:px-4 flex items-center justify-between max-w-md mx-auto">
          {/* Left Tabs */}
          <div className="flex-1 flex justify-around items-center pr-1.5 xs:pr-3 sm:pr-5">
            {mobileNav.left.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-1 xs:px-2 transition active:scale-95 ${
                    isActive ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-4.5 h-4.5 xs:w-5 xs:h-5 ${isActive ? 'stroke-[2.5] text-emerald-800' : 'stroke-[1.8]'}`} />
                    {item.badge && (
                      <span className="absolute -top-1 -right-2 px-1 xs:px-1.5 py-0.2 text-[8px] xs:text-[9px] font-black bg-amber-300 text-emerald-950 rounded-full shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 xs:mt-1 truncate max-w-[50px] xs:max-w-none text-center ${
                    isActive ? 'font-black text-emerald-900' : 'font-semibold text-slate-500'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Center Spacer for FAB */}
          <div className="w-10 xs:w-12 shrink-0" />

          {/* Right Tabs */}
          <div className="flex-1 flex justify-around items-center pl-1.5 xs:pl-3 sm:pl-5">
            {mobileNav.right.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-1 xs:px-2 transition active:scale-95 ${
                    isActive ? 'text-emerald-800' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-4.5 h-4.5 xs:w-5 xs:h-5 ${isActive ? 'stroke-[2.5] text-emerald-800' : 'stroke-[1.8]'}`} />
                    {item.badge && (
                      <span className="absolute -top-1 -right-2 px-1 xs:px-1.5 py-0.2 text-[8px] xs:text-[9px] font-black bg-amber-300 text-emerald-950 rounded-full shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 xs:mt-1 truncate max-w-[50px] xs:max-w-none text-center ${
                    isActive ? 'font-black text-emerald-900' : 'font-semibold text-slate-500'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Modern Slide-out Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden no-print">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <aside className="fixed inset-y-0 left-0 max-w-[280px] xs:max-w-[320px] w-full bg-white shadow-2xl flex flex-col z-50 border-r border-slate-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-800 text-amber-300 rounded-xl flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4.5 h-4.5 fill-amber-300 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Makhana Hub</h2>
                  <p className="text-xs text-slate-500 font-medium">Enterprise Management</p>
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
