// frontend/src/pages/salesman/SalesmanHome.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import { PlusCircle, Truck, CheckCircle2, MapPin, Phone, RefreshCw } from 'lucide-react';

export default function SalesmanHome({ onNavigate }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [timeRange, setTimeRange] = useState('all'); // 'all' | 'today'

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.orders.list({ limit: 100 });
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Error loading salesman home data:', err);
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

  const isToday = (isoString) => {
    if (!isoString) return false;
    try {
      const d = new Date(isoString);
      const now = new Date();
      return (
        d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) ===
        now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
      );
    } catch (e) {
      return false;
    }
  };

  const filteredOrders = timeRange === 'today'
    ? orders.filter(o => isToday(o.delivered_at || o.created_at))
    : orders;

  const placedCount = timeRange === 'today'
    ? orders.filter(o => o.status === 'PLACED' && isToday(o.created_at)).length
    : orders.filter(o => o.status === 'PLACED').length;

  const deliveredOrders = filteredOrders.filter(o => o.status === 'DELIVERED');
  const deliveredCount = deliveredOrders.length;
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0);

  const pendingDeliveries = orders.filter(o => o.status === 'PLACED');

  return (
    <div className="space-y-4 pb-12">
      {/* Welcome & Quick Action Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
              Sales Dashboard
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              Hello, {profile?.full_name || 'Partner'}
            </h2>
          </div>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 2 Big Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => onNavigate('catalogue')}
            className="flex items-center justify-center gap-2.5 bg-emerald-700 text-white font-bold text-base py-3.5 px-4 rounded-xl shadow-xs hover:bg-emerald-800 active:scale-98 transition uppercase"
          >
            <PlusCircle className="w-5 h-5 text-amber-300" />
            <span>+ New Order</span>
          </button>
          <button
            onClick={() => onNavigate('deliveries')}
            className="flex items-center justify-center gap-2.5 bg-white text-slate-800 font-bold text-base py-3.5 px-4 border border-slate-300 rounded-xl shadow-xs hover:bg-slate-50 active:scale-98 transition uppercase"
          >
            <Truck className="w-5 h-5 text-emerald-700" />
            <span>Deliveries ({pendingDeliveries.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {timeRange === 'today' ? "Today's Summary" : "All Time Summary"}
          </h3>
          <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1 rounded-md transition ${
                timeRange === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-md transition ${
                timeRange === 'today' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-amber-50/70 p-4 border border-amber-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">Pending Delivery</span>
            <span className="text-3xl font-black text-amber-800 mt-1 block">{placedCount}</span>
          </div>

          <div className="bg-emerald-50/70 p-4 border border-emerald-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">Delivered Orders</span>
            <span className="text-3xl font-black text-emerald-800 mt-1 block">{deliveredCount}</span>
          </div>

          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Cash Collected</span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 block font-mono">
              {formatPaise(deliveredRevenue, false)}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Deliveries List */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Pending Deliveries ({pendingDeliveries.length})
            </h3>
            <span className="text-xs text-slate-500">Orders ready for dispatch & cash collection</span>
          </div>
          <button
            onClick={() => onNavigate('deliveries')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline uppercase"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm font-semibold text-slate-500 border border-slate-100 rounded-xl">
            Loading deliveries...
          </div>
        ) : pendingDeliveries.length === 0 ? (
          <div className="p-6 text-center text-slate-800 border border-emerald-100 bg-emerald-50/30 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <span className="font-bold text-sm block text-emerald-950">All Deliveries Complete!</span>
            <span className="text-xs text-slate-500">No pending orders right now.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDeliveries.slice(0, 4).map(order => (
              <div key={order.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition flex flex-col gap-2.5 shadow-xs">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-bold text-base text-slate-900 block">{order.customer_name}</span>
                    <span className="text-xs font-mono font-semibold text-slate-500">Order: #{order.order_number}</span>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{order.customer_address}</span>
                </div>

                {order.customer_phone && (
                  <div className="text-xs">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call {order.customer_phone}</span>
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 mt-1">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">Collect Cash:</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatPaise(order.total_amount_paise)}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('deliveries')}
                    className="py-1.5 px-3 bg-emerald-700 text-white font-bold text-xs uppercase rounded-lg hover:bg-emerald-800 transition shadow-xs"
                  >
                    Deliver →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
