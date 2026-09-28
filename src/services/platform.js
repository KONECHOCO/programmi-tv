import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// Dove vengono pubblicati i dati EPG e le pagine legali (GitHub Pages con dominio cineguide.ikonetsolutions.com, workflow .github/workflows/pages.yml).
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://cineguide.ikonetsolutions.com').replace(/\/$/, '');
export const EPG_URL = import.meta.env.VITE_EPG_URL || (import.meta.env.DEV ? '/epg' : `${SITE_URL}/epg`);

export const STORE_URLS = {
  ios: import.meta.env.VITE_APPSTORE_URL || 'https://apps.apple.com/app/id6816837474',
  android: 'https://play.google.com/store/apps/details?id=com.ikonet.cineguide',
};
