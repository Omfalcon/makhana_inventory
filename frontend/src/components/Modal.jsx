// frontend/src/components/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto no-print">
      {/* Soft translucent backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      
      <div className="min-h-full flex items-center justify-center p-3 text-left sm:p-4">
        <div className={`relative bg-white text-left transition-all sm:my-8 w-full ${maxWidth} rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/80">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg font-bold text-xs uppercase transition shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
