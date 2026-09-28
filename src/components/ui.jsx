import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';

const PALETTE = ['#7c6cff', '#ff6b8b', '#22b8cf', '#f59f00', '#40c057', '#e64980', '#4c6ef5', '#fd7e14'];
function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function ChannelLogo({ channel, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (channel?.logo && !failed) {
    return (
      <div className="shrink-0 rounded-xl bg-white/95 p-1 flex items-center justify-center overflow-hidden" style={style}>
        <img src={channel.logo} alt={channel.name} loading="lazy" className="max-w-full max-h-full object-contain" onError={() => setFailed(true)} />
      </div>
    );
  }
  const initials = (channel?.name || '?').replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div
      className="shrink-0 rounded-xl flex items-center justify-center text-white font-bold"
      style={{ ...style, background: colorFor(channel?.name || '?'), fontSize: size * 0.34 }}
    >
      {initials || '?'}
    </div>
  );
}

export function Chip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
        active ? 'bg-accent text-accent-fg border-accent' : 'bg-surface text-muted border-line active:bg-surface-2'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export function ProgressBar({ value, className = '' }) {
  return (
    <div className={`h-1 rounded-full bg-surface-2 overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-live transition-[width] duration-700" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Stars({ value = 0, onChange, size = 28 }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}`}
          onClick={() => onChange?.(value === n ? 0 : n)}
          className="p-0.5 active:scale-90 transition-transform"
        >
          <Star style={{ width: size, height: size }} className={n <= value ? 'fill-gold text-gold' : 'text-line'} />
        </button>
      ))}
    </div>
  );
}

/** Pannello che sale dal basso, con sfondo scuro. Chiude con tap fuori o con la X. */
export function Sheet({ onClose, children, title, full = false }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`relative w-full sm:max-w-lg bg-bg rounded-t-3xl sm:rounded-3xl border border-line shadow-2xl animate-sheet flex flex-col ${
          full ? 'h-[92vh]' : 'max-h-[92vh]'
        }`}
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold truncate">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full text-muted active:bg-surface-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, text, action }) {
  return (
    <div className="text-center py-14 px-6">
      {Icon && <Icon className="w-10 h-10 mx-auto mb-3 text-muted opacity-60" />}
      <p className="text-sm text-muted max-w-xs mx-auto">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function GenreTag({ genre, t }) {
  if (!genre || genre === 'other') return null;
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{t(`genre_${genre}`)}</span>;
}

export function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDone, toast.long ? 5000 : 2600);
    return () => clearTimeout(id);
  }, [toast, onDone]);
  if (!toast) return null;
  return (
    <div className="fixed left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(var(--bottom-ui, 72px) + 12px)' }}>
      <div className="max-w-md bg-fg text-bg text-sm font-medium px-4 py-3 rounded-2xl shadow-xl animate-sheet pointer-events-auto" onClick={onDone}>
        {toast.text}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-2 px-1">
      <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted">{children}</h3>
      {right}
    </div>
  );
}
