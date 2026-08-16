import React, { useState, useRef, useEffect } from 'react';
import { loadPdfDocument, renderPageToCanvas } from '../../services/pdfViewerEngine';
import { embedSignatures } from '../../services/pdfEngine';
import { Pen, Type, Upload, Trash2, Check, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SignWorkbench({ file, onComplete, onClose }) {
  const [tab, setTab] = useState('draw'); // 'draw' | 'type' | 'upload'
  const [typedName, setTypedName] = useState('');
  const [typedColor, setTypedColor] = useState('#1e293b');
  const [penColor, setPenColor] = useState('#1e293b');
  const [penWidth, setPenWidth] = useState(3);
  const [activeSignatureUrl, setActiveSignatureUrl] = useState(null);

  // PDF Viewer State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [placedSignatures, setPlacedSignatures] = useState([]);
  const [processing, setProcessing] = useState(false);

  const signatureCanvasRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Load PDF
  useEffect(() => {
    async function initPdf() {
      try {
        const doc = await loadPdfDocument(file);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Failed to load PDF in SignWorkbench:', err);
      }
    }
    initPdf();
  }, [file]);

  // Render current PDF page
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    renderPageToCanvas(pdfDoc, currentPage, pdfCanvasRef.current, 1.2);
  }, [pdfDoc, currentPage]);

  // Signature canvas setup
  useEffect(() => {
    if (tab === 'draw' && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [tab]);

  // Drawing handlers (Mouse & Touch compatible)
  const getSigCoords = (clientX, clientY) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getSigCoords(clientX, clientY);

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { x, y } = getSigCoords(clientX, clientY);

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    generateSignatureDataUrl();
  };

  const clearCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setActiveSignatureUrl(null);
  };

  const generateSignatureDataUrl = () => {
    if (tab === 'draw') {
      const canvas = signatureCanvasRef.current;
      if (canvas) setActiveSignatureUrl(canvas.toDataURL('image/png'));
    } else if (tab === 'type') {
      if (!typedName.trim()) return;
      const c = document.createElement('canvas');
      c.width = 400;
      c.height = 120;
      const ctx = c.getContext('2d');
      ctx.font = '54px "Caveat", cursive';
      ctx.fillStyle = typedColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(typedName, 200, 60);
      setActiveSignatureUrl(c.toDataURL('image/png'));
    }
  };

  const handleImageUpload = (e) => {
    const f = e.target.files[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setActiveSignatureUrl(ev.target.result);
      };
      reader.readAsDataURL(f);
    }
  };

  // Place signature on PDF page canvas on click
  const handlePdfClick = (e) => {
    if (!activeSignatureUrl || !pdfContainerRef.current) return;
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, (clickX - 60) / rect.width));
    const normY = Math.max(0, Math.min(1, (clickY - 25) / rect.height));

    const newSig = {
      id: Date.now(),
      pageIndex: currentPage - 1,
      imageDataUrl: activeSignatureUrl,
      x: normX,
      y: normY,
      width: 0.25,
      height: 0.1,
    };

    setPlacedSignatures(prev => [...prev, newSig]);
  };

  const removePlacedSig = (id) => {
    setPlacedSignatures(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    if (placedSignatures.length === 0) {
      alert('Please place your signature on the PDF page first by clicking on the document.');
      return;
    }

    try {
      setProcessing(true);
      const result = await embedSignatures(file, placedSignatures);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      onComplete(result);
    } catch (err) {
      alert('Error applying signature: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Left Column: Signature Generator */}
      <div className="lg:col-span-5 flex flex-col space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-200">1. Create Your Signature</h3>

        {/* Tab Buttons */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => { setTab('draw'); setActiveSignatureUrl(null); }}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
              tab === 'draw' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            onClick={() => { setTab('type'); setActiveSignatureUrl(null); }}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
              tab === 'type' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>
          <button
            onClick={() => { setTab('upload'); setActiveSignatureUrl(null); }}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
              tab === 'upload' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'draw' && (
          <div className="flex flex-col space-y-3">
            <div className="relative bg-white rounded-lg border border-slate-600 overflow-hidden shadow-inner">
              <canvas
                ref={signatureCanvasRef}
                width={360}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair w-full h-[150px] touch-none"
              />
              <button
                onClick={clearCanvas}
                className="absolute top-2 right-2 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md shadow text-xs transition"
                title="Clear Canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span>Color:</span>
                {['#1e293b', '#2563eb', '#dc2626', '#16a34a'].map(c => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition ${penColor === c ? 'border-brand-400 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <span>Thickness:</span>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'type' && (
          <div className="flex flex-col space-y-3">
            <input
              type="text"
              value={typedName}
              onChange={(e) => {
                setTypedName(e.target.value);
              }}
              onKeyUp={generateSignatureDataUrl}
              placeholder="Type your full name..."
              className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
            />

            <div className="h-28 bg-white rounded-lg p-3 flex items-center justify-center border border-slate-600 overflow-hidden shadow-inner">
              {typedName ? (
                <span className="text-4xl font-signature" style={{ color: typedColor }}>
                  {typedName}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Signature preview will appear here</span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>Ink Color:</span>
              {['#1e293b', '#2563eb', '#dc2626', '#16a34a'].map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setTypedColor(c);
                    setTimeout(generateSignatureDataUrl, 50);
                  }}
                  className={`w-5 h-5 rounded-full border-2 transition ${typedColor === c ? 'border-brand-400 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div className="flex flex-col space-y-3">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl cursor-pointer bg-slate-800/40 transition">
              <Upload className="w-6 h-6 text-brand-400 mb-2" />
              <span className="text-xs text-slate-300 font-medium">Upload Transparent PNG Stamp</span>
              <span className="text-[11px] text-slate-500 mt-1">PNG, JPG, or SVG</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            {activeSignatureUrl && (
              <div className="h-24 bg-white/10 rounded-lg p-2 flex items-center justify-center border border-slate-700">
                <img src={activeSignatureUrl} alt="Stamp" className="max-h-full object-contain" />
              </div>
            )}
          </div>
        )}

        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-xs text-indigo-200">
          <p className="font-semibold mb-0.5">2. Place on PDF:</p>
          Click anywhere on the document viewer to stamp your active signature.
        </div>
      </div>

      {/* Right Column: Interactive PDF Page Viewer & Placement */}
      <div className="lg:col-span-7 flex flex-col space-y-3">
        {/* Page Nav Header */}
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

          <div className="text-xs text-slate-400">
            Signatures Placed: <span className="text-emerald-400 font-bold">{placedSignatures.length}</span>
          </div>
        </div>

        {/* Canvas Placement Container */}
        <div className="flex-1 max-h-[50vh] overflow-auto flex justify-center bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div
            ref={pdfContainerRef}
            onClick={handlePdfClick}
            className="relative cursor-crosshair shadow-2xl rounded overflow-hidden"
          >
            <canvas ref={pdfCanvasRef} className="block max-w-full" />

            {/* Placed signature stamps on current page */}
            {placedSignatures
              .filter(s => s.pageIndex === currentPage - 1)
              .map(s => (
                <div
                  key={s.id}
                  style={{
                    position: 'absolute',
                    left: `${s.x * 100}%`,
                    top: `${s.y * 100}%`,
                    width: `${s.width * 100}%`,
                    height: `${s.height * 100}%`,
                  }}
                  className="group absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 rounded flex items-center justify-center cursor-move"
                >
                  <img src={s.imageDataUrl} alt="Signature" className="max-w-full max-h-full object-contain pointer-events-none" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removePlacedSig(s.id); }}
                    className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition"
                    title="Remove Signature"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing || placedSignatures.length === 0}
            className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Applying Signature...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save & Download Signed PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
