// frontend/src/pages/salesman/SalesmanHome.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import { useWebSocketEvent } from '../../context/WebSocketContext';
import { PlusCircle, Truck, CheckCircle2, MapPin } from 'lucide-react';

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

  // Realtime WebSocket listeners to keep KPI counters up to date
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

  // KPI Calculations
  const filteredOrders = timeRange === 'today'
    ? orders.filter(o => isToday(o.delivered_at || o.created_at))
    : orders;

  const placedCount = timeRange === 'today'
    ? orders.filter(o => o.status === 'PLACED' && isToday(o.created_at)).length
    : orders.filter(o => o.status === 'PLACED').length;

  const deliveredOrders = filteredOrders.filter(o => o.status === 'DELIVERED');
  const deliveredCount = deliveredOrders.length;
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0);

  // All currently pending deliveries for the salesman (independent of placement date)
  const pendingDeliveries = orders.filter(o => o.status === 'PLACED');

  return (
    <div className="space-y-5 pb-8">
      {/* Welcome Greeting */}
      <div className="bg-gradient-to-r from-brand-800 to-brand-900 text-white rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-brand-200 uppercase tracking-wider">Salesman Dashboard</span>
        <h2 className="text-xl sm:text-2xl font-bold mt-1">Hello, {profile?.full_name || 'Partner'}</h2>
        <p className="text-xs sm:text-sm text-brand-100 mt-1">
          Ready for today's field orders & deliveries. Keep stock moving!
        </p>

        {/* Quick action shortcuts */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => onNavigate('catalogue')}
            className="flex items-center justify-center gap-2 bg-white text-brand-900 font-bold text-sm py-3 px-4 rounded-xl shadow-xs hover:bg-brand-50 active:scale-98 transition"
          >
            <PlusCircle className="w-5 h-5 text-brand-700" />
            <span>New Order</span>
          </button>
          <button
            onClick={() => onNavigate('deliveries')}
            className="flex items-center justify-center gap-2 bg-brand-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-xs hover:bg-brand-600 active:scale-98 transition border border-brand-600"
          >
            <Truck className="w-5 h-5" />
            <span>Deliveries</span>
          </button>
        </div>
      </div>

      {/* KPI Counters with Time Filter */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {timeRange === 'today' ? "Today's Progress" : "Orders Overview"}
          </h3>
          <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1 rounded-md transition ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Placed Orders</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{placedCount}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Delivered Orders</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{deliveredCount}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Delivered Cash</span>
            <span className="text-base sm:text-xl font-black text-slate-900 mt-1 block truncate">
              {formatPaise(deliveredRevenue, false)}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Deliveries */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pending Deliveries</h3>
          <button
            onClick={() => onNavigate('deliveries')}
            className="text-xs font-bold text-brand-700 hover:text-brand-800"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-400">
            Loading deliveries...
          </div>
        ) : pendingDeliveries.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No pending deliveries right now!
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingDeliveries
              .slice(0, 3)
              .map(order => (
                <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-900 block">{order.customer_name}</span>
                      <span className="text-xs font-mono text-slate-400">{order.order_number}</span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{order.customer_address}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {formatPaise(order.total_amount_paise)}
                    </span>
                    <button
                      onClick={() => onNavigate('deliveries')}
                      className="text-xs bg-brand-50 text-brand-800 font-bold px-3 py-1.5 rounded-lg hover:bg-brand-100"
                    >
                      Process Delivery
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
