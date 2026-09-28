#!/usr/bin/env node
// Configura CineGuide su App Store Connect tramite API ufficiale:
//   - registra il bundle ID (se manca)
//   - testi dello store in tutte le lingue di store/listing.json (nome, sottotitolo, descrizione, keywords, promo, URL)
//   - categorie
//   - acquisto in-app non consumabile "CineGuide Pro" a 2,99 € (localizzazioni, prezzo, disponibilità)
//
// Senza --apply mostra solo cosa farebbe. L'app va prima creata a mano su App Store Connect
// (Apple non permette di crearla via API): App › "+" › Nuova app, bundle com.ikonet.cineguide, SKU cineguide-ios.
//
// Variabili: ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_PATH (chiave .p8 con ruolo App Manager o Admin)
// Uso: node scripts/store/asc-setup.mjs [--apply]
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const listing = JSON.parse(readFileSync(new URL('../../store/listing.json', import.meta.url), 'utf8'));
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_PATH } = process.env;
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_PRIVATE_KEY_PATH) {
  console.error('Imposta ASC_KEY_ID, ASC_ISSUER_ID e ASC_PRIVATE_KEY_PATH');
  process.exit(1);
}
const key = createPrivateKey(readFileSync(ASC_PRIVATE_KEY_PATH));
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}

async function api(method, path, body) {
  const write = method !== 'GET';
  if (write && !APPLY) {
    console.log(`  [prova] ${method} ${path}`);
    return { data: { id: 'DRY-RUN', attributes: {} } };
  }
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json.errors?.map((e) => `${e.title}: ${e.detail}`).join(' | ');
    throw new Error(`${method} ${path} → ${res.status} ${detail || ''}`);
  }
  return json;
}

const log = (s) => console.log(`\n▶ ${s}`);
const bundleId = listing.app.bundleId;

// ─── 1. Bundle ID ──────────────────────────────────────────────────────────
log(`Bundle ID ${bundleId}`);
const bundles = await api('GET', `/v1/bundleIds?filter[identifier]=${bundleId}`);
if (bundles.data.find((b) => b.attributes.identifier === bundleId)) console.log('  già registrato');
else {
  await api('POST', '/v1/bundleIds', { data: { type: 'bundleIds', attributes: { identifier: bundleId, name: 'CineGuide', platform: 'IOS' } } });
  console.log('  registrato');
}

// ─── 2. App ────────────────────────────────────────────────────────────────
const apps = await api('GET', `/v1/apps?filter[bundleId]=${bundleId}`);
const app = apps.data[0];
if (!app) {
  console.log(`\n✋ L'app non esiste ancora su App Store Connect.
   Creala dal sito: App › "+" › Nuova app → Piattaforma iOS, Nome "${listing.locales.it.name}",
   Lingua principale Italiano, Bundle ID ${bundleId}, SKU ${listing.app.sku}. Poi rilancia questo script.`);
  process.exit(0);
}
console.log(`\nApp trovata: ${app.attributes.name} (id ${app.id})`);

// ─── 3. Info app: nome, sottotitolo, privacy, categorie ────────────────────
log('Informazioni app e categorie');
const infos = await api('GET', `/v1/apps/${app.id}/appInfos`);
const info = infos.data.find((i) => ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'WAITING_FOR_REVIEW'].includes(i.attributes.appStoreState || i.attributes.state)) || infos.data[0];
await api('PATCH', `/v1/appInfos/${info.id}`, {
  data: {
    type: 'appInfos', id: info.id,
    relationships: {
      primaryCategory: { data: { type: 'appCategories', id: listing.app.primaryCategory } },
      secondaryCategory: { data: { type: 'appCategories', id: listing.app.secondaryCategory } },
    },
  },
});
const infoLocs = (await api('GET', `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`)).data;
for (const loc of Object.values(listing.locales)) {
  for (const locale of loc.asc) {
    const attrs = { name: loc.name, subtitle: loc.subtitle, privacyPolicyUrl: listing.app.privacyPolicyUrl };
    const existing = infoLocs.find((l) => l.attributes.locale === locale);
    if (existing) await api('PATCH', `/v1/appInfoLocalizations/${existing.id}`, { data: { type: 'appInfoLocalizations', id: existing.id, attributes: attrs } });
    else await api('POST', '/v1/appInfoLocalizations', { data: { type: 'appInfoLocalizations', attributes: { locale, ...attrs }, relationships: { appInfo: { data: { type: 'appInfos', id: info.id } } } } });
    console.log(`  ${locale}: ${loc.name} — ${loc.subtitle}`);
  }
}

// ─── 4. Versione: descrizione, keywords, promo, URL, note per la revisione ──
log('Testi della versione');
const versions = await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=10`);
const version = versions.data.find((v) => ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(v.attributes.appStoreState));
if (!version) console.log('  nessuna versione modificabile trovata');
else {
  const isFirst = versions.data.length === 1;
  const verLocs = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`)).data;
  for (const loc of Object.values(listing.locales)) {
    for (const locale of loc.asc) {
      const attrs = {
        description: loc.description,
        keywords: loc.keywords,
        promotionalText: loc.promo,
        supportUrl: listing.app.supportUrl,
        marketingUrl: listing.app.marketingUrl,
        ...(!isFirst && { whatsNew: loc.whatsNew }), // non ammesso sulla prima versione
      };
      const existing = verLocs.find((l) => l.attributes.locale === locale);
      if (existing) await api('PATCH', `/v1/appStoreVersionLocalizations/${existing.id}`, { data: { type: 'appStoreVersionLocalizations', id: existing.id, attributes: attrs } });
      else await api('POST', '/v1/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale, ...attrs }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } });
      console.log(`  ${locale}: descrizione ${loc.description.length} caratteri, keywords "${loc.keywords}"`);
    }
  }
  const review = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`).catch(() => ({ data: null }));
  const reviewAttrs = { notes: listing.review.notes, demoAccountRequired: false };
  if (review.data) await api('PATCH', `/v1/appStoreReviewDetails/${review.data.id}`, { data: { type: 'appStoreReviewDetails', id: review.data.id, attributes: reviewAttrs } });
  else await api('POST', '/v1/appStoreReviewDetails', { data: { type: 'appStoreReviewDetails', attributes: reviewAttrs, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } });
  console.log('  note per la revisione impostate (contatto e telefono vanno completati dal sito)');
}

// ─── 5. Acquisto in-app CineGuide Pro ──────────────────────────────────────
log(`Acquisto in-app ${listing.iap.productId}`);
const iaps = await api('GET', `/v1/apps/${app.id}/inAppPurchasesV2?filter[productId]=${listing.iap.productId}`);
let iap = iaps.data[0];
if (iap) console.log(`  già presente (stato ${iap.attributes.state})`);
else {
  iap = (await api('POST', '/v2/inAppPurchases', {
    data: {
      type: 'inAppPurchases',
      attributes: { name: listing.iap.referenceName, productId: listing.iap.productId, inAppPurchaseType: listing.iap.type, reviewNote: listing.iap.reviewNote, familySharable: true },
      relationships: { app: { data: { type: 'apps', id: app.id } } },
    },
  })).data;
  console.log('  creato');
}

const iapLocs = iap.id === 'DRY-RUN' ? [] : (await api('GET', `/v2/inAppPurchases/${iap.id}/inAppPurchaseLocalizations?limit=50`)).data;
for (const loc of Object.values(listing.locales)) {
  for (const locale of loc.asc) {
    const attrs = { name: loc.iapName, description: loc.iapDescription };
    const existing = iapLocs.find((l) => l.attributes.locale === locale);
    if (existing) await api('PATCH', `/v1/inAppPurchaseLocalizations/${existing.id}`, { data: { type: 'inAppPurchaseLocalizations', id: existing.id, attributes: attrs } });
    else await api('POST', '/v1/inAppPurchaseLocalizations', { data: { type: 'inAppPurchaseLocalizations', attributes: { locale, ...attrs }, relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iap.id } } } } });
  }
}
console.log('  localizzazioni IAP impostate');

// Prezzo: 2,99 € con territorio base Italia (gli altri paesi vengono convertiti da Apple).
const { territory, price } = listing.iap.basePrice;
if (iap.id !== 'DRY-RUN') {
  let point = null;
  let next = `/v2/inAppPurchases/${iap.id}/pricePoints?filter[territory]=${territory}&limit=200`;
  while (next && !point) {
    const page = await api('GET', next);
    point = page.data.find((p) => p.attributes.customerPrice === price);
    next = page.links?.next ? page.links.next.replace('https://api.appstoreconnect.apple.com', '') : null;
  }
  if (!point) console.log(`  ⚠ prezzo ${price} non trovato per ${territory}`);
  else {
    await api('POST', '/v1/inAppPurchasePriceSchedules', {
      data: {
        type: 'inAppPurchasePriceSchedules',
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: iap.id } },
          baseTerritory: { data: { type: 'territories', id: territory } },
          manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price0}' }] },
        },
      },
      included: [{
        type: 'inAppPurchasePrices', id: '${price0}',
        attributes: { startDate: null },
        relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: point.id } } },
      }],
    });
    console.log(`  prezzo impostato: ${price} € (base ${territory})`);
  }
  const territories = (await api('GET', '/v1/territories?limit=200')).data;
  await api('POST', '/v1/inAppPurchaseAvailabilities', {
    data: {
      type: 'inAppPurchaseAvailabilities',
      attributes: { availableInNewTerritories: true },
      relationships: {
        inAppPurchase: { data: { type: 'inAppPurchases', id: iap.id } },
        availableTerritories: { data: territories.map((t) => ({ type: 'territories', id: t.id })) },
      },
    },
  }).catch((e) => console.log(`  disponibilità: ${e.message}`));
  console.log(`  disponibile in ${territories.length} paesi`);
} else console.log(`  [prova] prezzo ${price} € base ${territory} + disponibilità in tutti i paesi`);

console.log(`\n${APPLY ? '✅ Fatto.' : 'ℹ Prova completata: rilancia con --apply per applicare.'}
Da completare sul sito: screenshot (store/screenshots), questionario età, privacy "App Privacy",
screenshot dell'acquisto Pro per la revisione, contatto per la revisione, poi "Invia per la revisione".`);
