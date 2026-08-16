import React, { useState, useRef, useEffect } from 'react';
import { loadPdfDocument, renderPageToCanvas, computePageDiff } from '../../services/pdfViewerEngine';
import { GitCompare, Columns, SplitSquareVertical, ChevronLeft, ChevronRight, RefreshCw, Upload } from 'lucide-react';

export default function CompareWorkbench({ files = [], onClose }) {
  const [fileA, setFileA] = useState(files[0] || null);
  const [fileB, setFileB] = useState(files[1] || null);

  const [pdfA, setPdfA] = useState(null);
  const [pdfB, setPdfB] = useState(null);

  const [pageA, setPageA] = useState(1);
  const [pageB, setPageB] = useState(1);
  const [totalPagesA, setTotalPagesA] = useState(1);
  const [totalPagesB, setTotalPagesB] = useState(1);

  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide' | 'diff' | 'slider'
  const [sliderPos, setSliderPos] = useState(50);
  const [diffStats, setDiffStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  const diffCanvasRef = useRef(null);

  // Load Doc A
  useEffect(() => {
    if (!fileA) return;
    async function loadA() {
      try {
        const doc = await loadPdfDocument(fileA);
        setPdfA(doc);
        setTotalPagesA(doc.numPages);
      } catch (e) {
        console.error('Error loading Doc A:', e);
      }
    }
    loadA();
  }, [fileA]);

  // Load Doc B
  useEffect(() => {
    if (!fileB) return;
    async function loadB() {
      try {
        const doc = await loadPdfDocument(fileB);
        setPdfB(doc);
        setTotalPagesB(doc.numPages);
      } catch (e) {
        console.error('Error loading Doc B:', e);
      }
    }
    loadB();
  }, [fileB]);

  // Render Pages & Diff
  useEffect(() => {
    if (!pdfA || !pdfB) return;
    async function renderDocs() {
      setLoading(true);
      try {
        if (canvasARef.current) await renderPageToCanvas(pdfA, pageA, canvasARef.current, 1.0);
        if (canvasBRef.current) await renderPageToCanvas(pdfB, pageB, canvasBRef.current, 1.0);

        if (viewMode === 'diff' && diffCanvasRef.current) {
          const pA = await pdfA.getPage(pageA);
          const pB = await pdfB.getPage(pageB);
          const diffResult = await computePageDiff(pA, pB, diffCanvasRef.current, 1.0);
          setDiffStats(diffResult);
        }
      } catch (err) {
        console.error('Error rendering comparison:', err);
      } finally {
        setLoading(false);
      }
    }
    renderDocs();
  }, [pdfA, pdfB, pageA, pageB, viewMode]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* File Selectors / Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">A</span>
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
              {fileA ? fileA.name : 'Select First PDF'}
            </span>
          </div>
          <label className="cursor-pointer px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition flex items-center space-x-1">
            <Upload className="w-3 h-3" />
            <span>{fileA ? 'Change' : 'Upload'}</span>
            <input type="file" accept=".pdf" onChange={(e) => e.target.files[0] && setFileA(e.target.files[0])} className="hidden" />
          </label>
        </div>

        <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center">B</span>
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
              {fileB ? fileB.name : 'Select Second PDF'}
            </span>
          </div>
          <label className="cursor-pointer px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition flex items-center space-x-1">
            <Upload className="w-3 h-3" />
            <span>{fileB ? 'Change' : 'Upload'}</span>
            <input type="file" accept=".pdf" onChange={(e) => e.target.files[0] && setFileB(e.target.files[0])} className="hidden" />
          </label>
        </div>
      </div>

      {/* Mode Toolbar & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
        {/* View Mode */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setViewMode('sideBySide')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
              viewMode === 'sideBySide' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
              viewMode === 'diff' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Pixel Diff</span>
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
              viewMode === 'slider' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>
        </div>

        {/* Sync Page Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setPageA(p => Math.max(1, p - 1)); setPageB(p => Math.max(1, p - 1)); }}
            disabled={pageA <= 1 && pageB <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-300">
            Page {pageA} / {Math.max(totalPagesA, totalPagesB)}
          </span>
          <button
            onClick={() => {
              setPageA(p => Math.min(totalPagesA, p + 1));
              setPageB(p => Math.min(totalPagesB, p + 1));
            }}
            disabled={pageA >= totalPagesA && pageB >= totalPagesB}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Comparative Canvas Display */}
      {(!fileA || !fileB) ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-950/40 rounded-xl border border-dashed border-slate-700 text-slate-400 space-y-2">
          <GitCompare className="w-10 h-10 text-brand-400 opacity-60" />
          <p className="text-sm font-medium">Please upload both PDF files above to start comparison</p>
        </div>
      ) : (
        <div className="flex-1 max-h-[55vh] overflow-auto bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex justify-center">
          {viewMode === 'sideBySide' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-blue-400 mb-2">Original (Document A)</span>
                <div className="shadow-2xl rounded overflow-hidden bg-white">
                  <canvas ref={canvasARef} className="block max-w-full" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-purple-400 mb-2">Modified (Document B)</span>
                <div className="shadow-2xl rounded overflow-hidden bg-white">
                  <canvas ref={canvasBRef} className="block max-w-full" />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'diff' && (
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center space-x-2 text-xs bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full border border-rose-500/30">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Changed pixels highlighted in Red ({diffStats ? diffStats.diffPixels.toLocaleString() : 0} px changed)</span>
              </div>
              <div className="shadow-2xl rounded overflow-hidden bg-white">
                <canvas ref={diffCanvasRef} className="block max-w-full" />
              </div>
            </div>
          )}

          {viewMode === 'slider' && (
            <div className="flex flex-col items-center space-y-3">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-80"
              />
              <div className="relative shadow-2xl rounded overflow-hidden bg-white max-w-xl">
                <canvas ref={canvasARef} className="block max-w-full" />
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-brand-400"
                  style={{ width: `${sliderPos}%` }}
                >
                  <canvas ref={canvasBRef} className="block max-w-full" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end pt-2 border-t border-slate-800">
        <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition">
          Close Diff Viewer
        </button>
      </div>
    </div>
  );
}
