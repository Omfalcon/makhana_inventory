// frontend/src/components/Toast.jsx
import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />
    }
  }[type] || {
    bg: 'bg-slate-50 border-slate-200 text-slate-900',
    icon: <Info className="w-5 h-5 text-slate-600 shrink-0" />
  };

  return (
    <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 transition-all animate-bounce-short">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${config.bg}`}>
        {config.icon}
        <div className="flex-1 text-sm font-medium">{message}</div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:opacity-70 transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
