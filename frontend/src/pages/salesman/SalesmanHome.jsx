// frontend/src/pages/salesman/SalesmanHome.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatPaise, formatTime } from '../../lib/formatters';
import { OrderStatusBadge } from '../../components/Badge';
import { PlusCircle, Truck, FileText, CheckCircle2, AlertCircle, Phone, MapPin } from 'lucide-react';

export default function SalesmanHome({ onNavigate }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayOrders, setTodayOrders] = useState([]);
  const [stats, setStats] = useState({
    placed: 0,
    outForDelivery: 0,
    delivered: 0,
    failed: 0,
    deliveredRevenuePaise: 0
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.orders.list({ limit: 50 });
      const orders = res.orders || [];

      // Filter today's orders
      const today = new Date().toISOString().substring(0, 10);
      const todayList = orders.filter(o => o.created_at.startsWith(today));
      setTodayOrders(todayList);

      const placed = todayList.filter(o => o.status === 'PLACED').length;
      const outForDelivery = todayList.filter(o => o.status === 'OUT_FOR_DELIVERY').length;
      const delivered = todayList.filter(o => o.status === 'DELIVERED').length;
      const failed = todayList.filter(o => o.status === 'DELIVERY_FAILED').length;
      const deliveredRevenue = todayList
        .filter(o => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + o.total_amount_paise, 0);

      setStats({
        placed,
        outForDelivery,
        delivered,
        failed,
        deliveredRevenuePaise: deliveredRevenue
      });
    } catch (err) {
      console.error('Error loading salesman home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-5 pb-20">
      {/* Welcome Greeting */}
      <div className="bg-gradient-to-r from-brand-800 to-brand-900 text-white rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-semibold text-brand-200 uppercase tracking-wider">Salesman Dashboard</span>
        <h2 className="text-xl sm:text-2xl font-bold mt-1">Hello, {profile?.full_name || 'Partner'}</h2>
        <p className="text-xs sm:text-sm text-brand-100 mt-1">
          Ready for today's orders & deliveries. Keep stock moving!
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

      {/* Today's KPI Counters */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2.5">Today's Progress</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Placed</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{stats.placed}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Awaiting Delivery</span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">{stats.placed + stats.outForDelivery}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Delivered Today</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats.delivered}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Delivered Cash</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 mt-1 block truncate">
              {formatPaise(stats.deliveredRevenuePaise, false)}
            </span>
          </div>
        </div>
      </div>

      {/* Urgent Pending Deliveries */}
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
        ) : todayOrders.filter(o => o.status === 'PLACED' || o.status === 'OUT_FOR_DELIVERY').length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No pending deliveries for today!
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayOrders
              .filter(o => o.status === 'PLACED' || o.status === 'OUT_FOR_DELIVERY')
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
