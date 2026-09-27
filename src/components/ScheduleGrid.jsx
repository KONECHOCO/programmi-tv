import React from 'react';
import { Star, Bell, Check, Clock } from 'lucide-react';
import { channelsByCountry } from '../data/tvData';

export default function ScheduleGrid({
  t,
  currentCountry,
  programs,
  onSelectProgram,
  reminders,
  onToggleReminder
}) {
  const channels = channelsByCountry[currentCountry] || channelsByCountry.IT;

  const timeSlots = ["19:00", "20:00", "21:00", "22:00", "23:00", "00:00"];

  return (
    <div className="glass-card rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-2xl">
      
      {/* GRID HEADER: CHANNELS & TIME SLOTS */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 p-3 text-xs font-bold text-slate-400">
            <div className="col-span-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Canali ({currentCountry})</span>
            </div>
            {timeSlots.map((time, idx) => (
              <div key={idx} className="col-span-1 text-center font-mono text-slate-300">
                {time}
              </div>
            ))}
          </div>

          {/* CHANNELS ROWS */}
          <div className="divide-y divide-slate-800/60">
            {channels.map((channel) => {
              const channelPrograms = programs.filter(
                (p) => p.channelId === channel.id || p.channelName.toLowerCase().includes(channel.name.toLowerCase())
              );

              return (
                <div key={channel.id} className="grid grid-cols-7 items-center p-3 hover:bg-slate-800/30 transition-colors">
                  
                  {/* CHANNEL COL */}
                  <div className="col-span-2 flex items-center gap-3 pr-3">
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-700 shadow"
                    />
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {channel.name}
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">
                          Ch {channel.number}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PROGRAM BLOCKS FOR THIS CHANNEL */}
                  <div className="col-span-5 flex items-center gap-2 overflow-x-auto py-1">
                    {channelPrograms.length > 0 ? (
                      channelPrograms.map((prog) => {
                        const isReminderSet = reminders.some((r) => r.id === prog.id);
                        return (
                          <div
                            key={prog.id}
                            onClick={() => onSelectProgram(prog)}
                            className={`flex-1 min-w-[200px] p-2.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                              prog.isLive
                                ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-500/50 hover:border-indigo-400 shadow-md'
                                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                                <span className="font-mono text-indigo-300">
                                  {prog.startTime} - {prog.endTime}
                                </span>
                                <div className="flex items-center gap-1 text-amber-400">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>{prog.rating}</span>
                                </div>
                              </div>
                              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 line-clamp-1">
                                {prog.title}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                {prog.genre}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleReminder(prog);
                                }}
                                className={`p-1 rounded-md text-[10px] ${
                                  isReminderSet ? 'text-pink-400 bg-pink-500/10' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {isReminderSet ? <Check className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-500 italic py-2">
                        Nessun programma programmato in questa fascia
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
