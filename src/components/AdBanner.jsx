import React from 'react';
import { Sparkles, X, ShieldCheck } from 'lucide-react';

export default function AdBanner({ t, onOpenVip }) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div className="ad-banner-container glass-card mb-6 p-4 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 border border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-slate-900/60 shadow-lg">
      <button 
        onClick={() => setDismissed(true)} 
        className="absolute top-2 right-2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        title="Chiudi pubblicità"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              {t.sponsored}
            </span>
            <span className="text-xs text-slate-400">StreamMax Premium</span>
          </div>
          <p className="text-sm font-semibold text-slate-100 mt-0.5">
            Guarda migliaia di Film & Serie TV in 4K Senza Limiti!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenVip}
          className="px-4 py-2 text-xs font-bold text-slate-900 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 rounded-xl transition-all shadow-md hover:shadow-amber-500/25 flex items-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4" />
          {t.removeAds}
        </button>
      </div>
    </div>
  );
}
