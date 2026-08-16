import React from 'react';
import { CATEGORIES } from '../data/toolsConfig';
import {
  LayoutGrid,
  Layers,
  FileInput,
  FileOutput,
  ShieldCheck,
  Sliders,
  Sparkles,
  Workflow,
  History,
  Heart,
  ChevronRight
} from 'lucide-react';

const ICON_MAP = {
  LayoutGrid,
  Layers,
  FileInput,
  FileOutput,
  ShieldCheck,
  Sliders,
  Sparkles,
  Workflow
};

export default function Sidebar({
  activeCategory,
  setActiveCategory,
  favoritesCount,
  isFavoritesFilterActive,
  onShowFavoritesOnly,
  onOpenWorkflow
}) {
  return (
    <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col space-y-6">
      {/* Category Navigation */}
      <div className="bg-slate-900/60 dark:bg-slate-900/70 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
          Categories
        </h2>

        <div className="space-y-1 mt-1">
          {CATEGORIES.map(cat => {
            const Icon = ICON_MAP[cat.icon] || LayoutGrid;
            const isActive = !isFavoritesFilterActive && activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.id === 'workflow') {
                    onOpenWorkflow();
                  } else {
                    setActiveCategory(cat.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md glow-brand'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{cat.name}</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Launch Pipeline Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900/60 border border-indigo-500/30 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl group-hover:scale-125 transition" />
        <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold mb-1">
          <Workflow className="w-4 h-4 text-cyan-400" />
          <span>Workflow Pipeline</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Chain merge, watermark, compress &amp; protect into an automated batch job.
        </p>
        <button
          onClick={onOpenWorkflow}
          className="w-full flex items-center justify-center space-x-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
        >
          <span>Open Pipeline Builder</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Local Guarantee Card */}
      <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1.5">
        <div className="inline-flex p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mb-1">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-200">100% Offline Processing</h4>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Files are processed entirely inside your local browser &amp; machine. No data is ever uploaded to external servers.
        </p>
      </div>
    </aside>
  );
}
