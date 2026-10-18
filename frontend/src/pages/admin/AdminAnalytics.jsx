// frontend/src/pages/admin/AdminAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime, formatNumber } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  Award,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Phone
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

export default function AdminAnalytics() {
  const [preset, setPreset] = useState('7d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().substring(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().substring(0, 10));

  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [salesmenList, setSalesmenList] = useState([]);
  const [activeTab, setActiveTab] = useState('SALESMEN'); // SALESMEN | PRODUCTS
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  // Load salesmen list for the dropdown
  useEffect(() => {
    api.auth.getSalesmen().then(res => {
      setSalesmenList(res.salesmen || []);
    }).catch(console.error);
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = { preset };
      if (preset === 'custom') {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      if (selectedSalesmanId) {
        params.salesmanId = selectedSalesmanId;
      }
      const res = await api.analytics.getAdmin(params);
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preset !== 'custom') {
      loadAnalytics();
    }
  }, [preset, selectedSalesmanId]);

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    loadAnalytics();
  };

  const products = analytics?.products || [];
  const salesmen = analytics?.salesmen || [];
  const orders = analytics?.orders || [];
  const dailyTrends = analytics?.dailyTrends || [];

  // Selected Salesman Details or Overall
  const selectedSalesmanObj = selectedSalesmanId
    ? salesmen.find(s => s.id === selectedSalesmanId) || null
    : null;

  // Filtered orders for the selected salesman (or all if none selected)
  const displayOrders = selectedSalesmanId
    ? orders.filter(o => o.salesman_id === selectedSalesmanId)
    : orders;

  // Compute Daily Trend specifically for the selected view
  const trendChartData = dailyTrends.map(d => ({
    date: d.date.substring(5), // MM-DD
    orders: d.ordersCount,
    revenue: Math.round(d.deliveredRevenuePaise / 100),
    totalBooked: Math.round(d.totalRevenuePaise / 100)
  }));

  // Top 5 products by quantity
  const topProductsChart = [...products]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 13) + '..' : p.name,
      units: p.unitsSold,
      revenue: Math.round(p.deliveredRevenuePaise / 100)
    }));

  return (
    <div className="space-y-4 pb-24">
      {/* Page Title & Preset Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Business Analytics</h2>
            <p className="text-xs text-slate-500 font-medium">Salesman tracking, daily orders & revenue graphs</p>
          </div>
          <button
            onClick={loadAnalytics}
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Date Presets + Custom Option */}
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold text-slate-600 overflow-x-auto">
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

        {/* Custom Date Range Picker Form */}
        {preset === 'custom' && (
          <form onSubmit={handleApplyCustomDate} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
            />
            <span className="font-bold text-slate-700">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-lg transition"
            >
              Apply Range
            </button>
          </form>
        )}
      </div>

      {/* Main Tabs: Salesman Analytics vs Product Rankings */}
      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveTab('SALESMEN')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === 'SALESMEN' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Salesman Performance & Daily Trends
        </button>
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === 'PRODUCTS' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Product Rankings & Inventory
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading analytics reports...</div>
      ) : activeTab === 'SALESMEN' ? (
        <div className="space-y-4">
          {/* Salesman Dropdown Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Filter by Sales Representative
              </span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">
                {selectedSalesmanObj ? selectedSalesmanObj.name : 'Overall Business (All Salesmen)'}
              </h3>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={selectedSalesmanId}
                onChange={(e) => setSelectedSalesmanId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">All Salesmen (Overall Business)</option>
                {salesmenList.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.full_name} ({sm.phone || 'Salesman'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {selectedSalesmanObj ? selectedSalesmanObj.totalOrders : displayOrders.length}
              </span>
              <span className="text-[10px] text-slate-400">In selected period</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivered Orders</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {selectedSalesmanObj
                  ? selectedSalesmanObj.deliveredOrders
                  : displayOrders.filter(o => o.status === 'DELIVERED').length}
              </span>
              <span className="text-[10px] text-slate-400">Completed deliveries</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivered Revenue</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-1 block truncate">
                {formatPaise(
                  selectedSalesmanObj
                    ? selectedSalesmanObj.deliveredRevenuePaise
                    : displayOrders.filter(o => o.status === 'DELIVERED').reduce((acc, o) => acc + o.total_amount_paise, 0),
                  false
                )}
              </span>
              <span className="text-[10px] text-slate-400">Cash collected</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending / Failed</span>
              <div className="text-xl font-black mt-1 flex items-center gap-1.5">
                <span className="text-blue-600">
                  {selectedSalesmanObj
                    ? selectedSalesmanObj.pendingDeliveries
                    : displayOrders.filter(o => o.status === 'PLACED' || o.status === 'OUT_FOR_DELIVERY').length}
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-rose-600">
                  {selectedSalesmanObj
                    ? selectedSalesmanObj.failedDeliveries
                    : displayOrders.filter(o => o.status === 'DELIVERY_FAILED').length}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Pending / Failed</span>
            </div>
          </div>

          {/* Dual Bar Charts (Bhook Style: Orders per Day & Revenue per Day) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Daily Orders Count */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Orders Per Day
                  </h3>
                  <p className="text-[11px] text-slate-400">Daily order-taking volume</p>
                </div>
                <ShoppingBag className="w-4 h-4 text-brand-600" />
              </div>

              {trendChartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                  No orders recorded for this period.
                </div>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => [`${value} orders`, 'Orders']} />
                      <Bar dataKey="orders" fill="#047857" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Daily Revenue (₹ Rs Graph) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Revenue Per Day (₹ INR)
                  </h3>
                  <p className="text-[11px] text-slate-400">Delivered cash value collected</p>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>

              {trendChartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                  No revenue recorded for this period.
                </div>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Delivered Revenue']} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Orders Breakdown Table for the Selected Salesman */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {selectedSalesmanObj ? `${selectedSalesmanObj.name}'s Orders` : 'All Field Orders'}
                </h4>
                <span className="text-[11px] text-slate-400">
                  {displayOrders.length} orders in selected date range
                </span>
              </div>
            </div>

            {displayOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No orders found for this salesman in this period.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {displayOrders.map((order) => (
                  <div key={order.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{order.order_number}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <h5 className="font-bold text-slate-900 text-sm mt-0.5">{order.customer_name}</h5>
                      <span className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{formatDateTime(order.created_at)}</span>
                        <span>•</span>
                        <span>{order.salesman?.full_name || 'Salesman'}</span>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-900 font-mono block">
                        {formatPaise(order.total_amount_paise)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {order.items?.length || 0} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Products Tab */
        <div className="space-y-4">
          {/* Top Products Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Top Products by Units Sold ({preset})
            </h3>
            {topProductsChart.length === 0 || topProductsChart.every(p => p.units === 0) ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                No units ordered in this period.
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="units" fill="#047857" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Product Sales Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              All Products Sales & Stock Breakdown
            </div>
            <div className="divide-y divide-slate-100">
              {products.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                    <span className="font-mono text-xs text-slate-400">{p.sku}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Stock Left</span>
                      <span className={`font-mono font-bold ${p.stockRemaining <= p.lowStockThreshold ? 'text-amber-600' : 'text-slate-800'}`}>
                        {p.stockRemaining} pkts
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Units Sold</span>
                      <span className="font-mono font-bold text-slate-900">{p.unitsSold}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Delivered Revenue</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {formatPaise(p.deliveredRevenuePaise)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
