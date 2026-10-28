// frontend/src/pages/salesman/SalesmanPerformance.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/formatters';
import { TrendingUp, ShoppingBag, CheckCircle2, Clock } from 'lucide-react';
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
    .filter(h => h.hour >= 8 && h.hour <= 20)
    .map(h => ({
      hour: `${h.hour % 12 || 12}${h.hour >= 12 ? 'pm' : 'am'}`,
      orders: h.count
    }));

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            My Sales Report
          </h2>
          <p className="text-xs font-semibold text-slate-500">Daily progress & delivery collection</p>
        </div>

        {/* Preset Selector */}
        <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold shadow-xs">
          <button
            onClick={() => setPreset('today')}
            className={`px-3 py-1.5 rounded-md uppercase transition ${
              preset === 'today' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPreset('7d')}
            className={`px-3 py-1.5 rounded-md uppercase transition ${
              preset === '7d' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 font-semibold bg-white border border-slate-200 rounded-2xl shadow-xs">
          Loading performance stats...
        </div>
      ) : (
        <>
          {/* Main Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                <span>Orders Taken</span>
              </div>
              <span className="text-3xl font-black text-slate-900 mt-2 block font-mono">
                {p.totalOrders}
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                {p.unitsSold} Packets sold
              </span>
            </div>

            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Delivered Cash</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 mt-2 block font-mono">
                {formatPaise(p.deliveredRevenuePaise, false)}
              </span>
              <span className="text-xs text-emerald-700 font-medium block mt-1">
                {p.deliveredOrders} orders delivered
              </span>
            </div>

            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-bold uppercase tracking-wider">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Pending Deliveries</span>
              </div>
              <span className="text-3xl font-black text-amber-800 mt-2 block font-mono">
                {p.pendingDeliveries}
              </span>
              <span className="text-xs text-amber-700 font-medium block mt-1">
                Waiting for delivery to shop
              </span>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>Total Booked Value</span>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 block font-mono">
                {formatPaise(p.totalRevenuePaise, false)}
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">
                Avg per order: {formatPaise(p.averageOrderValuePaise)}
              </span>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Hourly Order Activity
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: '600', fill: '#6B665A' }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#17382B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
