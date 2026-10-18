// frontend/src/pages/salesman/SalesmanPerformance.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/formatters';
import { TrendingUp, ShoppingBag, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesmanPerformance() {
  const [preset, setPreset] = useState('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const res = await api.analytics.getSalesman({ preset });
      setData(res);
    } catch (err) {
      console.error('Failed to load performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, [preset]);

  const p = data?.performance || {
    totalOrders: 0,
    deliveredOrders: 0,
    pendingDeliveries: 0,
    failedDeliveries: 0,
    totalRevenuePaise: 0,
    deliveredRevenuePaise: 0,
    unitsSold: 0,
    averageOrderValuePaise: 0
  };

  const chartData = (data?.hourlyActivity || [])
    .filter(h => h.hour >= 8 && h.hour <= 20) // Normal business hours 8 AM - 8 PM
    .map(h => ({
      hour: `${h.hour % 12 || 12}${h.hour >= 12 ? 'pm' : 'am'}`,
      orders: h.count
    }));

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Performance</h2>
          <p className="text-xs text-slate-500">Sales & Delivery Metrics</p>
        </div>

        {/* Preset Selector */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setPreset('today')}
            className={`px-3 py-1.5 rounded-lg transition ${
              preset === 'today' ? 'bg-white text-slate-900 shadow-xs' : ''
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPreset('7d')}
            className={`px-3 py-1.5 rounded-lg transition ${
              preset === '7d' ? 'bg-white text-slate-900 shadow-xs' : ''
            }`}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading performance stats...</div>
      ) : (
        <>
          {/* Main Numbers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                <ShoppingBag className="w-4 h-4 text-brand-600" />
                <span>Orders Taken</span>
              </div>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                {p.totalOrders}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {p.unitsSold} units packed
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Delivered Value</span>
              </div>
              <span className="text-xl font-black text-emerald-700 mt-2 block font-mono truncate">
                {formatPaise(p.deliveredRevenuePaise, false)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {p.deliveredOrders} orders delivered
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Pending Deliveries</span>
              </div>
              <span className="text-2xl font-black text-blue-600 mt-2 block">
                {p.pendingDeliveries}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Awaiting delivery</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <span>Total Booked</span>
              </div>
              <span className="text-xl font-black text-slate-900 mt-2 block font-mono truncate">
                {formatPaise(p.totalRevenuePaise, false)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Placed + Delivered</span>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-xs flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                Avg Order Value
              </span>
              <span className="text-xl font-black font-mono mt-1 block">
                {formatPaise(p.averageOrderValuePaise)}
              </span>
            </div>
            <TrendingUp className="w-8 h-8 text-brand-400 opacity-80" />
          </div>

          {/* Hourly Order Activity */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Hourly Order-Taking Activity
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
