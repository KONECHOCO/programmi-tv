// Grafiche per Google Play: icona 512×512 e immagine in evidenza 1024×500 (store/play/).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('store/play', { recursive: true });
await sharp('resources/icon-only.png').resize(512, 512).png().toFile('store/play/icon-512.png');

const tv = `
  <g fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round">
    <path d="M404 250 L512 340 L620 250"/><rect x="232" y="340" width="560" height="400" rx="84"/>
  </g><path d="M470 470 L470 610 L590 540 Z" fill="#fff"/>`;
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c6cff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient>
  </defs>
  <rect width="1024" height="500" fill="#0b0d18"/>
  <circle cx="900" cy="80" r="260" fill="url(#g)" opacity="0.18"/>
  <g transform="translate(70 110) scale(0.27)"><rect width="1024" height="1024" rx="230" fill="url(#g)"/>${tv}</g>
  <text x="380" y="215" font-family="Segoe UI, Arial, sans-serif" font-size="84" font-weight="800" fill="#fff">CineGuide</text>
  <text x="383" y="285" font-family="Segoe UI, Arial, sans-serif" font-size="36" fill="#c9cbe0">Guida TV · Stasera in TV</text>
  <text x="383" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#9097b3">Promemoria · Serie · 17 paesi</text>
</svg>`;
await sharp(Buffer.from(feature)).png().toFile('store/play/feature-1024x500.png');
console.log('store/play/icon-512.png, store/play/feature-1024x500.png');
