import React, { useState } from 'react';
import { X, Crown, Check, ShieldCheck, Sparkles, Zap, Tv } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function VipUpgradeModal({
  t,
  onClose,
  onSubscribeSuccess
}) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
      onSubscribeSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 overflow-hidden">
        
        {/* GLOW DECORATIONS */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 mx-auto mb-3 shadow-xl shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-pulse" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white">{t.vipModalTitle}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{t.vipModalSubtitle}</p>
        </div>

        {/* FEATURES LIST */}
        <div className="space-y-2.5 mb-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          {[
            { icon: ShieldCheck, text: t.vipFeature1 },
            { icon: Zap, text: t.vipFeature2 },
            { icon: Sparkles, text: t.vipFeature3 },
            { icon: Tv, text: t.vipFeature4 }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>

        {/* PRICING PLANS */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* YEARLY */}
          <div
            onClick={() => setSelectedPlan('yearly')}
            className={`p-4 rounded-2xl border cursor-pointer relative transition-all ${
              selectedPlan === 'yearly'
                ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow">
              Miglior Valore
            </span>
            <div className="text-xs font-bold text-white mb-1">Pass Annuale</div>
            <div className="text-lg font-black text-amber-400">{t.vipYearly}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fatturato annualmente</div>
          </div>

          {/* MONTHLY */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedPlan === 'monthly'
                ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="text-xs font-bold text-white mb-1">Pass Mensile</div>
            <div className="text-lg font-black text-amber-400">{t.vipMonthly}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cancella in qualsiasi momento</div>
          </div>
        </div>

        {/* SUBSCRIBE BUTTON */}
        <button
          onClick={handleSubscribe}
          disabled={isProcessing}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
        >
          {isProcessing ? (
            <span className="animate-spin text-slate-950">⏳</span>
          ) : (
            <>
              <Crown className="w-5 h-5 fill-slate-950" />
              <span>{t.subscribeNow}</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-slate-500 mt-3">
          App Store & Google Play In-App Purchase Ready • Sicurezza Garantita 256-bit
        </p>

      </div>
    </div>
  );
}
