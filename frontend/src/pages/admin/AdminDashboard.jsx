// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatPaise, formatNumber } from '../../lib/formatters';
import {
  TrendingUp,
  Package,
  Truck,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminDashboard({ onNavigate }) {
  const [preset, setPreset] = useState('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [realtimeNotice, setRealtimeNotice] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.analytics.getAdmin({ preset });
      setData(res);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [preset]);

  // Set up Supabase Realtime subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel('admin-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        setRealtimeNotice(true);
        loadDashboardData();
        setTimeout(() => setRealtimeNotice(false), 3000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [preset]);

  const s = data?.summary || {
    totalOrdersToday: 0,
    ordersPlacedToday: 0,
    ordersDeliveredToday: 0,
    ordersAwaitingDelivery: 0,
    deliveredRevenuePaise: 0,
    pendingRevenuePaise: 0,
    totalUnitsSold: 0,
    lowStockCount: 0,
    bestSellingProduct: null,
    topSalesman: null
  };

  const chartData = (data?.dailyTrends || []).map(d => ({
    date: d.date.substring(5), // MM-DD
    revenue: d.deliveredRevenuePaise / 100,
    orders: d.ordersCount
  }));

  return (
    <div className="space-y-5 pb-24">
      {/* Realtime Notification Banner */}
      {realtimeNotice && (
        <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center animate-pulse flex items-center justify-center gap-1.5 shadow-md">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Realtime Update: New order or stock activity received!</span>
        </div>
      )}

      {/* Header and Preset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Business Dashboard</h2>
          <p className="text-xs text-slate-500 font-medium">Real-time inventory, sales & deliveries</p>
        </div>

        {/* Date Filters */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold text-slate-600 overflow-x-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'custom', label: '📅 Custom' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                preset === item.id ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {s.lowStockCount > 0 && (
        <div
          onClick={() => onNavigate('inventory')}
          className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-100 transition shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-amber-900 text-xs sm:text-sm block">
                {s.lowStockCount} {s.lowStockCount === 1 ? 'Product is' : 'Products are'} at or below low-stock threshold!
              </span>
              <span className="text-[11px] text-amber-700">Tap to add inventory before stock runs out.</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-700 shrink-0" />
        </div>
      )}

      {/* Key Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Orders Today</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">{s.totalOrdersToday}</span>
          <div className="text-[11px] text-slate-500 mt-1 flex gap-2">
            <span>{s.ordersPlacedToday} placed</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">{s.ordersDeliveredToday} delivered</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Delivered Revenue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-2 block truncate">
            {formatPaise(s.deliveredRevenuePaise, false)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {preset === 'today' ? "Today's collected cash" : `Delivered in ${preset}`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Placed Orders</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-600 mt-2 block">{s.ordersAwaitingDelivery}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Awaiting field delivery
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Units Sold</span>
            <TrendingUp className="w-4 h-4 text-brand-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">{formatNumber(s.totalUnitsSold)}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Packets deducted</span>
        </div>
      </div>

      {/* Top Performers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Best Selling Product */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Best Selling Product
            </span>
            <span className="font-bold text-slate-900 text-sm truncate block mt-0.5">
              {s.bestSellingProduct?.name || 'No sales recorded yet'}
            </span>
            <span className="text-xs text-slate-500">
              {s.bestSellingProduct ? `${s.bestSellingProduct.unitsSold} units ordered` : 'Awaiting orders'}
            </span>
          </div>
        </div>

        {/* Top Performing Salesman */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Top Salesman
            </span>
            <span className="font-bold text-slate-900 text-sm truncate block mt-0.5">
              {s.topSalesman?.name || 'No delivery recorded yet'}
            </span>
            <span className="text-xs text-slate-500">
              {s.topSalesman ? `${formatPaise(s.topSalesman.deliveredRevenuePaise, false)} delivered` : 'Awaiting deliveries'}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Sales Trend Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
          Sales & Revenue Trend ({preset})
        </h3>
        {chartData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400">
            No sales data recorded in this period.
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Delivered Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
