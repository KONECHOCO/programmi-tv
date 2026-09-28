// Accesso ai dati della guida TV generati da scripts/epg/build-epg.mjs.
import { EPG_URL } from './platform';
import { load, save, pruneCache } from './storage';

const memory = new Map();

async function getJson(path, { cacheKey, maxAgeMs = 0 } = {}) {
  if (memory.has(path)) return memory.get(path);
  const cached = cacheKey ? load(cacheKey, null) : null;
  if (cached && maxAgeMs && Date.now() - cached.at < maxAgeMs) {
    memory.set(path, cached.data);
    return cached.data;
  }
  try {
    const res = await fetch(`${EPG_URL}/${path}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    memory.set(path, data);
    if (cacheKey) save(cacheKey, { at: Date.now(), data });
    return data;
  } catch (err) {
    // Offline: usa l'ultima copia salvata, anche se vecchia.
    if (cached) return cached.data;
    throw err;
  }
}

export function clearMemoryCache() {
  memory.clear();
}

export function fetchIndex() {
  return getJson('index.json', { cacheKey: 'epg:index', maxAgeMs: 30 * 60e3 });
}

export function fetchChannels(cc) {
  return getJson(`${cc}/channels.json`, { cacheKey: `epg:${cc}:channels`, maxAgeMs: 6 * 3600e3 });
}

/** Programmi di un giorno: { [channelId]: Program[] } con id/cc/ch già valorizzati. */
export async function fetchDay(cc, date, { persist = false } = {}) {
  const raw = await getJson(`${cc}/${date}.json`, persist ? { cacheKey: `epg:${cc}:${date}`, maxAgeMs: 3 * 3600e3 } : {});
  if (persist) pruneCache([`epg:index`, `epg:${cc}:channels`, `epg:${cc}:${date}`]);
  if (raw._normalized) return raw.programmes;
  for (const [ch, list] of Object.entries(raw.programmes)) {
    for (const p of list) {
      p.cc = cc;
      p.ch = ch;
      p.id = `${cc}|${ch}|${p.s}`;
    }
  }
  raw._normalized = true;
  return raw.programmes;
}

// ─── Utilità tempo ───────────────────────────────────────────────────────────
export const nowSec = () => Math.floor(Date.now() / 1000);

export function todayIn(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function pickDefaultDay(days, tz) {
  if (!days?.length) return null;
  const today = todayIn(tz);
  if (days.includes(today)) return today;
  return days.filter((d) => d <= today).at(-1) || days[0];
}

/** Secondi epoch per "HH:MM" del giorno `date` nel fuso `tz`. */
export function atLocalTime(date, hhmm, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const offset = (ms) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000;
  };
  return Math.floor((wall - offset(wall - offset(wall))) / 1000);
}

export function currentAndNext(list, t = nowSec()) {
  if (!list?.length) return { current: null, next: null };
  const i = list.findIndex((p) => p.s <= t && p.e > t);
  if (i >= 0) return { current: list[i], next: list[i + 1] || null };
  const upcoming = list.find((p) => p.s > t);
  return { current: null, next: upcoming || null };
}

export function progressOf(p, t = nowSec()) {
  if (!p || t < p.s) return 0;
  if (t >= p.e) return 100;
  return Math.round(((t - p.s) / (p.e - p.s)) * 100);
}

/** Chiave stabile per "segui la serie": titolo normalizzato. */
export function titleKey(title) {
  return String(title || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*[-–:(].*(stag|season|staffel|temporada|saison|ep\.?|puntata).*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
