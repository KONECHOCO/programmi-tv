import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchChannels, fetchDay, fetchIndex, clearMemoryCache, nowSec, pickDefaultDay } from '../services/epg';

/** Dati guida per un paese: indice, canali e giorni caricati su richiesta. */
export function useEpg(country) {
  const [state, setState] = useState({ status: 'loading', index: null, channels: [], availableDays: [], today: null });
  const [days, setDays] = useState({});
  const pending = useRef(new Map());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    setDays({});
    pending.current.clear();
    (async () => {
      try {
        const index = await fetchIndex();
        const info = index.countries?.[country.code];
        if (!info) throw new Error('country-unavailable');
        const today = pickDefaultDay(info.days, country.tz);
        const [channels, todayData] = await Promise.all([
          fetchChannels(country.code),
          fetchDay(country.code, today, { persist: true }),
        ]);
        if (cancelled) return;
        setDays({ [today]: todayData });
        setState({ status: 'ready', index, channels, availableDays: info.days, today });
      } catch (err) {
        console.warn('EPG:', err);
        if (!cancelled) setState((s) => ({ ...s, status: 'error' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country.code, country.tz, reloadKey]);

  const ensureDay = useCallback(async (date) => {
    if (!date || days[date]) return days[date];
    if (pending.current.has(date)) return pending.current.get(date);
    const promise = fetchDay(country.code, date)
      .then((data) => {
        setDays((d) => ({ ...d, [date]: data }));
        return data;
      })
      .catch(() => null)
      .finally(() => pending.current.delete(date));
    pending.current.set(date, promise);
    return promise;
  }, [country.code, days]);

  const reload = useCallback(() => {
    clearMemoryCache();
    setReloadKey((k) => k + 1);
  }, []);

  return { ...state, days, ensureDay, reload };
}

/** Secondi correnti, aggiornati periodicamente per barre di avanzamento e "in onda". */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(nowSec());
  useEffect(() => {
    const id = setInterval(() => setNow(nowSec()), intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && setNow(nowSec());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
