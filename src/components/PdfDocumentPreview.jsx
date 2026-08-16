import React, { useState, useEffect, useRef } from 'react';
import { loadPdfDocument, renderPageToCanvas, getPageThumbnail } from '../services/pdfViewerEngine';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  LayoutGrid,
  FileText
} from 'lucide-react';

export default function PdfDocumentPreview({ fileOrBlob, className = '', initialPage = 1, showThumbnailsSidebar = true }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    async function loadPdf() {
      if (!fileOrBlob) return;
      setLoading(true);
      setThumbnails([]);
      try {
        const doc = await loadPdfDocument(fileOrBlob);
        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false); // Unblock immediately so page 1 renders!

          // Generate lightweight thumbnails asynchronously in background
          setTimeout(async () => {
            if (!isMounted) return;
            const thumbs = [];
            for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
              if (!isMounted) break;
              try {
                const tUrl = await getPageThumbnail(doc, i, 100);
                thumbs.push({ pageNumber: i, thumbnail: tUrl });
              } catch {}
            }
            if (isMounted) setThumbnails(thumbs);
          }, 100);
        }
      } catch (err) {
        console.error('Error loading PDF in PdfDocumentPreview:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadPdf();
    return () => { isMounted = false; };
  }, [fileOrBlob]);

  // Render current page to canvas
  useEffect(() => {
    let isMounted = true;
    async function renderPage() {
      if (!pdfDoc || !canvasRef.current || numPages === 0) return;
      setRendering(true);
      try {
        await renderPageToCanvas(pdfDoc, currentPage, canvasRef.current, scale);
        if (isMounted) setRendering(false);
      } catch (err) {
        console.error('Error rendering page:', err);
        if (isMounted) setRendering(false);
      }
    }
    renderPage();
    return () => { isMounted = false; };
  }, [pdfDoc, currentPage, scale]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage(currentPage + 1);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleFitWidth = () => {
    if (containerRef.current && canvasRef.current) {
      const containerWidth = containerRef.current.clientWidth - 40;
      if (containerWidth > 200) {
        // Base width standard A4 is ~595pt
        const newScale = containerWidth / 595;
        setScale(Math.max(0.6, Math.min(newScale, 2.0)));
      }
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 bg-slate-950/60 rounded-xl border border-slate-800 ${className}`}>
        <RefreshCw className="w-7 h-7 text-brand-400 animate-spin mb-2" />
        <p className="text-xs text-slate-400">Loading document preview...</p>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div className={`p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 ${className}`}>
        Unable to load document preview.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative'
      } ${className}`}
    >
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs select-none">
        {/* Page navigation */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-lg border transition ${
              showThumbnails ? 'bg-brand-600 text-white border-brand-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Page Thumbnails"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-slate-300 font-medium px-1.5">
            Page <span className="font-bold text-white">{currentPage}</span> of {numPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] text-slate-400 font-mono w-12 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFitWidth}
            className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Fit to Width"
          >
            Fit
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition ml-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex flex-1 overflow-hidden relative min-h-[360px] max-h-[60vh] bg-slate-950/80">
        {/* Collapsible Page Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-32 sm:w-36 bg-slate-900/90 border-r border-slate-800 overflow-y-auto p-2 space-y-2 flex-shrink-0">
            {thumbnails.map((t) => (
              <button
                key={t.pageNumber}
                onClick={() => setCurrentPage(t.pageNumber)}
                className={`w-full p-1 rounded-lg border text-left flex flex-col items-center transition ${
                  currentPage === t.pageNumber
                    ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500/50'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                }`}
              >
                <span className="text-[10px] text-slate-400 mb-1">Page {t.pageNumber}</span>
                <img
                  src={t.thumbnail}
                  alt={`Thumb ${t.pageNumber}`}
                  className="w-full h-auto object-contain rounded shadow"
                />
              </button>
            ))}
          </div>
        )}

        {/* Canvas Display Viewport */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          <div className="relative shadow-2xl rounded border border-slate-800 bg-white">
            {rendering && (
              <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] flex items-center justify-center rounded">
                <RefreshCw className="w-6 h-6 text-brand-400 animate-spin" />
              </div>
            )}
            <canvas ref={canvasRef} className="max-w-full h-auto block rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
