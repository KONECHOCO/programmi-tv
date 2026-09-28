import { useMemo, useState } from 'react';
import { Moon } from 'lucide-react';
import { useApp } from '../state/AppState';
import { atLocalTime } from '../services/epg';
import { timeOf, durationMin } from '../lib/format';
import { ChannelLogo, Chip, EmptyState, GenreTag } from './ui';

// Orario "di riferimento" della prima serata per paese (ora locale).
const PRIME_TIME = {
  IT: '21:25', GB: '21:00', IE: '21:00', US: '20:30', CA: '20:30', AU: '19:45', DE: '20:15', AT: '20:15', CH: '20:10',
  FR: '21:10', BE: '20:45', ES: '22:45', MX: '21:00', AR: '21:45', PT: '21:30', BR: '21:30', NL: '20:30',
};
const GENRES = ['all', 'movie', 'series', 'sport', 'show', 'doc', 'kids', 'news'];

function Poster({ src }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="w-20 h-28 rounded-xl object-cover shrink-0 bg-surface-2"
      onError={() => setOk(false)}
      onLoad={(e) => e.currentTarget.naturalWidth < 10 && setOk(false)}
    />
  );
}

function airingAt(list, sec) {
  return list?.find((p) => p.s <= sec && p.e > sec) || null;
}

export default function TonightView({ channels, programmes, date, onOpen }) {
  const { t, locale, country } = useApp();
  const [genre, setGenre] = useState('all');
  const [slot, setSlot] = useState('prime');

  const rows = useMemo(() => {
    if (!programmes || !date) return [];
    const prime = atLocalTime(date, PRIME_TIME[country.code] || '21:00', country.tz);
    return channels
      .map((ch) => {
        const list = programmes[ch.id];
        const first = airingAt(list, prime);
        const late = first ? airingAt(list, Math.max(first.e + 60, prime + 2 * 3600)) : airingAt(list, prime + 2 * 3600);
        return { ch, p: slot === 'prime' ? first : late };
      })
      .filter((r) => r.p && (genre === 'all' || r.p.g === genre));
  }, [channels, programmes, date, country, slot, genre]);

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Chip active={slot === 'prime'} onClick={() => setSlot('prime')}>{t('primeTime')}</Chip>
        <Chip active={slot === 'late'} onClick={() => setSlot('late')}>{t('lateNight')}</Chip>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3">
        {GENRES.map((g) => (
          <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>{t(`genre_${g}`)}</Chip>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Moon} text={t('noResults')} />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ ch, p }) => (
            <li key={ch.id}>
              <button onClick={() => onOpen(p)} className="w-full flex gap-3 p-3 rounded-2xl bg-surface border border-line text-left active:scale-[0.99] transition-transform">
                <div className="flex flex-col items-center gap-1 w-11 shrink-0">
                  <ChannelLogo channel={ch} size={40} />
                  {ch.lcn != null && <span className="text-[10px] font-bold text-muted">{ch.lcn}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-muted tabular-nums">
                    {timeOf(p.s, locale, country.tz)} · {durationMin(p)} {t('minutesShort')}
                  </div>
                  <div className="font-bold text-[15px] leading-snug line-clamp-2">{p.t}</div>
                  {p.st && <div className="text-[12px] text-muted truncate">{p.st}</div>}
                  <GenreTag genre={p.g} t={t} />
                </div>
                {p.i && <Poster src={p.i} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
