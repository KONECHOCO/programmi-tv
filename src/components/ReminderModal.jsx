import React, { useState } from 'react';
import { X, Bell, Calendar, Check, Clock } from 'lucide-react';

export default function ReminderModal({
  t,
  program,
  onClose,
  onSaveReminder
}) {
  const [offset, setOffset] = useState('fiveMinBefore');
  const [applySeries, setApplySeries] = useState(true);

  if (!program) return null;

  const handleSave = () => {
    // Request notification permission if supported
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    onSaveReminder({
      ...program,
      reminderOffset: offset,
      isSeriesReminder: applySeries,
      createdAt: new Date().toISOString()
    });
  };

  const handleDownloadIcs = () => {
    const title = program.title;
    const description = `${program.synopsis}\nCanale: ${program.channelName}`;
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CineGuide Pro//TV Guide Reminders//IT
BEGIN:VEVENT
SUMMARY:${title} su ${program.channelName}
DESCRIPTION:${description}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_promemoria.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t.reminderModalTitle}</h3>
            <p className="text-xs text-slate-400">{program.title} • {program.channelName}</p>
          </div>
        </div>

        {/* TIME OFFSET OPTIONS */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
            {t.notifyMe}
          </label>
          {[
            { id: 'atStart', label: t.atStart },
            { id: 'fiveMinBefore', label: t.fiveMinBefore },
            { id: 'fifteenMinBefore', label: t.fifteenMinBefore },
            { id: 'oneHourBefore', label: t.oneHourBefore }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setOffset(item.id)}
              className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                offset === item.id
                  ? 'bg-pink-500/20 border-pink-500/60 text-pink-300 shadow-md'
                  : 'bg-slate-800/50 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                {item.label}
              </span>
              {offset === item.id && <Check className="w-4 h-4 text-pink-400" />}
            </button>
          ))}
        </div>

        {/* ENTIRE SERIES CHECKBOX */}
        {program.genre === 'series' && (
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={applySeries}
              onChange={(e) => setApplySeries(e.target.checked)}
              className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 bg-slate-900 border-slate-700"
            />
            <span className="text-xs font-medium text-slate-200">{t.entireSeries}</span>
          </label>
        )}

        {/* ACTION BUTTONS */}
        <div className="space-y-2">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-pink-600/25 flex items-center justify-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" />
            {t.saveReminder}
          </button>

          <button
            onClick={handleDownloadIcs}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            {t.addToCalendar} (.ics)
          </button>
        </div>

      </div>
    </div>
  );
}
