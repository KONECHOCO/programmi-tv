import React, { useState } from 'react';
import { X, Star, Bell, Share2, Play, Check, ExternalLink, ThumbsUp, Send, Tv, MessageSquare, Clapperboard } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ProgramDetailModal({
  t,
  program,
  onClose,
  isReminderSet,
  onOpenReminderModal,
  onOpenShare
}) {
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewsList, setReviewsList] = useState(program?.reviews || []);
  const [newReviewText, setNewReviewText] = useState('');
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [hasVotedHelpful, setHasVotedHelpful] = useState({});

  if (!program) return null;

  const handleRate = (stars) => {
    setUserRating(stars);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newRev = {
      id: Date.now().toString(),
      user: "Tu (Utente VIP)",
      avatar: "https://i.pravatar.cc/100?img=68",
      rating: userRating || 5,
      text: newReviewText,
      date: "Proprio ora",
      helpful: 0
    };

    setReviewsList([newRev, ...reviewsList]);
    setNewReviewText('');
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 }
    });
  };

  const handleHelpfulClick = (reviewId) => {
    if (hasVotedHelpful[reviewId]) return;
    setHasVotedHelpful((prev) => ({ ...prev, [reviewId]: true }));
    setReviewsList((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpful: r.helpful + 1 } : r))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HERO HEADER WITH TRAILER SIMULATOR */}
        <div className="relative aspect-[16/8] sm:aspect-[21/9] bg-slate-950 overflow-hidden shrink-0">
          {isPlayingTrailer ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-center p-6 relative">
              <div className="w-16 h-16 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 mb-3 animate-pulse">
                <Clapperboard className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Riproduzione Anteprima HD: {program.title}</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                [Trailer Ufficiale 1080p - Durata 2m 14s]
              </p>
              <button
                onClick={() => setIsPlayingTrailer(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Chiudi Anteprima
              </button>
            </div>
          ) : (
            <>
              <img
                src={program.bannerUrl || program.posterUrl}
                alt={program.title}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

              {/* TRAILER PLAY BUTTON OVERLAY */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setIsPlayingTrailer(true)}
                  className="w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all border-2 border-white/20"
                  title="Guarda Trailer"
                >
                  <Play className="w-7 h-7 fill-white ml-1" />
                </button>
              </div>

              {/* HERO CHANNEL & GENRE BADGES */}
              <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-extrabold uppercase">
                      {program.channelName}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-indigo-300 text-xs font-semibold">
                      {program.genre}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {program.startTime} - {program.endTime}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {program.title}
                  </h2>
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* PRIMARY ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-800/40 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenReminderModal(program)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  isReminderSet
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                }`}
              >
                {isReminderSet ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                <span>{isReminderSet ? t.reminderActive : t.remindMe}</span>
              </button>

              <button
                onClick={() => onOpenShare(program)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.share}</span>
              </button>
            </div>

            {/* RATING HIGHLIGHT */}
            <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-700">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <div>
                <div className="text-sm font-black text-white leading-none">
                  {program.rating} <span className="text-xs text-slate-400 font-normal">/ 5</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {program.votesCount} {t.ratingTitle}
                </div>
              </div>
            </div>
          </div>

          {/* SYNOPSIS & DETAILS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  {t.synopsis}
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {program.synopsis}
                </p>
              </div>

              {/* CAST & CREW */}
              <div className="pt-3 border-t border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {t.cast}
                </h4>
                <p className="text-xs text-slate-200">
                  {program.cast}
                </p>
                {program.director && (
                  <p className="text-xs text-slate-400 mt-1">
                    Regia: <span className="text-slate-200">{program.director}</span>
                  </p>
                )}
              </div>
            </div>

            {/* WHERE TO WATCH STREAMING LINKS */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                  <Tv className="w-4 h-4" />
                  {t.whereToWatch}
                </h4>
                <div className="space-y-2">
                  {program.streamingProviders && program.streamingProviders.map((provider, i) => (
                    <a
                      key={i}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert(`Apertura app ${provider}...`);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-xs font-bold text-slate-200 transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {provider}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Anno: <span className="text-slate-200 font-semibold">{program.year}</span> | Età: <span className="text-slate-200 font-semibold">{program.ageRating}</span>
              </div>
            </div>
          </div>

          {/* INTERACTIVE USER RATING WIDGET */}
          <div className="p-5 bg-gradient-to-r from-amber-950/20 via-purple-950/20 to-slate-900 rounded-2xl border border-amber-500/20">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {t.ratingTitle}
            </h4>
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || userRating) >= star
                        ? 'fill-amber-400 text-amber-400 shadow-md'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              {userRating > 0 && (
                <span className="ml-2 text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  Hai votato {userRating} / 5!
                </span>
              )}
            </div>

            {/* WRITE A REVIEW FORM */}
            <form onSubmit={handleSubmitReview} className="flex gap-2">
              <input
                type="text"
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder={t.writeReview}
                className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                {t.submitReview}
              </button>
            </form>
          </div>

          {/* COMMUNITY REVIEWS LIST */}
          <div>
            <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              {t.reviews} ({reviewsList.length})
            </h4>

            {reviewsList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">{t.noReviews}</p>
            ) : (
              <div className="space-y-3">
                {reviewsList.map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img src={rev.avatar} alt={rev.user} className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-bold text-slate-200">{rev.user}</span>
                        <div className="flex items-center gap-0.5 text-amber-400 ml-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span className="font-semibold">{rev.rating}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">{rev.date}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{rev.text}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                      <button
                        onClick={() => handleHelpfulClick(rev.id)}
                        className={`flex items-center gap-1 hover:text-white transition-colors ${
                          hasVotedHelpful[rev.id] ? 'text-indigo-400 font-bold' : ''
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Utile ({rev.helpful})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
