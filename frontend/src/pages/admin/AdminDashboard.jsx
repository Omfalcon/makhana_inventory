// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useWebSocketEvent } from '../../context/WebSocketContext';
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
  Award,
  Receipt,
  Banknote,
  Store,
  Layers
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

  useWebSocketEvent('ORDER_CREATED', () => {
    setRealtimeNotice(true);
    loadDashboardData();
    setTimeout(() => setRealtimeNotice(false), 3000);
  });
  useWebSocketEvent('ORDER_STATUS_CHANGED', () => loadDashboardData());
  useWebSocketEvent('ORDER_CANCELLED', () => loadDashboardData());
  useWebSocketEvent('STOCK_UPDATED', () => loadDashboardData());
  useWebSocketEvent('PRODUCT_CREATED', () => loadDashboardData());
  useWebSocketEvent('PRODUCT_UPDATED', () => loadDashboardData());

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
    date: d.date.substring(5),
    revenue: d.deliveredRevenuePaise / 100,
    orders: d.ordersCount
  }));

  return (
    <div className="space-y-4 pb-12">
      {/* Realtime Notification Banner */}
      {realtimeNotice && (
        <div className="p-3 bg-emerald-800 text-white rounded-xl shadow-xs text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
          <span>Petpooja Live Sync: New order booking or stock adjustment recorded!</span>
        </div>
      )}

      {/* Petpooja Register Header & Preset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-700" />
              <span>Counter Register &amp; Sales Summary</span>
            </h2>
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TERMINAL LIVE</span>
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Petpooja Retail Analytics • Day register totals, cash tenders &amp; dispatch metrics
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold overflow-x-auto shadow-2xs gap-1">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: 'custom', label: 'All Time' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap uppercase transition ${
                preset === item.id ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
          className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-100/80 transition shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-amber-950 text-xs sm:text-sm block">
                {s.lowStockCount} {s.lowStockCount === 1 ? 'Product is' : 'Products are'} at or below low-stock threshold!
              </span>
              <span className="text-xs text-amber-800 font-semibold">Tap to open inventory register &amp; adjust warehouse stock.</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-800 shrink-0" />
        </div>
      )}

      {/* Petpooja 4-Metric Register Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Invoices Count */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoices Booked</span>
            <Receipt className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-3xl font-black text-slate-900 mt-2 block font-mono tabular-nums">{s.totalOrdersToday}</span>
          <div className="text-xs font-semibold text-slate-500 mt-1 flex gap-2">
            <span>{s.ordersPlacedToday} pending</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">{s.ordersDeliveredToday} delivered</span>
          </div>
        </div>

        {/* Collected Cash Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Collected Cash Tender</span>
            <Banknote className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-2xl font-black text-emerald-900 font-mono mt-2 block truncate tabular-nums">
            {formatPaise(s.deliveredRevenuePaise, false)}
          </span>
          <span className="text-xs text-emerald-700 font-semibold mt-1 block">
            {preset === 'today' ? "Today's register collection" : `Cash collected in ${preset}`}
          </span>
        </div>

        {/* Pending Deliveries */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Handover</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-3xl font-black text-amber-700 mt-2 block font-mono tabular-nums">{s.ordersAwaitingDelivery}</span>
          <span className="text-xs text-amber-700 font-semibold mt-1 block">
            Orders pending field delivery
          </span>
        </div>

        {/* Units Sold */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Units Dispensed</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-3xl font-black text-slate-900 mt-2 block font-mono tabular-nums">{formatNumber(s.totalUnitsSold)}</span>
          <span className="text-xs text-slate-500 font-semibold mt-1 block">Makhana packets dispatched</span>
        </div>
      </div>

      {/* Top Performers Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top Product */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Top Selling SKU
            </span>
            <span className="font-extrabold text-slate-900 text-sm sm:text-base truncate block mt-0.5">
              {s.bestSellingProduct?.name || 'No sales recorded yet'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {s.bestSellingProduct ? `${s.bestSellingProduct.unitsSold} units billed` : 'Awaiting counter sales'}
            </span>
          </div>
        </div>

        {/* Top Field Agent */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Top Field Cashier
            </span>
            <span className="font-extrabold text-slate-900 text-sm sm:text-base truncate block mt-0.5">
              {s.topSalesman?.name || 'No delivery recorded yet'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {s.topSalesman ? `${formatPaise(s.topSalesman.deliveredRevenuePaise, false)} collected` : 'Awaiting collections'}
            </span>
          </div>
        </div>
      </div>

      {/* Register Sales Trend Chart */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
          Counter Revenue Trend ({preset.toUpperCase()})
        </h3>
        {chartData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-500 font-semibold">
            No sales data recorded in this period.
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17382B" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#17382B" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                <YAxis tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Delivered Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#17382B" strokeWidth={2.5} fillOpacity={1} fill="url(#emeraldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
