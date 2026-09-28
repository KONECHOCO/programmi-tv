import { todayIn } from '../services/epg';

const cache = new Map();
function fmt(locale, tz, opts) {
  const key = `${locale}|${tz}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) {
    try {
      cache.set(key, new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts }));
    } catch {
      cache.set(key, new Intl.DateTimeFormat('en', { timeZone: tz, ...opts }));
    }
  }
  return cache.get(key);
}

export const timeOf = (sec, locale, tz) => fmt(locale, tz, { hour: '2-digit', minute: '2-digit' }).format(new Date(sec * 1000));
export const dateOf = (sec, tz) => fmt('en-CA', tz, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(sec * 1000));

export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "Oggi", "Domani" oppure "sab 4 ott". */
export function dayLabel(date, t, locale, tz) {
  const today = todayIn(tz);
  if (date === today) return t('today');
  if (date === addDays(today, 1)) return t('tomorrow');
  const [y, m, d] = date.split('-').map(Number);
  return fmt(locale, 'UTC', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** "Oggi 21:30" / "Domani 21:30" / "sab 4 ott 21:30". */
export function whenLabel(sec, t, locale, tz) {
  return `${dayLabel(dateOf(sec, tz), t, locale, tz)} ${timeOf(sec, locale, tz)}`;
}

export function durationMin(p) {
  return Math.round((p.e - p.s) / 60);
}
