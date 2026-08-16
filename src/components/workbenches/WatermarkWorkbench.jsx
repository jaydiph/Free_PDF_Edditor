import React, { useState, useRef, useEffect } from 'react';
import { loadPdfDocument, renderPageToCanvas } from '../../services/pdfViewerEngine';
import { addWatermark } from '../../services/pdfEngine';
import { Stamp, Download, RefreshCw, ChevronLeft, ChevronRight, Image as ImageIcon, Type, Sliders } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function WatermarkWorkbench({ file, onComplete, onClose }) {
  const [mode, setMode] = useState('text'); // 'text' | 'image'
  const [text, setText] = useState('CONFIDENTIAL');
  const [angle, setAngle] = useState(45);
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(42);
  const [color, setColor] = useState('#ef4444');
  const [isGrid, setIsGrid] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // PDF Viewer
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState(false);

  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    async function initPdf() {
      try {
        const doc = await loadPdfDocument(file);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF in WatermarkWorkbench:', err);
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
        drawWatermarkPreview();
      }
    });
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    drawWatermarkPreview();
  }, [text, angle, opacity, fontSize, color, isGrid, imagePreview, mode]);

  const drawWatermarkPreview = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = opacity;

    if (mode === 'text' && text.trim()) {
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize * 1.2}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isGrid) {
        for (let x = 60; x < canvas.width; x += 180) {
          for (let y = 60; y < canvas.height; y += 140) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((-angle * Math.PI) / 180);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }
      } else {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-angle * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
      }
    } else if (mode === 'image' && imagePreview) {
      const img = new Image();
      img.onload = () => {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-angle * Math.PI) / 180);
        const maxW = canvas.width * 0.4;
        const scale = maxW / img.width;
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      };
      img.src = imagePreview;
    }

    ctx.restore();
  };

  const handleImageUpload = (e) => {
    const f = e.target.files[0];
    if (f) {
      setImageFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(f);
    }
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      const result = await addWatermark(file, {
        text,
        angle,
        opacity,
        fontSize,
        color,
        isGrid,
        imageFile: mode === 'image' ? imageFile : null,
      });
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onComplete(result);
    } catch (err) {
      alert('Failed to apply watermark: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Left Column: Watermark Customizer Controls */}
      <div className="lg:col-span-5 flex flex-col space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
          <Stamp className="w-4 h-4 text-brand-400" />
          <span>Watermark Settings</span>
        </h3>

        {/* Mode Selector */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
              mode === 'text' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text Watermark</span>
          </button>
          <button
            onClick={() => setMode('image')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
              mode === 'image' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image Logo</span>
          </button>
        </div>

        {mode === 'text' ? (
          <div className="flex flex-col space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Watermark Text</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'INTERNAL USE ONLY', 'SAMPLE'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setText(preset)}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] rounded border border-slate-700/60 transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Color & Font size */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-mono">{color}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Font Size: {fontSize}px</label>
                <input
                  type="range"
                  min="18"
                  max="80"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl cursor-pointer bg-slate-800/40 transition">
              <ImageIcon className="w-6 h-6 text-brand-400 mb-2" />
              <span className="text-xs text-slate-300 font-medium">Upload Transparent Logo</span>
              <span className="text-[11px] text-slate-500 mt-1">PNG or JPG</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Universal sliders */}
        <div className="space-y-3 pt-2 border-t border-slate-700/60">
          <div>
            <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
              <span>Rotation Angle</span>
              <span className="text-brand-400 font-bold">{angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
              <span>Opacity</span>
              <span className="text-brand-400 font-bold">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {mode === 'text' && (
            <label className="flex items-center space-x-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isGrid}
                onChange={(e) => setIsGrid(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 bg-slate-800 border-slate-700"
              />
              <span className="text-xs text-slate-300 font-medium">Repeat as Grid Pattern across Page</span>
            </label>
          )}
        </div>
      </div>

      {/* Right Column: Real-time Interactive PDF Page Preview */}
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

          <span className="text-xs text-slate-400">Live Real-time Preview</span>
        </div>

        {/* Canvas preview */}
        <div className="flex-1 max-h-[50vh] overflow-auto flex justify-center bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="relative shadow-2xl rounded overflow-hidden select-none">
            <canvas ref={pdfCanvasRef} className="block max-w-full" />
            <canvas ref={overlayCanvasRef} className="absolute inset-0 pointer-events-none" />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Applying Watermark...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Apply Watermark & Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
