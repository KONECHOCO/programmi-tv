// Verifica l'accesso del service account all'app su Google Play (apre e scarta un edit).
// Uso: PLAY_SA_PATH=... node scripts/store/play-check.mjs
import { playApi, serviceAccountEmail } from './play-api.mjs';

const PKG = 'com.ikonet.cineguide';
try {
  const edit = await playApi('POST', `/applications/${PKG}/edits`, {});
  const details = await playApi('GET', `/applications/${PKG}/edits/${edit.id}/details`);
  const tracks = await playApi('GET', `/applications/${PKG}/edits/${edit.id}/tracks`);
  console.log(`${serviceAccountEmail} → accesso OK`);
  console.log('dettagli:', JSON.stringify(details));
  console.log('canali:', (tracks.tracks || []).map((t) => t.track).join(', '));
  await playApi('DELETE', `/applications/${PKG}/edits/${edit.id}`);
} catch (err) {
  console.log(`${serviceAccountEmail} → ${err.message}`);
}
