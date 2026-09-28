// Genera icona, splash e immagini di brand da SVG (sharp).
//   resources/icon-only.png, splash.png, splash-dark.png   → input di @capacitor/assets
//   public/favicon.svg, public/og-image.png               → web / anteprima link condivisi
//   resources/notify/ic_stat_notify-<dpi>.png             → icona notifica Android (bianca)
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const BG = '#0b0d18';

const tvGlyph = (fill = '#fff') => `
  <g fill="none" stroke="${fill}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round">
    <path d="M404 250 L512 340 L620 250"/>
    <rect x="232" y="340" width="560" height="400" rx="84"/>
  </g>
  <path d="M470 470 L470 610 L590 540 Z" fill="${fill}"/>
  <circle cx="712" cy="682" r="0"/>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c6cff"/><stop offset="1" stop-color="#ff4d6d"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  ${tvGlyph()}
  <g transform="translate(700 690)">
    <circle r="118" fill="#f5b83d" stroke="#fff" stroke-width="28"/>
    <path d="M0 -58 L17 -18 L60 -18 L25 8 L38 50 L0 25 L-38 50 L-25 8 L-60 -18 L-17 -18 Z" fill="#fff"/>
  </g>
</svg>`;

const splashSvg = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${bg}"/>
  <g transform="translate(1066 1066) scale(0.586)">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c6cff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient></defs>
    <rect width="1024" height="1024" rx="230" fill="url(#g)"/>
    ${tvGlyph()}
  </g>
</svg>`;

const notifySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${tvGlyph('#fff')}</svg>`;

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c6cff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient></defs>
  <rect width="1200" height="630" fill="${BG}"/>
  <g transform="translate(90 155) scale(0.31)"><rect width="1024" height="1024" rx="230" fill="url(#g)"/>${tvGlyph()}</g>
  <text x="460" y="290" font-family="Segoe UI, Arial, sans-serif" font-size="92" font-weight="800" fill="#fff">CineGuide</text>
  <text x="462" y="370" font-family="Segoe UI, Arial, sans-serif" font-size="40" fill="#9097b3">Guida TV · TV Guide · Guía TV</text>
  <text x="462" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="32" fill="#9097b3">Promemoria · Serie · Stasera in TV</text>
</svg>`;

await mkdir('resources/notify', { recursive: true });
await sharp(Buffer.from(iconSvg)).png().toFile('resources/icon-only.png');
await sharp(Buffer.from(splashSvg(BG))).png().toFile('resources/splash.png');
await sharp(Buffer.from(splashSvg(BG))).png().toFile('resources/splash-dark.png');
await sharp(Buffer.from(ogSvg)).png().toFile('public/og-image.png');
await writeFile('public/favicon.svg', iconSvg.replace('<rect width="1024" height="1024" fill="url(#g)"/>', '<rect width="1024" height="1024" rx="230" fill="url(#g)"/>'));
for (const [dpi, size] of Object.entries({ mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 })) {
  await sharp(Buffer.from(notifySvg)).resize(size, size).png().toFile(`resources/notify/ic_stat_notify-${dpi}.png`);
}
console.log('Asset generati');
