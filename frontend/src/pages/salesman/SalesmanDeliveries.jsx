// frontend/src/pages/salesman/SalesmanDeliveries.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import Modal from '../../components/Modal';
import { CheckCircle2, Phone, MapPin, RefreshCw, ShoppingBag } from 'lucide-react';

export default function SalesmanDeliveries() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('PENDING'); // PENDING | DELIVERED | ALL
  const [orderToDeliver, setOrderToDeliver] = useState(null);
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

  // Realtime live sync for deliveries
  useWebSocketEvent('ORDER_CREATED', () => loadDeliveries());
  useWebSocketEvent('ORDER_STATUS_CHANGED', () => loadDeliveries());
  useWebSocketEvent('ORDER_CANCELLED', () => loadDeliveries());

  const handleConfirmDeliver = async () => {
    if (!orderToDeliver) return;
    try {
      setProcessing(true);
      setErrorMsg('');
      await api.orders.updateStatus(orderToDeliver.id, 'DELIVERED');
      setOrderToDeliver(null);
      await loadDeliveries();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to mark order as delivered.');
    } finally {
      setProcessing(false);
    }
  };

  // Filter list: Only PLACED and DELIVERED
  const pendingOrders = orders.filter(o => o.status === 'PLACED');
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');

  const displayedOrders = filterTab === 'PENDING'
    ? pendingOrders
    : filterTab === 'DELIVERED'
    ? deliveredOrders
    : orders;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Delivery Orders</h2>
          <p className="text-xs text-slate-500">Deliveries & Cash Collection</p>
        </div>
        <button
          onClick={loadDeliveries}
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
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
          Delivered ({deliveredOrders.length})
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
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          No orders in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order) => {
            const isPlaced = order.status === 'PLACED';

            return (
              <div
                key={order.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-400 block">{order.order_number || 'N/A'}</span>
                    <h3 className="font-bold text-slate-900 text-base">{order.customer_name || 'Customer'}</h3>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{order.customer_address || 'No address provided'}</span>
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center gap-2 pt-1">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="text-brand-700 font-bold hover:underline flex items-center gap-1"
                      >
                        {order.customer_phone} <span className="text-[10px] bg-brand-100 px-1.5 py-0.5 rounded font-semibold">Call</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Amount and Deliver Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      {isPlaced ? 'Cash To Collect' : 'Cash Collected'}
                    </span>
                    <span className="font-mono font-black text-slate-900 text-base">
                      {formatPaise(order.total_amount_paise || 0)}
                    </span>
                  </div>

                  {isPlaced && (
                    <button
                      onClick={() => {
                        setOrderToDeliver(order);
                        setErrorMsg('');
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Delivered</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(orderToDeliver)}
        onClose={() => {
          if (!processing) setOrderToDeliver(null);
        }}
        title="Confirm Delivery"
      >
        {orderToDeliver && (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            <p className="text-sm text-slate-600">
              Confirm delivery for order <strong>{orderToDeliver.order_number}</strong> to{' '}
              <strong>{orderToDeliver.customer_name}</strong>?
            </p>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <span className="font-bold block">Cash Payment Collection:</span>
              <p className="text-sm font-mono font-black text-emerald-800">
                {formatPaise(orderToDeliver.total_amount_paise)}
              </p>
              <p className="text-[11px] text-emerald-700">Collect this amount from the shopkeeper / customer.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDeliver(null)}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeliver}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition"
              >
                {processing ? 'Saving...' : 'Yes, Mark Delivered ✓'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
