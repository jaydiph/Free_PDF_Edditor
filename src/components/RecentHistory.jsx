import React from 'react';
import { History, Trash2, CheckCircle2, Clock } from 'lucide-react';

export default function RecentHistory({ history = [], onClearHistory }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="mt-8 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
          <History className="w-4 h-4 text-brand-400" />
          <span>Recent Local Operations</span>
        </div>
        <button
          onClick={onClearHistory}
          className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-rose-400 transition"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {history.slice(0, 6).map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs"
          >
            <div className="flex items-center space-x-2 truncate max-w-[200px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-200">{item.toolTitle}</span>
                <span className="text-[10px] text-slate-400 block truncate">{item.filename}</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 flex-shrink-0">
              <Clock className="w-2.5 h-2.5" />
              <span>{item.timestamp}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
