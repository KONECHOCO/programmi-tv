import React from 'react';
import { Star, Bell, Share2, Play, Tv, Check, Flame } from 'lucide-react';

export default function ProgramCard({
  t,
  program,
  onSelectProgram,
  isReminderSet,
  onToggleReminder,
  onOpenShare
}) {
  return (
    <div
      onClick={() => onSelectProgram(program)}
      className="group relative bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1"
    >
      {/* CARD MEDIA HEADER */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
        <img
          src={program.posterUrl}
          alt={program.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* TOP BADGES ROW */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Channel Badge */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/60 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-xs font-bold text-white">{program.channelName}</span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
              Ch {program.channelId.toUpperCase()}
            </span>
          </div>

          {/* Rating Badge */}
          <div className="flex items-center gap-1 bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-bold shadow-md">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{program.rating}</span>
          </div>
        </div>

        {/* LIVE PROGRESS BAR & TIME STAMP */}
        {program.isLive && (
          <div className="absolute bottom-2 left-3 right-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Flame className="w-3 h-3 animate-pulse" />
                {t.liveProgress}
              </span>
              <span>{program.startTime} - {program.endTime}</span>
            </div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-pink-500 h-full transition-all duration-1000"
                style={{ width: `${program.progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CARD CONTENT */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {program.genre}
            </span>
            <span className="text-xs text-slate-400">{program.year}</span>
            {program.ageRating && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                {program.ageRating}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
            {program.title}
          </h3>

          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {program.synopsis}
          </p>
        </div>

        {/* CARD FOOTER ACTIONS */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Reminder Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleReminder(program);
              }}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isReminderSet
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={isReminderSet ? t.reminderActive : t.remindMe}
            >
              {isReminderSet ? (
                <>
                  <Check className="w-3.5 h-3.5 text-pink-400" />
                  <span className="hidden sm:inline text-[11px]">{t.reminderActive}</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-400" />
                  <span className="hidden sm:inline text-[11px]">{t.remindMe}</span>
                </>
              )}
            </button>

            {/* Share Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenShare(program);
              }}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              title={t.share}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Details CTA */}
          <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
            {t.details} &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}
