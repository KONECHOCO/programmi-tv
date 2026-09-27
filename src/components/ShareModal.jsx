import React, { useState } from 'react';
import { X, Copy, Check, Share2, Send, MessageCircle } from 'lucide-react';

export default function ShareModal({
  t,
  program,
  onClose
}) {
  const [copied, setCopied] = useState(false);

  if (!program) return null;

  const shareUrl = `${window.location.origin}/program/${program.id}`;
  const shareText = `Stasera guardo "${program.title}" su ${program.channelName} (${program.startTime})! Scoprilo su CineGuide Pro: ${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: program.title,
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-indigo-400" />
          {t.shareModalTitle}
        </h3>
        <p className="text-xs text-slate-400 mb-4">Condividi con amici sui social network</p>

        {/* PREVIEW CARD SNIPPET */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3 mb-5">
          <img src={program.posterUrl} alt={program.title} className="w-12 h-16 rounded-lg object-cover" />
          <div className="text-xs">
            <h4 className="font-bold text-white line-clamp-1">{program.title}</h4>
            <p className="text-slate-400">{program.channelName} • {program.startTime}</p>
            <span className="text-[10px] text-indigo-400 font-medium">★ {program.rating} / 5</span>
          </div>
        </div>

        {/* SOCIAL BUTTONS */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold flex flex-col items-center gap-1 transition-all"
          >
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <span>WhatsApp</span>
          </a>

          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-sky-600/20 border border-sky-500/40 hover:bg-sky-600/30 text-sky-300 text-xs font-bold flex flex-col items-center gap-1 transition-all"
          >
            <Send className="w-5 h-5 text-sky-400" />
            <span>Telegram</span>
          </a>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold flex flex-col items-center gap-1 transition-all"
          >
            <svg className="w-5 h-5 text-slate-300 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>X (Twitter)</span>
          </a>
        </div>

        {/* COPY LINK BUTTON */}
        <button
          onClick={handleCopy}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all mb-2"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? t.linkCopied : t.copyLink}</span>
        </button>

        {navigator.share && (
          <button
            onClick={handleNativeShare}
            className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Usa Condivisione di Sistema
          </button>
        )}

      </div>
    </div>
  );
}
