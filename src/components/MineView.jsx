import { useMemo, useState } from 'react';
import { Bell, Heart, Star, Trash2, Crown, ChevronDown } from 'lucide-react';
import { useApp, FREE_FOLLOW_LIMIT } from '../state/AppState';
import { titleKey } from '../services/epg';
import { whenLabel } from '../lib/format';
import { ChannelLogo, EmptyState, SectionTitle, Stars } from './ui';

export default function MineView({ channels, days, now, onOpen, onOpenPro, findProgram }) {
  const { t, locale, country, reminders, removeReminder, follows, toggleFollow, ratings, rate, isFavorite, toggleFavorite, isPro } = useApp();
  const [showAllChannels, setShowAllChannels] = useState(false);
  const byId = useMemo(() => Object.fromEntries(channels.map((c) => [c.id, c])), [channels]);

  const reminderList = Object.values(reminders).filter((r) => r.e > now).sort((a, b) => a.s - b.s);

  // Prossima messa in onda di ogni serie seguita, tra i giorni già caricati.
  const nextByKey = useMemo(() => {
    const map = {};
    for (const day of Object.values(days)) {
      for (const list of Object.values(day)) {
        for (const p of list) {
          if (p.s <= now) continue;
          const k = titleKey(p.t);
          if (follows[k] && (!map[k] || p.s < map[k].s)) map[k] = p;
        }
      }
    }
    return map;
  }, [days, follows, now]);

  const followList = Object.entries(follows).sort((a, b) => (nextByKey[a[0]]?.s ?? Infinity) - (nextByKey[b[0]]?.s ?? Infinity));
  const ratingList = Object.entries(ratings).sort((a, b) => b[1].at - a[1].at);
  const favChannels = channels.filter((c) => isFavorite(c.id));

  return (
    <div className="pb-4">
      {!isPro && (
        <button onClick={onOpenPro} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-accent to-live text-white text-left mt-1">
          <Crown className="w-7 h-7 shrink-0" />
          <div className="flex-1">
            <div className="font-bold">{t('goPro')}</div>
            <div className="text-[12px] opacity-90">{t('proFeat1')} · {t('proFeat2')}</div>
          </div>
        </button>
      )}

      <SectionTitle>{t('myReminders')}</SectionTitle>
      {reminderList.length === 0 ? (
        <EmptyState icon={Bell} text={t('emptyReminders')} />
      ) : (
        <ul className="space-y-2">
          {reminderList.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line">
              <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => { const p = findProgram(r.id); if (p) onOpen(p); }}>
                {r.cc === country.code && byId[r.ch] ? <ChannelLogo channel={byId[r.ch]} size={40} /> : <Bell className="w-6 h-6 text-accent m-2" />}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.t}</div>
                  <div className="text-[12px] text-muted truncate">
                    {r.s <= now ? <span className="text-live font-bold">● {t('live')} </span> : whenLabel(r.s, t, locale, country.tz)} · {r.chName}
                  </div>
                  <div className="text-[11px] text-accent font-semibold">{t(`offset_${r.offset}`)}</div>
                </div>
              </button>
              <button onClick={() => removeReminder(r.id)} className="p-2 rounded-full text-muted active:bg-surface-2" aria-label={t('removeReminder')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle right={!isPro && <span className="text-[11px] text-muted">{followList.length}/{FREE_FOLLOW_LIMIT}</span>}>
        {t('followedSeries')}
      </SectionTitle>
      {followList.length === 0 ? (
        <EmptyState icon={Heart} text={t('emptyFollows')} />
      ) : (
        <ul className="space-y-2">
          {followList.map(([key, f]) => {
            const next = nextByKey[key];
            return (
              <li key={key} className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line">
                <button className="flex-1 min-w-0 text-left" onClick={() => next && onOpen(next)} disabled={!next}>
                  <div className="font-semibold truncate">{f.t}</div>
                  <div className="text-[12px] text-muted truncate">
                    {next ? t('nextAiring', { when: `${whenLabel(next.s, t, locale, country.tz)} · ${byId[next.ch]?.name || ''}` }) : t('noUpcoming')}
                  </div>
                </button>
                <button onClick={() => toggleFollow({ t: f.t })} className="p-2 rounded-full active:bg-surface-2" aria-label={t('following')}>
                  <Heart className="w-5 h-5 fill-live text-live" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <SectionTitle>{t('myRatings')}</SectionTitle>
      {ratingList.length === 0 ? (
        <EmptyState icon={Star} text={t('emptyRatings')} />
      ) : (
        <ul className="space-y-2">
          {ratingList.map(([key, r]) => (
            <li key={key} className="p-3 rounded-2xl bg-surface border border-line">
              <div className="font-semibold truncate mb-1">{r.t}</div>
              <Stars value={r.stars} size={20} onChange={(n) => rate(r, n)} />
            </li>
          ))}
        </ul>
      )}

      <SectionTitle
        right={
          <button onClick={() => setShowAllChannels((v) => !v)} className="text-[12px] font-semibold text-accent flex items-center gap-1">
            {t('filterAll')} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllChannels ? 'rotate-180' : ''}`} />
          </button>
        }
      >
        {t('favChannels')}
      </SectionTitle>
      {(showAllChannels ? channels : favChannels).length === 0 ? (
        <EmptyState icon={Star} text={t('emptyFavs')} />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {(showAllChannels ? channels : favChannels).map((ch) => (
            <li key={ch.id}>
              <button onClick={() => toggleFavorite(ch.id)} className="w-full flex items-center gap-3 p-2 rounded-xl active:bg-surface text-left">
                <ChannelLogo channel={ch} size={32} />
                <span className="flex-1 truncate text-sm">{ch.lcn != null ? `${ch.lcn} · ` : ''}{ch.name}</span>
                <Star className={`w-5 h-5 ${isFavorite(ch.id) ? 'fill-gold text-gold' : 'text-line'}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
