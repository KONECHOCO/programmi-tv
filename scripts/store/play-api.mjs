// Accesso minimo a Google Play Developer API con un service account (JWT RS256, nessuna dipendenza).
// Uso come modulo: import { playApi } from './play-api.mjs'; variabile PLAY_SA_PATH = file JSON del service account.
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sa = JSON.parse(readFileSync(process.env.PLAY_SA_PATH, 'utf8'));
let cached = null;

async function token() {
  if (cached && cached.exp > Date.now() + 60e3) return cached.value;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`token: ${JSON.stringify(json)}`);
  cached = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return cached.value;
}

export const serviceAccountEmail = sa.client_email;

export async function playApi(method, path, body, { upload, contentType } = {}) {
  const base = upload ? 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3' : 'https://androidpublisher.googleapis.com/androidpublisher/v3';
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, ...(body && { 'Content-Type': contentType || 'application/json' }) },
    body: body == null ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body)),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json.error?.message || text.slice(0, 300)}`);
  return json;
}
