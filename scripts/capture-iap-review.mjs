// Screenshot della schermata Pro per la revisione dell'acquisto in-app (App Store).
// Riproduce il ramo nativo di ProSheet.jsx (pulsante acquisto + ripristino), che sul web non viene mostrato.
// Uso: con `npm run dev` avviato → node scripts/capture-iap-review.mjs
import { chromium } from 'playwright';

const url = process.env.SCREENSHOT_URL ?? 'http://localhost:4321';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, colorScheme: 'dark', locale: 'en' });
const p = await ctx.newPage();
await p.addInitScript(() => {
  localStorage.setItem('cineguide:prefs', JSON.stringify({ lang: 'en', country: 'GB', pkg: 'all', theme: 'dark', offset: 5 }));
});
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForSelector('main li');
await p.locator('header button:has-text("Pro")').click();
await p.waitForTimeout(800);
await p.evaluate(() => {
  const el = [...document.querySelectorAll('p')].find((x) => x.textContent.includes('iPhone and Android'));
  el.outerHTML = `<button class="mt-8 w-full py-4 rounded-2xl bg-accent text-accent-fg font-bold text-[16px] flex items-center justify-center gap-2">Buy for 2,99 €</button>
  <p class="text-center text-[12px] text-muted mt-2">One-time payment · no subscription</p>
  <button class="mt-4 w-full py-2 text-sm font-semibold text-accent">Restore purchases</button>`;
});
await p.screenshot({ path: 'store/iap-review-pro.png' });
await b.close();
console.log('store/iap-review-pro.png');
