// frontend/src/App.jsx
import React, { useState, Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';

// Lazy load pages for fast initial bundle and instant page open
const SalesmanHome = lazy(() => import('./pages/salesman/SalesmanHome'));
const SalesmanCatalogue = lazy(() => import('./pages/salesman/SalesmanCatalogue'));
const SalesmanCart = lazy(() => import('./pages/salesman/SalesmanCart'));
const SalesmanOrders = lazy(() => import('./pages/salesman/SalesmanOrders'));
const SalesmanDeliveries = lazy(() => import('./pages/salesman/SalesmanDeliveries'));
const SalesmanPerformance = lazy(() => import('./pages/salesman/SalesmanPerformance'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminSalesmen = lazy(() => import('./pages/admin/AdminSalesmen'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

function PageLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse py-4">
      <div className="h-24 bg-slate-200/70 rounded-2xl w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="h-20 bg-slate-200/70 rounded-2xl" />
        <div className="h-20 bg-slate-200/70 rounded-2xl" />
        <div className="h-20 bg-slate-200/70 rounded-2xl" />
        <div className="h-20 bg-slate-200/70 rounded-2xl" />
      </div>
      <div className="h-48 bg-slate-200/70 rounded-2xl w-full" />
    </div>
  );
}

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar activeTab={activeTab} onSelectTab={handleSelectTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Suspense fallback={<PageLoadingSkeleton />}>
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
        </Suspense>
      </main>
    </div>
  );
}
