import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../state/AppState';
import { whenLabel } from '../lib/format';
import { ChannelLogo, EmptyState, GenreTag } from './ui';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function SearchView({ channels, days, availableDays, ensureDay, now, onOpen }) {
  const { t, locale, country } = useApp();
  const [query, setQuery] = useState('');
  const byId = useMemo(() => Object.fromEntries(channels.map((c) => [c.id, c])), [channels]);

  useEffect(() => {
    availableDays.forEach((d) => ensureDay(d));
  }, [availableDays, ensureDay]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < 2) return [];
    const out = [];
    const seen = new Set();
    for (const date of availableDays) {
      const day = days[date];
      if (!day) continue;
      for (const [ch, list] of Object.entries(day)) {
        if (!byId[ch]) continue;
        for (const p of list) {
          if (p.e <= now || seen.has(p.id)) continue;
          if (norm(p.t).includes(q) || norm(p.st).includes(q) || norm(p.ca).includes(q)) {
            seen.add(p.id);
            out.push(p);
          }
        }
      }
    }
    // Prima i titoli che iniziano con la ricerca, poi in ordine di orario.
    return out
      .sort((a, b) => Number(!norm(a.t).startsWith(q)) - Number(!norm(b.t).startsWith(q)) || a.s - b.s)
      .slice(0, 120);
  }, [query, days, availableDays, byId, now]);

  return (
    <div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          autoFocus
          enterKeyHint="search"
          className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface border border-line text-[15px] placeholder:text-muted focus:outline-none focus:border-accent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted" aria-label={t('close')}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {query.trim().length < 2 ? (
        <EmptyState icon={Search} text={t('searchHint')} />
      ) : results.length === 0 ? (
        <EmptyState icon={Search} text={t('noResults')} />
      ) : (
        <ul className="divide-y divide-line">
          {results.map((p) => (
            <li key={p.id}>
              <button onClick={() => onOpen(p)} className="w-full flex items-center gap-3 py-3 text-left">
                <ChannelLogo channel={byId[p.ch]} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px] truncate">{p.t}</div>
                  <div className="text-[12px] text-muted truncate">
                    {p.s <= now ? <span className="text-live font-bold">● {t('live')} </span> : `${whenLabel(p.s, t, locale, country.tz)} · `}
                    {byId[p.ch]?.name}
                  </div>
                  <GenreTag genre={p.g} t={t} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
