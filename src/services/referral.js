// Programma ambasciatori Ikonet: configurazione per CineGuide (logica comune in referral-core.js).
// La chiave identifica l'app verso partner.ikonetsolutions.com, non è un segreto.
import { useSyncExternalStore } from 'react';
import { configureReferral, getReferralState, subscribeReferral } from './referral-core';

configureReferral({
  api: 'https://partner.ikonetsolutions.com',
  key: 'DazGcCof0TLvrvfz76VBVg4UBz-V9Qx-',
  appId: 'cineguide',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.3',
});

export * from './referral-core';
export const useReferral = () => useSyncExternalStore(subscribeReferral, getReferralState);
