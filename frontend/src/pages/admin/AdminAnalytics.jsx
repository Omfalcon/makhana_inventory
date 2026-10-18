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
  Printer,
  ChevronDown,
  ChevronUp
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

  // Modals for Order Details and Invoice Printing
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Selected Salesman Details or Overall
  const selectedSalesmanObj = selectedSalesmanId
    ? salesmen.find(s => s.id === selectedSalesmanId) || null
    : null;

  // Filtered orders for the selected salesman (or all if none selected)
  const displayOrders = selectedSalesmanId
    ? orders.filter(o => o.salesman_id === selectedSalesmanId)
    : orders;

  // Calculate comprehensive totals for the active view
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

  // Products Tab Totals
  const totalWarehouseStock = products.reduce((sum, p) => sum + (p.stockRemaining || 0), 0);
  const totalProductsUnitsSold = products.reduce((sum, p) => sum + (p.unitsSold || 0), 0);
  const totalProductsRevenuePaise = products.reduce((sum, p) => sum + (p.deliveredRevenuePaise || 0), 0);

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
            className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs transition"
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
              className="px-3.5 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-lg transition shadow-xs"
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
          Salesman Performance & Field Orders
        </button>
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === 'PRODUCTS' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Product Rankings & Stock
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

          {/* KPI Summary Cards (Full Totals Displayed) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Card 1: Total Sales Booked */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sales Value</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1 block truncate">
                {formatPaise(
                  selectedSalesmanObj ? selectedSalesmanObj.totalRevenuePaise : totalSalesPaise,
                  false
                )}
              </span>
              <span className="text-[10px] text-slate-400">Placed + Delivered</span>
            </div>

            {/* Card 2: Delivered Cash Collected */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivered Revenue</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-1 block truncate">
                {formatPaise(
                  selectedSalesmanObj ? selectedSalesmanObj.deliveredRevenuePaise : deliveredRevenuePaise,
                  false
                )}
              </span>
              <span className="text-[10px] text-slate-400">Cash collected</span>
            </div>

            {/* Card 3: Total Orders */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {selectedSalesmanObj ? selectedSalesmanObj.totalOrders : totalOrdersCount}
              </span>
              <span className="text-[10px] text-slate-400">
                {deliveredOrdersCount} del • {placedOrdersCount} placed
              </span>
            </div>

            {/* Card 4: Placed Orders (Pending Delivery) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Placed Orders</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {selectedSalesmanObj ? selectedSalesmanObj.pendingDeliveries : placedOrdersCount}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate block">
                {formatPaise(placedRevenuePaise, false)} pending
              </span>
            </div>

            {/* Card 5: Total Units Sold */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Items Sold</span>
              <span className="text-2xl font-black text-brand-700 font-mono mt-1 block">
                {formatNumber(selectedSalesmanObj ? selectedSalesmanObj.unitsSold : totalUnitsOrdered)}
              </span>
              <span className="text-[10px] text-slate-400">Packets ordered</span>
            </div>
          </div>

          {/* Dual Bar Charts: Orders per Day & Revenue per Day */}
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

          {/* Orders Breakdown Table with Visible Items & Totals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header with Detailed Aggregate Summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {selectedSalesmanObj ? `${selectedSalesmanObj.name}'s Field Orders` : 'All Field Orders'}
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  {displayOrders.length} orders • {totalUnitsOrdered} total packets ordered
                </span>
              </div>

              {/* Aggregated Totals Pill */}
              <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Sales</span>
                  <span className="font-mono font-black text-xs sm:text-sm text-slate-900">
                    {formatPaise(totalSalesPaise)}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Delivered Cash</span>
                  <span className="font-mono font-black text-xs sm:text-sm text-emerald-700">
                    {formatPaise(deliveredRevenuePaise)}
                  </span>
                </div>
              </div>
            </div>

            {displayOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No orders recorded for this selection in the chosen period.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayOrders.map((order) => {
                  const orderItems = order.items || [];
                  const orderTotalUnits = orderItems.reduce((acc, itm) => acc + (itm.quantity || 0), 0);

                  return (
                    <div key={order.id} className="p-4 hover:bg-slate-50/50 transition space-y-3">
                      {/* Top Row: Order Number, Customer, Date, Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                              {order.order_number || 'N/A'}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <h5 className="font-bold text-slate-900 text-sm sm:text-base mt-1">
                            {order.customer_name || 'Customer'}
                          </h5>
                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <a href={`tel:${order.customer_phone}`} className="hover:underline text-slate-700">
                                {order.customer_phone || '-'}
                              </a>
                            </span>
                            <span>•</span>
                            <span>{formatDateTime(order.created_at)}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              Salesman: {order.salesman?.full_name || 'Field Salesman'}
                            </span>
                          </div>
                          {order.customer_address && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-md">{order.customer_address}</span>
                            </div>
                          )}
                        </div>

                        {/* Order Total & Action Buttons */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block sm:text-right">
                              Order Grand Total
                            </span>
                            <span className="text-base sm:text-lg font-black text-emerald-800 font-mono block">
                              {formatPaise(order.total_amount_paise || 0)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openOrderDetails(order.id)}
                              className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
                              title="Full Order Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleGenerateInvoice(order.id)}
                              disabled={actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 text-brand-800 hover:bg-brand-100 rounded-lg text-xs font-bold transition border border-brand-200"
                              title="Generate GST Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Bill</span>
                            </button>

                            {order.status === 'PLACED' && (
                              <button
                                onClick={() => handleMarkDelivered(order.id)}
                                disabled={actionLoading}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                title="Mark Delivered"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Deliver</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Explicit Visible Items List */}
                      <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <span>Ordered Items ({orderItems.length} {orderItems.length === 1 ? 'variety' : 'varieties'} • {orderTotalUnits} total pkts)</span>
                          <span className="font-mono text-slate-500">Subtotal</span>
                        </div>

                        {orderItems.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">No item snapshots recorded for this order.</div>
                        ) : (
                          <div className="divide-y divide-slate-200/60">
                            {orderItems.map((item) => (
                              <div key={item.id} className="py-1.5 flex items-center justify-between text-xs gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-slate-900 truncate">
                                    {item.product_name_snapshot || 'Makhana Item'}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    ({item.sku_snapshot || 'SKU'})
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-800 font-bold rounded text-[11px] font-mono">
                                    {item.quantity} pkts
                                  </span>
                                  <span className="text-slate-500 font-mono text-xs hidden sm:inline">
                                    @{formatPaise(item.unit_price_paise)}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900 text-xs w-20 text-right">
                                    {formatPaise(item.line_total_paise)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Products Tab */
        <div className="space-y-4">
          {/* Products Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Catalog Products</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{products.length}</span>
              <span className="text-[10px] text-slate-400">Active makhana SKUs</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Warehouse Stock</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                {formatNumber(totalWarehouseStock)}
              </span>
              <span className="text-[10px] text-slate-400">Packets in inventory</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Units Sold ({preset})</span>
              <span className="text-2xl font-black text-brand-700 font-mono mt-1 block">
                {formatNumber(totalProductsUnitsSold)}
              </span>
              <span className="text-[10px] text-slate-400">Total packets ordered</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivered Revenue ({preset})</span>
              <span className="text-xl font-black text-emerald-700 font-mono mt-1 block truncate">
                {formatPaise(totalProductsRevenuePaise, false)}
              </span>
              <span className="text-[10px] text-slate-400">Cash realized</span>
            </div>
          </div>

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
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                All Products Sales & Stock Breakdown (Descending by Units Sold)
              </span>
              <span className="text-xs text-slate-400 font-medium">{products.length} products</span>
            </div>
            <div className="divide-y divide-slate-100">
              {products.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
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
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {p.unitsSold}
                      </span>
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

      {/* Order Detail Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.order_number}` : ''}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-xs block">Status</span>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-xs block">Date</span>
                <span className="font-semibold text-slate-800">{formatDateTime(selectedOrder.created_at)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer Details</span>
              <p className="font-bold text-slate-900">{selectedOrder.customer_name}</p>
              <p className="text-slate-600 font-mono">{selectedOrder.customer_phone}</p>
              <p className="text-slate-600">{selectedOrder.customer_address}</p>
              <p className="text-slate-600">Place of Supply: {selectedOrder.customer_state} ({selectedOrder.customer_state_code})</p>
            </div>

            {/* Items */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Order Items</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{item.product_name_snapshot}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {item.quantity} × {formatPaise(item.unit_price_paise)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {formatPaise(item.line_total_paise)}
                    </span>
                  </div>
                ))}
                <div className="p-3 bg-slate-50 flex justify-between font-bold text-xs">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-800">{formatPaise(selectedOrder.total_amount_paise)}</span>
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
