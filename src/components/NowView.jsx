import { Star, Bell, Tv } from 'lucide-react';
import { useApp } from '../state/AppState';
import { currentAndNext, progressOf } from '../services/epg';
import { timeOf } from '../lib/format';
import { ChannelLogo, ProgressBar, GenreTag, EmptyState } from './ui';

export default function NowView({ channels, programmes, now, onOpen }) {
  const { t, locale, country, isFavorite, toggleFavorite, reminders } = useApp();
  if (!channels.length) return <EmptyState icon={Tv} text={t('emptyFavs')} />;

  return (
    <ul className="divide-y divide-line">
      {channels.map((ch) => {
        const { current, next } = currentAndNext(programmes?.[ch.id], now);
        const main = current || next;
        const fav = isFavorite(ch.id);
        return (
          <li key={ch.id} className="flex items-center gap-3 py-3 px-1">
            <button className="flex flex-col items-center gap-1 w-12 shrink-0" onClick={() => main && onOpen(main)}>
              <ChannelLogo channel={ch} size={44} />
              {ch.lcn != null && <span className="text-[10px] font-bold text-muted">{ch.lcn}</span>}
            </button>
            <button className="flex-1 min-w-0 text-left" onClick={() => main && onOpen(main)} disabled={!main}>
              {main ? (
                <>
                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="truncate">{ch.name}</span>
                    <span>·</span>
                    <span className="tabular-nums">{timeOf(main.s, locale, country.tz)}–{timeOf(main.e, locale, country.tz)}</span>
                    {reminders[main.id] && <Bell className="w-3 h-3 text-accent fill-accent shrink-0" />}
                  </div>
                  <div className="font-semibold text-[15px] leading-snug truncate">{main.t}</div>
                  {current ? <ProgressBar value={progressOf(current, now)} className="my-1.5" /> : <GenreTag genre={main.g} t={t} />}
                  {current && next && (
                    <div className="text-[12px] text-muted truncate">
                      <span className="font-semibold">{t('next')} {timeOf(next.s, locale, country.tz)}</span> · {next.t}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-[11px] text-muted truncate">{ch.name}</div>
                  <div className="text-sm text-muted">{t('nothingNow')}</div>
                </>
              )}
            </button>
            <button
              onClick={() => toggleFavorite(ch.id)}
              className="p-2 -mr-1 rounded-full active:bg-surface-2"
              aria-label={t('favChannels')}
              aria-pressed={fav}
            >
              <Star className={`w-5 h-5 ${fav ? 'fill-gold text-gold' : 'text-line'}`} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
