// frontend/src/pages/salesman/SalesmanOrders.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import Modal from '../../components/Modal';
import { Search, Phone, Calendar, Package, Eye, MapPin } from 'lucide-react';

export default function SalesmanOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.orders.list({ limit: 100 });
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Error fetching salesman orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Realtime live sync for orders
  useWebSocketEvent('ORDER_CREATED', () => loadOrders());
  useWebSocketEvent('ORDER_STATUS_CHANGED', () => loadOrders());
  useWebSocketEvent('ORDER_CANCELLED', () => loadOrders());

  const openOrderDetails = async (orderId) => {
    try {
      setDetailsLoading(true);
      const res = await api.orders.getById(orderId);
      setSelectedOrder(res.order);
    } catch (err) {
      alert('Failed to load order details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">My Orders</h2>
        <span className="text-xs text-slate-500 font-semibold">{filtered.length} Orders</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by order no, customer, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 shadow-xs"
        />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          No orders found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => openOrderDetails(order.id)}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-brand-300 transition cursor-pointer space-y-2.5 active:bg-slate-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500">{order.order_number}</span>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{order.customer_name}</h3>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {order.customer_phone}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDateTime(order.created_at)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {order.items?.length || 0} items
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  {formatPaise(order.total_amount_paise)}
                </span>
              </div>
            </div>
          ))}
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
                <span className="text-slate-500 text-xs block">Current Status</span>
                <div className="mt-0.5">
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs block">Order Date & Time</span>
                <span className="font-semibold text-slate-800">{formatDateTime(selectedOrder.created_at)}</span>
              </div>
            </div>

            {selectedOrder.failure_reason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                <strong>Failure Reason:</strong> {selectedOrder.failure_reason}
              </div>
            )}

            {/* Customer Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer Details</span>
              <p className="font-bold text-slate-900">{selectedOrder.customer_name}</p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${selectedOrder.customer_phone}`} className="text-brand-700 underline font-medium">
                  {selectedOrder.customer_phone}
                </a>
              </p>
              <p className="text-slate-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{selectedOrder.customer_address}</span>
              </p>
            </div>

            {/* Order Items */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Order Items
              </span>
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
                <div className="p-3 bg-slate-50 flex justify-between font-bold text-xs sm:text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-800">{formatPaise(selectedOrder.total_amount_paise)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
