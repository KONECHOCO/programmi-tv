import React, { useState } from 'react';
import { Sparkles, Clock, HeartHandshake, Film, ArrowRight, RotateCcw, Star, Play } from 'lucide-react';

export default function AiRecommenderModal({
  t,
  programs,
  onSelectProgram
}) {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState('movie');
  const [mood, setMood] = useState('action');
  const [matchedProgram, setMatchedProgram] = useState(null);

  const handleCalculate = () => {
    // Pick the best program matching constraints
    let filtered = programs;
    if (mood === 'action') filtered = programs.filter(p => p.genre === 'movies' || p.genre === 'series' || p.genre === 'sports');
    if (mood === 'relax') filtered = programs.filter(p => p.genre === 'entertainment' || p.genre === 'kids');
    if (mood === 'emotion') filtered = programs.filter(p => p.genre === 'series' || p.genre === 'movies');

    const result = filtered[Math.floor(Math.random() * filtered.length)] || programs[0];
    setMatchedProgram(result);
    setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setMatchedProgram(null);
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-900 shadow-2xl relative overflow-hidden my-4">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TITLE */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
          <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">{t.aiTitle}</h3>
          <p className="text-xs text-slate-400">{t.aiSubtitle}</p>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t.step1Duration}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'quick', label: t.durationQuick },
              { id: 'movie', label: t.durationMovie },
              { id: 'binge', label: t.durationBinge }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setDuration(item.id)}
                className={`p-4 rounded-2xl border text-xs font-bold transition-all text-left ${
                  duration === item.id
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg ml-auto"
          >
            <span>Prosegui</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-fadeIn">
          <h4 className="text-sm font-bold text-pink-300 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4" />
            {t.step2Mood}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'relax', label: t.moodRelax, desc: "Leggero, risate e intrattenimento" },
              { id: 'action', label: t.moodAction, desc: "Azione mozzafiato e adrenalina" },
              { id: 'emotion', label: t.moodEmotion, desc: "Drammatico, profondo e toccante" },
              { id: 'mystery', label: t.moodMystery, desc: "Tensione, crimine e misteri" }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMood(item.id)}
                className={`p-4 rounded-2xl border text-xs transition-all text-left ${
                  mood === item.id
                    ? 'bg-pink-600 border-pink-400 text-white shadow-lg'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold mb-0.5">{item.label}</div>
                <div className="text-[10px] text-slate-300">{item.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Indietro
            </button>

            <button
              onClick={handleCalculate}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black flex items-center gap-2 shadow-xl shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>{t.findProgram}</span>
            </button>
          </div>
        </div>
      )}

      {step === 3 && matchedProgram && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {t.aiResultTitle}
            </h4>
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Riprova
            </button>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-center gap-4">
            <img
              src={matchedProgram.posterUrl}
              alt={matchedProgram.title}
              className="w-24 h-32 rounded-xl object-cover shadow-lg"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {matchedProgram.channelName}
                </span>
                <span className="text-xs text-slate-400">{matchedProgram.startTime} - {matchedProgram.endTime}</span>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {matchedProgram.rating}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{matchedProgram.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-2 mb-3">{matchedProgram.synopsis}</p>

              <button
                onClick={() => onSelectProgram(matchedProgram)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Vedi Scheda Completa & Promemoria
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
