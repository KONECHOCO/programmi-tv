#!/usr/bin/env node
// Crea/aggiorna su Google Play il prodotto a pagamento singolo "CineGuide Pro" (API monetization.onetimeproducts):
// prezzo base 2,99 € convertito da Google in tutte le valute, titolo e descrizione in tutte le lingue di
// store/listing.json, opzione di acquisto "buy" (compatibile con la Billing Library classica) attivata.
// Uso: PLAY_SA_PATH=chiave.json node scripts/store/play-iap.mjs
import { readFileSync } from 'node:fs';
import { playApi } from './play-api.mjs';

const listing = JSON.parse(readFileSync(new URL('../../store/listing.json', import.meta.url), 'utf8'));
const PKG = listing.app.bundleId;
const PRODUCT = listing.iap.productId;
const OPTION = 'buy';
const base = { currencyCode: 'EUR', units: '2', nanos: 990000000 };

// Prezzi locali equivalenti a 2,99 € (stessa conversione della console).
const converted = await playApi('POST', `/applications/${PKG}/pricing:convertRegionPrices`, { price: base });
const regions = Object.values(converted.convertedRegionPrices || {}).map((r) => ({
  regionCode: r.regionCode,
  price: r.price,
  availability: 'AVAILABLE',
}));
// L'Italia sempre a 2,99 € esatti.
const it = regions.find((r) => r.regionCode === 'IT');
if (it) it.price = base;

const listings = [];
for (const loc of Object.values(listing.locales)) {
  for (const languageCode of loc.play) listings.push({ languageCode, title: loc.iapName, description: loc.iapDescription });
}

const product = {
  packageName: PKG,
  productId: PRODUCT,
  listings,
  purchaseOptions: [{
    purchaseOptionId: OPTION,
    buyOption: { legacyCompatible: true, multiQuantityEnabled: false },
    regionalPricingAndAvailabilityConfigs: regions,
  }],
};

const q = new URLSearchParams({
  allowMissing: 'true',
  'regionsVersion.version': converted.regionVersion?.version || '2022/02',
  updateMask: 'listings,purchaseOptions',
});
const res = await playApi('PATCH', `/applications/${PKG}/onetimeproducts/${PRODUCT}?${q}`, product);
console.log(`prodotto ${res.productId}: ${res.listings.length} lingue, ${res.purchaseOptions[0].regionalPricingAndAvailabilityConfigs.length} paesi`);

const state = await playApi('POST', `/applications/${PKG}/oneTimeProducts/${PRODUCT}/purchaseOptions:batchUpdateStates`, {
  requests: [{ activatePurchaseOptionRequest: { packageName: PKG, productId: PRODUCT, purchaseOptionId: OPTION } }],
});
const opt = state.oneTimeProducts?.[0]?.purchaseOptions?.find((o) => o.purchaseOptionId === OPTION);
console.log(`opzione di acquisto "${OPTION}": ${opt?.state || 'aggiornata'}`);
