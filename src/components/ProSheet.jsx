import { useEffect, useState } from 'react';
import { Crown, Check, Loader2 } from 'lucide-react';
import { useApp } from '../state/AppState';
import { isNative, SITE_URL } from '../services/platform';
import { buyPro, restorePro, subscribePurchases } from '../services/purchases';
import { Sheet } from './ui';

export default function ProSheet({ onClose }) {
  const { t, isPro, prefs } = useApp();
  const [store, setStore] = useState({ ready: false, owned: false, price: null, busy: false, error: null });

  useEffect(() => subscribePurchases(setStore), []);
  useEffect(() => {
    if (isPro) {
      const id = setTimeout(onClose, 1500);
      return () => clearTimeout(id);
    }
  }, [isPro, onClose]);

  const features = ['proFeat1', 'proFeat2', 'proFeat3', 'proFeat4'];

  return (
    <Sheet onClose={onClose} title="">
      <div className="text-center -mt-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-gold to-live flex items-center justify-center shadow-lg">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold mt-4">{t('proTitle')}</h2>
        <p className="text-muted mt-1">{t('proSubtitle')}</p>
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </span>
            <span className="text-[15px]">{t(f)}</span>
          </li>
        ))}
      </ul>

      {isPro ? (
        <div className="mt-8 p-4 rounded-2xl bg-surface border border-gold/50 text-center font-semibold">{t('proActive')}</div>
      ) : !isNative ? (
        <p className="mt-8 text-center text-sm text-muted">{t('proAppOnly')}</p>
      ) : (
        <>
          <button
            onClick={buyPro}
            disabled={store.busy || !store.ready}
            className="mt-8 w-full py-4 rounded-2xl bg-accent text-accent-fg font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {store.busy || !store.ready ? <Loader2 className="w-5 h-5 animate-spin" /> : store.price ? t('buyFor', { price: store.price }) : t('buy')}
          </button>
          <p className="text-center text-[12px] text-muted mt-2">{t('oneTime')}</p>
          {store.error && <p className="text-center text-[13px] text-live mt-2">{t('purchaseUnavailable')}</p>}
          <button onClick={restorePro} disabled={store.busy} className="mt-4 w-full py-2 text-sm font-semibold text-accent">
            {t('restore')}
          </button>
        </>
      )}

      <div className="mt-4 flex justify-center gap-4 text-[12px] text-muted">
        <a href={`${SITE_URL}/legal/terms.html#${prefs.lang}`} target="_blank" rel="noopener noreferrer" className="underline">{t('terms')}</a>
        <a href={`${SITE_URL}/legal/privacy.html#${prefs.lang}`} target="_blank" rel="noopener noreferrer" className="underline">{t('privacyPolicy')}</a>
      </div>
    </Sheet>
  );
}
