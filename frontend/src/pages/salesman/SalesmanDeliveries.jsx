// frontend/src/pages/salesman/SalesmanDeliveries.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import Modal from '../../components/Modal';
import { Truck, CheckCircle2, XCircle, Phone, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export default function SalesmanDeliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('PENDING'); // PENDING | DELIVERED | ALL
  const [actionOrder, setActionOrder] = useState(null);
  const [actionType, setActionType] = useState(null); // 'DELIVER' | 'FAIL' | 'OUT_FOR_DELIVERY'
  const [failureReason, setFailureReason] = useState('Customer shop closed');
  const [customReason, setCustomReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const res = await api.orders.list({ limit: 100 });
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleUpdateStatus = async () => {
    if (!actionOrder || !actionType) return;
    setErrorMsg('');

    let newStatus;
    let reason = null;

    if (actionType === 'OUT_FOR_DELIVERY') {
      newStatus = 'OUT_FOR_DELIVERY';
    } else if (actionType === 'DELIVER') {
      newStatus = 'DELIVERED';
    } else if (actionType === 'FAIL') {
      newStatus = 'DELIVERY_FAILED';
      reason = failureReason === 'Other' ? customReason.trim() : failureReason;
      if (!reason) {
        setErrorMsg('Please specify a valid delivery failure reason.');
        return;
      }
    }

    try {
      setProcessing(true);
      await api.orders.updateStatus(actionOrder.id, newStatus, reason);
      // Close modal
      setActionOrder(null);
      setActionType(null);
      setCustomReason('');
      // Reload
      await loadDeliveries();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update delivery status.');
    } finally {
      setProcessing(false);
    }
  };

  // Filter list
  const pendingOrders = orders.filter(o => o.status === 'PLACED' || o.status === 'OUT_FOR_DELIVERY');
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const failedOrders = orders.filter(o => o.status === 'DELIVERY_FAILED');

  const displayedOrders = filterTab === 'PENDING'
    ? pendingOrders
    : filterTab === 'DELIVERED'
    ? completedOrders
    : orders;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Delivery Orders</h2>
          <p className="text-xs text-slate-500">Day 2 Delivery Execution</p>
        </div>
        <button
          onClick={loadDeliveries}
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold text-slate-600">
        <button
          onClick={() => setFilterTab('PENDING')}
          className={`flex-1 py-2 rounded-lg transition ${
            filterTab === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Pending ({pendingOrders.length})
        </button>
        <button
          onClick={() => setFilterTab('DELIVERED')}
          className={`flex-1 py-2 rounded-lg transition ${
            filterTab === 'DELIVERED' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          Delivered ({completedOrders.length})
        </button>
        <button
          onClick={() => setFilterTab('ALL')}
          className={`flex-1 py-2 rounded-lg transition ${
            filterTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          All ({orders.length})
        </button>
      </div>

      {/* Delivery Cards */}
      {loading && orders.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading deliveries...</div>
      ) : displayedOrders.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          No orders in this delivery category.
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order) => {
            const isPending = order.status === 'PLACED' || order.status === 'OUT_FOR_DELIVERY';

            return (
              <div
                key={order.id}
                className={`p-4 bg-white rounded-2xl border transition-all shadow-xs space-y-3 ${
                  order.status === 'OUT_FOR_DELIVERY' ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-400 block">{order.order_number}</span>
                    <h3 className="font-bold text-slate-900 text-base">{order.customer_name}</h3>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{order.customer_address}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="text-brand-700 font-bold hover:underline flex items-center gap-1"
                    >
                      {order.customer_phone} <span className="text-[10px] bg-brand-100 px-1 rounded">Call</span>
                    </a>
                  </div>
                </div>

                {order.failure_reason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                    <strong>Reported Failure:</strong> {order.failure_reason}
                  </div>
                )}

                {/* Amount and Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Collect Cash</span>
                    <span className="font-mono font-black text-slate-900 text-base">
                      {formatPaise(order.total_amount_paise)}
                    </span>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      {order.status === 'PLACED' && (
                        <button
                          onClick={() => {
                            setActionOrder(order);
                            setActionType('OUT_FOR_DELIVERY');
                          }}
                          className="px-3 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Out For Delivery</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setActionOrder(order);
                          setActionType('FAIL');
                        }}
                        className="p-2 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition"
                        title="Report Delivery Failed"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setActionOrder(order);
                          setActionType('DELIVER');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Delivered</span>
                      </button>
                    </div>
                  )}

                  {order.status === 'DELIVERY_FAILED' && (
                    <button
                      onClick={() => {
                        setActionOrder(order);
                        setActionType('OUT_FOR_DELIVERY');
                      }}
                      className="px-3 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 font-semibold text-xs rounded-xl"
                    >
                      Retry Delivery
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation & Reason Modal */}
      <Modal
        isOpen={Boolean(actionOrder && actionType)}
        onClose={() => {
          if (!processing) {
            setActionOrder(null);
            setActionType(null);
          }
        }}
        title={
          actionType === 'DELIVER'
            ? 'Confirm Successful Delivery'
            : actionType === 'FAIL'
            ? 'Report Failed Delivery'
            : 'Mark Out For Delivery'
        }
      >
        {actionOrder && (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            {actionType === 'DELIVER' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Are you sure you want to mark order <strong>{actionOrder.order_number}</strong> for{' '}
                  <strong>{actionOrder.customer_name}</strong> as delivered?
                </p>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                  Cash payment of <strong>{formatPaise(actionOrder.total_amount_paise)}</strong> received directly from customer.
                </div>
              </div>
            )}

            {actionType === 'OUT_FOR_DELIVERY' && (
              <p className="text-sm text-slate-600">
                Mark order <strong>{actionOrder.order_number}</strong> as out for delivery?
              </p>
            )}

            {actionType === 'FAIL' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Stock was already deducted at order placement and will NOT be deducted again. Please select the reason why delivery could not be completed:
                </p>

                <div className="space-y-2">
                  {[
                    'Customer shop closed',
                    'Customer unavailable / Phone not reachable',
                    'Customer refused delivery',
                    'Incorrect delivery address',
                    'Payment not ready',
                    'Other'
                  ].map((r) => (
                    <label key={r} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="failureReason"
                        checked={failureReason === r}
                        onChange={() => setFailureReason(r)}
                        className="text-brand-600"
                      />
                      <span>{r}</span>
                    </label>
                  ))}

                  {failureReason === 'Other' && (
                    <textarea
                      rows={2}
                      placeholder="Please describe why delivery failed..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs mt-2"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionOrder(null);
                  setActionType(null);
                }}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={processing}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition ${
                  actionType === 'DELIVER'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionType === 'FAIL'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {processing ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
