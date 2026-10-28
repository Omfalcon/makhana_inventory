// frontend/src/pages/admin/AdminOrders.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import Modal from '../../components/Modal';
import InvoicePrint from '../../components/InvoicePrint';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import {
  Search,
  Filter,
  FileText,
  Ban,
  Phone,
  Eye,
  Calendar,
  AlertCircle,
  RefreshCw,
  Printer,
  CheckCircle2,
  User,
  ShoppingBag,
  Store
} from 'lucide-react';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [restockStock, setRestockStock] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, salesmenRes] = await Promise.all([
        api.orders.list({ limit: 200 }),
        api.auth.getSalesmen()
      ]);
      setOrders(ordersRes.orders || []);
      setSalesmen(salesmenRes.salesmen || []);
    } catch (err) {
      console.error('Failed to load orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useWebSocketEvent('ORDER_CREATED', () => loadData());
  useWebSocketEvent('ORDER_STATUS_CHANGED', () => loadData());
  useWebSocketEvent('ORDER_CANCELLED', () => loadData());

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

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      setErrorMsg('Please specify a cancellation reason.');
      return;
    }

    try {
      setActionLoading(true);
      await api.orders.cancel(orderToCancel.id, cancellationReason.trim(), restockStock);
      setOrderToCancel(null);
      setCancellationReason('');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    if (!window.confirm('Mark this order as DELIVERED & Cash Collected?')) return;
    try {
      setActionLoading(true);
      await api.orders.updateStatus(orderId, 'DELIVERED');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = (search || '').toLowerCase().trim();
    const orderNo = (o.order_number || '').toLowerCase();
    const custName = (o.customer_name || '').toLowerCase();
    const custPhone = (o.customer_phone || '').toLowerCase();

    const matchesSearch = !q || orderNo.includes(q) || custName.includes(q) || custPhone.includes(q);
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const matchesSalesman = !salesmanFilter || o.salesman_id === salesmanFilter;

    return matchesSearch && matchesStatus && matchesSalesman;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Dispatch Terminal Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              Order Dispatch &amp; Deliveries
            </h2>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full">
              {filteredOrders.length} Invoices
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Counter Billing Ledger • Track field deliveries, collections &amp; GST tax invoices
          </p>
        </div>
        <button
          onClick={loadData}
          className="self-start sm:self-center p-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition shadow-2xs flex items-center gap-1.5 text-xs font-bold"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number (e.g. 1001), customer shop name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
          />
        </div>

        {/* Quick Filter Status Tabs & Salesman Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Status Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg border transition ${
                !statusFilter
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('PLACED')}
              className={`px-3 py-1.5 rounded-lg border transition ${
                statusFilter === 'PLACED'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              ● Pending ({orders.filter(o => o.status === 'PLACED').length})
            </button>
            <button
              onClick={() => setStatusFilter('DELIVERED')}
              className={`px-3 py-1.5 rounded-lg border transition ${
                statusFilter === 'DELIVERED'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              ● Delivered ({orders.filter(o => o.status === 'DELIVERED').length})
            </button>
            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-lg border transition ${
                statusFilter === 'CANCELLED'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
              }`}
            >
              Cancelled
            </button>
          </div>

          {/* Salesman dropdown */}
          <div className="min-w-[180px]">
            <select
              value={salesmanFilter}
              onChange={(e) => setSalesmanFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 uppercase focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="">All Field Salesmen</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Grid (Card Style) */}
      {loading && orders.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-semibold bg-white border border-slate-200 rounded-2xl shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 mx-auto mb-2" />
          <span>Synchronizing orders from counter...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center text-slate-600 bg-white border border-slate-200 rounded-2xl font-semibold shadow-xs">
          No orders match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PLACED';
            const isDelivered = order.status === 'DELIVERED';
            const customerInitials = (order.customer_name || 'C')
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl shadow-xs overflow-hidden transition relative flex flex-col justify-between"
              >
                {/* Top Status Stripe */}
                <div
                  className={`h-1.5 w-full ${
                    isPending
                      ? 'bg-amber-500'
                      : isDelivered
                      ? 'bg-emerald-600'
                      : 'bg-rose-500'
                  }`}
                />

                <div className="p-4 sm:p-5 space-y-3.5 flex-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initials */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-sm flex items-center justify-center shrink-0">
                        {customerInitials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug truncate">
                          {order.customer_name || 'Customer'}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{order.order_number}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 truncate">
                            {order.salesman?.full_name || 'Counter'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  {/* Order Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`tel:${order.customer_phone}`} className="font-mono text-emerald-800 hover:underline truncate">
                        {order.customer_phone || '-'}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 text-slate-500 font-mono text-[11px] justify-end">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatDateTime(order.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action & Total Cluster */}
                <div className="px-4 py-3 sm:px-5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">
                      Total Bill Amount
                    </span>
                    <span className="font-mono font-black text-slate-900 text-lg tabular-nums">
                      {formatPaise(order.total_amount_paise || 0)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openOrderDetails(order.id)}
                      className="px-2.5 py-1.5 text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold uppercase flex items-center gap-1 transition shadow-2xs"
                      title="Inspect Items"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleGenerateInvoice(order.id)}
                      disabled={actionLoading}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold uppercase transition shadow-2xs flex items-center gap-1"
                      title="Print Official GST Tax Invoice"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>GST Bill</span>
                    </button>

                    {isPending && (
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase transition shadow-2xs flex items-center gap-1"
                        title="Mark Delivered & Cash Received"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                        <span>Deliver</span>
                      </button>
                    )}

                    {!isDelivered && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          setOrderToCancel(order);
                          setErrorMsg('');
                        }}
                        className="p-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition shadow-2xs"
                        title="Void / Cancel Order"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {activeInvoice && (
        <InvoicePrint invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
      )}

      {/* Order Details Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order Ledger #${selectedOrder.order_number}` : ''}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs sm:text-sm font-semibold">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 text-xs block uppercase">Order Status</span>
                <div className="mt-1">
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs block uppercase">Timestamp</span>
                <span className="font-mono text-slate-900 font-bold">{formatDateTime(selectedOrder.created_at)}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Customer / Counter Record</span>
              <p className="font-bold text-slate-900 text-base">{selectedOrder.customer_name}</p>
              <p className="text-slate-700 font-mono">Phone: {selectedOrder.customer_phone}</p>
              <p className="text-slate-700">Delivery Address: {selectedOrder.customer_address}</p>
              <p className="text-slate-700">Place of Supply: {selectedOrder.customer_state} ({selectedOrder.customer_state_code})</p>
            </div>

            {/* Items */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Itemized Ledger</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{item.product_name_snapshot}</p>
                      <p className="font-mono text-xs text-slate-500">
                        {item.quantity} × {formatPaise(item.unit_price_paise)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                      {formatPaise(item.line_total_paise)}
                    </span>
                  </div>
                ))}
                <div className="p-3 bg-amber-50/80 flex justify-between font-bold text-sm text-amber-950 border-t border-amber-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-base font-extrabold">{formatPaise(selectedOrder.total_amount_paise)}</span>
                </div>
              </div>
            </div>

            {/* Events */}
            {selectedOrder.events && selectedOrder.events.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Transaction Audit Trail</span>
                <div className="space-y-1.5">
                  {selectedOrder.events.map((ev) => (
                    <div key={ev.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900">{ev.new_status}</span>
                        {ev.reason && <span className="text-slate-500 block text-[11px] mt-0.5">{ev.reason}</span>}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{formatDateTime(ev.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={Boolean(orderToCancel)}
        onClose={() => {
          if (!actionLoading) setOrderToCancel(null);
        }}
        title="Authorize Order Cancellation"
      >
        {orderToCancel && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">
              Are you sure you want to cancel order <strong>#{orderToCancel.order_number}</strong> for <strong>{orderToCancel.customer_name}</strong>?
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Customer cancelled before dispatch, duplicate request"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={restockStock}
                onChange={(e) => setRestockStock(e.target.checked)}
                className="text-emerald-700 rounded focus:ring-emerald-600"
              />
              <span className="font-semibold text-slate-800">
                Restore deducted quantities back to inventory atomically
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                disabled={actionLoading}
                className="py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase rounded-xl transition shadow-xs"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
