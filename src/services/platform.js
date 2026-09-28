import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// Sito, link condivisi e pagine legali: cineguide.ikonetsolutions.com (repo KONECHOCO/cineguide-site).
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://cineguide.ikonetsolutions.com').replace(/\/$/, '');

// Dati EPG: GitHub Pages di questo repo, volutamente SENZA dominio personalizzato: con un dominio
// GitHub reindirizza github.io via http, che iOS blocca, e le build già distribuite resterebbero senza dati.
export const EPG_URL = import.meta.env.VITE_EPG_URL || (import.meta.env.DEV ? '/epg' : 'https://konechoco.github.io/programmi-tv/epg');

export const STORE_URLS = {
  ios: import.meta.env.VITE_APPSTORE_URL || 'https://apps.apple.com/app/id6816837474',
  android: 'https://play.google.com/store/apps/details?id=com.ikonet.cineguide',
};
