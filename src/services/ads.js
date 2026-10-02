// Pubblicità AdMob (solo app native, disattivata per gli utenti Pro).
// Flusso: consenso UMP (GDPR) → richiesta ATT su iOS → banner in basso + interstitial occasionali.
import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdmobConsentStatus } from '@capacitor-community/admob';
import { isNative, platform } from './platform';

// ID di test ufficiali Google: vengono sostituiti in build dalle variabili VITE_ADMOB_* (codemagic.yaml).
const TEST_IDS = {
  ios: { banner: 'ca-app-pub-3940256099942544/2934735716', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
  android: { banner: 'ca-app-pub-3940256099942544/6300978111', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
};
const env = import.meta.env;
const IDS = {
  ios: { banner: env.VITE_ADMOB_IOS_BANNER_ID, interstitial: env.VITE_ADMOB_IOS_INTERSTITIAL_ID },
  android: { banner: env.VITE_ADMOB_ANDROID_BANNER_ID, interstitial: env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID },
}[platform] || {};
const TESTING = !IDS.banner;
const unit = (kind) => IDS[kind] || TEST_IDS[platform]?.[kind];

// Interstitial solo nei passaggi naturali (apertura scheda, cambio sezione), mai al lancio: policy AdMob.
const INTERSTITIAL_MIN_GAP_MS = 3 * 60e3;
const INTERSTITIAL_EVERY_N_OPENS = 4;

let ready = false;
let canRequestAds = false;
let privacyOptionsRequired = false;
let bannerVisible = false;
let interstitialLoaded = false;
let lastInterstitialAt = Date.now(); // mai subito all'apertura
let opensSinceInterstitial = 0;

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
  } catch (err) {
    console.warn('AdMob init:', err);
  }
}

export async function showBanner() {
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
  if (opensSinceInterstitial < INTERSTITIAL_EVERY_N_OPENS || Date.now() - lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return;
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
