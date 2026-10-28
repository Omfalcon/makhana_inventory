// frontend/src/components/Badge.jsx
import React from 'react';

export function OrderStatusBadge({ status }) {
  switch (status) {
    case 'PLACED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 rounded-full shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending
        </span>
      );
    case 'DELIVERED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Delivered
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-900 border border-rose-200 rounded-full shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 rounded-full shadow-xs">
          {status}
        </span>
      );
  }
}

export function StockStatusBadge({ stock, threshold }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 rounded-full shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Out of Stock
      </span>
    );
  }
  if (stock <= threshold) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 rounded-full shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Low ({stock})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full shadow-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
      {stock} in stock
    </span>
  );
}

export function RoleBadge({ role }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-full shadow-xs">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 rounded-full shadow-xs">
      Salesman
    </span>
  );
}

