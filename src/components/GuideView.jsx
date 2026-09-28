import { useEffect, useRef } from 'react';
import { Bell, Tv } from 'lucide-react';
import { useApp } from '../state/AppState';
import { progressOf } from '../services/epg';
import { timeOf, durationMin } from '../lib/format';
import { ChannelLogo, EmptyState, GenreTag, ProgressBar } from './ui';

/** Selettore orizzontale dei canali (mostrato nell'intestazione fissa). */
export function ChannelPicker({ channels, selected, onSelect }) {
  const { t } = useApp();
  const ref = useRef(null);
  const active = channels.find((c) => c.id === selected)?.id || channels[0]?.id;
  useEffect(() => {
    ref.current?.querySelector('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);
  return (
    <div ref={ref} className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" aria-label={t('chooseChannel')}>
      {channels.map((ch) => (
        <button
          key={ch.id}
          data-active={ch.id === active}
          onClick={() => onSelect(ch.id)}
          className={`shrink-0 flex flex-col items-center gap-0.5 w-[60px] p-1 rounded-xl border ${ch.id === active ? 'border-accent bg-surface' : 'border-transparent'}`}
        >
          <ChannelLogo channel={ch} size={34} />
          <span className="text-[10px] text-muted w-full truncate text-center">{ch.name}</span>
        </button>
      ))}
    </div>
  );
}

export default function GuideView({ channels, programmes, now, onOpen, selected }) {
  const { t, locale, country, reminders } = useApp();
  const channel = channels.find((c) => c.id === selected) || channels[0];
  const list = channel ? programmes?.[channel.id] || [] : [];
  const currentRef = useRef(null);
  const hasList = list.length > 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (currentRef.current) currentRef.current.scrollIntoView({ block: 'center' });
      else window.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(id);
  }, [channel?.id, programmes, hasList]);

  if (!channels.length) return <EmptyState icon={Tv} text={t('emptyFavs')} />;
  if (!hasList) return <EmptyState icon={Tv} text={t('noData')} />;

  return (
    <ol className="relative border-l-2 border-line ml-3">
      {list.map((p) => {
        const live = p.s <= now && p.e > now;
        const past = p.e <= now;
        return (
          <li key={p.id} ref={live ? currentRef : null} className={`relative pl-5 pr-1 py-2 ${past ? 'opacity-50' : ''}`}>
            <span className={`absolute -left-[7px] top-4 w-3 h-3 rounded-full border-2 border-bg ${live ? 'bg-live' : 'bg-line'}`} />
            <button onClick={() => onOpen(p)} className={`w-full text-left rounded-2xl p-3 ${live ? 'bg-surface border border-live/40' : 'active:bg-surface'}`}>
              <div className="flex items-center gap-2 text-[12px] text-muted tabular-nums">
                <span className={`font-bold ${live ? 'text-live' : 'text-fg'}`}>{timeOf(p.s, locale, country.tz)}</span>
                <span>{durationMin(p)} {t('minutesShort')}</span>
                {live && <span className="text-live font-bold uppercase text-[10px]">● {t('live')}</span>}
                {reminders[p.id] && <Bell className="w-3 h-3 text-accent fill-accent" />}
              </div>
              <div className="font-semibold text-[15px] leading-snug">{p.t}</div>
              {(p.st || p.ep) && <div className="text-[12px] text-muted truncate">{[p.ep, p.st].filter(Boolean).join(' · ')}</div>}
              {live ? <ProgressBar value={progressOf(p, now)} className="mt-2" /> : <GenreTag genre={p.g} t={t} />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
