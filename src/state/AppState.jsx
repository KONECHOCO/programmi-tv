import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { load, save, remove } from '../services/storage';
import { detectLanguage, makeT, localeFor } from '../i18n/translations';
import { COUNTRIES, COUNTRY_BY_CODE } from '../data/countries';
import { titleKey } from '../services/epg';

const AppStateContext = createContext(null);

export const FREE_FOLLOW_LIMIT = 3;

function detectCountry(lang) {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  for (const l of langs) {
    const region = l.split('-')[1]?.toUpperCase();
    const code = region === 'UK' ? 'GB' : region;
    if (code && COUNTRY_BY_CODE[code]) return code;
  }
  return COUNTRIES.find((c) => c.lang === lang)?.code || 'IT';
}

function usePersisted(key, initial) {
  const [value, setValue] = useState(() => load(key, typeof initial === 'function' ? initial() : initial));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue];
}

export function AppStateProvider({ children }) {
  const [prefs, setPrefs] = usePersisted('prefs', () => {
    const lang = detectLanguage();
    return { lang, country: detectCountry(lang), pkg: 'all', theme: 'auto', offset: 5 };
  });
  const [favorites, setFavorites] = usePersisted('favorites', {}); // { "IT:rai1": true }
  const [reminders, setReminders] = usePersisted('reminders', {}); // { programId: Reminder }
  const [follows, setFollows] = usePersisted('follows', {}); // { titleKey: { t, cc, at } }
  const [ratings, setRatings] = usePersisted('ratings', {}); // { titleKey: { t, stars, at, cc, ch, i } }
  const [isPro, setIsPro] = usePersisted('pro', false);

  const setPref = useCallback((k, v) => setPrefs((p) => ({ ...p, [k]: v })), [setPrefs]);
  const t = useMemo(() => makeT(prefs.lang), [prefs.lang]);
  const country = COUNTRY_BY_CODE[prefs.country] || COUNTRIES[0];
  const locale = localeFor(prefs.lang, country.code);

  // Tema: automatico segue il sistema.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const light = prefs.theme === 'light' || (prefs.theme === 'auto' && mq.matches);
      document.documentElement.classList.toggle('light', light);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [prefs.theme]);

  useEffect(() => {
    document.documentElement.lang = prefs.lang;
  }, [prefs.lang]);

  const toggleFavorite = useCallback((ch) => {
    const key = `${country.code}:${ch}`;
    setFavorites((f) => {
      const next = { ...f };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }, [country.code, setFavorites]);
  const isFavorite = useCallback((ch) => Boolean(favorites[`${country.code}:${ch}`]), [favorites, country.code]);

  const setReminder = useCallback((p, channelName, offset) => {
    setReminders((r) => ({
      ...r,
      [p.id]: { id: p.id, cc: p.cc, ch: p.ch, chName: channelName, s: p.s, e: p.e, t: p.t, st: p.st, i: p.i, g: p.g, offset },
    }));
  }, [setReminders]);
  const removeReminder = useCallback((id) => setReminders((r) => {
    const next = { ...r };
    delete next[id];
    return next;
  }), [setReminders]);

  const toggleFollow = useCallback((p) => {
    const key = titleKey(p.t);
    const added = !follows[key];
    setFollows((f) => {
      const next = { ...f };
      if (added) next[key] = { t: p.t, cc: p.cc, at: Date.now(), i: p.i };
      else delete next[key];
      return next;
    });
    return added;
  }, [follows, setFollows]);

  const rate = useCallback((p, stars) => {
    const key = titleKey(p.t);
    setRatings((r) => {
      const next = { ...r };
      if (!stars) delete next[key];
      else next[key] = { t: p.t, stars, at: Date.now(), cc: p.cc, ch: p.ch, i: p.i, g: p.g };
      return next;
    });
  }, [setRatings]);

  const resetUserData = useCallback(() => {
    for (const k of ['favorites', 'reminders', 'follows', 'ratings', 'review']) remove(k);
    setFavorites({});
    setReminders({});
    setFollows({});
    setRatings({});
  }, [setFavorites, setReminders, setFollows, setRatings]);

  // Pulizia promemoria passati.
  useEffect(() => {
    const now = Date.now() / 1000;
    const expired = Object.values(reminders).filter((r) => r.e < now);
    if (expired.length) {
      setReminders((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v.e >= now)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    prefs, setPref, t, country, locale,
    favorites, toggleFavorite, isFavorite,
    reminders, setReminder, removeReminder,
    follows, toggleFollow, ratings, rate,
    isPro, setIsPro, resetUserData,
  };
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useApp() {
  return useContext(AppStateContext);
}
