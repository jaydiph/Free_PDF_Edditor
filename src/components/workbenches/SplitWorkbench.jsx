import React, { useState, useEffect } from 'react';
import { loadPdfDocument, getPageThumbnail } from '../../services/pdfViewerEngine';
import { splitPdf, parsePageRanges } from '../../services/pdfEngine';
import PdfDocumentPreview from '../PdfDocumentPreview';
import {
  Split,
  Download,
  RefreshCw,
  CheckCircle2,
  Layers,
  FileSpreadsheet,
  Check,
  Plus,
  Trash2,
  FolderArchive,
  Eye,
  LayoutGrid,
  ZoomIn,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SplitWorkbench({ file, onComplete, onClose }) {
  const [splitMode, setSplitMode] = useState('range'); // 'range' | 'all' | 'fixed'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'reader'
  const [ranges, setRanges] = useState('');
  const [fixedCount, setFixedCount] = useState(2);
  const [selectedPages, setSelectedPages] = useState([]); // 0-indexed selected pages for range mode

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Quick zoom modal for inspecting a single thumbnail
  const [zoomedPage, setZoomedPage] = useState(null);

  // Load PDF and render visual thumbnails
  useEffect(() => {
    let isMounted = true;
    async function initThumbnails() {
      if (!file) {
        if (isMounted) setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const pdfDoc = await loadPdfDocument(file);
        const thumbs = [];
        const numPages = pdfDoc.numPages;

        for (let i = 1; i <= numPages; i++) {
          try {
            const thumbUrl = await getPageThumbnail(pdfDoc, i, 180);
            thumbs.push({
              pageNumber: i,
              pageIndex: i - 1,
              thumbnail: thumbUrl,
            });
          } catch (tErr) {
            console.warn(`Error generating thumbnail for page ${i}:`, tErr);
            thumbs.push({
              pageNumber: i,
              pageIndex: i - 1,
              thumbnail: '',
            });
          }
        }

        if (isMounted) {
          setPages(thumbs);
          setSelectedPages(thumbs.map(t => t.pageIndex));
          setRanges(`1-${thumbs.length}`);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error rendering thumbnails for SplitWorkbench:', err);
        if (isMounted) {
          setError('Failed to load PDF preview. ' + err.message);
          setLoading(false);
        }
      }
    }
    initThumbnails();
    return () => { isMounted = false; };
  }, [file]);

  // Sync ranges text input to selectedPages state
  const handleRangeInputChange = (e) => {
    const val = e.target.value;
    setRanges(val);
    if (pages.length > 0) {
      const parsed = parsePageRanges(val, pages.length);
      setSelectedPages(parsed);
    }
  };

  // Toggle page selection on thumbnail click
  const togglePageSelection = (pageIndex) => {
    let newSelected;
    if (selectedPages.includes(pageIndex)) {
      if (selectedPages.length === 1) return; // Keep at least 1
      newSelected = selectedPages.filter(p => p !== pageIndex);
    } else {
      newSelected = [...selectedPages, pageIndex].sort((a, b) => a - b);
    }
    setSelectedPages(newSelected);

    const rangeString = formatRangesFromArray(newSelected);
    setRanges(rangeString);
  };

  // Helper to convert array of indices into range string
  const formatRangesFromArray = (indices) => {
    if (indices.length === 0) return '';
    const sorted = [...indices].sort((a, b) => a - b).map(i => i + 1);
    const result = [];
    let start = sorted[0];
    let end = start;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        result.push(start === end ? `${start}` : `${start}-${end}`);
        start = sorted[i];
        end = start;
      }
    }
    result.push(start === end ? `${start}` : `${start}-${end}`);
    return result.join(', ');
  };

  const handleSelectAll = () => {
    const all = pages.map(p => p.pageIndex);
    setSelectedPages(all);
    setRanges(`1-${pages.length}`);
  };

  const handleSelectOdd = () => {
    const odd = pages.filter((_, i) => i % 2 === 0).map(p => p.pageIndex);
    setSelectedPages(odd);
    setRanges(formatRangesFromArray(odd));
  };

  const handleSelectEven = () => {
    const even = pages.filter((_, i) => i % 2 === 1).map(p => p.pageIndex);
    setSelectedPages(even);
    setRanges(formatRangesFromArray(even));
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      const result = await splitPdf(file, {
        splitMode,
        ranges,
        fixedCount
      });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onComplete(result);
    } catch (err) {
      alert('Failed to split PDF: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 select-none">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 rounded-2xl border border-slate-700/80 shadow-md">
        {/* Split Mode Selector */}
        <div className="flex bg-slate-950/80 rounded-xl p-1 border border-slate-800">
          <button
            onClick={() => setSplitMode('range')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              splitMode === 'range' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Visual Range Selection</span>
          </button>
          <button
            onClick={() => setSplitMode('all')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              splitMode === 'all' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Extract Every Page (ZIP)</span>
          </button>
          <button
            onClick={() => setSplitMode('fixed')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              splitMode === 'fixed' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fixed Chunks</span>
          </button>
        </div>

        {/* View Mode Toggle (Grid Preview vs Full Reader Preview) */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition ${
                viewMode === 'grid' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Preview</span>
            </button>
            <button
              onClick={() => setViewMode('reader')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition ${
                viewMode === 'reader' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Document Reader</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode-Specific Subtoolbar */}
      {splitMode === 'range' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Page Range:</span>
            <input
              type="text"
              value={ranges}
              onChange={handleRangeInputChange}
              placeholder="e.g. 1-3, 5"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500 w-36 font-mono"
            />
            <div className="flex items-center space-x-1 pl-2 border-l border-slate-700">
              <button
                onClick={handleSelectAll}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition text-[11px]"
              >
                All
              </button>
              <button
                onClick={handleSelectOdd}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition text-[11px]"
              >
                Odd
              </button>
              <button
                onClick={handleSelectEven}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition text-[11px]"
              >
                Even
              </button>
            </div>
          </div>

          <span className="text-slate-300">
            Selected: <span className="text-brand-400 font-bold">{selectedPages.length}</span> of {pages.length} pages
          </span>
        </div>
      )}

      {splitMode === 'fixed' && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 font-medium">Pages per split document:</span>
            <input
              type="number"
              min="1"
              max={pages.length || 50}
              value={fixedCount}
              onChange={(e) => setFixedCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500 w-20"
            />
          </div>
          <span className="text-slate-400">
            Will generate <span className="text-brand-400 font-bold">{Math.ceil(pages.length / fixedCount)}</span> PDF files
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading document pages for visual preview...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 bg-rose-950/20 border border-rose-500/30 rounded-xl">
          {error}
        </div>
      ) : viewMode === 'reader' ? (
        /* Full Interactive Document Reader Preview */
        <div className="flex-1 min-h-[50vh] max-h-[60vh] overflow-hidden rounded-2xl border border-slate-800">
          <PdfDocumentPreview fileOrBlob={file} className="h-full" />
        </div>
      ) : (
        /* Visual Thumbnail Grid */
        <div className="flex-1 overflow-y-auto max-h-[55vh] p-2">
          {/* Range Mode Thumbnail Grid */}
          {splitMode === 'range' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((p) => {
                const isSelected = selectedPages.includes(p.pageIndex);
                return (
                  <div
                    key={p.pageNumber}
                    onClick={() => togglePageSelection(p.pageIndex)}
                    className={`group relative rounded-xl p-2.5 border transition cursor-pointer flex flex-col items-center select-none ${
                      isSelected
                        ? 'bg-brand-950/40 border-brand-500 shadow-lg glow-brand ring-2 ring-brand-500/50'
                        : 'bg-slate-900/60 border-slate-800 opacity-50 hover:opacity-80'
                    }`}
                  >
                    {/* Badge Number */}
                    <div className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow ${
                      isSelected ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.pageNumber}
                    </div>

                    {/* Quick Zoom Inspector Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedPage(p);
                      }}
                      className="absolute top-3 right-11 z-10 p-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 opacity-0 group-hover:opacity-100 transition shadow"
                      title="Inspect full page"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    {/* Selection Checkmark */}
                    <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center shadow ${
                      isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 border border-slate-700 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>

                    {/* Thumbnail Image */}
                    <div className="w-full h-44 bg-slate-950/70 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-slate-800">
                      {p.thumbnail ? (
                        <img
                          src={p.thumbnail}
                          alt={`Page ${p.pageNumber}`}
                          className="max-w-full max-h-full object-contain rounded shadow"
                        />
                      ) : (
                        <span className="text-xs text-slate-500">Page {p.pageNumber}</span>
                      )}
                    </div>

                    <div className="w-full mt-2 flex items-center justify-center text-[11px]">
                      <span className={isSelected ? 'text-brand-300 font-semibold' : 'text-slate-500'}>
                        {isSelected ? '✓ Included in Split' : 'Excluded'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Extract All Mode Preview */}
          {splitMode === 'all' && (
            <div className="space-y-3">
              <div className="p-3 bg-brand-950/30 border border-brand-500/20 rounded-xl text-xs text-brand-300 flex items-center space-x-2">
                <FolderArchive className="w-4 h-4 flex-shrink-0" />
                <span>Every single page below will be extracted into its own standalone PDF file and bundled into a ZIP archive.</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {pages.map((p) => (
                  <div key={p.pageNumber} className="bg-slate-900/80 rounded-xl p-2 border border-slate-800 flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-300 mb-1">page_{p.pageNumber}.pdf</span>
                    <div className="w-full h-36 bg-slate-950 rounded overflow-hidden flex items-center justify-center p-1 border border-slate-800">
                      <img src={p.thumbnail} alt={`Page ${p.pageNumber}`} className="max-w-full max-h-full object-contain" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed Chunks Mode Preview */}
          {splitMode === 'fixed' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                Splitting into files of <span className="font-bold">{fixedCount} pages each</span>. Below are the grouped document chunks:
              </div>

              {Array.from({ length: Math.ceil(pages.length / fixedCount) }, (_, chunkIdx) => {
                const startIdx = chunkIdx * fixedCount;
                const chunkPages = pages.slice(startIdx, startIdx + fixedCount);
                return (
                  <div key={chunkIdx} className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand-300">Part {chunkIdx + 1}: Pages {startIdx + 1} to {startIdx + chunkPages.length}</span>
                      <span className="text-slate-500">({chunkPages.length} pages)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {chunkPages.map(p => (
                        <div key={p.pageNumber} className="bg-slate-950 rounded-lg p-2 border border-slate-800 flex flex-col items-center">
                          <span className="text-[10px] text-slate-400 mb-1">Page {p.pageNumber}</span>
                          <div className="w-full h-32 overflow-hidden flex items-center justify-center">
                            <img src={p.thumbnail} alt={`Page ${p.pageNumber}`} className="max-w-full max-h-full object-contain" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Page Zoom Inspector Modal */}
      {zoomedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl max-h-[85vh] p-4 flex flex-col items-center space-y-3 shadow-2xl">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-slate-200">Page {zoomedPage.pageNumber} Preview</span>
              <button
                onClick={() => setZoomedPage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[70vh] flex items-center justify-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              <img src={zoomedPage.thumbnail} alt={`Page ${zoomedPage.pageNumber}`} className="max-h-[65vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <span className="text-xs text-slate-400">
          Document contains <span className="text-white font-bold">{pages.length}</span> total pages
        </span>

        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing || (splitMode === 'range' && selectedPages.length === 0)}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Splitting PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Split &amp; Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
