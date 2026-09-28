import { useMemo, useState } from 'react';
import { Bell, BellOff, Heart, Share2, PlayCircle, MonitorPlay, Info, Check } from 'lucide-react';
import { useApp, FREE_FOLLOW_LIMIT } from '../state/AppState';
import { progressOf, titleKey } from '../services/epg';
import { ensurePermission } from '../services/notifications';
import { programLink, shareText, notePositiveAction } from '../services/social';
import { timeOf, whenLabel, durationMin } from '../lib/format';
import { ChannelLogo, GenreTag, ProgressBar, Sheet, Stars } from './ui';

const OFFSETS = [0, 5, 15, 30, 60];

function ActionButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-[12px] font-semibold ${
        active ? 'bg-accent text-accent-fg border-accent' : 'bg-surface border-line'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
      <span className="leading-tight text-center px-1">{label}</span>
    </button>
  );
}

function ExternalLink({ href, icon: Icon, label }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-2 text-[12px] font-semibold">
      <Icon className="w-4 h-4" />
      {label}
    </a>
  );
}

export default function ProgramSheet({ program: p, channel, now, days, channelsById, onClose, onOpen, onOpenPro, toast }) {
  const { t, locale, country, prefs, reminders, setReminder, removeReminder, follows, toggleFollow, ratings, rate, isPro } = useApp();
  const [choosingOffset, setChoosingOffset] = useState(false);
  const key = titleKey(p.t);
  const reminder = reminders[p.id];
  const following = Boolean(follows[key]);
  const myRating = ratings[key]?.stars || 0;
  const live = p.s <= now && p.e > now;
  const tz = country.tz;

  const otherAirings = useMemo(() => {
    const out = [];
    for (const day of Object.values(days)) {
      for (const list of Object.values(day)) {
        for (const x of list) if (x.id !== p.id && x.s > now && titleKey(x.t) === key) out.push(x);
      }
    }
    return out.sort((a, b) => a.s - b.s).slice(0, 5);
  }, [days, key, p.id, now]);

  async function saveReminder(offset) {
    setChoosingOffset(false);
    const granted = await ensurePermission();
    setReminder(p, channel?.name || '', offset);
    toast(granted ? t('reminderAdded') : t('notifDenied'), !granted);
    notePositiveAction();
  }

  async function onFollow() {
    if (!following && !isPro && Object.keys(follows).length >= FREE_FOLLOW_LIMIT) {
      toast(t('followLimit', { n: FREE_FOLLOW_LIMIT }), true);
      onOpenPro();
      return;
    }
    const added = toggleFollow(p);
    if (added) {
      const granted = await ensurePermission();
      toast(granted ? t('followAdded') : t('notifDenied'), !granted);
      notePositiveAction();
    } else toast(t('followRemoved'));
  }

  async function onShare(extra) {
    const when = live ? t('live') : whenLabel(p.s, t, locale, tz);
    const text = [extra, t('shareText', { title: p.t, when, ch: channel?.name || '' }), t('shareVia')].filter(Boolean).join('\n');
    const res = await shareText({ title: p.t, text, url: programLink(p) });
    if (res === 'copied') toast(t('linkCopied'));
    if (res === 'shared') notePositiveAction();
  }

  function onRate(stars) {
    rate(p, stars);
    if (stars) notePositiveAction();
  }

  const q = encodeURIComponent(p.t);
  const cc = country.code.toLowerCase() === 'gb' ? 'uk' : country.code.toLowerCase();

  return (
    <Sheet onClose={onClose} title={channel?.name || ''}>
      {p.i && (
        <div className="-mx-5 mb-4 relative">
          <img src={p.i} alt="" className="w-full max-h-64 object-cover" onError={(e) => (e.currentTarget.parentElement.style.display = 'none')} />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <ChannelLogo channel={channel} size={44} />
        <div className="flex-1 min-w-0">
          <GenreTag genre={p.g} t={t} />
          <h2 className="text-xl font-extrabold leading-tight">{p.t}</h2>
          {(p.st || p.ep) && <div className="text-sm text-muted mt-0.5">{[p.ep, p.st].filter(Boolean).join(' · ')}</div>}
          <div className="text-sm mt-1 tabular-nums">
            {live ? <span className="text-live font-bold">● {t('live')} · </span> : `${whenLabel(p.s, t, locale, tz)}–`}
            {live ? `${timeOf(p.s, locale, tz)}–${timeOf(p.e, locale, tz)}` : timeOf(p.e, locale, tz)}
            <span className="text-muted"> · {durationMin(p)} {t('minutesShort')}{p.y ? ` · ${p.y}` : ''}</span>
          </div>
          {live && <ProgressBar value={progressOf(p, now)} className="mt-2" />}
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        {!live && p.s > now && (
          <ActionButton
            icon={reminder ? BellOff : Bell}
            active={Boolean(reminder)}
            label={reminder ? t('reminderOn') : t('remind')}
            onClick={() => {
              if (reminder) {
                removeReminder(p.id);
                toast(t('reminderRemoved'));
              } else setChoosingOffset((v) => !v);
            }}
          />
        )}
        <ActionButton icon={Heart} active={following} label={following ? t('following') : t('follow')} onClick={onFollow} />
        <ActionButton icon={Share2} label={t('share')} onClick={() => onShare()} />
      </div>

      {choosingOffset && (
        <div className="mt-3 p-3 rounded-2xl bg-surface border border-line animate-fade">
          <div className="text-sm font-semibold mb-2">{t('notifyWhen')}</div>
          <div className="grid grid-cols-2 gap-2">
            {OFFSETS.filter((o) => p.s - o * 60 > now).map((o) => (
              <button
                key={o}
                onClick={() => saveReminder(o)}
                className={`py-2.5 rounded-xl text-[13px] font-semibold border ${o === prefs.offset ? 'border-accent text-accent' : 'border-line'}`}
              >
                {o === prefs.offset && <Check className="w-3.5 h-3.5 inline mr-1" />}
                {t(`offset_${o}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {p.d && <p className="mt-5 text-[15px] leading-relaxed">{p.d}</p>}
      {(p.dr || p.ca) && (
        <dl className="mt-3 text-sm space-y-1">
          {p.dr && (
            <div><dt className="inline text-muted">{t('director')}: </dt><dd className="inline">{p.dr}</dd></div>
          )}
          {p.ca && (
            <div><dt className="inline text-muted">{t('cast')}: </dt><dd className="inline">{p.ca}</dd></div>
          )}
        </dl>
      )}

      <div className="mt-5 p-4 rounded-2xl bg-surface border border-line">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t('yourRating')}</span>
          {myRating > 0 && (
            <button onClick={() => onShare(t('shareRated', { stars: myRating, title: p.t }))} className="text-[12px] font-semibold text-accent flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" /> {t('share')}
            </button>
          )}
        </div>
        <div className="mt-2">
          <Stars value={myRating} onChange={onRate} />
        </div>
      </div>

      {(p.g === 'movie' || p.g === 'series' || p.g === 'doc' || p.g === 'kids') && (
        <div className="flex gap-2 mt-3">
          <ExternalLink href={`https://www.youtube.com/results?search_query=${q}+trailer`} icon={PlayCircle} label={t('trailer')} />
          <ExternalLink href={`https://www.justwatch.com/${cc}/search?q=${q}`} icon={MonitorPlay} label={t('whereToWatch')} />
          <ExternalLink href={`https://www.imdb.com/find/?q=${q}`} icon={Info} label={t('imdb')} />
        </div>
      )}

      {otherAirings.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-[13px] font-bold uppercase tracking-wider text-muted">{t('upcoming')}</h3>
          <ul className="divide-y divide-line">
            {otherAirings.map((x) => (
              <li key={x.id}>
                <button onClick={() => onOpen(x)} className="w-full flex items-center gap-3 py-2.5 text-left">
                  <ChannelLogo channel={channelsById[x.ch]} size={32} />
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-semibold">{whenLabel(x.s, t, locale, tz)}</div>
                    <div className="text-muted truncate">{[channelsById[x.ch]?.name, x.ep, x.st].filter(Boolean).join(' · ')}</div>
                  </div>
                  {reminders[x.id] && <Bell className="w-4 h-4 text-accent fill-accent" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
