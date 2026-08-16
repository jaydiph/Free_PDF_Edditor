import React from 'react';
import {
  Merge,
  Split,
  Grid,
  RotateCw,
  Trash2,
  FileSpreadsheet,
  Crop,
  Columns,
  Image,
  FileCode,
  Code2,
  Table,
  Globe,
  Images,
  FileText,
  ImageDown,
  Sheet,
  Code,
  Lock,
  Unlock,
  Eraser,
  PenTool,
  EyeOff,
  Stamp,
  Hash,
  Minimize2,
  Tags,
  Moon,
  Wrench,
  Highlighter,
  ScanText,
  GitCompare,
  Workflow,
  Star,
  ArrowRight,
  Presentation,
  Camera,
  Award,
  Sparkles,
  Edit3,
  Zap
} from 'lucide-react';

const ICON_MAP = {
  Merge,
  Split,
  Grid,
  RotateCw,
  Trash2,
  FileSpreadsheet,
  Crop,
  Columns,
  Image,
  FileCode,
  Code2,
  Table,
  Globe,
  Images,
  FileText,
  ImageDown,
  Sheet,
  Code,
  Lock,
  Unlock,
  Eraser,
  PenTool,
  EyeOff,
  Stamp,
  Hash,
  Minimize2,
  Tags,
  Moon,
  Wrench,
  Highlighter,
  ScanText,
  GitCompare,
  Workflow,
  Presentation,
  Camera,
  Award,
  Sparkles,
  Edit3,
  Zap
};

export default function ToolCard({ tool, onSelect, isFavorite, onToggleFavorite }) {
  const IconComponent = ICON_MAP[tool.icon] || FileText;

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(tool.id);
  };

  return (
    <div
      onClick={() => onSelect(tool)}
      className="group relative rounded-3xl p-5 cursor-pointer flex flex-col justify-between overflow-hidden bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-rose-500/50 shadow-lg hover:shadow-2xl hover:shadow-rose-950/30 transition-all duration-300 transform hover:-translate-y-1.5 active:scale-[0.98] backdrop-blur-xl"
    >
      {/* Category Ambient Glow Backlight */}
      <div className={`absolute -top-10 -right-10 w-36 h-36 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 pointer-events-none rounded-full`} />

      {/* Top Section */}
      <div>
        {/* Top Header: Icon + Badge + Favorite */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
            <IconComponent className="w-6 h-6 drop-shadow" />
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          </div>

          <div className="flex items-center space-x-1.5">
            {tool.badge && (
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border shadow-sm ${
                tool.badge === 'Popular' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse-subtle' :
                tool.badge === 'Visual Preview' ? 'bg-sky-500/15 text-sky-300 border-sky-500/40' :
                tool.badge === 'OCR In-Place Editor' ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-black' :
                tool.badge === 'Interactive' ? 'bg-purple-500/15 text-purple-300 border-purple-500/40' :
                tool.badge === '40+ Languages' ? 'bg-violet-500/15 text-violet-300 border-violet-500/40' :
                'bg-slate-800/90 text-slate-300 border-slate-700'
              }`}>
                {tool.badge}
              </span>
            )}

            <button
              onClick={handleFavoriteClick}
              className={`p-1.5 rounded-xl transition duration-200 ${
                isFavorite
                  ? 'text-amber-400 bg-amber-500/20 ring-1 ring-amber-500/40 scale-110 shadow'
                  : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 transition-transform ${isFavorite ? 'fill-amber-400 scale-105' : 'group-hover:scale-110'}`} />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-sm font-bold text-slate-100 group-hover:text-rose-300 transition-colors line-clamp-1 mb-1.5 tracking-tight">
          {tool.title}
        </h3>
        <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-2 leading-relaxed font-normal">
          {tool.description}
        </p>
      </div>

      {/* Bottom Footer Section */}
      <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-medium">
        <span className="capitalize text-[11px] text-slate-500 font-semibold tracking-wider">
          {tool.category.replace('-', ' ')}
        </span>
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-950/70 group-hover:bg-gradient-to-r group-hover:from-rose-600 group-hover:to-red-600 text-slate-400 group-hover:text-white font-bold transition-all duration-200 shadow-sm">
          <span>Launch</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
