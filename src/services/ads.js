// Pubblicità AdMob (solo app native, disattivata per gli utenti Pro).
// Flusso: consenso UMP (GDPR) → richiesta ATT su iOS → annuncio all'apertura (App Open) → banner in basso
// + interstitial occasionali. L'App Open torna anche quando l'utente rientra nell'app dopo un po' di tempo.
import {
  AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, InterstitialAdPluginEvents, AppOpenAdPluginEvents, AdmobConsentStatus,
} from '@capacitor-community/admob';
import { App as CapApp } from '@capacitor/app';
import { isNative, platform } from './platform';
import { attachAdMobListeners } from './referral';

// ID di test ufficiali Google: vengono sostituiti in build dalle variabili VITE_ADMOB_* (codemagic.yaml).
const TEST_IDS = {
  ios: { banner: 'ca-app-pub-3940256099942544/2934735716', interstitial: 'ca-app-pub-3940256099942544/4411468910', appOpen: 'ca-app-pub-3940256099942544/5575463023' },
  android: { banner: 'ca-app-pub-3940256099942544/6300978111', interstitial: 'ca-app-pub-3940256099942544/1033173712', appOpen: 'ca-app-pub-3940256099942544/9257395921' },
};
const env = import.meta.env;
const IDS = {
  ios: { banner: env.VITE_ADMOB_IOS_BANNER_ID, interstitial: env.VITE_ADMOB_IOS_INTERSTITIAL_ID, appOpen: env.VITE_ADMOB_IOS_APP_OPEN_ID },
  android: { banner: env.VITE_ADMOB_ANDROID_BANNER_ID, interstitial: env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID, appOpen: env.VITE_ADMOB_ANDROID_APP_OPEN_ID },
}[platform] || {};
const TESTING = !IDS.banner;
const unit = (kind) => IDS[kind] || TEST_IDS[platform]?.[kind];

// Interstitial solo nei passaggi naturali (apertura scheda, cambio sezione), mai al lancio: policy AdMob.
const INTERSTITIAL_MIN_GAP_MS = 3 * 60e3;
const INTERSTITIAL_EVERY_N_OPENS = 4;
// App Open: all'avvio (non al primissimo, come consiglia Google) e al rientro dopo almeno 30 s in background.
// Al massimo un annuncio a schermo intero ogni 3 minuti, e attesa massima di caricamento breve all'avvio.
const APP_OPEN_LOAD_TIMEOUT_MS = 3500;
const APP_OPEN_RESUME_AFTER_MS = 30e3;
const FIRST_LAUNCH_KEY = 'cg_first_launch_done';

let ready = false;
let canRequestAds = false;
let privacyOptionsRequired = false;
let bannerVisible = false;
let interstitialLoaded = false;
let lastInterstitialAt = Date.now(); // mai subito all'apertura
let opensSinceInterstitial = 0;
let appOpenLoaded = false;
let fullscreenShowing = false;
let lastFullscreenAt = 0;
let backgroundedAt = 0;
let adsDisabled = false; // utente Pro

export const adsSupported = isNative;
export const isPrivacyOptionsRequired = () => privacyOptionsRequired;

export async function initAds(onBannerHeight) {
  if (!isNative || ready) return;
  ready = true;
  try {
    await AdMob.initialize({ initializeForTesting: TESTING });
    let info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) info = await AdMob.showConsentForm();
    canRequestAds = info.canRequestAds;
    privacyOptionsRequired = info.privacyOptionsRequirementStatus === 'REQUIRED'; // enum non esportato dal plugin

    if (platform === 'ios') {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }

    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => onBannerHeight?.(bannerVisible ? size.height : 0));
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => onBannerHeight?.(0));
    AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
      fullscreenShowing = false;
      lastFullscreenAt = Date.now();
      loadAppOpen();
    });
    AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
      fullscreenShowing = false;
      loadAppOpen();
    });
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        backgroundedAt = Date.now();
        return;
      }
      if (backgroundedAt && Date.now() - backgroundedAt >= APP_OPEN_RESUME_AFTER_MS) showAppOpen();
      backgroundedAt = 0;
    });
    // Programma ambasciatori: conta gli annunci visti dagli utenti invitati (nulla per gli altri)
    attachAdMobListeners(AdMob, { BannerAdPluginEvents, InterstitialAdPluginEvents, AppOpenAdPluginEvents });

    // Annuncio all'apertura: dal secondo avvio in poi (al primo l'utente vede subito l'app).
    let firstLaunch = false;
    try {
      firstLaunch = !localStorage.getItem(FIRST_LAUNCH_KEY);
      localStorage.setItem(FIRST_LAUNCH_KEY, '1');
    } catch {
      // storage non disponibile: trattiamo l'avvio come normale
    }
    if (firstLaunch) loadAppOpen();
    else await showAppOpen();
  } catch (err) {
    console.warn('AdMob init:', err);
  }
}

async function loadAppOpen() {
  if (!canRequestAds || adsDisabled) return;
  try {
    await AdMob.loadAppOpen({ adId: unit('appOpen') });
    appOpenLoaded = true;
  } catch {
    appOpenLoaded = false;
  }
}

async function showAppOpen() {
  if (!canRequestAds || adsDisabled || fullscreenShowing) return;
  if (Date.now() - lastFullscreenAt < INTERSTITIAL_MIN_GAP_MS) return;
  if (!appOpenLoaded) {
    // meglio perdere l'annuncio che far aspettare l'utente
    await Promise.race([loadAppOpen(), new Promise((r) => setTimeout(r, APP_OPEN_LOAD_TIMEOUT_MS))]);
  }
  if (!appOpenLoaded || adsDisabled) return;
  try {
    fullscreenShowing = true;
    appOpenLoaded = false;
    await AdMob.showAppOpen();
    lastFullscreenAt = Date.now();
  } catch {
    fullscreenShowing = false;
  }
}

export async function showBanner() {
  adsDisabled = false;
  if (!isNative || !canRequestAds || bannerVisible) return;
  try {
    bannerVisible = true;
    await AdMob.showBanner({
      adId: unit('banner'),
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: TESTING,
    });
  } catch (err) {
    bannerVisible = false;
    console.warn('Banner:', err);
  }
}

export async function removeBanner() {
  adsDisabled = true; // Pro: niente più annunci a schermo intero
  if (!isNative || !bannerVisible) return;
  bannerVisible = false;
  try {
    await AdMob.removeBanner();
  } catch {
    // ignora
  }
}

async function prepareInterstitial() {
  if (!canRequestAds || interstitialLoaded) return;
  try {
    await AdMob.prepareInterstitial({ adId: unit('interstitial'), isTesting: TESTING });
    interstitialLoaded = true;
  } catch {
    interstitialLoaded = false;
  }
}

/** Da chiamare all'apertura di una scheda programma o al cambio sezione: ogni tanto mostra un interstitial. */
export async function maybeShowInterstitial() {
  if (!isNative || !canRequestAds) return;
  opensSinceInterstitial++;
  if (opensSinceInterstitial === INTERSTITIAL_EVERY_N_OPENS - 1) prepareInterstitial();
  if (opensSinceInterstitial < INTERSTITIAL_EVERY_N_OPENS || fullscreenShowing) return;
  if (Date.now() - Math.max(lastInterstitialAt, lastFullscreenAt) < INTERSTITIAL_MIN_GAP_MS) return;
  if (!interstitialLoaded) {
    await prepareInterstitial();
    if (!interstitialLoaded) return;
  }
  try {
    await AdMob.showInterstitial();
    lastInterstitialAt = Date.now();
    opensSinceInterstitial = 0;
  } catch {
    // ignora
  } finally {
    interstitialLoaded = false;
  }
}

export async function showPrivacyOptions() {
  try {
    await AdMob.showPrivacyOptionsForm();
  } catch (err) {
    console.warn('Privacy options:', err);
  }
}
