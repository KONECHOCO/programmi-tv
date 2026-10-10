#!/usr/bin/env node
// Pubblica CineGuide su Google Play tramite API (un unico "edit"):
//   - scheda dello store in tutte le lingue di store/listing.json (titolo, breve, completa)
//   - icona, immagine in evidenza, screenshot telefono (store/play, store/screenshots/android/<lingua>)
//   - contatti e lingua predefinita
//   - AAB nel canale indicato (default: internal, stato "draft" finché l'app non è mai stata pubblicata)
//
// Uso: PLAY_SA_PATH=chiave.json node scripts/store/play-publish.mjs --aab percorso.aab [--track internal] [--status draft] [--no-images]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { playApi } from './play-api.mjs';

const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const AAB = arg('aab');
const TRACK = arg('track', 'internal');
const STATUS = arg('status', 'draft');
const IMAGES = !args.includes('--no-images');

const listing = JSON.parse(readFileSync(new URL('../../store/listing.json', import.meta.url), 'utf8'));
const PKG = listing.app.bundleId;
const base = `/applications/${PKG}/edits`;

const edit = await playApi('POST', base, {});
const E = `${base}/${edit.id}`;
console.log(`edit ${edit.id}`);

// 1. Schede dello store
for (const [lang, loc] of Object.entries(listing.locales)) {
  for (const language of loc.play) {
    await playApi('PUT', `${E}/listings/${language}`, {
      language,
      title: loc.name,
      shortDescription: loc.playShort,
      fullDescription: loc.description,
    });
    console.log(`scheda ${language}: ${loc.name}`);

    if (!IMAGES) continue;
    const upload = async (type, file) => {
      await playApi('POST', `${E}/listings/${language}/${type}?uploadType=media`, readFileSync(file), { upload: true, contentType: 'image/png' });
    };
    await playApi('DELETE', `${E}/listings/${language}/icon`).catch(() => {});
    await upload('icon', 'store/play/icon-512.png');
    await playApi('DELETE', `${E}/listings/${language}/featureGraphic`).catch(() => {});
    await upload('featureGraphic', 'store/play/feature-1024x500.png');
    const dir = path.join('store', 'screenshots', 'android', lang);
    if (existsSync(dir)) {
      await playApi('DELETE', `${E}/listings/${language}/phoneScreenshots`).catch(() => {});
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.png')).sort()) await upload('phoneScreenshots', path.join(dir, f));
    }
    console.log(`  immagini ${language}: icona, evidenza, screenshot`);
  }
}

// 2. Contatti e lingua predefinita
await playApi('PUT', `${E}/details`, {
  defaultLanguage: 'it-IT',
  contactEmail: 'konechocoproduction@gmail.com',
  contactWebsite: listing.app.marketingUrl,
});
console.log('dettagli: lingua predefinita it-IT, contatti');

// 3. Bundle e canale
if (AAB) {
  const bundle = await playApi('POST', `/applications/${PKG}/edits/${edit.id}/bundles?uploadType=media`, readFileSync(AAB), { upload: true, contentType: 'application/octet-stream' });
  console.log(`bundle caricato: versionCode ${bundle.versionCode}`);
  await playApi('PUT', `${E}/tracks/${TRACK}`, {
    track: TRACK,
    releases: [{
      name: `1.0.1 (${bundle.versionCode})`,
      versionCodes: [String(bundle.versionCode)],
      status: STATUS,
      releaseNotes: [
        { language: 'it-IT', text: listing.locales.it.whatsNew },
        { language: 'en-US', text: listing.locales.en.whatsNew },
      ],
    }],
  });
  console.log(`canale ${TRACK}: release ${STATUS}`);
}

await playApi('POST', `${E}:commit`);
console.log('✅ modifiche pubblicate su Play Console');
