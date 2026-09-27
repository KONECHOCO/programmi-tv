import React from 'react';
import { PlayCircle, Calendar, Bell, Sparkles, Star, Film, Tv, Trophy, Flame, Newspaper, Baby, Clock } from 'lucide-react';

export default function Navigation({
  t,
  activeTab,
  setActiveTab,
  activeGenre,
  setActiveGenre,
  activeTimeSlot,
  setActiveTimeSlot,
  activeRemindersCount
}) {
  const tabs = [
    { id: 'now', label: t.nowPlaying, icon: PlayCircle, color: 'text-emerald-400' },
    { id: 'grid', label: t.tvGuide, icon: Calendar, color: 'text-indigo-400' },
    { id: 'reminders', label: t.myReminders, icon: Bell, badge: activeRemindersCount, color: 'text-pink-400' },
    { id: 'ai', label: t.aiAssistant, icon: Sparkles, color: 'text-amber-400' },
    { id: 'top', label: t.topRated, icon: Star, color: 'text-yellow-400' }
  ];

  const genres = [
    { id: 'all', label: t.allGenres, icon: Flame },
    { id: 'movies', label: t.movies, icon: Film },
    { id: 'series', label: t.series, icon: Tv },
    { id: 'sports', label: t.sports, icon: Trophy },
    { id: 'entertainment', label: t.entertainment, icon: Newspaper },
    { id: 'docs', label: t.docs, icon: Flame },
    { id: 'kids', label: t.kids, icon: Baby }
  ];

  const timeSlots = [
    { id: 'now', label: t.now },
    { id: 'primeTime', label: t.primeTime },
    { id: 'lateNight', label: t.lateNight },
    { id: 'morning', label: t.morning },
    { id: 'afternoon', label: t.afternoon }
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap relative ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white animate-pulse' : tab.color}`} />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-pink-500 text-white text-[10px] font-black rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FILTER BAR: GENRES & TIME SLOTS (ACTIVE ON NOW AND GRID TABS) */}
      {(activeTab === 'now' || activeTab === 'grid') && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Genre Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {genres.map((g) => {
              const Icon = g.icon;
              const isSelected = activeGenre === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveGenre(g.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 shadow-sm'
                      : 'bg-slate-800/40 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{g.label}</span>
                </button>
              );
            })}
          </div>

          {/* Time Slots Chips */}
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
            {timeSlots.map((ts) => {
              const isSelected = activeTimeSlot === ts.id;
              return (
                <button
                  key={ts.id}
                  onClick={() => setActiveTimeSlot(ts.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                    isSelected
                      ? 'bg-slate-800 text-white font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ts.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
