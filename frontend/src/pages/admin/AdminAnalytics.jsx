// frontend/src/pages/admin/AdminAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime, formatNumber } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import Modal from '../../components/Modal';
import InvoicePrint from '../../components/InvoicePrint';
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
  RefreshCw,
  ShoppingBag,
  Phone,
  MapPin,
  Eye,
  Printer
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

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

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const openOrderDetails = async (orderId) => {
    try {
      const res = await api.orders.getById(orderId);
      setSelectedOrder(res.order);
    } catch (err) {
      alert('Failed to load order details');
    }
  };

  const handleGenerateInvoice = async (orderId) => {
    try {
      setActionLoading(true);
      const res = await api.invoices.generate(orderId);
      setActiveInvoice(res.invoice);
    } catch (err) {
      alert(err.message || 'Failed to generate invoice. Please ensure Business GSTIN is configured in Settings.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    if (!window.confirm('Mark this order as DELIVERED?')) return;
    try {
      setActionLoading(true);
      await api.orders.updateStatus(orderId, 'DELIVERED');
      await loadAnalytics();
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const products = [...(analytics?.products || [])].sort((a, b) => b.unitsSold - a.unitsSold || b.deliveredRevenuePaise - a.deliveredRevenuePaise);
  const salesmen = analytics?.salesmen || [];
  const orders = analytics?.orders || [];
  const dailyTrends = analytics?.dailyTrends || [];

  const selectedSalesmanObj = selectedSalesmanId
    ? (salesmenList.find(s => s.id === selectedSalesmanId) || salesmen.find(s => s.id === selectedSalesmanId) || null)
    : null;

  const selectedSalesmanName = selectedSalesmanObj
    ? (selectedSalesmanObj.full_name || selectedSalesmanObj.name || '')
    : '';

  const selectedSalesmanFirstName = selectedSalesmanName
    ? selectedSalesmanName.trim().split(' ')[0]
    : '';

  const displayOrders = selectedSalesmanId
    ? orders.filter(o => o.salesman_id === selectedSalesmanId)
    : orders;

  const totalOrdersCount = displayOrders.length;
  const deliveredOrdersCount = displayOrders.filter(o => o.status === 'DELIVERED').length;
  const placedOrdersCount = displayOrders.filter(o => o.status === 'PLACED').length;

  const totalSalesPaise = displayOrders.reduce((acc, o) => acc + (o.total_amount_paise || 0), 0);
  const deliveredRevenuePaise = displayOrders
    .filter(o => o.status === 'DELIVERED')
    .reduce((acc, o) => acc + (o.total_amount_paise || 0), 0);
  const placedRevenuePaise = displayOrders
    .filter(o => o.status === 'PLACED')
    .reduce((acc, o) => acc + (o.total_amount_paise || 0), 0);

  const totalUnitsOrdered = displayOrders.reduce((sum, o) => {
    const orderUnits = (o.items || []).reduce((iSum, itm) => iSum + (itm.quantity || 0), 0);
    return sum + orderUnits;
  }, 0);

  const totalWarehouseStock = products.reduce((sum, p) => sum + (p.stockRemaining || 0), 0);
  const totalProductsUnitsSold = products.reduce((sum, p) => sum + (p.unitsSold || 0), 0);
  const totalProductsRevenuePaise = products.reduce((sum, p) => sum + (p.deliveredRevenuePaise || 0), 0);

  const trendChartData = dailyTrends.map(d => ({
    date: d.date.substring(5),
    orders: d.ordersCount,
    revenue: Math.round(d.deliveredRevenuePaise / 100),
    totalBooked: Math.round(d.totalRevenuePaise / 100)
  }));

  const topProductsChart = [...products]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 13) + '..' : p.name,
      units: p.unitsSold,
      revenue: Math.round(p.deliveredRevenuePaise / 100)
    }));

  return (
    <div className="space-y-5 pb-12">
      {/* Title & Preset Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Sales Analytics
            </h2>
            <p className="text-xs font-semibold text-slate-500">Salesman tracking, daily orders & revenue reports</p>
          </div>
          <button
            onClick={loadAnalytics}
            className="p-2.5 bg-slate-100/80 border border-slate-200 text-slate-700 hover:bg-slate-200/80 rounded-xl transition shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-bold overflow-x-auto shadow-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: 'custom', label: 'Custom' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`px-4 py-2 rounded-xl uppercase whitespace-nowrap transition text-xs font-bold ${
                preset === item.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker Form */}
        {preset === 'custom' && (
          <form onSubmit={handleApplyCustomDate} className="bg-white p-4 border border-slate-200/90 rounded-2xl flex flex-wrap items-center gap-3 text-xs font-bold shadow-xs">
            <span className="font-bold text-slate-700 uppercase">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <span className="font-bold text-slate-700 uppercase">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase text-xs rounded-xl transition shadow-xs"
            >
              Apply Filter
            </button>
          </form>
        )}
      </div>

      {/* Filter by Salesman */}
      <div className="bg-white p-5 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <span className="text-xs uppercase font-bold text-slate-500 tracking-wider block">
            Filter by Salesman
          </span>
          <h3 className="font-bold text-slate-900 text-base mt-0.5">
            {selectedSalesmanName || 'Overall Business (All Salesmen)'}
          </h3>
        </div>

        <div className="w-full sm:w-80">
          <select
            value={selectedSalesmanId}
            onChange={(e) => setSelectedSalesmanId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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

      {/* Main Tabs */}
      <div className="flex p-1.5 bg-slate-200/60 rounded-2xl gap-1.5 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('SALESMEN')}
          className={`flex-1 py-2.5 px-3 rounded-xl uppercase text-center transition ${
            activeTab === 'SALESMEN'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Salesman Performance & Orders
        </button>
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`flex-1 py-2.5 px-3 rounded-xl uppercase text-center transition ${
            activeTab === 'PRODUCTS'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Product Sales & Stock {selectedSalesmanFirstName ? `(${selectedSalesmanFirstName})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 font-semibold bg-white border border-slate-200 rounded-2xl shadow-xs">
          Loading analytics reports...
        </div>
      ) : activeTab === 'SALESMEN' ? (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 border border-slate-200/90 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Booked</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block truncate">
                {formatPaise(totalSalesPaise, false)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Placed + Delivered</span>
            </div>

            <div className="bg-emerald-50/50 p-4 border border-emerald-200/80 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Delivered Cash</span>
              <span className="text-2xl font-black text-emerald-800 font-mono mt-1 block truncate">
                {formatPaise(deliveredRevenuePaise, false)}
              </span>
              <span className="text-xs text-emerald-700/80 font-semibold">Cash collected</span>
            </div>

            <div className="bg-white p-4 border border-slate-200/90 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Orders</span>
              <span className="text-3xl font-black text-slate-900 mt-1 block font-mono">
                {totalOrdersCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {deliveredOrdersCount} del • {placedOrdersCount} pending
              </span>
            </div>

            <div className="bg-amber-50/50 p-4 border border-amber-200/80 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">Pending Orders</span>
              <span className="text-3xl font-black text-amber-800 mt-1 block font-mono">
                {placedOrdersCount}
              </span>
              <span className="text-xs text-amber-700 font-semibold font-mono">
                {formatPaise(placedRevenuePaise, false)} pending
              </span>
            </div>

            <div className="bg-white p-4 border border-slate-200/90 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Items Sold</span>
              <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
                {formatNumber(totalUnitsOrdered)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Packets ordered</span>
            </div>
          </div>

          {/* Dual Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 border border-slate-200/90 rounded-2xl shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Orders Per Day
              </h3>
              {trendChartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-500 font-semibold">
                  No orders recorded for this period.
                </div>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                      <Tooltip formatter={(value) => [`${value} orders`, 'Orders']} />
                      <Bar dataKey="orders" fill="#17382B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white p-5 border border-slate-200/90 rounded-2xl shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Revenue Per Day (₹ INR)
              </h3>
              {trendChartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-500 font-semibold">
                  No revenue recorded for this period.
                </div>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendChartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                      <YAxis tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Delivered Revenue']} />
                      <Bar dataKey="revenue" fill="#1F5C3B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Orders Breakdown */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {selectedSalesmanObj ? `${selectedSalesmanObj.name}'s Field Orders` : 'All Field Orders'}
                </h4>
                <span className="text-xs text-slate-500 font-semibold">
                  {displayOrders.length} orders • {totalUnitsOrdered} total packets ordered
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-xs">
                <span className="text-xs font-bold uppercase text-slate-800">Total: {formatPaise(totalSalesPaise)}</span>
              </div>
            </div>

            {displayOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                No orders recorded for this selection.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayOrders.map((order) => (
                  <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                          #{order.order_number || 'N/A'}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <h5 className="font-bold text-slate-900 text-base">
                        {order.customer_name || 'Customer'}
                      </h5>
                      <div className="text-xs text-slate-500 font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Phone: {order.customer_phone || '-'}</span>
                        <span>•</span>
                        <span>{formatDateTime(order.created_at)}</span>
                        <span>•</span>
                        <span>Salesman: {order.salesman?.full_name || 'Field Salesman'}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                        {formatPaise(order.total_amount_paise || 0)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openOrderDetails(order.id)}
                          className="px-3 py-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase rounded-lg transition shadow-xs"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleGenerateInvoice(order.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold uppercase rounded-lg transition shadow-xs"
                        >
                          Bill
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Products Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 border border-slate-200/90 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Products</span>
              <span className="text-3xl font-black text-slate-900 mt-1 block font-mono">{products.length}</span>
              <span className="text-xs text-slate-500 font-semibold">Active makhana SKUs</span>
            </div>

            <div className="bg-white p-4 border border-slate-200/90 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Warehouse Stock</span>
              <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
                {formatNumber(totalWarehouseStock)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Packets in inventory</span>
            </div>

            <div className="bg-white p-4 border border-slate-200/90 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Units Sold</span>
              <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
                {formatNumber(totalProductsUnitsSold)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Packets ordered</span>
            </div>

            <div className="bg-emerald-50/50 p-4 border border-emerald-200/80 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Delivered Revenue</span>
              <span className="text-2xl font-black text-emerald-800 font-mono mt-1 block truncate">
                {formatPaise(totalProductsRevenuePaise, false)}
              </span>
              <span className="text-xs text-emerald-700/80 font-semibold">Cash realized</span>
            </div>
          </div>

          {/* Top Products Bar Chart */}
          <div className="bg-white p-5 border border-slate-200/90 rounded-2xl shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Top Products by Units Sold ({preset})
            </h3>
            {topProductsChart.length === 0 || topProductsChart.every(p => p.units === 0) ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-500 font-semibold">
                No units ordered in this period.
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                    <Tooltip />
                    <Bar dataKey="units" fill="#17382B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Product Sales Breakdown Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Product Sales & Stock Breakdown
              </span>
              <span className="text-xs text-slate-500 font-semibold">{products.length} products</span>
            </div>
            <div className="divide-y divide-slate-100">
              {products.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-base">{p.name}</h4>
                    <span className="font-mono text-xs font-semibold text-slate-500 block">SKU: {p.sku}</span>
                  </div>

                  <div className="flex items-center gap-6 text-xs font-semibold shrink-0">
                    <div>
                      <span className="text-slate-500 block uppercase">Stock Left:</span>
                      <span className={`font-mono font-bold text-sm ${p.stockRemaining <= p.lowStockThreshold ? 'text-amber-700' : 'text-slate-900'}`}>
                        {p.stockRemaining} pkts
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block uppercase">Sold:</span>
                      <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {p.unitsSold} pkts
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 block uppercase">Delivered Cash:</span>
                      <span className="font-mono font-bold text-sm text-emerald-700">
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

      {/* Order Detail Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.order_number}` : ''}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs sm:text-sm font-semibold">
            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-500 text-xs block uppercase font-bold">Status</span>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs block uppercase font-bold">Date</span>
                <span className="font-mono text-slate-900 font-semibold">{formatDateTime(selectedOrder.created_at)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Customer Details</span>
              <p className="font-bold text-slate-900 text-base">{selectedOrder.customer_name}</p>
              <p className="text-slate-700 font-mono">Phone: {selectedOrder.customer_phone}</p>
              <p className="text-slate-700">Address: {selectedOrder.customer_address}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Order Items</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{item.product_name_snapshot}</p>
                      <p className="font-mono text-xs text-slate-500">
                        {item.quantity} × {formatPaise(item.unit_price_paise)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {formatPaise(item.line_total_paise)}
                    </span>
                  </div>
                ))}
                <div className="p-3.5 bg-emerald-50/60 border-t border-emerald-100 flex justify-between font-bold text-sm text-emerald-950">
                  <span>Grand Total:</span>
                  <span className="font-mono text-base font-black text-emerald-800">{formatPaise(selectedOrder.total_amount_paise)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice Printable View */}
      {activeInvoice && (
        <InvoicePrint
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}
    </div>
  );
}
