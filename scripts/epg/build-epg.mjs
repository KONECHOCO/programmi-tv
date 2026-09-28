#!/usr/bin/env node
// Genera la guida TV statica per l'app:
//   <out>/index.json                 elenco paesi disponibili + giorni + data di generazione
//   <out>/<CC>/channels.json         canali ordinati (nome, numero, pacchetto, logo)
//   <out>/<CC>/<YYYY-MM-DD>.json     programmi del giorno (ora locale del paese), per canale
//
// Fonte programmi: feed XMLTV giornalieri di epgshare01.online.
// Fonte loghi: database open source iptv-org (https://github.com/iptv-org/database).
//
// Uso: node scripts/epg/build-epg.mjs [cartellaOutput=dist/epg] [CODICI=tutti]
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { COUNTRIES } from '../../src/data/countries.js';
import { LINEUPS, PAY_KEYWORDS } from './lineups.mjs';

const OUT_DIR = path.resolve(process.argv[2] || 'dist/epg');
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const DAYS_BACK = 0; // i programmi a cavallo della mezzanotte sono inclusi anche nel giorno dopo
const DAYS_AHEAD = 7;
const MAX_DESC = 400;
const MIN_PROGRAMMES = 8;
const MAX_CHANNELS = 150;

// ─── Utility ───────────────────────────────────────────────────────────────
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
  if (!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeName(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\.(it|uk|us|de|fr|es|pt|br|mx|ar|nl|be|at|ch|ie|ca|au)$/g, ' ')
    .replace(/\b(f?hd|uhd|sd|4k|hevc|tv hd)\b/g, ' ')
    .replace(/\b\d{3,4}\b/g, ' ') // numeri di posizione tipo "(101)" o ".5021"
    .replace(/[^a-z0-9!+]+/g, '')
    .replace(/!$/, '');
}

const isTimeshift = (name) => /\+\s*\d+|\+\s*$|\+24|\btimeshift\b/i.test(name);

function attr(tagAttrs, key) {
  const m = tagAttrs.match(new RegExp(`${key}="([^"]*)"`));
  return m ? m[1] : '';
}
function firstTag(body, tag) {
  const m = body.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : '';
}
function allTags(body, tag) {
  return [...body.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => decode(m[1]));
}

function parseXmltvDate(s) {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, sec = '00', off = '+0000'] = m;
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec);
  const sign = off[0] === '-' ? -1 : 1;
  const offMin = sign * (parseInt(off.slice(1, 3), 10) * 60 + parseInt(off.slice(3, 5), 10));
  return Math.round((utc - offMin * 60000) / 1000);
}

function safeImage(url) {
  if (!url) return undefined;
  const u = decode(url);
  if (u.startsWith('https://')) return u;
  if (u.startsWith('http://')) return 'https://' + u.slice(7);
  return undefined;
}

function episodeLabel(body) {
  const onscreen = body.match(/<episode-num system="onscreen">([^<]*)<\/episode-num>/);
  if (onscreen) return decode(onscreen[1]);
  const ns = body.match(/<episode-num system="xmltv_ns">([^<]*)<\/episode-num>/);
  if (ns) {
    const [s, e] = ns[1].split('.').map((p) => parseInt(p.split('/')[0], 10));
    const parts = [];
    if (Number.isFinite(s)) parts.push(`S${s + 1}`);
    if (Number.isFinite(e)) parts.push(`E${e + 1}`);
    return parts.join(' ') || undefined;
  }
  return undefined;
}

// ─── Generi ────────────────────────────────────────────────────────────────
const UMBRELLA = /^(ragazzi e musica|mondo e tendenze|intrattenimento|altri( programmi)?|altro|other|varie)$/;
const GENRE_RULES = [
  ['sport', /sport|calcio|football|soccer|tennis|motori|motor|basket|rugby|ciclismo|golf|futbol|fussball|fußball|bundesliga|formel|eishockey|deport|esporte|formula|nfl|nba|boxe|boxing|equestr|volley|atletica|basquet|lucha|automovilismo|extremos|toros/],
  ['news', /notiziario|informazione|news|telegiornale|notizie|nachricht|noticias|noticiario|noticiero|informac|informativ|jornalismo|journal|actualit|attualit|actualidad|meteo|weather|wetter|economia|economy|business|wirtschaft|politic|current affairs|telejornal/],
  ['series', /telefilm|fiction|^serie|series|sitcom|soap|telenovela|novela|serien|serie$|feuilleton|episod|fernsehserie/],
  ['movie', /film|movie|cinema|\bcine\b|pelicula|filme|kino|lungometraggio|feature|cortometraje|thriller|western/],
  ['kids', /bambin|ragazzi|cartoni|animazione|children|kids|cartoon|infantil|kinder|jeunesse|enfant|anime|bimbi|preschool|animation|desenho|zeichentrick|animacao|animacion/],
  ['doc', /documentar|natura|nature|history|storia|scien|reportage|viaggi|travel|viaje|viagem|scoperta|cultura|kultur|arte|wildlife|dokument|doku|docu|educativ|societa|popoli|factual|ratgeber|wissenschaft|divulgativ|ciencia|medio ambiente/],
  ['music', /musica|music|musik|musique|concert|konzert|rock|pop/],
  ['sport', /pesca|caccia|fishing|hunting/],
];
// Generi narrativi senza "film"/"serie" esplicito: si decide in base a episodio e durata.
const FICTION = /drammatic|dramma|dram|azione|avventura|aventura|biografic|fantastic|fantasy|crime|poliziesc|policial|giallo|horror|terror|suspense|romantic|sentimental|fantascienza|sci-?fi|action|accion|acao|adventure|guerra|war|mystery|commedia|comedy|comedie|comedia|komodie|krimi|abenteuer|ficcao/;
const SHOW = /show|entertainment|talk|reality|quiz|game|variet|magazin|magacin|cucina|cooking|cocina|culinaria|koch|lifestyle|unterhaltung|divertissement|entretenimiento|entretenimento|intrattenimento|variedades|gesprach|entrevista|humor|espetaculo|ocio/;
// Contenuti per adulti: canali e programmi esclusi (linee guida App Store 1.1 / Google Play).
const ADULT = /erotic|erotik|erotico|xxx|porn|adult|hustler|playboy|penthouse|dorcel|redlight|brazzers|vivid|private tv|pink ?x|sexy|hot ?club/i;

function detectGenre(categories, { ep, minutes }) {
  const cats = categories.map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/-/g, '').trim());
  const specific = cats.filter((c) => !UMBRELLA.test(c));
  for (const list of [specific, cats]) {
    for (const [genre, re] of GENRE_RULES) {
      if (list.some((c) => re.test(c))) return genre;
    }
    if (list.some((c) => FICTION.test(c))) return ep || minutes < 70 ? 'series' : 'movie';
    if (list.some((c) => SHOW.test(c))) return 'show';
  }
  if (ep) return 'series';
  return 'other';
}

// ─── Fusi orari ────────────────────────────────────────────────────────────
function tzOffsetMs(tz, epochMs) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(epochMs)).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}
function localDateString(tz, epochMs) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(epochMs));
}
function localMidnight(tz, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d);
  const first = wall - tzOffsetMs(tz, wall);
  return wall - tzOffsetMs(tz, first); // seconda passata: corretto anche nei giorni di cambio ora
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// ─── Download ──────────────────────────────────────────────────────────────
async function download(url, { gz = url.endsWith('.gz'), json = false } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'CineGuide-EPG/1.0 (+https://github.com/KONECHOCO/programmi-tv)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const text = gz ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
      return json ? JSON.parse(text) : text;
    } catch (err) {
      if (attempt === 3) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// ─── Loghi da iptv-org ─────────────────────────────────────────────────────
async function loadLogoIndex() {
  try {
    const [channels, logos] = await Promise.all([
      download('https://iptv-org.github.io/api/channels.json', { json: true }),
      download('https://iptv-org.github.io/api/logos.json', { json: true }),
    ]);
    const logoByChannel = new Map();
    for (const l of logos) {
      if (l.feed || !l.url?.startsWith('https://')) continue;
      const prev = logoByChannel.get(l.channel);
      const score = (l.format === 'PNG' ? 2 : l.format === 'SVG' ? 0 : 1) + (l.tags?.includes('picons') ? -1 : 0) + Math.min(l.width || 0, 512) / 512;
      if (!prev || score > prev.score) logoByChannel.set(l.channel, { url: l.url, score });
    }
    const index = new Map(); // "CC:nome" -> url
    for (const ch of channels) {
      const logo = logoByChannel.get(ch.id);
      if (!logo) continue;
      const cc = ch.country === 'UK' ? 'GB' : ch.country;
      for (const n of [ch.name, ...(ch.alt_names || [])]) {
        const key = `${cc}:${normalizeName(n)}`;
        if (!index.has(key)) index.set(key, logo.url);
      }
    }
    console.log(`Loghi iptv-org: ${index.size} nomi indicizzati`);
    return index;
  } catch (err) {
    console.warn('Loghi iptv-org non disponibili:', err.message);
    return new Map();
  }
}

// ─── Parsing XMLTV ─────────────────────────────────────────────────────────
function parseXmltv(xml, into) {
  for (const m of xml.matchAll(/<channel\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/g)) {
    const id = decode(m[1]);
    if (into.channels.has(id)) continue;
    const icon = m[2].match(/<icon\s+src="([^"]+)"/);
    into.channels.set(id, { id, name: firstTag(m[2], 'display-name') || id, icon: safeImage(icon?.[1]) });
  }
  for (const m of xml.matchAll(/<programme\s([^>]*)>([\s\S]*?)<\/programme>/g)) {
    const a = m[1];
    const body = m[2];
    const channel = decode(attr(a, 'channel'));
    const s = parseXmltvDate(attr(a, 'start'));
    const e = parseXmltvDate(attr(a, 'stop'));
    if (!channel || !s || !e || e <= s) continue;
    const categories = allTags(body, 'category');
    if (categories.some((c) => ADULT.test(c))) {
      into.adultCount.set(channel, (into.adultCount.get(channel) || 0) + 1);
      continue;
    }
    const icon = body.match(/<icon\s+src="([^"]+)"/);
    const desc = firstTag(body, 'desc');
    const ep = episodeLabel(body);
    const prog = {
      s, e,
      t: firstTag(body, 'title'),
      st: firstTag(body, 'sub-title') || undefined,
      g: detectGenre(categories, { ep, minutes: (e - s) / 60 }),
      c: categories.find((c) => !UMBRELLA.test(c.toLowerCase())) || categories[0] || undefined,
      i: safeImage(icon?.[1]),
      d: desc ? (desc.length > MAX_DESC ? desc.slice(0, MAX_DESC - 1).trimEnd() + '…' : desc) : undefined,
      ep,
      y: (firstTag(body, 'date').match(/\d{4}/) || [])[0],
      dr: allTags(body, 'director').slice(0, 2).join(', ') || undefined,
      ca: allTags(body, 'actor').slice(0, 5).join(', ') || undefined,
    };
    if (!prog.t) continue;
    if (!into.programmes.has(channel)) into.programmes.set(channel, []);
    into.programmes.get(channel).push(prog);
  }
}

// ─── Selezione canali ──────────────────────────────────────────────────────
function selectChannels(country, feed, logoIndex) {
  const lineup = (LINEUPS[country.code] || []).map(([name, lcn, pkg, ...aliases], order) => ({
    name, lcn, pkg, order, keys: new Set([name, ...aliases].map(normalizeName)),
  }));
  const candidates = [];
  for (const [id, ch] of feed.channels) {
    const progs = feed.programmes.get(id) || [];
    if (progs.length < MIN_PROGRAMMES) continue;
    // Canale per adulti se il nome lo indica o se almeno il 20% dei programmi lo è.
    if (ADULT.test(ch.name) || ADULT.test(id) || (feed.adultCount.get(id) || 0) > progs.length * 0.25) continue;
    const norm = normalizeName(ch.name);
    const normId = normalizeName(id.replace(/\./g, ' '));
    const noPrefix = norm.replace(/^canal(?=[a-z])/, ''); // "Canal Telefe" -> "telefe"
    const entry = lineup.find((l) => l.keys.has(norm) || l.keys.has(normId) || l.keys.has(noPrefix));
    if (!entry && isTimeshift(ch.name)) continue;
    candidates.push({ id, ch, progs, norm, entry });
  }
  // Un solo canale per voce di lineup / nome normalizzato: tieni quello con più programmi.
  const best = new Map();
  for (const c of candidates) {
    const key = c.entry ? `L${c.entry.order}` : `N${c.norm}`;
    const prev = best.get(key);
    if (!prev || c.progs.length > prev.progs.length) best.set(key, c);
  }
  const all = [...best.values()];
  const matched = all.filter((c) => c.entry).sort((a, b) => a.entry.order - b.entry.order);
  // Altri canali: i più completi (programmi con descrizione), fino al limite, poi in ordine alfabetico.
  const richness = (c) => c.progs.filter((p) => p.d).length + c.progs.length * 0.2 + (c.ch.icon ? 5 : 0);
  const others = all
    .filter((c) => !c.entry)
    .sort((a, b) => richness(b) - richness(a))
    .slice(0, Math.max(0, MAX_CHANNELS - matched.length))
    .sort((a, b) => a.ch.name.localeCompare(b.ch.name));
  const chosen = [...matched, ...others];

  const usedIds = new Set();
  return chosen.map((c) => {
    const name = c.entry?.name || c.ch.name
      .replace(/\s*\((\d+|[A-Z][a-z]+( [A-Z][a-z]+)?)\)\s*$/, '') // "(101)", "(Argentina)"
      .replace(/\s+(F?HD|UHD)$/i, '')
      .trim();
    let slug = normalizeName(name) || normalizeName(c.id);
    while (usedIds.has(slug)) slug += '_';
    usedIds.add(slug);
    const lower = name.toLowerCase();
    const pkg = c.entry?.pkg || (PAY_KEYWORDS.some((k) => lower.includes(k)) ? 'pay' : 'other');
    const logo = logoIndex.get(`${country.code}:${normalizeName(name)}`) || logoIndex.get(`${country.code}:${c.norm}`) || c.ch.icon;
    return { id: slug, feedId: c.id, name, lcn: c.entry?.lcn ?? undefined, pkg, logo, progs: c.progs };
  });
}

// ─── Build per paese ───────────────────────────────────────────────────────
async function buildCountry(country, logoIndex) {
  const feed = { channels: new Map(), programmes: new Map(), adultCount: new Map() };
  for (const src of country.sources) {
    try {
      parseXmltv(await download(src), feed);
    } catch (err) {
      console.warn(`  [${country.code}] sorgente saltata: ${err.message}`);
    }
  }
  if (feed.channels.size === 0) throw new Error('nessun dato');

  const channels = selectChannels(country, feed, logoIndex);

  // Immagini usate da moltissimi programmi = segnaposto generici (es. "DTT_Cover"): meglio nessuna immagine.
  const imageUse = new Map();
  for (const ch of channels) for (const p of ch.progs) if (p.i) imageUse.set(p.i, (imageUse.get(p.i) || 0) + 1);
  for (const ch of channels) {
    for (const p of ch.progs) {
      if (p.i && (imageUse.get(p.i) > 12 || /placeholder|default|dtt_cover|noimage|no_image/i.test(p.i))) delete p.i;
    }
  }
  const today = localDateString(country.tz, Date.now());
  const days = [];
  const dir = path.join(OUT_DIR, country.code);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const built = [];
  for (let n = -DAYS_BACK; n <= DAYS_AHEAD; n++) {
    const date = addDays(today, n);
    const from = localMidnight(country.tz, date) / 1000;
    const to = localMidnight(country.tz, addDays(date, 1)) / 1000;
    const byChannel = {};
    let count = 0;
    for (const ch of channels) {
      const list = ch.progs
        .filter((p) => p.e > from && p.s < to)
        .sort((a, b) => a.s - b.s)
        .filter((p, i, arr) => i === 0 || p.s !== arr[i - 1].s); // niente duplicati
      if (list.length) {
        byChannel[ch.id] = list;
        count += list.length;
      }
    }
    built.push({ date, byChannel, count });
  }
  // Scarta i giorni ai margini con copertura troppo scarsa (feed che finisce a metà giornata).
  const maxCount = Math.max(...built.map((b) => b.count));
  for (const b of built) {
    if (b.count < maxCount * 0.25) continue;
    days.push(b.date);
    await writeFile(path.join(dir, `${b.date}.json`), JSON.stringify({ date: b.date, tz: country.tz, programmes: b.byChannel }));
  }

  const withData = new Set(days.length ? channels.filter((c) => c.progs.some((p) => p.s >= localMidnight(country.tz, days[0]) / 1000)).map((c) => c.id) : []);
  const channelList = channels
    .filter((c) => withData.has(c.id))
    .map(({ id, name, lcn, pkg, logo }) => ({ id, name, ...(lcn != null && { lcn }), pkg, ...(logo && { logo }) }));
  await writeFile(path.join(dir, 'channels.json'), JSON.stringify(channelList));
  return { channels: channelList.length, days, lineupMatched: channels.filter((c) => c.lcn != null || c.pkg !== 'other').length };
}

// ─── Main ──────────────────────────────────────────────────────────────────
const logoIndex = await loadLogoIndex();
await mkdir(OUT_DIR, { recursive: true });
const index = { generatedAt: new Date().toISOString(), source: 'epgshare01.online (XMLTV) + iptv-org', countries: {} };
let failures = 0;
for (const country of COUNTRIES.filter((c) => !ONLY || ONLY.includes(c.code))) {
  const t0 = Date.now();
  try {
    const r = await buildCountry(country, logoIndex);
    index.countries[country.code] = { channels: r.channels, days: r.days };
    console.log(`[${country.code}] ${r.channels} canali, giorni ${r.days[0]} → ${r.days.at(-1)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (err) {
    failures++;
    console.error(`[${country.code}] ERRORE: ${err.message}`);
  }
}
await writeFile(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 1));
if (Object.keys(index.countries).length === 0) {
  console.error('Nessun paese generato');
  process.exit(1);
}
console.log(`Fatto: ${Object.keys(index.countries).length} paesi, ${failures} errori → ${OUT_DIR}`);
