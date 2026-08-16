import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import ToolCard from './components/ToolCard';
import ToolModal from './components/ToolModal';
import { TOOLS, CATEGORIES } from './data/toolsConfig';
import { UI_TRANSLATIONS } from './data/languages';
import {
  Sparkles,
  Shield,
  Zap,
  Search,
  LayoutGrid,
  Layers,
  FileInput,
  FileOutput,
  ShieldCheck,
  Edit3,
  Star,
  Flame,
  ArrowRight,
  Cpu,
  ScanText,
  FileCheck2,
  Lock,
  Scissors,
  Minimize2
} from 'lucide-react';

const CATEGORY_ICON_MAP = {
  LayoutGrid,
  Layers,
  Sparkles,
  FileInput,
  FileOutput,
  Edit3,
  ShieldCheck
};

// Spotlight Featured Fast-Launch Tools
const SPOTLIGHT_TOOL_IDS = [
  'ai-assistant',
  'edit-pdf-content',
  'merge-pdf',
  'ocr-pdf',
  'split-pdf',
  'protect-pdf'
];

export default function App() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [siteLang, setSiteLang] = useState(() => {
    try {
      return localStorage.getItem('freepdf_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('freepdf_favorites');
      return saved ? JSON.parse(saved) : ['edit-pdf-content', 'merge-pdf', 'split-pdf', 'ocr-pdf', 'compress-pdf', 'protect-pdf'];
    } catch {
      return ['edit-pdf-content', 'merge-pdf', 'split-pdf'];
    }
  });

  const t = UI_TRANSLATIONS[siteLang] || UI_TRANSLATIONS.en;

  useEffect(() => {
    localStorage.setItem('freepdf_lang', siteLang);
  }, [siteLang]);

  useEffect(() => {
    localStorage.setItem('freepdf_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [darkMode]);

  // Keyboard shortcut listener (Ctrl+K or / to search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFavorite = (toolId) => {
    setFavorites(prev =>
      prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
    );
  };

  // Filter tools based on search query, category, or favorites
  const filteredTools = useMemo(() => {
    return TOOLS.filter(tool => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query) ||
        (tool.badge && tool.badge.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (activeCategory === 'all') return true;
      if (activeCategory === 'favorites') return favorites.includes(tool.id);
      return tool.category === activeCategory;
    });
  }, [searchQuery, activeCategory, favorites]);

  // Spotlight tools list
  const spotlightTools = useMemo(() => {
    return SPOTLIGHT_TOOL_IDS.map(id => TOOLS.find(t => t.id === id)).filter(Boolean);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100 selection:bg-rose-500 selection:text-white transition-colors duration-300">
      {/* Top Header Navbar with World Languages Selector */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        siteLang={siteLang}
        setSiteLang={setSiteLang}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Ultra-Modern Addictive Hero Banner */}
        <div className="relative rounded-3xl p-6 sm:p-10 overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-rose-950/40 border border-slate-800/80 shadow-2xl backdrop-blur-2xl">
          {/* Animated Ambient Auroras */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-aurora" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            {/* Left Content Area */}
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-rose-500/20 to-purple-500/20 border border-rose-500/30 rounded-full text-rose-300 text-xs font-bold shadow-sm backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>{t.heroTag}</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                {t.heroTitle} <br />
                <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-violet-300 bg-clip-text text-transparent drop-shadow-sm">
                  {t.heroGradient}
                </span>
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed max-w-xl font-normal">
                {t.heroSub}
              </p>

              {/* Fast Quick-Action Launch Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => setSelectedTool(TOOLS.find(t => t.id === 'ai-assistant'))}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg glow-violet transition-transform active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                  <span>AI PDF Assistant</span>
                </button>

                <button
                  onClick={() => setSelectedTool(TOOLS.find(t => t.id === 'edit-pdf-content'))}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-lg glow-rose transition-transform active:scale-95"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit PDF Content</span>
                </button>

                <button
                  onClick={() => setSelectedTool(TOOLS.find(t => t.id === 'ocr-pdf'))}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  <ScanText className="w-4 h-4 text-violet-400" />
                  <span>Deep OCR (100+ Lang)</span>
                </button>

                <button
                  onClick={() => setSelectedTool(TOOLS.find(t => t.id === 'merge-pdf'))}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Merge PDF</span>
                </button>
              </div>
            </div>

            {/* Right Interactive Stats Cards Grid */}
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto flex-shrink-0">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wide uppercase">100% Private</span>
                </div>
                <div className="text-xl font-extrabold text-white">0 Uploads</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Zero cloud storage</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-rose-400 mb-2">
                  <Flame className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wide uppercase">Pro Suite</span>
                </div>
                <div className="text-xl font-extrabold text-white">{TOOLS.length} Tools</div>
                <div className="text-[11px] text-slate-400 mt-0.5">All offline ready</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-violet-400 mb-2">
                  <Cpu className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wide uppercase">Deep OCR</span>
                </div>
                <div className="text-xl font-extrabold text-white">100+ Lang</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Multi-language AI</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition">
                <div className="flex items-center space-x-2 text-amber-400 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wide uppercase">Ultra Fast</span>
                </div>
                <div className="text-xl font-extrabold text-white">0ms Latency</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Instant browser engine</div>
              </div>
            </div>
          </div>
        </div>

        {/* Spotlight Trending Tools Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Trending Most Popular Tools
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {spotlightTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool)}
                className="group relative p-3 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 text-left transition-all duration-200 transform hover:-translate-y-1 shadow-sm"
              >
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center mb-2 shadow group-hover:scale-110 transition-transform`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-rose-300 transition-colors line-clamp-1">
                  {tool.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                  {tool.badge || 'Popular'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Category Filter Navigation Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-2.5 bg-slate-900/70 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-lg">
          {/* Category Filter Tabs */}
          <div className="flex items-center overflow-x-auto gap-1.5 p-1 no-scrollbar">
            {CATEGORIES.map(cat => {
              const IconComp = CATEGORY_ICON_MAP[cat.icon] || LayoutGrid;
              const isActive = activeCategory === cat.id;
              const count = cat.id === 'all'
                ? TOOLS.length
                : TOOLS.filter(t => t.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-lg glow-rose'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{cat.id === 'all' ? t.allTools : cat.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Favorites filter */}
            {favorites.length > 0 && (
              <button
                onClick={() => setActiveCategory('favorites')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  activeCategory === 'favorites'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg glow-amber'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{t.favorites}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  {favorites.length}
                </span>
              </button>
            )}
          </div>

          {/* Quick Search Input with Shortcut Badge */}
          <div className="relative min-w-[280px] px-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-14 py-2 bg-slate-950/90 border border-slate-800 focus:border-rose-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition shadow-inner"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        {/* Tool Cards Full Responsive Grid */}
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-base font-extrabold text-slate-100 flex items-center space-x-2">
                <span>
                  {activeCategory === 'all' ? t.allTools :
                   activeCategory === 'favorites' ? t.favorites :
                   CATEGORIES.find(c => c.id === activeCategory)?.name || 'Tools'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                  {filteredTools.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.selectToolPrompt}</p>
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <div className="p-16 text-center bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 space-y-3 backdrop-blur-md">
              <p className="text-sm font-semibold text-slate-300">{t.noToolsFound} "{searchQuery}"</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                {t.resetSearch}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTools.map(tool => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onSelect={setSelectedTool}
                  isFavorite={favorites.includes(tool.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modern Addictive Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/95 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <p>© 2026 Free-PDF Editor • {t.author}</p>
          </div>
          <div className="flex items-center space-x-4 font-medium">
            <span className="text-emerald-400 flex items-center space-x-1.5">
              <span>{t.offlineReady}</span>
            </span>
            <span>•</span>
            <span className="text-rose-400">
              {t.freeAndSecure}
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Zero Server Uploads
            </span>
          </div>
        </div>
      </footer>

      {/* Active Tool Modal / Workbench */}
      <ToolModal
        tool={selectedTool}
        isOpen={!!selectedTool}
        onClose={() => setSelectedTool(null)}
      />
    </div>
  );
}
