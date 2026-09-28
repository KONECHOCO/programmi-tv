#!/usr/bin/env node
// Crea (se manca) il profilo di provisioning App Store per il bundle dell'app,
// usando i certificati di distribuzione iOS validi dell'account.
// Stesse variabili di asc-setup.mjs. Uso: node scripts/store/asc-profile.mjs
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BUNDLE = 'com.ikonet.cineguide';
const PROFILE_NAME = 'CineGuide App Store';
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_PATH } = process.env;
const key = createPrivateKey(readFileSync(ASC_PRIVATE_KEY_PATH));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${json.errors?.map((e) => e.detail).join(' | ')}`);
  return json;
}

const bundle = (await api('GET', `/v1/bundleIds?filter[identifier]=${BUNDLE}`)).data.find((b) => b.attributes.identifier === BUNDLE);
const certs = (await api('GET', '/v1/certificates?limit=200')).data.filter(
  (c) => ['DISTRIBUTION', 'IOS_DISTRIBUTION'].includes(c.attributes.certificateType) && new Date(c.attributes.expirationDate) > new Date(),
);
console.log('Certificati di distribuzione validi:');
for (const c of certs) console.log(`  ${c.id}  ${c.attributes.name}  ${c.attributes.certificateType}  scade ${c.attributes.expirationDate.slice(0, 10)}  serial ${c.attributes.serialNumber}`);

const existing = (await api('GET', `/v1/bundleIds/${bundle.id}/profiles`)).data.filter((p) => p.attributes.profileType === 'IOS_APP_STORE' && p.attributes.profileState === 'ACTIVE');
if (existing.length) {
  console.log(`Profilo già presente: ${existing.map((p) => p.attributes.name).join(', ')}`);
} else {
  const profile = (await api('POST', '/v1/profiles', {
    data: {
      type: 'profiles',
      attributes: { name: PROFILE_NAME, profileType: 'IOS_APP_STORE' },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: bundle.id } },
        certificates: { data: certs.map((c) => ({ type: 'certificates', id: c.id })) },
      },
    },
  })).data;
  console.log(`Profilo creato: ${profile.attributes.name} (${profile.id}), scade ${profile.attributes.expirationDate.slice(0, 10)}`);
}
