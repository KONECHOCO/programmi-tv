# CineGuide — Guida TV

App per iOS e Android (React + Vite + Capacitor 7) con la guida TV di 17 paesi, promemoria, serie seguite, voti,
condivisione, 6 lingue (IT, EN, ES, FR, DE, PT), pubblicità AdMob e acquisto unico **CineGuide Pro 2,99 €** senza pubblicità.

## Architettura

```
GitHub Actions (ogni 6 ore)                         App (iOS / Android / web)
 scripts/epg/build-epg.mjs                           src/services/epg.js
   ├─ XMLTV per paese (epgshare01.online)   ──►  https://konechoco.github.io/programmi-tv/epg/
   ├─ loghi canali (iptv-org)                          index.json · <PAESE>/channels.json · <PAESE>/<data>.json
   └─ lineup e numeri LCN (scripts/epg/lineups.mjs)
```

- **Dati**: nessun server da mantenere. Il workflow `.github/workflows/pages.yml` rigenera la guida ogni 6 ore e pubblica
  su GitHub Pages anche la versione web (per i link condivisi) e le pagine legali (`public/legal`).
- **Canali**: i canali principali di ogni paese sono in `scripts/epg/lineups.mjs` (ordine, numero telecomando, gratuito/pay).
  Per aggiungere un canale o un alias basta modificare quel file. I canali per adulti vengono esclusi automaticamente.
- **Notifiche**: `@capacitor/local-notifications` (promemoria + avvisi automatici per le serie seguite, max 60 in coda).
- **Pubblicità**: `@capacitor-community/admob` con consenso GDPR (UMP) e App Tracking Transparency su iOS.
- **Pro**: `cordova-plugin-purchase`, prodotto non consumabile `com.ikonet.cineguide.pro`.

## Sviluppo

```bash
npm install
npm run epg:dev      # scarica la guida in .epg-cache (servita su /epg dal dev server)
npm run dev
```

Altri comandi: `npm run build`, `npm run lint`, `npx cap sync`, `npm run assets:generate` (icone/splash da `resources/`),
`npm run screenshots:store` (screenshot degli store in `store/screenshots`, con il dev server avviato).

## Pubblicazione

| Cosa | Dove |
|------|------|
| Testi store 6 lingue, IAP, note revisione | `store/listing.json` |
| Screenshot iPhone 6.9", iPad 13", Android | `store/screenshots/<device>/<lingua>/` |
| Caricamento su App Store Connect (testi, categorie, IAP 2,99 €) | `node scripts/store/asc-setup.mjs [--apply]` |
| Build firmate | `codemagic.yaml` (`android-release`, `ios-release`) |
| Privacy / termini / supporto | `https://konechoco.github.io/programmi-tv/legal/` |

Passaggi manuali una tantum (non automatizzabili via API):
1. **AdMob**: creare le app iOS e Android e le unità banner + interstitial; mettere i 6 ID nel gruppo Codemagic `cineguide_admob`.
2. **App Store Connect**: creare l'app (bundle `com.ikonet.cineguide`, SKU `cineguide-ios`), poi lanciare `asc-setup.mjs --apply`.
3. **Google Play Console**: creare l'app `com.ikonet.cineguide`, il prodotto in-app `com.ikonet.cineguide.pro` a 2,99 €,
   e compilare scheda dati/sicurezza (ID pubblicità: sì; dati raccolti: solo tramite AdMob).
4. **Codemagic**: aggiungere il repo e avviare `android-release` e `ios-release`.
