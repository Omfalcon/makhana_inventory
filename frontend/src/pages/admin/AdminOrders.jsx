// frontend/src/pages/admin/AdminOrders.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import Modal from '../../components/Modal';
import InvoicePrint from '../../components/InvoicePrint';
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
  CheckCircle2
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
    if (!window.confirm('Mark this order as DELIVERED?')) return;
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
    <div className="space-y-4 pb-24">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Manage Orders</h2>
          <p className="text-xs text-slate-500 font-medium">All field orders & deliveries</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order no, customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="">All Statuses (Placed & Delivered)</option>
            <option value="PLACED">Placed Orders</option>
            <option value="DELIVERED">Delivered Orders</option>
            <option value="CANCELLED">Cancelled Orders</option>
          </select>

          <select
            value={salesmanFilter}
            onChange={(e) => setSalesmanFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="">All Salesmen</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List: Compact cards for phone, table for desktop */}
      {loading && orders.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No orders match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-400 block">{order.order_number || 'N/A'}</span>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">{order.customer_name || 'Customer'}</h3>
                  <span className="text-xs text-slate-500">Salesman: {order.salesman?.full_name || 'Field Salesman'}</span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {order.customer_phone || '-'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDateTime(order.created_at)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                  <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                    {formatPaise(order.total_amount_paise || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openOrderDetails(order.id)}
                    className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleGenerateInvoice(order.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-2 bg-brand-50 text-brand-800 hover:bg-brand-100 rounded-xl text-xs font-bold transition"
                    title="Invoice"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Bill</span>
                  </button>

                  {order.status === 'PLACED' && (
                    <button
                      onClick={() => handleMarkDelivered(order.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      title="Mark Delivered"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Deliver</span>
                    </button>
                  )}

                  {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                    <button
                      onClick={() => {
                        setOrderToCancel(order);
                        setErrorMsg('');
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs"
                      title="Cancel Order"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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

            {/* Audit Logs */}
            {selectedOrder.events && selectedOrder.events.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Activity Audit Trail</span>
                <div className="space-y-1.5">
                  {selectedOrder.events.map((ev) => (
                    <div key={ev.id} className="p-2 bg-slate-50 rounded-lg text-xs flex justify-between items-center border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800">{ev.new_status}</span>
                        {ev.reason && <span className="text-slate-500 block text-[10px]">{ev.reason}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400">{formatDateTime(ev.created_at)}</span>
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
            <p className="text-xs sm:text-sm text-slate-600">
              Are you sure you want to cancel order <strong>{orderToCancel.order_number}</strong> for <strong>{orderToCancel.customer_name}</strong>?
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Customer cancelled before dispatch, duplicate request, wrong items"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={restockStock}
                onChange={(e) => setRestockStock(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="font-semibold text-slate-800">
                Restore deducted quantities back to inventory atomically
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
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
