import React from 'react';
import { Tv, Search, Bell, Crown, Globe, Smartphone, Monitor, Sun, Moon, Radio, RefreshCw } from 'lucide-react';
import { countriesList } from '../data/tvData';

export default function Header({
  t,
  currentCountry,
  setCurrentCountry,
  currentLang,
  setCurrentLang,
  searchQuery,
  setSearchQuery,
  activeRemindersCount,
  onOpenReminders,
  onOpenVip,
  viewMode,
  setViewMode,
  theme,
  setTheme,
  isLiveApi,
  isLoadingApi,
  onRefreshApi
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* TOP BRANDING & ACTION ROW */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSearchQuery('')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Tv className="w-5 h-5 text-indigo-400 group-hover:text-pink-400 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  {t.appName}
                </h1>
                <span className="text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  PRO
                </span>
                
                {/* LIVE API STATUS BADGE */}
                <div
                  onClick={onRefreshApi}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold cursor-pointer hover:bg-emerald-500/20 transition-all ml-1"
                  title="Clicca per aggiornare la Guida TV live via API"
                >
                  <Radio className={`w-3 h-3 ${isLoadingApi ? 'animate-spin' : 'animate-pulse'}`} />
                  <span className="hidden sm:inline">EPG LIVE API</span>
                  <RefreshCw className={`w-2.5 h-2.5 ml-0.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* MOBILE ACTIONS */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenReminders}
              className="relative p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {activeRemindersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {activeRemindersCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenVip}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-lg"
            >
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              VIP
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-800/70 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* DESKTOP CONTROLS & SELECTORS */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Country Selector */}
          <div className="relative flex items-center bg-slate-800/70 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
            <Globe className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
            <select
              value={currentCountry}
              onChange={(e) => setCurrentCountry(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
            >
              {countriesList.map((c) => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selector */}
          <div className="relative flex items-center bg-slate-800/70 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
            <span className="font-bold text-indigo-400 mr-1.5 uppercase text-[10px]">{currentLang}</span>
            <select
              value={currentLang}
              onChange={(e) => setCurrentLang(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="it" className="bg-slate-900">Italiano (IT)</option>
              <option value="en" className="bg-slate-900">English (EN)</option>
              <option value="es" className="bg-slate-900">Español (ES)</option>
              <option value="fr" className="bg-slate-900">Français (FR)</option>
              <option value="de" className="bg-slate-900">Deutsch (DE)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
            className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            title={viewMode === 'mobile' ? t.viewModeDesktop : t.viewModeMobile}
          >
            {viewMode === 'mobile' ? <Monitor className="w-4 h-4 text-pink-400" /> : <Smartphone className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-amber-400 hover:bg-slate-700/50 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Reminders Button */}
          <button
            onClick={onOpenReminders}
            className="relative p-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-slate-200 hover:text-white hover:border-indigo-500/50 transition-all"
            title={t.myReminders}
          >
            <Bell className="w-4 h-4 text-indigo-300" />
            {activeRemindersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-600 text-white text-[9px] font-bold flex items-center justify-center border border-slate-900 animate-pulse">
                {activeRemindersCount}
              </span>
            )}
          </button>

          {/* VIP Upgrade Button */}
          <button
            onClick={onOpenVip}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>{t.vipPass}</span>
          </button>
        </div>

      </div>

      {/* MOBILE SECONDARY CONTROLS BAR */}
      <div className="flex md:hidden items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80 text-xs">
        {/* Country */}
        <div className="flex items-center gap-1 bg-slate-800/90 rounded-lg px-2 py-1">
          <Globe className="w-3 h-3 text-indigo-400" />
          <select
            value={currentCountry}
            onChange={(e) => setCurrentCountry(e.target.value)}
            className="bg-transparent text-white font-medium focus:outline-none"
          >
            {countriesList.map((c) => (
              <option key={c.code} value={c.code} className="bg-slate-900">
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="flex items-center gap-1 bg-slate-800/90 rounded-lg px-2 py-1">
          <select
            value={currentLang}
            onChange={(e) => setCurrentLang(e.target.value)}
            className="bg-transparent text-white font-medium uppercase focus:outline-none"
          >
            <option value="it" className="bg-slate-900">IT</option>
            <option value="en" className="bg-slate-900">EN</option>
            <option value="es" className="bg-slate-900">ES</option>
            <option value="fr" className="bg-slate-900">FR</option>
            <option value="de" className="bg-slate-900">DE</option>
          </select>
        </div>

        {/* Mobile View Toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'mobile' ? 'desktop' : 'mobile')}
          className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg text-slate-300"
        >
          {viewMode === 'mobile' ? <Monitor className="w-3 h-3 text-pink-400" /> : <Smartphone className="w-3 h-3 text-indigo-400" />}
          <span>{viewMode === 'mobile' ? 'Desktop' : 'App Frame'}</span>
        </button>
      </div>
    </header>
  );
}
