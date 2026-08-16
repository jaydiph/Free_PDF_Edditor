import React, { useState, useEffect } from 'react';
import { loadPdfDocument, getPageThumbnail } from '../../services/pdfViewerEngine';
import { organizePdfPages } from '../../services/pdfEngine';
import { RotateCw, RotateCcw, Trash2, Copy, Plus, MoveLeft, MoveRight, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function OrganizeWorkbench({ files, onComplete, onClose }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadThumbnails() {
      setLoading(true);
      const allPages = [];

      for (let docIdx = 0; docIdx < files.length; docIdx++) {
        const file = files[docIdx];
        try {
          const pdfDoc = await loadPdfDocument(file);
          for (let pNum = 1; pNum <= pdfDoc.numPages; pNum++) {
            const thumbUrl = await getPageThumbnail(pdfDoc, pNum, 180);
            allPages.push({
              id: `${docIdx}-${pNum}-${Date.now()}-${Math.random()}`,
              docIndex: docIdx,
              pageIndex: pNum - 1,
              pageNumber: pNum,
              docName: file.name,
              thumbnail: thumbUrl,
              rotation: 0,
              isBlank: false,
            });
          }
        } catch (err) {
          console.error('Error loading page thumbnail:', err);
        }
      }

      if (isMounted) {
        setPages(allPages);
        setLoading(false);
      }
    }

    loadThumbnails();
    return () => { isMounted = false; };
  }, [files]);

  const handleRotate = (idx, deg) => {
    setPages(prev => prev.map((p, i) => {
      if (i === idx) {
        return { ...p, rotation: (p.rotation + deg) % 360 };
      }
      return p;
    }));
  };

  const handleDelete = (idx) => {
    if (pages.length <= 1) {
      alert('You must keep at least 1 page.');
      return;
    }
    setPages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDuplicate = (idx) => {
    const target = pages[idx];
    const newPage = {
      ...target,
      id: `dup-${Date.now()}-${Math.random()}`,
    };
    const updated = [...pages];
    updated.splice(idx + 1, 0, newPage);
    setPages(updated);
  };

  const handleAddBlank = () => {
    setPages(prev => [
      ...prev,
      {
        id: `blank-${Date.now()}`,
        isBlank: true,
        rotation: 0,
        pageNumber: prev.length + 1,
        docName: 'Blank Page',
      }
    ]);
  };

  const movePage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setPages(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    movePage(draggedIdx, index);
    setDraggedIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      const result = await organizePdfPages(files, pages);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onComplete(result);
    } catch (err) {
      alert('Failed to organize PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 dark:bg-slate-900/80 rounded-xl border border-slate-700/50">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-slate-300">
            Total Pages: <span className="text-brand-400 font-bold">{pages.length}</span>
          </span>
          <span className="text-xs text-slate-500">• Drag cards or use arrows to reorder</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddBlank}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Blank Page</span>
          </button>

          <button
            onClick={() => setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + 90) % 360 })))}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <RotateCw className="w-4 h-4 text-indigo-400" />
            <span>Rotate All 90°</span>
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-sm text-slate-400">Rendering visual page thumbnails...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto max-h-[60vh] p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group relative bg-slate-800/80 rounded-xl p-2.5 border transition cursor-grab active:cursor-grabbing flex flex-col items-center select-none ${
                  draggedIdx === idx ? 'border-brand-500 scale-105 shadow-xl bg-slate-800' : 'border-slate-700/60 hover:border-brand-400/60'
                }`}
              >
                {/* Badge Number */}
                <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-slate-900/90 border border-slate-700 text-brand-300 text-xs font-bold flex items-center justify-center shadow">
                  {idx + 1}
                </div>

                {/* Thumbnail Display */}
                <div className="w-full h-44 bg-slate-950/70 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-slate-800/80">
                  {p.isBlank ? (
                    <div className="w-full h-full bg-white/95 rounded flex items-center justify-center border border-dashed border-slate-300">
                      <span className="text-xs text-slate-400 font-medium">Blank</span>
                    </div>
                  ) : (
                    <img
                      src={p.thumbnail}
                      alt={`Page ${idx + 1}`}
                      className="max-w-full max-h-full object-contain rounded shadow transition-transform duration-200"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    />
                  )}
                </div>

                {/* Page Info */}
                <div className="w-full mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[90px]">{p.docName || `Page ${p.pageNumber}`}</span>
                  {p.rotation !== 0 && (
                    <span className="text-brand-400 font-semibold">{p.rotation}°</span>
                  )}
                </div>

                {/* Quick Action Overlay Controls */}
                <div className="flex items-center justify-center gap-1.5 mt-2.5 w-full pt-2 border-t border-slate-700/40">
                  <button
                    onClick={() => movePage(idx, idx - 1)}
                    disabled={idx === 0}
                    title="Move Left"
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  >
                    <MoveLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRotate(idx, 90)}
                    title="Rotate 90° Clockwise"
                    className="p-1 text-slate-400 hover:text-brand-400 transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(idx)}
                    title="Duplicate Page"
                    className="p-1 text-slate-400 hover:text-emerald-400 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(idx)}
                    title="Delete Page"
                    className="p-1 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => movePage(idx, idx + 1)}
                    disabled={idx === pages.length - 1}
                    title="Move Right"
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Submit Button */}
      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={processing || pages.length === 0}
          className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
        >
          {processing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Compiling PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Apply & Download Organized PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
