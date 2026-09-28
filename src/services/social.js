// Condivisione e richiesta di recensione sugli store.
import { Share } from '@capacitor/share';
import { InAppReview } from '@capacitor-community/in-app-review';
import { isNative, SITE_URL } from './platform';
import { load, save } from './storage';

/** Link web al programma: apre la versione web dell'app direttamente sulla scheda. */
export function programLink(p) {
  const q = new URLSearchParams({ c: p.cc, ch: p.ch, s: String(p.s) });
  return `${SITE_URL}/?${q}`;
}

/** Restituisce 'shared' | 'copied' | 'cancelled'. */
export async function shareText({ title, text, url }) {
  try {
    if (isNative) {
      await Share.share({ title, text, url, dialogTitle: title });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}

// Chiede la recensione dopo alcune azioni positive (promemoria, voti, serie seguite),
// al massimo una volta ogni 90 giorni. Il sistema operativo decide se mostrare davvero il popup.
const REVIEW_AFTER = 4;
export async function notePositiveAction() {
  const st = load('review', { count: 0, askedAt: 0 });
  st.count += 1;
  const due = st.count >= REVIEW_AFTER && Date.now() - st.askedAt > 90 * 86400e3;
  if (due && isNative) {
    st.askedAt = Date.now();
    st.count = 0;
    try {
      await InAppReview.requestReview();
    } catch {
      // ignora
    }
  }
  save('review', st);
}
