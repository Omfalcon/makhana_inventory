// frontend/src/App.jsx
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import ErrorBoundary from './components/ErrorBoundary';

// Direct imports: eliminates lazy-chunk network roundtrips & white-screen lag
import SalesmanHome from './pages/salesman/SalesmanHome';
import SalesmanCatalogue from './pages/salesman/SalesmanCatalogue';
import SalesmanCart from './pages/salesman/SalesmanCart';
import SalesmanOrders from './pages/salesman/SalesmanOrders';
import SalesmanDeliveries from './pages/salesman/SalesmanDeliveries';
import SalesmanPerformance from './pages/salesman/SalesmanPerformance';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminInventory from './pages/admin/AdminInventory';
import AdminSalesmen from './pages/admin/AdminSalesmen';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  const { user, profile, loading, isAdmin, isSalesman } = useAuth();

  // Navigation state
  const [adminTab, setAdminTab] = useState('dashboard');
  const [salesmanTab, setSalesmanTab] = useState('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Makhana Hub...
          </span>
        </div>
      </div>
    );
  }

  // Unauthenticated
  if (!user || !profile) {
    return <Login />;
  }

  // Deactivated Account
  if (!profile.is_active) {
    return <Unauthorized />;
  }

  const activeTab = isAdmin ? adminTab : salesmanTab;
  const handleSelectTab = isAdmin ? setAdminTab : setSalesmanTab;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar activeTab={activeTab} onSelectTab={handleSelectTab} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {isAdmin && (
            <>
              {adminTab === 'dashboard' && <AdminDashboard onNavigate={setAdminTab} />}
              {adminTab === 'orders' && <AdminOrders />}
              {adminTab === 'inventory' && <AdminInventory />}
              {adminTab === 'salesmen' && <AdminSalesmen />}
              {adminTab === 'analytics' && <AdminAnalytics />}
              {adminTab === 'settings' && <AdminSettings />}
            </>
          )}

          {isSalesman && (
            <>
              {salesmanTab === 'home' && <SalesmanHome onNavigate={setSalesmanTab} />}
              {salesmanTab === 'catalogue' && <SalesmanCatalogue onNavigate={setSalesmanTab} />}
              {salesmanTab === 'cart' && <SalesmanCart onNavigate={setSalesmanTab} />}
              {salesmanTab === 'orders' && <SalesmanOrders />}
              {salesmanTab === 'deliveries' && <SalesmanDeliveries />}
              {salesmanTab === 'performance' && <SalesmanPerformance />}
            </>
          )}

          {!isAdmin && !isSalesman && (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <p className="font-bold text-sm text-slate-800">Initializing your account workspace...</p>
              <p className="text-xs text-slate-400 mt-1">Please wait a moment while permissions are loaded.</p>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
