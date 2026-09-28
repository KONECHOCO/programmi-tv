// Persistenza locale (localStorage del WebView). Ogni accesso è protetto: se lo storage
// non è disponibile l'app continua a funzionare con i valori di default.
const PREFIX = 'cineguide:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota piena o storage disabilitato: ignora
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignora
  }
}

// Rimuove le cache EPG più vecchie per non superare la quota dello storage.
export function pruneCache(keep) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX + 'epg:') && !keep.includes(k.slice(PREFIX.length))) localStorage.removeItem(k);
    }
  } catch {
    // ignora
  }
}
