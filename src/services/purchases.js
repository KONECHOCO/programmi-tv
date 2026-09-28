// Acquisto "CineGuide Pro" (non consumabile, 2,99 €) tramite cordova-plugin-purchase
// (StoreKit su iOS, Google Play Billing su Android). Nessun server: lo stato "posseduto"
// arriva dallo store e viene ripristinato con "Ripristina acquisti".
import { isNative, platform } from './platform';

export const PRO_PRODUCT_ID = 'com.ikonet.cineguide.pro';

let store = null;
let listeners = new Set();
let state = { ready: false, owned: false, price: null, busy: false, error: null };

function emit(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export function subscribePurchases(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

function waitForPlugin() {
  return new Promise((resolve) => {
    if (window.CdvPurchase) return resolve(window.CdvPurchase);
    document.addEventListener('deviceready', () => resolve(window.CdvPurchase), { once: true });
    setTimeout(() => resolve(window.CdvPurchase), 8000);
  });
}

function refreshFromStore() {
  const product = store?.get(PRO_PRODUCT_ID);
  emit({
    ready: true,
    owned: Boolean(product && (store.owned({ id: PRO_PRODUCT_ID, platform: product.platform }) || product.owned)),
    price: product?.pricing?.price || null,
  });
}

export async function initPurchases() {
  if (!isNative || store) return;
  const Cdv = await waitForPlugin();
  if (!Cdv) {
    emit({ ready: true, error: 'unavailable' });
    return;
  }
  store = Cdv.store;
  const storePlatform = platform === 'ios' ? Cdv.Platform.APPLE_APPSTORE : Cdv.Platform.GOOGLE_PLAY;
  store.register([{ id: PRO_PRODUCT_ID, type: Cdv.ProductType.NON_CONSUMABLE, platform: storePlatform }]);
  store
    .when()
    .productUpdated(refreshFromStore)
    .approved((tx) => tx.finish())
    .finished(() => {
      refreshFromStore();
      emit({ busy: false });
    })
    .receiptUpdated(refreshFromStore);
  store.error((err) => emit({ busy: false, error: err?.message || String(err) }));
  try {
    await store.initialize([storePlatform]);
  } catch (err) {
    emit({ error: err?.message || String(err) });
  }
  refreshFromStore();
}

export async function buyPro() {
  const offer = store?.get(PRO_PRODUCT_ID)?.getOffer();
  if (!offer) {
    emit({ error: 'unavailable' });
    return;
  }
  emit({ busy: true, error: null });
  const result = await offer.order();
  // result definito = errore o annullamento da parte dell'utente
  if (result) emit({ busy: false, error: result.code === window.CdvPurchase?.ErrorCode?.PAYMENT_CANCELLED ? null : result.message });
}

export async function restorePro() {
  if (!store) return;
  emit({ busy: true, error: null });
  try {
    await store.restorePurchases();
  } finally {
    refreshFromStore();
    emit({ busy: false });
  }
}
