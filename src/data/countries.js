// Paesi supportati. Condiviso tra l'app e lo script EPG (scripts/epg/build-epg.mjs).
// `sources`: feed XMLTV giornalieri (epgshare01.online), `tz`: fuso orario usato per dividere i giorni.
const EPGSHARE = 'https://epgshare01.online/epgshare01/epg_ripper_';

export const COUNTRIES = [
  { code: 'IT', flag: '🇮🇹', name: 'Italia', lang: 'it', tz: 'Europe/Rome', sources: [`${EPGSHARE}IT1.xml.gz`] },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', lang: 'en', tz: 'Europe/London', sources: [`${EPGSHARE}UK1.xml.gz`] },
  { code: 'IE', flag: '🇮🇪', name: 'Ireland', lang: 'en', tz: 'Europe/Dublin', sources: [`${EPGSHARE}IE1.xml.gz`] },
  { code: 'US', flag: '🇺🇸', name: 'United States', lang: 'en', tz: 'America/New_York', sources: [`${EPGSHARE}US2.xml.gz`] },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', lang: 'en', tz: 'America/Toronto', sources: [`${EPGSHARE}CA2.xml.gz`] },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', lang: 'en', tz: 'Australia/Sydney', sources: [`${EPGSHARE}AU1.xml.gz`] },
  { code: 'DE', flag: '🇩🇪', name: 'Deutschland', lang: 'de', tz: 'Europe/Berlin', sources: [`${EPGSHARE}DE1.xml.gz`] },
  { code: 'AT', flag: '🇦🇹', name: 'Österreich', lang: 'de', tz: 'Europe/Vienna', sources: [`${EPGSHARE}AT1.xml.gz`] },
  { code: 'CH', flag: '🇨🇭', name: 'Schweiz / Suisse', lang: 'de', tz: 'Europe/Zurich', sources: [`${EPGSHARE}CH1.xml.gz`] },
  { code: 'FR', flag: '🇫🇷', name: 'France', lang: 'fr', tz: 'Europe/Paris', sources: [`${EPGSHARE}FR1.xml.gz`] },
  { code: 'BE', flag: '🇧🇪', name: 'Belgique / België', lang: 'fr', tz: 'Europe/Brussels', sources: [`${EPGSHARE}BE2.xml.gz`] },
  { code: 'ES', flag: '🇪🇸', name: 'España', lang: 'es', tz: 'Europe/Madrid', sources: [`${EPGSHARE}ES1.xml.gz`] },
  { code: 'MX', flag: '🇲🇽', name: 'México', lang: 'es', tz: 'America/Mexico_City', sources: [`${EPGSHARE}MX1.xml.gz`] },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina', lang: 'es', tz: 'America/Argentina/Buenos_Aires', sources: [`${EPGSHARE}AR1.xml.gz`] },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', lang: 'pt', tz: 'Europe/Lisbon', sources: [`${EPGSHARE}PT1.xml.gz`] },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil', lang: 'pt', tz: 'America/Sao_Paulo', sources: [`${EPGSHARE}BR1.xml.gz`, `${EPGSHARE}BR2.xml.gz`] },
  { code: 'NL', flag: '🇳🇱', name: 'Nederland', lang: 'en', tz: 'Europe/Amsterdam', sources: [`${EPGSHARE}NL1.xml.gz`] },
];

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
