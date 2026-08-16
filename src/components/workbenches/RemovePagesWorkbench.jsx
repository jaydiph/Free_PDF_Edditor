import React, { useState, useEffect } from 'react';
import { loadPdfDocument, getPageThumbnail } from '../../services/pdfViewerEngine';
import { removePages, parsePageRanges } from '../../services/pdfEngine';
import PdfDocumentPreview from '../PdfDocumentPreview';
import {
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Undo,
  Check,
  XCircle,
  Eye,
  LayoutGrid,
  ZoomIn,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RemovePagesWorkbench({ file, onComplete, onClose }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'reader'
  const [pagesToRemoveInput, setPagesToRemoveInput] = useState('');
  const [markedPages, setMarkedPages] = useState([]); // 0-indexed page numbers marked for deletion

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [zoomedPage, setZoomedPage] = useState(null);

  // Load PDF and render thumbnails
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
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading thumbnails for RemovePagesWorkbench:', err);
        if (isMounted) {
          setError('Failed to load PDF pages. ' + err.message);
          setLoading(false);
        }
      }
    }
    initThumbnails();
    return () => { isMounted = false; };
  }, [file]);

  // Sync text input with markedPages state
  const handleInputChange = (e) => {
    const val = e.target.value;
    setPagesToRemoveInput(val);
    if (pages.length > 0) {
      const parsed = parsePageRanges(val, pages.length);
      setMarkedPages(parsed);
    }
  };

  // Toggle marked page on thumbnail click
  const togglePageDeletion = (pageIndex) => {
    let newMarked;
    if (markedPages.includes(pageIndex)) {
      newMarked = markedPages.filter(p => p !== pageIndex);
    } else {
      if (markedPages.length >= pages.length - 1) {
        alert('You must keep at least 1 page in the document.');
        return;
      }
      newMarked = [...markedPages, pageIndex].sort((a, b) => a - b);
    }
    setMarkedPages(newMarked);

    const rangeString = formatRangesFromArray(newMarked);
    setPagesToRemoveInput(rangeString);
  };

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

  const handleSelectOdd = () => {
    const odd = pages.filter((_, i) => i % 2 === 0).map(p => p.pageIndex);
    if (odd.length >= pages.length) {
      alert('Cannot delete all pages.');
      return;
    }
    setMarkedPages(odd);
    setPagesToRemoveInput(formatRangesFromArray(odd));
  };

  const handleSelectEven = () => {
    const even = pages.filter((_, i) => i % 2 === 1).map(p => p.pageIndex);
    if (even.length >= pages.length) {
      alert('Cannot delete all pages.');
      return;
    }
    setMarkedPages(even);
    setPagesToRemoveInput(formatRangesFromArray(even));
  };

  const handleClear = () => {
    setMarkedPages([]);
    setPagesToRemoveInput('');
  };

  const handleSave = async () => {
    if (markedPages.length === 0) {
      alert('Please select at least 1 page to delete.');
      return;
    }
    if (markedPages.length >= pages.length) {
      alert('You cannot delete all pages from the document.');
      return;
    }

    try {
      setProcessing(true);
      const result = await removePages(file, {
        pagesToRemove: pagesToRemoveInput
      });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onComplete(result);
    } catch (err) {
      alert('Failed to remove pages: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 select-none">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 rounded-2xl border border-slate-700/80 shadow-md">
        {/* Quick Selection Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Quick Select:</span>
          <button
            onClick={handleSelectOdd}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
          >
            Odd Pages (1, 3, 5...)
          </button>
          <button
            onClick={handleSelectEven}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
          >
            Even Pages (2, 4, 6...)
          </button>
          {markedPages.length > 0 && (
            <button
              onClick={handleClear}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs rounded-lg border border-slate-700 transition flex items-center space-x-1"
            >
              <Undo className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition ${
              viewMode === 'grid' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid Selection</span>
          </button>
          <button
            onClick={() => setViewMode('reader')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition ${
              viewMode === 'reader' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Document Reader</span>
          </button>
        </div>
      </div>

      {/* Counter summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-slate-300">
            Total: <span className="font-bold text-slate-100">{pages.length}</span>
          </span>
          <span className="text-emerald-400 font-semibold">
            Keeping: {pages.length - markedPages.length}
          </span>
          <span className="text-rose-400 font-semibold">
            Deleting: {markedPages.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-300 font-medium">Pages to Delete:</span>
          <input
            type="text"
            value={pagesToRemoveInput}
            onChange={handleInputChange}
            placeholder="e.g. 1, 3-5"
            className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-rose-500 w-28 font-mono"
          />
        </div>
      </div>

      {/* Visual Pages Thumbnail Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
          <p className="text-sm text-slate-400">Rendering visual page previews...</p>
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
        <div className="flex-1 overflow-y-auto max-h-[55vh] p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((p) => {
              const isMarkedForDeletion = markedPages.includes(p.pageIndex);
              return (
                <div
                  key={p.pageNumber}
                  onClick={() => togglePageDeletion(p.pageIndex)}
                  className={`group relative rounded-xl p-2.5 border transition cursor-pointer flex flex-col items-center select-none ${
                    isMarkedForDeletion
                      ? 'bg-rose-950/50 border-rose-500 shadow-lg glow-rose ring-2 ring-rose-500/60'
                      : 'bg-slate-900/70 border-slate-700/70 hover:border-slate-500'
                  }`}
                >
                  {/* Badge Number */}
                  <div className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow ${
                    isMarkedForDeletion ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {p.pageNumber}
                  </div>

                  {/* Zoom Inspector Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedPage(p);
                    }}
                    className="absolute top-3 right-11 z-10 p-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 opacity-0 group-hover:opacity-100 transition shadow"
                    title="Inspect page"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {/* Deletion / Keep Status Icon */}
                  <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center shadow ${
                    isMarkedForDeletion ? 'bg-rose-600 text-white' : 'bg-slate-800 text-emerald-400 border border-slate-700'
                  }`}>
                    {isMarkedForDeletion ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  </div>

                  {/* Thumbnail Image with red overlay when marked */}
                  <div className="w-full h-44 bg-slate-950/70 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-slate-800 relative">
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt={`Page ${p.pageNumber}`}
                        className={`max-w-full max-h-full object-contain rounded shadow transition duration-150 ${
                          isMarkedForDeletion ? 'opacity-30 grayscale' : 'opacity-100'
                        }`}
                      />
                    ) : (
                      <span className="text-xs text-slate-500">Page {p.pageNumber}</span>
                    )}

                    {isMarkedForDeletion && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/60 text-rose-300">
                        <Trash2 className="w-8 h-8 text-rose-400 mb-1 animate-bounce" />
                        <span className="text-xs font-bold uppercase tracking-wider">Delete</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full mt-2 flex items-center justify-center text-[11px]">
                    <span className={isMarkedForDeletion ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                      {isMarkedForDeletion ? '✕ Marked for Removal' : '✓ Keep Page'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
        <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={processing || markedPages.length === 0}
          className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold rounded-xl shadow-lg glow-rose disabled:opacity-50 transition"
        >
          {processing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Removing Pages...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span>Delete {markedPages.length} Selected Pages &amp; Download</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
