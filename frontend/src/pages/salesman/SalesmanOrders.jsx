// frontend/src/pages/salesman/SalesmanOrders.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise, formatDateTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import Modal from '../../components/Modal';
import { Search, Phone, Calendar, Package, Eye, MapPin, Printer } from 'lucide-react';

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
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Order History
          </h2>
          <p className="text-xs font-semibold text-slate-500">Past orders and customer invoices</p>
        </div>
        <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full">
          {filtered.length} Orders
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by order number, customer or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
        />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 font-semibold bg-white border border-slate-200 rounded-2xl shadow-xs">
          Loading orders...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-700 bg-white border border-slate-200 rounded-2xl font-semibold shadow-xs">
          No orders found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => openOrderDetails(order.id)}
              className="p-4 bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer space-y-2.5"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{order.customer_name}</h3>
                  <span className="font-mono text-xs font-medium text-slate-500">
                    Order #{order.order_number}
                  </span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="text-xs font-medium text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                {order.customer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {order.customer_phone}
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDateTime(order.created_at)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                <span className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </span>
                <span className="font-mono font-bold text-base text-slate-900">
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
        title={selectedOrder ? `Order Details: #${selectedOrder.order_number}` : ''}
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs sm:text-sm font-semibold">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 text-xs block uppercase">Status:</span>
                <div className="mt-1">
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs block uppercase">Total Amount:</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {formatPaise(selectedOrder.total_amount_paise)}
                </span>
              </div>
            </div>

            {/* Customer info */}
            <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/70 space-y-1">
              <span className="text-slate-900 font-bold block text-sm">{selectedOrder.customer_name}</span>
              <span className="text-slate-600 block">Phone: {selectedOrder.customer_phone}</span>
              <span className="text-slate-600 block">Address: {selectedOrder.customer_address}</span>
            </div>

            {/* Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-100/70 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(selectedOrder.order_items || selectedOrder.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-900">{item.product?.name || 'Makhana'}</td>
                      <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{formatPaise(item.line_total_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-slate-800 text-white font-bold text-xs uppercase rounded-xl hover:bg-slate-900 transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
