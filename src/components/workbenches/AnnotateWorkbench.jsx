import React, { useState, useRef, useEffect } from 'react';
import { loadPdfDocument, renderPageToCanvas } from '../../services/pdfViewerEngine';
import { embedAnnotations } from '../../services/pdfEngine';
import { Pen, Type, Square, Image as ImageIcon, Undo, Trash2, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AnnotateWorkbench({ file, onComplete, onClose }) {
  const [tool, setTool] = useState('text'); // 'text' | 'pen' | 'rect' | 'image'
  const [color, setColor] = useState('#ef4444');
  const [fontSize, setFontSize] = useState(16);
  const [textInput, setTextInput] = useState('');
  const [isFilled, setIsFilled] = useState(false);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [annotations, setAnnotations] = useState([]);
  const [processing, setProcessing] = useState(false);

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startPosRef = useRef(null);

  useEffect(() => {
    async function initPdf() {
      try {
        const doc = await loadPdfDocument(file);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF in AnnotateWorkbench:', err);
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
        drawOverlay();
      }
    });
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    drawOverlay();
  }, [annotations, currentPage, color, tool]);

  const drawOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const curPageAnns = annotations.filter(a => a.pageIndex === currentPage - 1);
    for (const ann of curPageAnns) {
      if (ann.type === 'text') {
        ctx.fillStyle = ann.color || '#1e293b';
        ctx.font = `bold ${ann.fontSize || 16}px Inter, sans-serif`;
        ctx.fillText(ann.text, ann.x * canvas.width, ann.y * canvas.height);
      } else if (ann.type === 'rect') {
        ctx.strokeStyle = ann.color || '#ef4444';
        ctx.lineWidth = 2;
        if (ann.isFilled) {
          ctx.fillStyle = ann.color || '#ef4444';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(ann.x * canvas.width, ann.y * canvas.height, ann.width * canvas.width, ann.height * canvas.height);
          ctx.globalAlpha = 1.0;
        }
        ctx.strokeRect(ann.x * canvas.width, ann.y * canvas.height, ann.width * canvas.width, ann.height * canvas.height);
      }
    }
  };

  const handleMouseDown = (e) => {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (tool === 'text') {
      if (!textInput.trim()) {
        alert('Please enter some text in the left input box first.');
        return;
      }
      setAnnotations(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'text',
          pageIndex: currentPage - 1,
          x,
          y,
          text: textInput,
          fontSize,
          color
        }
      ]);
    } else if (tool === 'rect') {
      isDrawingRef.current = true;
      startPosRef.current = { x, y };
    }
  };

  const handleMouseUp = (e) => {
    if (tool === 'rect' && isDrawingRef.current && startPosRef.current) {
      const rect = overlayCanvasRef.current.getBoundingClientRect();
      const curX = (e.clientX - rect.left) / rect.width;
      const curY = (e.clientY - rect.top) / rect.height;

      const x = Math.min(startPosRef.current.x, curX);
      const y = Math.min(startPosRef.current.y, curY);
      const width = Math.abs(curX - startPosRef.current.x);
      const height = Math.abs(curY - startPosRef.current.y);

      if (width > 0.01 && height > 0.01) {
        setAnnotations(prev => [
          ...prev,
          {
            id: Date.now(),
            type: 'rect',
            pageIndex: currentPage - 1,
            x,
            y,
            width,
            height,
            color,
            isFilled
          }
        ]);
      }
    }
    isDrawingRef.current = false;
    startPosRef.current = null;
  };

  const handleSave = async () => {
    if (annotations.length === 0) {
      alert('Please add at least one annotation or text note.');
      return;
    }

    try {
      setProcessing(true);
      const result = await embedAnnotations(file, annotations);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onComplete(result);
    } catch (err) {
      alert('Failed to save annotations: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Left controls */}
      <div className="lg:col-span-5 flex flex-col space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-200">Annotation Tools</h3>

        {/* Tools bar */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setTool('text')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
              tool === 'text' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text Note</span>
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
              tool === 'rect' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Rectangle</span>
          </button>
        </div>

        {tool === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Text Content</label>
              <textarea
                rows={2}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type note and click on page..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Font Size: {fontSize}px</label>
              <input
                type="range"
                min="10"
                max="36"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {tool === 'rect' && (
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFilled}
                onChange={(e) => setIsFilled(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 bg-slate-800 border-slate-700"
              />
              <span className="text-xs text-slate-300 font-medium">Highlight Fill (Semi-transparent)</span>
            </label>
            <p className="text-xs text-slate-500">Click and drag a box across the document canvas.</p>
          </div>
        )}

        {/* Color picker */}
        <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
          <label className="text-xs text-slate-300 font-medium block">Color</label>
          <div className="flex items-center space-x-2">
            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#0f172a'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition ${color === c ? 'border-brand-400 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 pt-2">
          <button
            onClick={() => setAnnotations(prev => prev.slice(0, -1))}
            disabled={annotations.length === 0}
            className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 disabled:opacity-30 transition"
          >
            <Undo className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={() => setAnnotations(prev => prev.filter(a => a.pageIndex !== currentPage - 1))}
            className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs rounded-lg border border-slate-700 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Page</span>
          </button>
        </div>
      </div>

      {/* Right Canvas */}
      <div className="lg:col-span-7 flex flex-col space-y-3">
        {/* Page Nav */}
        <div className="flex items-center justify-between bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-700/50">
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

          <span className="text-xs text-slate-400">
            Total Notes: <span className="text-brand-400 font-bold">{annotations.length}</span>
          </span>
        </div>

        {/* Viewer */}
        <div className="flex-1 max-h-[50vh] overflow-auto flex justify-center bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="relative shadow-2xl rounded overflow-hidden select-none">
            <canvas ref={pdfCanvasRef} className="block max-w-full" />
            <canvas
              ref={overlayCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              className="absolute inset-0 cursor-crosshair touch-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing || annotations.length === 0}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Annotations...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Annotated PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
