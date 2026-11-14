/**
 * Programma ambasciatori Ikonet — client comune per le app Capacitor (React o JS semplice).
 * Copiare questo file nell'app e chiamare configureReferral({...}) una volta all'avvio.
 *
 * Privacy: NIENTE viene inviato se l'utente non è arrivato da un invito (link di un ambasciatore
 * letto dal Play Install Referrer, oppure codice inserito a mano nei primi 7 giorni). In quel caso
 * inviamo solo un ID casuale dell'installazione, contatori di utilizzo (aperture, annunci visti,
 * acquisti), piattaforma, lingua e — su Android — un hash dell'ID del dispositivo per non contare due
 * volte una reinstallazione. Nessun ID pubblicitario, nessun dato personale.
 *
 * Gli ambasciatori sono pagati per utenti reali che usano l'app su più giorni, MAI per i clic sugli
 * annunci: i "clic" servono solo al server per riconoscere comportamenti anomali.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const CODE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FLUSH_EVERY_MS = 5 * 60 * 1000;
const NEW_SESSION_AFTER_MS = 30 * 60 * 1000;
const LIMITS = { impressions: 500, clicks: 500, revenue_micros: 5_000_000, iap: 3 };
const ZERO = { impressions: 0, clicks: 0, revenue_micros: 0, iap: 0 };

const Native = registerPlugin('Referral'); // solo Android (ReferralPlugin.java)
const platform = Capacitor.getPlatform();
const isNative = Capacitor.isNativePlatform();

let cfg = { api: '', key: '', appId: '', appVersion: '', prefix: 'ref' };
let counters = { ...ZERO };
let state = { enabled: false, code: null, registered: false, firstSeen: 0 };
const listeners = new Set();

const K = name => `${cfg.prefix}.ref.${name}`;
const read = k => { try { return localStorage.getItem(K(k)); } catch { return null; } };
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(K(k));
    else localStorage.setItem(K(k), v);
  } catch { /* storage non disponibile */ }
};

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}
export const getReferralState = () => state;
export function subscribeReferral(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Da chiamare una volta, prima di initReferral(). */
export function configureReferral({ api, key, appId, appVersion = '', prefix = appId }) {
  cfg = { api: (api || '').replace(/\/$/, ''), key: key || '', appId, appVersion, prefix };
  try { counters = { ...ZERO, ...JSON.parse(read('counters') || '{}') }; } catch { counters = { ...ZERO }; }
  state = {
    // Solo nelle app installate dagli store: nella versione web (sito) gli inviti non hanno senso
    enabled: isNative && Boolean(cfg.api && cfg.key && cfg.appId),
    code: read('code'),
    registered: read('registered') === '1',
    firstSeen: Number(read('firstSeen')) || 0
  };
}

/** True se l'utente può ancora inserire un codice (primi 7 giorni, nessun codice già usato). */
export function canEnterCode(s = state) {
  return s.enabled && !s.code && Date.now() - (s.firstSeen || Date.now()) < CODE_WINDOW_MS;
}

async function request(path, body) {
  const res = await fetch(cfg.api + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'X-App-Key': cfg.key },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = new Error(String(res.status));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function installId() {
  let id = read('installId');
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    write('installId', id);
  }
  return id;
}

async function deviceId() {
  if (platform !== 'android') return '';
  try {
    const { id } = await Native.getDeviceId();
    return id || '';
  } catch {
    return '';
  }
}

async function register() {
  if (!state.code || state.registered) return;
  const locale = navigator.language || '';
  try {
    await request('/v1/install', {
      app_id: cfg.appId,
      install_id: installId(),
      code: state.code,
      platform: isNative ? platform : 'web',
      country: (locale.split('-')[1] || '').slice(0, 2).toUpperCase(),
      locale: locale.slice(0, 10),
      app_version: cfg.appVersion,
      device_id: await deviceId(),
      is_emulator: false
    });
    write('registered', '1');
    setState({ registered: true });
  } catch (err) {
    if (err.status === 404) { // codice non più valido (ambasciatore sospeso)
      write('code', null);
      setState({ code: null });
    }
  }
}

function persist() {
  if (state.code) write('counters', JSON.stringify(counters));
}

async function flush(sessions = 0) {
  if (!state.code || !state.registered) return;
  const c = { ...counters };
  if (!sessions && !c.impressions && !c.clicks && !c.iap && !c.revenue_micros) return;
  const sent = Object.fromEntries(Object.entries(LIMITS).map(([k, max]) => [k, Math.min(c[k], max)]));
  try {
    await request('/v1/ping', { app_id: cfg.appId, install_id: installId(), sessions, ...sent });
    for (const k of Object.keys(LIMITS)) counters[k] = Math.max(0, counters[k] - sent[k]);
    persist();
  } catch {
    // offline: riproviamo più tardi
  }
}

let started = false;
let backgroundedAt = 0;

async function onAppOpen() {
  if (!state.code) return;
  await register();
  await flush(1);
}

/** Da chiamare una volta all'avvio, dopo configureReferral(). Non blocca mai l'app. */
export async function initReferral() {
  if (!state.enabled || started) return;
  started = true;
  if (!state.firstSeen) {
    const now = Date.now();
    write('firstSeen', String(now));
    setState({ firstSeen: now });
  }
  if (!state.code && platform === 'android' && canEnterCode()) {
    try {
      const { referrer } = await Native.getInstallReferrer();
      await applyInstallReferrer(referrer);
    } catch {
      // Play Store non disponibile o referrer scaduto
    }
  }
  await onAppOpen();
  setInterval(() => { flush(0); }, FLUSH_EVERY_MS);
  if (isNative) {
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        backgroundedAt = Date.now();
        flush(0);
        return;
      }
      if (backgroundedAt && Date.now() - backgroundedAt >= NEW_SESSION_AFTER_MS) onAppOpen();
    });
  }
}

/** Legge "utm_campaign=CODE&ref=CODE" dal referrer di Google Play. */
export async function applyInstallReferrer(raw) {
  if (!raw || state.code) return false;
  let text = raw;
  try { text = decodeURIComponent(raw); } catch { /* già decodificato */ }
  const m = /(?:^|&)ref=([A-Za-z0-9]{3,20})(?:&|$)/.exec(text);
  return m ? (await setReferralCode(m[1])) === 'ok' : false;
}

/** Applica un codice invito. Ritorna 'ok' | 'invalid' | 'expired' | 'network'. */
export async function setReferralCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!state.enabled) return 'network';
  if (!canEnterCode()) return 'expired';
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return 'invalid';
  try {
    const { valid } = await request(`/v1/code/${encodeURIComponent(code)}`);
    if (!valid) return 'invalid';
  } catch {
    return 'network';
  }
  write('code', code);
  setState({ code });
  await onAppOpen();
  return 'ok';
}

export function trackImpression(valueMicros = 0) {
  if (!state.code) return;
  counters.impressions += 1;
  counters.revenue_micros += Math.max(0, Math.round(Number(valueMicros) || 0));
  persist();
}

/** Valore di un'impression già contata (evento "paid" del banner). */
export function trackRevenue(valueMicros) {
  if (!state.code) return;
  counters.revenue_micros += Math.max(0, Math.round(Number(valueMicros) || 0));
  persist();
}

/** Solo per il controllo anti-frode lato server: i clic non generano premi. */
export function trackClick() {
  if (!state.code) return;
  counters.clicks += 1;
  persist();
}

export function trackPurchase() {
  if (!state.code) return;
  counters.iap += 1;
  persist();
  flush(0);
}

/**
 * Collega gli eventi AdMob (@capacitor-community/admob v7/v8) ai contatori.
 * Passare il modulo AdMob e gli enum degli eventi importati dall'app.
 */
export function attachAdMobListeners(AdMob, ev) {
  const on = (name, fn) => { if (name) AdMob.addListener(name, fn).catch?.(() => {}); };
  on(ev.BannerAdPluginEvents?.AdImpression, () => trackImpression());
  on(ev.BannerAdPluginEvents?.AdPaid, d => trackRevenue(d?.valueMicros));
  on(ev.BannerAdPluginEvents?.Opened, () => trackClick());
  on(ev.AppOpenAdPluginEvents?.AdImpression, d => trackImpression(d?.valueMicros));
  on(ev.InterstitialAdPluginEvents?.AdImpression, d => trackImpression(d?.valueMicros));
  on(ev.RewardAdPluginEvents?.AdImpression, d => trackImpression(d?.valueMicros));
  on(ev.RewardInterstitialAdPluginEvents?.AdImpression, d => trackImpression(d?.valueMicros));
}
