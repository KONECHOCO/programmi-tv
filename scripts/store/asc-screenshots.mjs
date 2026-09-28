#!/usr/bin/env node
// Carica gli screenshot di store/screenshots/{iphone,ipad}/<lingua>/ nella versione iOS in preparazione.
// Sostituisce quelli esistenti per le stesse lingue/dispositivi. Stesse variabili di asc-setup.mjs.
// Uso: node scripts/store/asc-screenshots.mjs
import { createPrivateKey, sign, createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const listing = JSON.parse(readFileSync(new URL('../../store/listing.json', import.meta.url), 'utf8'));
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_PATH } = process.env;
const key = createPrivateKey(readFileSync(ASC_PRIVATE_KEY_PATH));
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const p = b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
  return `${h}.${p}.${sign('sha256', Buffer.from(`${h}.${p}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
async function api(method, p, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
    method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
  });
  if (res.status === 204) return {};
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${json.errors?.map((e) => e.detail).join(' | ')}`);
  return json;
}

const DISPLAY = { iphone: 'APP_IPHONE_67', ipad: 'APP_IPAD_PRO_3GEN_129' };
const app = (await api('GET', `/v1/apps?filter[bundleId]=${listing.app.bundleId}`)).data[0];
const version = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&filter[appStoreState]=PREPARE_FOR_SUBMISSION`)).data[0];
const locs = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`)).data;

for (const [lang, loc] of Object.entries(listing.locales)) {
  for (const locale of loc.asc) {
    const vl = locs.find((l) => l.attributes.locale === locale);
    if (!vl) continue;
    const sets = (await api('GET', `/v1/appStoreVersionLocalizations/${vl.id}/appScreenshotSets`)).data;
    for (const [device, displayType] of Object.entries(DISPLAY)) {
      const dir = path.resolve('store', 'screenshots', device, lang);
      if (!existsSync(dir)) continue;
      let set = sets.find((s) => s.attributes.screenshotDisplayType === displayType);
      if (set) {
        const old = (await api('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`)).data;
        for (const s of old) await api('DELETE', `/v1/appScreenshots/${s.id}`);
      } else {
        set = (await api('POST', '/v1/appScreenshotSets', {
          data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: displayType }, relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: vl.id } } } },
        })).data;
      }
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
        const buf = readFileSync(path.join(dir, file));
        const shot = (await api('POST', '/v1/appScreenshots', {
          data: { type: 'appScreenshots', attributes: { fileName: file, fileSize: buf.length }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } },
        })).data;
        for (const op of shot.attributes.uploadOperations) {
          const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
          const r = await fetch(op.url, { method: op.method, headers, body: buf.subarray(op.offset, op.offset + op.length) });
          if (!r.ok) throw new Error(`upload ${file}: ${r.status}`);
        }
        await api('PATCH', `/v1/appScreenshots/${shot.id}`, {
          data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(buf).digest('hex') } },
        });
      }
      console.log(`${locale} ${device}: caricati`);
    }
  }
}
console.log('Screenshot caricati.');
