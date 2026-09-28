// Screenshot per App Store e Google Play in 6 lingue, con dati reali della guida.
// Prerequisiti: `npm run epg:dev` (dati in .epg-cache) e il server di sviluppo avviato (npm run dev).
// Uso: SCREENSHOT_URL=http://localhost:4321 node scripts/capture-store-screenshots.mjs
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.SCREENSHOT_URL ?? 'http://localhost:4321';
const outDir = path.resolve('store', 'screenshots');

const DEVICES = {
  iphone: { width: 440, height: 956, dpr: 3, mobile: true }, // 1320x2868 (6.9")
  ipad: { width: 1032, height: 1376, dpr: 2, mobile: false }, // 2064x2752 (13")
  android: { width: 360, height: 720, dpr: 3, mobile: true }, // 1080x2160 (Google Play, rapporto 2:1)
};
const LANGS = [
  { lang: 'it', country: 'IT', tz: 'Europe/Rome' },
  { lang: 'en', country: 'GB', tz: 'Europe/London' },
  { lang: 'es', country: 'ES', tz: 'Europe/Madrid' },
  { lang: 'fr', country: 'FR', tz: 'Europe/Paris' },
  { lang: 'de', country: 'DE', tz: 'Europe/Berlin' },
  { lang: 'pt', country: 'BR', tz: 'America/Sao_Paulo' },
];
const SHOTS = ['now', 'tonight', 'detail', 'guide', 'mine'];

// Ora fissa: stasera alle 21:40 del paese, così "Ora in onda" mostra la prima serata.
function eveningIn(tz) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  const [y, m, d] = date.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, 21, 40);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(wall)).map((p) => [p.type, p.value]));
  const offset = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - wall;
  return { time: new Date(wall - offset), date };
}

const TAB_INDEX = { now: 0, tonight: 1, guide: 2, search: 3, mine: 4 };

async function seedUserData(cc, date, at) {
  // Qualche promemoria, serie seguita e voto reali per la schermata "Il mio TV".
  const day = JSON.parse(await readFile(path.resolve('.epg-cache', cc, `${date}.json`), 'utf8')).programmes;
  const channels = JSON.parse(await readFile(path.resolve('.epg-cache', cc, 'channels.json'), 'utf8'));
  const sec = Math.floor(at.getTime() / 1000);
  const upcoming = [];
  for (const ch of channels.slice(0, 12)) {
    const p = (day[ch.id] || []).find((x) => x.s > sec + 600 && x.e - x.s >= 40 * 60);
    if (p) upcoming.push({ ...p, cc, ch: ch.id, id: `${cc}|${ch.id}|${p.s}`, chName: ch.name });
  }
  const reminders = Object.fromEntries(upcoming.slice(0, 3).map((p, i) => [p.id, { ...p, offset: [5, 15, 0][i] }]));
  const series = upcoming.filter((p) => p.g === 'series' || p.ep).slice(0, 2);
  const key = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const follows = Object.fromEntries(series.map((p) => [key(p.t), { t: p.t, cc, at: Date.now() }]));
  const ratings = Object.fromEntries(upcoming.slice(3, 6).map((p, i) => [key(p.t), { t: p.t, stars: [5, 4, 5][i], at: Date.now() - i * 1000, cc }]));
  const favorites = Object.fromEntries(channels.slice(0, 5).map((c) => [`${cc}:${c.id}`, true]));
  return { reminders, follows, ratings, favorites };
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
for (const [devName, dev] of Object.entries(DEVICES)) {
  for (const { lang, country, tz } of LANGS) {
    const { time, date } = eveningIn(tz);
    const seed = await seedUserData(country, date, time);
    const ctx = await browser.newContext({
      viewport: { width: dev.width, height: dev.height },
      deviceScaleFactor: dev.dpr,
      isMobile: dev.mobile,
      hasTouch: true,
      colorScheme: 'dark',
      locale: lang,
      timezoneId: tz,
    });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(time);
    await page.addInitScript(({ lang, country, seed }) => {
      const set = (k, v) => localStorage.setItem(`cineguide:${k}`, JSON.stringify(v));
      set('prefs', { lang, country, pkg: 'all', theme: 'dark', offset: 5 });
      for (const [k, v] of Object.entries(seed)) set(k, v);
      set('pro', false);
    }, { lang, country, seed });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('main li', { timeout: 20000 });

    for (const [i, shot] of SHOTS.entries()) {
      const tab = shot === 'detail' ? 'tonight' : shot;
      await page.locator('nav button').nth(TAB_INDEX[tab]).click();
      await page.waitForTimeout(700);
      if (shot === 'detail') {
        const withImage = page.locator('main li button:has(img.object-cover)').first();
        await ((await withImage.count()) ? withImage : page.locator('main li button').first()).click();
        await page.waitForTimeout(900);
      }
      await page.waitForLoadState('networkidle').catch(() => {});
      const file = path.join(outDir, devName, lang, `${String(i + 1).padStart(2, '0')}-${shot}.png`);
      await mkdir(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file });
      if (shot === 'detail') await page.keyboard.press('Escape').catch(() => {});
      if (shot === 'detail') await page.locator('[aria-label="Close"]').first().click().catch(() => {});
    }
    console.log(`${devName} ${lang}: ${SHOTS.length} screenshot`);
    await ctx.close();
  }
}
await browser.close();
