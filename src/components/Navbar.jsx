import React from 'react';
import { Sun, Moon, ShieldCheck, Sparkles, Globe } from 'lucide-react';
import { UI_TRANSLATIONS } from '../data/languages';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '简体中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' }
];

export default function Navbar({
  darkMode,
  setDarkMode,
  siteLang = 'en',
  setSiteLang = () => {}
}) {
  const t = UI_TRANSLATIONS[siteLang] || UI_TRANSLATIONS.en;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/85 dark:bg-slate-950/85 border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-rose-500 to-purple-500 text-white shadow-lg glow-brand">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-brand-400 bg-clip-text text-transparent">
                {t.title}
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-500/20 text-brand-300 rounded-md border border-brand-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {t.author} • 100% Private Offline PDF Suite
            </p>
          </div>
        </div>

        {/* Global Controls: World Language Switcher, Author Badge, Privacy & Dark Mode */}
        <div className="flex items-center space-x-2.5">
          {/* Website World Language Selector */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-brand-400" />
            <select
              value={siteLang}
              onChange={(e) => setSiteLang(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 border-none outline-none cursor-pointer"
              title="Select Website Language"
            >
              {LANGUAGE_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code} className="bg-slate-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Author Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Made By Jaydip Hadiya</span>
          </div>

          {/* Privacy Guarantee Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.privacyBadge}</span>
          </div>

          {/* Dark / Light Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/70 transition shadow-sm"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
