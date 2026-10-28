// frontend/src/components/Toast.jsx
import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-emerald-50/95 border border-emerald-200 text-emerald-950',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
    },
    error: {
      bg: 'bg-rose-50/95 border border-rose-200 text-rose-950',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
    },
    info: {
      bg: 'bg-white/95 border border-slate-200 text-slate-900',
      icon: <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
    }
  }[type] || {
    bg: 'bg-white/95 border border-slate-200 text-slate-900',
    icon: <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
  };

  return (
    <div className="fixed top-18 right-3 left-3 sm:left-auto sm:w-96 z-50">
      <div className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md ${config.bg}`}>
        {config.icon}
        <div className="flex-1 text-sm font-semibold">{message}</div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/50 text-slate-700 transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
