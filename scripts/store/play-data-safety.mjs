#!/usr/bin/env node
// Invia a Google Play la dichiarazione "Sicurezza dei dati" (API applications.dataSafety, formato CSV di Play Console).
// Dati raccolti dall'SDK AdMob: posizione approssimativa, interazioni, log arresti anomali, diagnostica, ID dispositivo.
// Programma ambasciatori (solo utenti invitati): interazioni e ID dispositivo (hash) anche per prevenzione frodi.
// Uso: PLAY_SA_PATH=chiave.json node scripts/store/play-data-safety.mjs
import { readFileSync } from 'node:fs';
import { playApi } from './play-api.mjs';

const PKG = JSON.parse(readFileSync(new URL('../../store/listing.json', import.meta.url), 'utf8')).app.bundleId;

const rows = [
  ['PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA', '', 'true'],
  ['PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT', '', 'true'],
  ['PSL_SUPPORTED_ACCOUNT_CREATION_METHODS', 'PSL_ACM_NONE', 'true'],
  ['PSL_HAS_OUTSIDE_APP_ACCOUNTS', '', 'false'],
  ['PSL_DATA_TYPES_LOCATION', 'PSL_APPROX_LOCATION', 'true'],
  ['PSL_DATA_TYPES_APP_PERFORMANCE', 'PSL_CRASH_LOGS', 'true'],
  ['PSL_DATA_TYPES_APP_PERFORMANCE', 'PSL_PERFORMANCE_DIAGNOSTICS', 'true'],
  ['PSL_DATA_TYPES_APP_ACTIVITY', 'PSL_USER_INTERACTION', 'true'],
  ['PSL_DATA_TYPES_IDENTIFIERS', 'PSL_DEVICE_ID', 'true'],
];

// Tutti i tipi: raccolti e condivisi (SDK AdMob), non effimeri, raccolta obbligatoria, per pubblicità;
// log e diagnostica anche per analisi.
const types = {
  PSL_APPROX_LOCATION: ['PSL_ADVERTISING'],
  PSL_CRASH_LOGS: ['PSL_ADVERTISING', 'PSL_ANALYTICS'],
  PSL_PERFORMANCE_DIAGNOSTICS: ['PSL_ADVERTISING', 'PSL_ANALYTICS'],
  PSL_USER_INTERACTION: ['PSL_ADVERTISING', 'PSL_ANALYTICS'],
  PSL_DEVICE_ID: ['PSL_ADVERTISING'],
};
// Raccolti da noi (non condivisi) per il programma ambasciatori: verifica utenti reali e anti-frode.
const collectOnly = { PSL_USER_INTERACTION: ['PSL_FRAUD_PREVENTION_SECURITY'], PSL_DEVICE_ID: ['PSL_FRAUD_PREVENTION_SECURITY'] };
for (const [t, purposes] of Object.entries(types)) {
  const q = (k) => `PSL_DATA_USAGE_RESPONSES:${t}:${k}`;
  rows.push(
    [q('PSL_DATA_USAGE_COLLECTION_AND_SHARING'), 'PSL_DATA_USAGE_ONLY_COLLECTED', 'true'],
    [q('PSL_DATA_USAGE_COLLECTION_AND_SHARING'), 'PSL_DATA_USAGE_ONLY_SHARED', 'true'],
    [q('PSL_DATA_USAGE_EPHEMERAL'), '', 'false'],
    [q('DATA_USAGE_USER_CONTROL'), 'PSL_DATA_USAGE_USER_CONTROL_REQUIRED', 'true'],
  );
  for (const p of purposes) {
    rows.push([q('DATA_USAGE_COLLECTION_PURPOSE'), p, 'true'], [q('DATA_USAGE_SHARING_PURPOSE'), p, 'true']);
  }
  for (const p of collectOnly[t] || []) rows.push([q('DATA_USAGE_COLLECTION_PURPOSE'), p, 'true']);
}

const header = 'Question ID (machine readable),Response ID (machine readable),Response value,Answer requirement,Human-friendly question label';
const csv = [header, ...rows.map((r) => `${r.join(',')},,`)].join('\r\n') + '\r\n';
await playApi('POST', `/applications/${PKG}/dataSafety`, { safetyLabels: csv });
console.log(`sicurezza dei dati inviata: ${rows.length} risposte`);
