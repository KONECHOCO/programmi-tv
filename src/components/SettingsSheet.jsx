import { useEffect, useState } from 'react';
import { ChevronRight, Crown, ExternalLink, AlarmClock } from 'lucide-react';
import { InAppReview } from '@capacitor-community/in-app-review';
import { useApp } from '../state/AppState';
import { COUNTRIES } from '../data/countries';
import { LANGUAGES } from '../i18n/translations';
import { isNative, platform, SITE_URL, STORE_URLS } from '../services/platform';
import { adsSupported, isPrivacyOptionsRequired, showPrivacyOptions } from '../services/ads';
import { exactAlarmStatus, openExactAlarmSettings } from '../services/notifications';
import { shareText } from '../services/social';
import { Sheet } from './ui';

function Row({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 border-b border-line">
      <span className="text-[15px]">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-surface border border-line rounded-xl px-3 py-2 text-sm max-w-[55%] focus:outline-none focus:border-accent"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function LinkRow({ label, href, onClick }) {
  const cls = 'w-full flex items-center justify-between py-3 border-b border-line text-[15px] text-left';
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {label}
        <ExternalLink className="w-4 h-4 text-muted" />
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {label}
      <ChevronRight className="w-4 h-4 text-muted" />
    </button>
  );
}

export default function SettingsSheet({ onClose, onOpenPro, availableCountries }) {
  const { t, prefs, setPref, isPro, resetUserData } = useApp();
  const [exact, setExact] = useState('granted');

  useEffect(() => {
    exactAlarmStatus().then(setExact);
  }, []);

  async function rateApp() {
    try {
      if (isNative) await InAppReview.requestReview();
      else window.open(STORE_URLS.ios, '_blank');
    } catch {
      window.open(platform === 'android' ? STORE_URLS.android : STORE_URLS.ios, '_blank');
    }
  }

  const countries = COUNTRIES.filter((c) => !availableCountries || availableCountries.includes(c.code));
  const legal = `${SITE_URL}/legal`;

  return (
    <Sheet onClose={onClose} title={t('settings')} full>
      {!isPro ? (
        <button onClick={onOpenPro} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-accent to-live text-white text-left">
          <Crown className="w-7 h-7 shrink-0" />
          <div className="flex-1">
            <div className="font-bold">{t('goPro')}</div>
            <div className="text-[12px] opacity-90">{t('proSubtitle')}</div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </button>
      ) : (
        <div className="p-4 rounded-2xl bg-surface border border-gold/50 flex items-center gap-3">
          <Crown className="w-6 h-6 text-gold" />
          <span className="font-semibold">{t('proActive')}</span>
        </div>
      )}

      <div className="mt-2">
        <Row label={t('country')}>
          <Select value={prefs.country} onChange={(v) => setPref('country', v)} options={countries.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))} />
        </Row>
        <Row label={t('language')}>
          <Select value={prefs.lang} onChange={(v) => setPref('lang', v)} options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))} />
        </Row>
        <Row label={t('theme')}>
          <Select
            value={prefs.theme}
            onChange={(v) => setPref('theme', v)}
            options={[{ value: 'auto', label: t('themeAuto') }, { value: 'dark', label: t('themeDark') }, { value: 'light', label: t('themeLight') }]}
          />
        </Row>
        <Row label={t('defaultReminder')}>
          <Select value={String(prefs.offset)} onChange={(v) => setPref('offset', Number(v))} options={[0, 5, 15, 30, 60].map((o) => ({ value: String(o), label: t(`offset_${o}`) }))} />
        </Row>
      </div>

      {exact !== 'granted' && (
        <div className="mt-4 p-4 rounded-2xl bg-surface border border-line">
          <div className="flex items-center gap-2 font-semibold"><AlarmClock className="w-5 h-5 text-accent" /> {t('preciseReminders')}</div>
          <p className="text-[13px] text-muted mt-1">{t('preciseRemindersHint')}</p>
          <button
            onClick={async () => {
              await openExactAlarmSettings();
              setExact(await exactAlarmStatus());
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-accent text-accent-fg text-sm font-semibold"
          >
            {t('enable')}
          </button>
        </div>
      )}

      <div className="mt-4">
        <LinkRow label={t('rateApp')} onClick={rateApp} />
        <LinkRow label={t('shareApp')} onClick={() => shareText({ title: 'CineGuide', text: t('shareAppText'), url: SITE_URL })} />
        {adsSupported && !isPro && isPrivacyOptionsRequired() && <LinkRow label={t('privacyOptions')} onClick={showPrivacyOptions} />}
        <LinkRow label={t('privacyPolicy')} href={`${legal}/privacy.html#${prefs.lang}`} />
        <LinkRow label={t('terms')} href={`${legal}/terms.html#${prefs.lang}`} />
        <LinkRow label={t('support')} href={`${legal}/support.html`} />
        <LinkRow
          label={t('resetData')}
          onClick={() => {
            if (window.confirm(t('resetConfirm'))) resetUserData();
          }}
        />
      </div>

      <div className="mt-6 text-[12px] text-muted leading-relaxed">
        <div className="font-semibold text-fg mb-1">{t('dataSources')}</div>
        {t('dataSourcesText')}
        <div className="mt-3">CineGuide · {t('version')} {import.meta.env.VITE_APP_VERSION || '1.0.0'}</div>
      </div>
    </Sheet>
  );
}
