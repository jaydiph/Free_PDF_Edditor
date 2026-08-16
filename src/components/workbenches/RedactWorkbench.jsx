import React, { useState, useRef, useEffect } from 'react';
import { loadPdfDocument, renderPageToCanvas } from '../../services/pdfViewerEngine';
import { embedRedactions } from '../../services/pdfEngine';
import { EyeOff, Trash2, Undo, Download, ChevronLeft, ChevronRight, RefreshCw, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RedactWorkbench({ file, onComplete, onClose }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [redactions, setRedactions] = useState([]);
  const [colorMode, setColorMode] = useState('black'); // 'black' | 'white'
  const [processing, setProcessing] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    async function initPdf() {
      try {
        const doc = await loadPdfDocument(file);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF in RedactWorkbench:', err);
      }
    }
    initPdf();
  }, [file]);

  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    renderPageToCanvas(pdfDoc, currentPage, pdfCanvasRef.current, 1.2).then(vp => {
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = vp.width;
        overlayCanvasRef.current.height = vp.height;
        drawRedactionsOverlay();
      }
    });
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    drawRedactionsOverlay();
  }, [redactions, currentPage, currentBox]);

  const drawRedactionsOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const curPageReds = redactions.filter(r => r.pageIndex === currentPage - 1);
    for (const r of curPageReds) {
      ctx.fillStyle = r.color === 'white' ? '#ffffff' : '#000000';
      ctx.fillRect(r.x * canvas.width, r.y * canvas.height, r.width * canvas.width, r.height * canvas.height);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x * canvas.width, r.y * canvas.height, r.width * canvas.width, r.height * canvas.height);
    }

    if (currentBox) {
      ctx.fillStyle = colorMode === 'white' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(currentBox.x * canvas.width, currentBox.y * canvas.height, currentBox.width * canvas.width, currentBox.height * canvas.height);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(currentBox.x * canvas.width, currentBox.y * canvas.height, currentBox.width * canvas.width, currentBox.height * canvas.height);
      ctx.setLineDash([]);
    }
  };

  const handleMouseDown = (e) => {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos) return;
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / rect.width;
    const curY = (e.clientY - rect.top) / rect.height;

    const x = Math.min(startPos.x, curX);
    const y = Math.min(startPos.y, curY);
    const width = Math.abs(curX - startPos.x);
    const height = Math.abs(curY - startPos.y);

    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.width > 0.01 && currentBox.height > 0.01) {
      setRedactions(prev => [
        ...prev,
        {
          id: Date.now(),
          pageIndex: currentPage - 1,
          x: currentBox.x,
          y: currentBox.y,
          width: currentBox.width,
          height: currentBox.height,
          color: colorMode
        }
      ]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const handleUndo = () => {
    setRedactions(prev => prev.slice(0, -1));
  };

  const handleClearPage = () => {
    setRedactions(prev => prev.filter(r => r.pageIndex !== currentPage - 1));
  };

  const handleSave = async () => {
    if (redactions.length === 0) {
      alert('Please draw at least one redaction box to blackout sensitive content.');
      return;
    }

    try {
      setProcessing(true);
      const result = await embedRedactions(file, redactions);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onComplete(result);
    } catch (err) {
      alert('Failed to apply redactions: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
        {/* Color Choice */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-300">Style:</span>
          <button
            onClick={() => setColorMode('black')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition ${
              colorMode === 'black' ? 'bg-black text-white border-brand-500 shadow' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <div className="w-3 h-3 bg-black rounded border border-slate-600" />
            <span>Blackout</span>
          </button>
          <button
            onClick={() => setColorMode('white')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition ${
              colorMode === 'white' ? 'bg-white text-slate-900 border-brand-500 shadow' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <div className="w-3 h-3 bg-white rounded border border-slate-300" />
            <span>Whiteout</span>
          </button>
        </div>

        {/* Page Nav */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Edit Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUndo}
            disabled={redactions.length === 0}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 disabled:opacity-30 transition"
          >
            <Undo className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={handleClearPage}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Page</span>
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-center space-x-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span>Click and drag boxes directly over text or images to permanently redact and blackout confidential data.</span>
      </div>

      {/* Viewer Canvas */}
      <div className="flex-1 max-h-[55vh] overflow-auto flex justify-center bg-slate-950/80 p-4 rounded-xl border border-slate-800">
        <div ref={containerRef} className="relative shadow-2xl rounded overflow-hidden select-none">
          <canvas ref={pdfCanvasRef} className="block max-w-full" />
          <canvas
            ref={overlayCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0 cursor-crosshair touch-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <span className="text-xs text-slate-400">
          Total Redactions: <span className="text-brand-400 font-bold">{redactions.length}</span>
        </span>
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing || redactions.length === 0}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sanitizing & Redacting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Apply Redactions & Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
