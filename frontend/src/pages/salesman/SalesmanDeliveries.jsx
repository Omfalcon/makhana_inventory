// frontend/src/pages/salesman/SalesmanDeliveries.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import Modal from '../../components/Modal';
import { 
  CheckCircle2, Phone, MapPin, RefreshCw, ShoppingBag, 
  AlertCircle, Truck, Store, Receipt, Banknote 
} from 'lucide-react';

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

  const pendingOrders = orders.filter(o => o.status === 'PLACED');
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');

  const displayedOrders = filterTab === 'PENDING'
    ? pendingOrders
    : filterTab === 'DELIVERED'
    ? deliveredOrders
    : orders;

  return (
    <div className="space-y-4 pb-12">
      {/* Petpooja Delivery Terminal Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-700" />
              <span>Deliveries &amp; Cash Collection</span>
            </h2>
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
              {pendingOrders.length} Pending
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Petpooja Handover Terminal • Confirm delivery &amp; record cash collection at counter
          </p>
        </div>
        <button
          onClick={loadDeliveries}
          className="self-start sm:self-center p-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition shadow-2xs flex items-center gap-1.5 text-xs font-bold"
          title="Sync Deliveries"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1 text-xs sm:text-sm font-bold shadow-2xs">
        <button
          onClick={() => setFilterTab('PENDING')}
          className={`flex-1 py-2 px-3 rounded-lg text-center uppercase transition ${
            filterTab === 'PENDING' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ● To Deliver ({pendingOrders.length})
        </button>
        <button
          onClick={() => setFilterTab('DELIVERED')}
          className={`flex-1 py-2 px-3 rounded-lg text-center uppercase transition ${
            filterTab === 'DELIVERED' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ✓ Completed ({deliveredOrders.length})
        </button>
        <button
          onClick={() => setFilterTab('ALL')}
          className={`py-2 px-4 rounded-lg text-center uppercase transition ${
            filterTab === 'ALL' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({orders.length})
        </button>
      </div>

      {/* Deliveries List */}
      {loading && orders.length === 0 ? (
        <div className="p-10 text-center font-semibold text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 mx-auto mb-2" />
          <span>Loading counter deliveries...</span>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl space-y-2 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">All Deliveries Cleared</h3>
          <p className="text-xs font-medium text-slate-500">There are no pending orders left in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedOrders.map((order) => {
            const isPending = order.status === 'PLACED';
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
                {/* Petpooja Top Status Stripe */}
                <div
                  className={`h-1.5 w-full ${
                    isPending ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                />

                <div className="p-4 sm:p-5 space-y-3.5 flex-1">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-sm flex items-center justify-center shrink-0">
                        {customerInitials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-base truncate">
                          {order.customer_name}
                        </h3>
                        <span className="text-xs font-mono font-bold text-slate-500 block mt-0.5">
                          Invoice #{order.order_number} • {formatDateTime(order.created_at)}
                        </span>
                      </div>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    {/* Delivery Address */}
                    <div className="flex items-start gap-2 text-slate-700 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{order.customer_address}</span>
                    </div>

                    {/* Direct Contact Calling */}
                    {order.customer_phone && (
                      <div className="pt-0.5">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="inline-flex items-center gap-2 py-1.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs uppercase rounded-lg hover:bg-emerald-100 transition shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Call Customer: {order.customer_phone}</span>
                        </a>
                      </div>
                    )}

                    {/* Items snapshot */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                        <span className="font-bold uppercase text-slate-600 block text-[10px] tracking-wider">
                          Package Breakdown ({order.order_items.length} SKUs):
                        </span>
                        {order.order_items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="truncate">• {item.product?.name || 'Makhana'} × {item.quantity}</span>
                            <span className="font-mono font-bold tabular-nums">{formatPaise(item.line_total_paise)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Amount & Petpooja Action */}
                <div className="px-4 py-3 sm:px-5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Cash Tender Due:
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                      {formatPaise(order.total_amount_paise)}
                    </span>
                  </div>

                  {isPending && (
                    <button
                      onClick={() => setOrderToDeliver(order)}
                      className="py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-2 shadow-xs active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      <span>CONFIRM DELIVERY</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {orderToDeliver && (
        <Modal
          isOpen={true}
          onClose={() => setOrderToDeliver(null)}
          title="Confirm Handover & Cash Received"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 font-semibold text-xs rounded-xl flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Verify that all items were delivered and cash tender has been collected in full.</span>
            </div>

            <div className="space-y-2 border border-slate-200 p-4 bg-slate-50/70 rounded-xl text-xs sm:text-sm font-semibold">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Customer Shop:</span>
                <span className="text-slate-900 font-bold">{orderToDeliver.customer_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-mono text-slate-900 font-bold">#{orderToDeliver.order_number}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Cash Received:</span>
                <span className="font-mono text-emerald-800 font-black text-lg tabular-nums">
                  {formatPaise(orderToDeliver.total_amount_paise)}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDeliver(null)}
                className="py-2.5 px-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition shadow-2xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmDeliver}
                disabled={processing}
                className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50"
              >
                {processing ? 'Recording...' : 'YES, DELIVERED'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
