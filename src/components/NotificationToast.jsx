import React, { useEffect } from 'react';
import { Bell, CheckCircle, Sparkles, X } from 'lucide-react';

export default function NotificationToast({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 shadow-2xl shadow-indigo-500/20 text-white flex items-center justify-between gap-3 animate-slideUp">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
          {toast.type === 'vip' ? (
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          ) : toast.type === 'reminder' ? (
            <Bell className="w-5 h-5 text-pink-400 animate-bounce" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          )}
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-100">{toast.title || "Notifica CineGuide"}</h4>
          <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
