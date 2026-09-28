import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Moon, CalendarDays, Search, Heart, Settings, Crown, RefreshCw, WifiOff } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useApp } from './state/AppState';
import { useEpg, useNow } from './state/useEpg';
import { todayIn, titleKey } from './services/epg';
import { isNative } from './services/platform';
import { initAds, showBanner, removeBanner, maybeShowInterstitial } from './services/ads';
import { initPurchases, subscribePurchases } from './services/purchases';
import { syncScheduled, setupNotificationChannel, onNotificationTap } from './services/notifications';
import { dayLabel, timeOf, addDays } from './lib/format';
import { Chip, Toast, EmptyState } from './components/ui';
import NowView from './components/NowView';
import TonightView from './components/TonightView';
import GuideView, { ChannelPicker } from './components/GuideView';
import SearchView from './components/SearchView';
import MineView from './components/MineView';
import ProgramSheet from './components/ProgramSheet';
import SettingsSheet from './components/SettingsSheet';
import ProSheet from './components/ProSheet';

const TABS = [
  { id: 'now', icon: Radio, label: 'tabNow' },
  { id: 'tonight', icon: Moon, label: 'tabTonight' },
  { id: 'guide', icon: CalendarDays, label: 'tabGuide' },
  { id: 'search', icon: Search, label: 'tabSearch' },
  { id: 'mine', icon: Heart, label: 'tabMine' },
];
const TABBAR_HEIGHT = 64;

export default function App() {
  const app = useApp();
  const { t, prefs, setPref, country, locale, isPro, setIsPro, favorites, reminders, follows } = app;
  const epg = useEpg(country);
  const now = useNow();
  const [tab, setTab] = useState('now');
  const [selectedDate, setSelectedDate] = useState(null);
  const [guideChannel, setGuideChannel] = useState(null);
  const [openProgram, setOpenProgram] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPro, setShowPro] = useState(false);
  const [toastState, setToastState] = useState(null);
  const [bannerHeight, setBannerHeight] = useState(0);

  const toast = useCallback((text, long = false) => setToastState({ text, long, at: Date.now() }), []);
  const uiRef = useRef({});
  uiRef.current = { tab, openProgram, showSettings, showPro };
  const liveToday = todayIn(country.tz);
  const date = selectedDate && epg.availableDays.includes(selectedDate) ? selectedDate : epg.today;

  // ─── Giorni necessari ────────────────────────────────────────────────────
  useEffect(() => {
    epg.ensureDay(liveToday);
  }, [liveToday, epg.ensureDay]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab !== 'now' && tab !== 'search') epg.ensureDay(date);
  }, [tab, date, epg.ensureDay]); // eslint-disable-line react-hooks/exhaustive-deps
  // Con serie seguite servono i prossimi giorni per programmare gli avvisi automatici.
  const hasFollows = Object.keys(follows).length > 0;
  useEffect(() => {
    if (epg.status !== 'ready' || !hasFollows) return;
    epg.availableDays.filter((d) => d >= liveToday).slice(0, 4).forEach((d) => epg.ensureDay(d));
  }, [epg.status, hasFollows, liveToday, epg.availableDays, epg.ensureDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Canali filtrati ─────────────────────────────────────────────────────
  const channelsById = useMemo(() => Object.fromEntries(epg.channels.map((c) => [c.id, c])), [epg.channels]);
  const filteredChannels = useMemo(() => {
    const fav = (c) => favorites[`${country.code}:${c.id}`];
    switch (prefs.pkg) {
      case 'fav': return epg.channels.filter(fav);
      case 'free': return epg.channels.filter((c) => c.pkg === 'free');
      case 'pay': return epg.channels.filter((c) => c.pkg === 'pay');
      default: {
        // Preferiti in cima, poi l'ordine della guida.
        const favs = epg.channels.filter(fav);
        return favs.length ? [...favs, ...epg.channels.filter((c) => !fav(c))] : epg.channels;
      }
    }
  }, [epg.channels, prefs.pkg, favorites, country.code]);

  const findProgram = useCallback((id) => {
    const [, ch, s] = id.split('|');
    for (const day of Object.values(epg.days)) {
      const p = day[ch]?.find((x) => String(x.s) === s);
      if (p) return p;
    }
    return reminders[id] ? { ...reminders[id], cc: country.code } : null;
  }, [epg.days, reminders, country.code]);
  const findRef = useRef(findProgram);
  findRef.current = findProgram;

  const openDetails = useCallback((p) => {
    setOpenProgram(p);
    if (!isPro) maybeShowInterstitial();
  }, [isPro]);

  // ─── Avvio nativo: status bar, splash, notifiche, back button ────────────
  useEffect(() => {
    if (!isNative) return;
    SplashScreen.hide().catch(() => {});
    setupNotificationChannel();
    const offTap = onNotificationTap((id) => {
      const p = findRef.current(id);
      if (p) setOpenProgram(p);
    });
    const back = CapApp.addListener('backButton', () => {
      const ui = uiRef.current;
      if (ui.showPro) setShowPro(false);
      else if (ui.openProgram) setOpenProgram(null);
      else if (ui.showSettings) setShowSettings(false);
      else if (ui.tab !== 'now') setTab('now');
      else CapApp.minimizeApp();
    });
    return () => {
      offTap();
      back.then((b) => b.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isNative) return;
    const light = document.documentElement.classList.contains('light');
    StatusBar.setStyle({ style: light ? Style.Light : Style.Dark }).catch(() => {});
  }, [prefs.theme]);

  // ─── Acquisti e pubblicità ───────────────────────────────────────────────
  useEffect(() => {
    initPurchases();
    return subscribePurchases((s) => {
      if (s.owned) setIsPro(true);
    });
  }, [setIsPro]);

  useEffect(() => {
    if (!isNative) return;
    if (isPro) {
      removeBanner();
      setBannerHeight(0);
      return;
    }
    initAds(setBannerHeight).then(showBanner);
  }, [isPro]);

  // ─── Notifiche: promemoria + avvisi automatici per le serie seguite ─────
  useEffect(() => {
    const items = [];
    const channelName = (ch) => channelsById[ch]?.name || '';
    const push = (p, offset, chName) => {
      const time = timeOf(p.s, locale, country.tz);
      items.push({
        programId: p.id,
        at: p.s - offset * 60,
        title: offset ? t('notifTitle', { title: p.t }) : t('notifTitleNow', { title: p.t }),
        body: t('notifBody', { time, ch: chName }),
      });
    };
    for (const r of Object.values(reminders)) push(r, r.offset, r.chName);
    if (hasFollows) {
      for (const day of Object.values(epg.days)) {
        for (const list of Object.values(day)) {
          for (const p of list) {
            if (p.s > now && follows[titleKey(p.t)] && !reminders[p.id]) push(p, prefs.offset, channelName(p.ch));
          }
        }
      }
    }
    syncScheduled(items);
    // `now` escluso di proposito: basta risincronizzare quando cambiano i dati.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders, follows, epg.days, prefs.offset, t, locale, country.tz, channelsById, hasFollows]);

  // ─── Link condivisi (versione web): ?c=IT&ch=rai1&s=1759… ───────────────
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get('c');
    if (c && c !== prefs.country) setPref('country', c);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const [c, ch, s] = [q.get('c'), q.get('ch'), Number(q.get('s'))];
    if (!c || c !== country.code || epg.status !== 'ready' || !s) return;
    const target = new Intl.DateTimeFormat('en-CA', { timeZone: country.tz }).format(new Date(s * 1000));
    epg.ensureDay(target).then((day) => {
      const p = day?.[ch]?.find((x) => x.s === s);
      if (p) setOpenProgram(p);
      window.history.replaceState(null, '', window.location.pathname);
    });
  }, [epg.status, country.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const bottomUi = TABBAR_HEIGHT + bannerHeight;
  const dayData = epg.days[date];
  const liveData = epg.days[liveToday] || epg.days[epg.today];
  const upcomingDays = epg.availableDays.filter((d) => d >= addDays(liveToday, -1));

  let content;
  if (epg.status === 'loading' && !epg.channels.length) {
    content = (
      <div className="py-24 text-center text-muted">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-60" />
        {t('loading')}
      </div>
    );
  } else if (epg.status === 'error' && !epg.channels.length) {
    content = (
      <EmptyState
        icon={WifiOff}
        text={t('loadError')}
        action={<button onClick={epg.reload} className="px-5 py-2.5 rounded-xl bg-accent text-accent-fg font-semibold">{t('retry')}</button>}
      />
    );
  } else if (tab === 'now') {
    content = <NowView channels={filteredChannels} programmes={liveData} now={now} onOpen={openDetails} />;
  } else if (tab === 'tonight') {
    content = <TonightView channels={filteredChannels} programmes={dayData} date={date} onOpen={openDetails} />;
  } else if (tab === 'guide') {
    content = (
      <GuideView
        channels={filteredChannels}
        programmes={dayData}
        now={now}
        onOpen={openDetails}
        selected={guideChannel}
        onSelect={setGuideChannel}
      />
    );
  } else if (tab === 'search') {
    content = (
      <SearchView channels={epg.channels} days={epg.days} availableDays={upcomingDays} ensureDay={epg.ensureDay} now={now} onOpen={openDetails} />
    );
  } else {
    content = (
      <MineView channels={epg.channels} days={epg.days} now={now} onOpen={openDetails} onOpenPro={() => setShowPro(true)} findProgram={findProgram} />
    );
  }

  const showChannelFilter = tab === 'now' || tab === 'tonight';
  const showDays = (tab === 'tonight' || tab === 'guide') && upcomingDays.length > 1;

  return (
    <div className="min-h-screen" style={{ '--bottom-ui': `calc(${bottomUi}px + var(--safe-bottom))` }}>
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl border-b border-line pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="px-2 py-1 rounded-lg bg-surface-2 border border-line text-[12px] font-extrabold tracking-wide" aria-label={t('country')}>{country.code}</button>
          <h1 className="flex-1 text-[19px] font-extrabold tracking-tight truncate">
            {tab === 'tonight' ? t('tonightTitle') : t(TABS.find((x) => x.id === tab).label)}
          </h1>
          {!isPro && (
            <button onClick={() => setShowPro(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold/15 text-gold text-[13px] font-bold">
              <Crown className="w-4 h-4" /> Pro
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 -mr-2 rounded-full active:bg-surface-2" aria-label={t('settings')}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
        {(showChannelFilter || showDays || tab === 'guide') && (
          <div className="max-w-3xl mx-auto px-4 pb-2.5 space-y-2">
            {showDays && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {upcomingDays.map((d) => (
                  <Chip key={d} active={d === date} onClick={() => setSelectedDate(d)}>{dayLabel(d, t, locale, country.tz)}</Chip>
                ))}
              </div>
            )}
            {showChannelFilter && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[['all', 'filterAll'], ['fav', 'filterFavorites'], ['free', 'filterFree'], ['pay', 'filterPay']].map(([k, label]) => (
                  <Chip key={k} active={prefs.pkg === k} onClick={() => setPref('pkg', k)}>{t(label)}</Chip>
                ))}
              </div>
            )}
            {tab === 'guide' && filteredChannels.length > 0 && (
              <ChannelPicker channels={filteredChannels} selected={guideChannel} onSelect={setGuideChannel} />
            )}
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-3" style={{ paddingBottom: `calc(${bottomUi + 16}px + var(--safe-bottom))` }}>
        {content}
      </main>

      <nav
        className="fixed left-0 right-0 z-40 bg-bg/95 backdrop-blur-xl border-t border-line"
        style={{ bottom: `calc(${bannerHeight}px + var(--safe-bottom))`, height: TABBAR_HEIGHT }}
      >
        <div className="max-w-3xl mx-auto h-full grid grid-cols-5">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                window.scrollTo({ top: 0 });
              }}
              className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${tab === id ? 'text-accent' : 'text-muted'}`}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={tab === id ? 2.4 : 1.8} />
              <span className="truncate max-w-full px-1">{t(label)}</span>
            </button>
          ))}
        </div>
      </nav>
      {/* Riempie l'area sotto la barra (home indicator / banner) con lo stesso colore. */}
      <div className="fixed left-0 right-0 bottom-0 z-30 bg-bg" style={{ height: `calc(${bannerHeight}px + var(--safe-bottom))` }} />

      {openProgram && (
        <ProgramSheet
          key={openProgram.id}
          program={openProgram}
          channel={channelsById[openProgram.ch] || { name: openProgram.chName || '' }}
          channelsById={channelsById}
          now={now}
          days={epg.days}
          onClose={() => setOpenProgram(null)}
          onOpen={setOpenProgram}
          onOpenPro={() => setShowPro(true)}
          toast={toast}
        />
      )}
      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          onOpenPro={() => { setShowSettings(false); setShowPro(true); }}
          availableCountries={epg.index ? Object.keys(epg.index.countries) : null}
        />
      )}
      {showPro && <ProSheet onClose={() => setShowPro(false)} />}
      <Toast toast={toastState} onDone={() => setToastState(null)} />
    </div>
  );
}
