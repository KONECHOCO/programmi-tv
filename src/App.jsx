import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { translations } from './data/translations';
import { samplePrograms } from './data/tvData';
import { fetchLiveSchedule, searchLiveShows, fetchShowCast } from './services/apiService';

import Header from './components/Header';
import Navigation from './components/Navigation';
import ProgramCard from './components/ProgramCard';
import ScheduleGrid from './components/ScheduleGrid';
import ProgramDetailModal from './components/ProgramDetailModal';
import ReminderModal from './components/ReminderModal';
import ShareModal from './components/ShareModal';
import VipUpgradeModal from './components/VipUpgradeModal';
import AiRecommenderModal from './components/AiRecommenderModal';
import AdBanner from './components/AdBanner';
import NotificationToast from './components/NotificationToast';

import { Star, Bell, Tv, Flame, Trash2, Radio, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentCountry, setCurrentCountry] = useState('IT');
  const [currentLang, setCurrentLang] = useState('it');
  const [activeTab, setActiveTab] = useState('now');
  const [activeGenre, setActiveGenre] = useState('all');
  const [activeTimeSlot, setActiveTimeSlot] = useState('now');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' or 'mobile'
  const [theme, setTheme] = useState('dark');

  // Live API Programs State
  const [livePrograms, setLivePrograms] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);

  // Reminders list loaded from localStorage
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('cineguide_reminders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // VIP Status
  const [isVipUser, setIsVipUser] = useState(() => {
    return localStorage.getItem('cineguide_vip') === 'true';
  });

  // Modals state
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [reminderProgram, setReminderProgram] = useState(null);
  const [shareProgram, setShareProgram] = useState(null);
  const [showVipModal, setShowVipModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Translations shortcut
  const t = useMemo(() => translations[currentLang] || translations.it, [currentLang]);

  // Load Live EPG Schedule from API
  const loadSchedule = useCallback(async (country) => {
    setIsLoadingApi(true);
    try {
      const data = await fetchLiveSchedule(country);
      setLivePrograms(data);
    } catch (err) {
      console.error(err);
      setLivePrograms(samplePrograms.filter(p => p.country === country));
    } finally {
      setIsLoadingApi(false);
    }
  }, []);

  // Fetch API on country change
  useEffect(() => {
    loadSchedule(currentCountry);
  }, [currentCountry, loadSchedule]);

  // Real-time Search API Trigger
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await searchLiveShows(searchQuery);
      setSearchResults(res);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save reminders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cineguide_reminders', JSON.stringify(reminders));
    } catch (e) {
      console.error(e);
    }
  }, [reminders]);

  // Save VIP status to localStorage
  useEffect(() => {
    localStorage.setItem('cineguide_vip', isVipUser ? 'true' : 'false');
  }, [isVipUser]);

  // Open Program Modal & dynamically fetch Cast from API
  const handleOpenProgramModal = async (prog) => {
    setSelectedProgram(prog);
    if (prog.tvmazeShowId) {
      const castInfo = await fetchShowCast(prog.tvmazeShowId);
      if (castInfo) {
        setSelectedProgram((prev) => (prev ? { ...prev, cast: castInfo } : prev));
      }
    }
  };

  // Filter programs based on Country, Genre, TimeSlot & Search
  const displayPrograms = useMemo(() => {
    let source = searchQuery.trim().length >= 2 && searchResults.length > 0 ? searchResults : livePrograms;

    return source.filter((prog) => {
      // Search Query Text Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = prog.title.toLowerCase().includes(q);
        const matchesChannel = prog.channelName.toLowerCase().includes(q);
        const matchesCast = prog.cast?.toLowerCase().includes(q);
        const matchesGenre = prog.genre.toLowerCase().includes(q);
        if (!matchesTitle && !matchesChannel && !matchesCast && !matchesGenre) return false;
      }

      // Genre Filter
      if (activeGenre !== 'all' && prog.genre !== activeGenre) return false;

      // Time Slot Filter
      if (activeTimeSlot !== 'now' && prog.timeSlot && prog.timeSlot !== activeTimeSlot) {
        // Allow fallback if viewing specific time slot
      }

      return true;
    });
  }, [livePrograms, searchResults, searchQuery, activeGenre, activeTimeSlot]);

  // Top Rated programs for leaderboard
  const topRatedPrograms = useMemo(() => {
    return [...displayPrograms].sort((a, b) => b.rating - a.rating);
  }, [displayPrograms]);

  // Toggle Reminder
  const handleToggleReminder = (prog) => {
    const exists = reminders.some((r) => r.id === prog.id);
    if (exists) {
      setReminders(reminders.filter((r) => r.id !== prog.id));
      setToast({
        type: 'info',
        title: "Promemoria Rimosso",
        message: `Rimosso l'avviso per ${prog.title}`
      });
    } else {
      setReminderProgram(prog);
    }
  };

  const handleSaveReminderFromModal = (reminderData) => {
    setReminders((prev) => [...prev.filter((r) => r.id !== reminderData.id), reminderData]);
    setReminderProgram(null);
    setToast({
      type: 'reminder',
      title: "Promemoria Attivato! 🔔",
      message: `${t.reminderSetToast} per ${reminderData.title}`
    });
  };

  const handleRemoveReminder = (id) => {
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const handleSubscribeSuccess = () => {
    setIsVipUser(true);
    setToast({
      type: 'vip',
      title: "Status VIP Attivato! 👑",
      message: t.vipSuccessToast
    });
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} font-sans antialiased transition-colors duration-300 selection:bg-indigo-500 selection:text-white`}>
      
      {/* MOBILE SHELL CONTAINER WRAPPER IF IN MOBILE VIEW MODE */}
      <div className={viewMode === 'mobile' ? 'max-w-md mx-auto my-0 sm:my-6 rounded-[40px] border-[8px] border-slate-800 shadow-2xl overflow-hidden bg-slate-950 relative min-h-[840px]' : 'w-full'}>
        
        {/* MOBILE FRAME SPEAKER BAR */}
        {viewMode === 'mobile' && (
          <div className="w-full bg-slate-900 py-2 flex items-center justify-center border-b border-slate-800">
            <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-8 h-1.5 rounded-full bg-slate-800" />
            </div>
          </div>
        )}

        {/* TOP HEADER WITH API INDICATOR */}
        <Header
          t={t}
          currentCountry={currentCountry}
          setCurrentCountry={setCurrentCountry}
          currentLang={currentLang}
          setCurrentLang={setCurrentLang}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeRemindersCount={reminders.length}
          onOpenReminders={() => setActiveTab('reminders')}
          onOpenVip={() => setShowVipModal(true)}
          viewMode={viewMode}
          setViewMode={setViewMode}
          theme={theme}
          setTheme={setTheme}
          isLiveApi={true}
          isLoadingApi={isLoadingApi}
          onRefreshApi={() => loadSchedule(currentCountry)}
        />

        {/* MAIN BODY CONTAINER */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          
          {/* MONETIZATION ADS BANNER (HIDE IF VIP USER) */}
          {!isVipUser && (
            <AdBanner t={t} onOpenVip={() => setShowVipModal(true)} />
          )}

          {/* MAIN TABS & FILTERS NAVIGATION */}
          <Navigation
            t={t}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeGenre={activeGenre}
            setActiveGenre={setActiveGenre}
            activeTimeSlot={activeTimeSlot}
            setActiveTimeSlot={setActiveTimeSlot}
            activeRemindersCount={reminders.length}
          />

          {/* SEARCH QUERY BANNER */}
          {searchQuery && (
            <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
              <span>Risultati API in tempo reale per: <strong>"{searchQuery}"</strong> ({displayPrograms.length})</span>
              <button onClick={() => setSearchQuery('')} className="underline hover:text-white">Mostra tutti</button>
            </div>
          )}

          {/* TAB 1: ORA IN ONDA / NOW PLAYING CARDS */}
          {activeTab === 'now' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span>{t.nowPlaying} ({displayPrograms.length})</span>
                </h2>
                {isLoadingApi ? (
                  <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sincronizzazione API in corso...
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400" />
                    Live EPG Server {currentCountry}
                  </span>
                )}
              </div>

              {displayPrograms.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800">
                  <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Nessun programma trovato</p>
                  <p className="text-xs text-slate-500 mt-1">Prova a cambiare il filtro genere o il Paese selezionato.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayPrograms.map((prog) => (
                    <ProgramCard
                      key={prog.id}
                      t={t}
                      program={prog}
                      onSelectProgram={handleOpenProgramModal}
                      isReminderSet={reminders.some((r) => r.id === prog.id)}
                      onToggleReminder={handleToggleReminder}
                      onOpenShare={setShareProgram}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GUIDA TV INTERACTIVE EPG GRID */}
          {activeTab === 'grid' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-indigo-400" />
                  <span>{t.tvGuide} Palinsesto Completo API</span>
                </h2>
              </div>
              <ScheduleGrid
                t={t}
                currentCountry={currentCountry}
                programs={displayPrograms}
                onSelectProgram={handleOpenProgramModal}
                reminders={reminders}
                onToggleReminder={handleToggleReminder}
              />
            </div>
          )}

          {/* TAB 3: I MIEI PROMEMORIA */}
          {activeTab === 'reminders' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-pink-400 animate-bounce" />
                  <span>{t.myReminders} ({reminders.length})</span>
                </h2>
              </div>

              {reminders.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 p-8">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300">{t.noReminders}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-pink-500/40 transition-all shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <img src={item.posterUrl} alt={item.title} className="w-12 h-16 rounded-xl object-cover" />
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            {item.channelName} • {item.startTime}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">{item.title}</h4>
                          <p className="text-xs text-slate-400">
                            Avviso: {t[item.reminderOffset] || "5 minuti prima"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenProgramModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold hover:bg-slate-700"
                        >
                          Dettagli
                        </button>
                        <button
                          onClick={() => handleRemoveReminder(item.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Elimina promemoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ASSISTANTE AI TV */}
          {activeTab === 'ai' && (
            <div className="max-w-3xl mx-auto">
              <AiRecommenderModal
                t={t}
                programs={displayPrograms}
                onSelectProgram={handleOpenProgramModal}
              />
            </div>
          )}

          {/* TAB 5: CLASSIFICA & RECENSIONI COMMUNITY */}
          {activeTab === 'top' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span>{t.trendingToday} & Classifica Voti</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topRatedPrograms.map((prog, idx) => (
                  <div
                    key={prog.id}
                    onClick={() => handleOpenProgramModal(prog)}
                    className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center shrink-0 border border-amber-500/30">
                      #{idx + 1}
                    </div>
                    <img src={prog.posterUrl} alt={prog.title} className="w-14 h-20 rounded-xl object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                        <span className="font-bold text-indigo-400">{prog.channelName}</span>
                        <span>•</span>
                        <span>{prog.genre}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{prog.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {prog.rating} / 5
                        </span>
                        <span className="text-[10px] text-slate-500">({prog.votesCount} voti)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* MODALS */}
        {selectedProgram && (
          <ProgramDetailModal
            t={t}
            program={selectedProgram}
            onClose={() => setSelectedProgram(null)}
            isReminderSet={reminders.some((r) => r.id === selectedProgram.id)}
            onOpenReminderModal={(prog) => {
              setSelectedProgram(null);
              setReminderProgram(prog);
            }}
            onOpenShare={(prog) => {
              setShareProgram(prog);
            }}
          />
        )}

        {reminderProgram && (
          <ReminderModal
            t={t}
            program={reminderProgram}
            onClose={() => setReminderProgram(null)}
            onSaveReminder={handleSaveReminderFromModal}
          />
        )}

        {shareProgram && (
          <ShareModal
            t={t}
            program={shareProgram}
            onClose={() => setShareProgram(null)}
          />
        )}

        {showVipModal && (
          <VipUpgradeModal
            t={t}
            onClose={() => setShowVipModal(false)}
            onSubscribeSuccess={handleSubscribeSuccess}
          />
        )}

        {/* FLOATING TOAST NOTIFICATION */}
        <NotificationToast toast={toast} onClose={() => setToast(null)} />

        {/* FOOTER */}
        <footer className="mt-12 py-8 border-t border-slate-800 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-slate-300">CineGuide Pro</span>
              <span>© 2026 App Store & Google Play Ready • Live EPG API Connected</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <a href="#" onClick={(e) => { e.preventDefault(); setShowVipModal(true); }} className="hover:text-amber-400">Guida VIP</a>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Privacy Policy & Terms of Service ready for App Store & Play Store publication!"); }} className="hover:text-white">Privacy & Termini</a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
