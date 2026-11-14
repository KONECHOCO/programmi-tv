import { useState } from 'react';
import { Gift, Check, Loader2 } from 'lucide-react';
import { useApp } from '../state/AppState';
import { useReferral, setReferralCode, canEnterCode } from '../services/referral';

/** Campo "Hai un codice invito?" del programma ambasciatori. Non mostra nulla quando non serve. */
export default function ReferralCodeForm() {
  const { t } = useApp();
  const ref = useReferral();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!ref.enabled || (!ref.code && !canEnterCode(ref))) return null;

  if (ref.code) {
    return (
      <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl bg-surface border border-line text-[14px]">
        <Check className="w-5 h-5 text-accent shrink-0" />
        <span>{t('refApplied')} <b className="font-mono tracking-wider">{ref.code}</b></span>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError('');
    const res = await setReferralCode(value);
    setBusy(false);
    if (res !== 'ok') setError(t(`ref${res[0].toUpperCase()}${res.slice(1)}`));
  }

  return (
    <form onSubmit={submit} className="mt-3 p-4 rounded-2xl bg-surface border border-line">
      <div className="flex items-center gap-2 font-semibold"><Gift className="w-5 h-5 text-accent" /> {t('refTitle')}</div>
      <div className="flex gap-2 mt-3">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(''); }}
          placeholder={t('refPlaceholder')}
          maxLength={20}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 min-w-0 bg-bg border border-line rounded-xl px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:border-accent"
        />
        <button type="submit" disabled={busy || !value.trim()} className="px-4 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-40 flex items-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('refApply')}
        </button>
      </div>
      {error && <p className="text-[13px] text-red-500 mt-2">{error}</p>}
      <p className="text-[12px] text-muted mt-2">{t('refHint')}</p>
    </form>
  );
}
