import React, { useState, useRef, useEffect } from 'react';
import { loadPdfDocument, renderPageToCanvas, getPageThumbnail, getPageTextBlocks } from '../../services/pdfViewerEngine';
import { applyFullPdfEdits } from '../../services/pdfEngine';
import { scanPageWithOcr } from '../../services/ocrEngine';
import { OCR_LANGUAGES } from '../../data/languages';
import {
  Type,
  Pen,
  Highlighter,
  Square,
  Circle,
  Image as ImageIcon,
  Eraser,
  Undo,
  Redo,
  Trash2,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  ScanText,
  Sparkles,
  Bold,
  Italic,
  Smile,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STAMP_SYMBOLS = ['✓', '✕', '★', '➔', '⚠️', '🔒', 'APPROVED', 'REJECTED', 'CONFIDENTIAL', 'PAID', 'DRAFT'];

export default function FullPdfEditorWorkbench({ file, onComplete, onClose }) {
  // Active Tool Mode
  // 'select' | 'editText' | 'addText' | 'draw' | 'highlighter' | 'shapes' | 'symbols' | 'whiteout'
  const [activeTool, setActiveTool] = useState('editText');

  // OCR Language & Deep Scanner State (100+ World Languages)
  const [ocrLang, setOcrLang] = useState('eng');
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrProgressText, setOcrProgressText] = useState('');
  const [ocrProgressPercent, setOcrProgressPercent] = useState(0);

  // Typography & Text Styling (Matches original text by default)
  const [fontFamily, setFontFamily] = useState('helvetica');
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setTextColor] = useState('#0f172a');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textBgColor, setTextBgColor] = useState('transparent');

  // Drawing, Highlighter & Shapes
  const [drawColor, setDrawColor] = useState('#e11d48');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapeType, setShapeType] = useState('rect');
  const [shapeFillColor, setShapeFillColor] = useState('transparent');
  const [shapeOpacity, setShapeOpacity] = useState(1);

  // PDF Document State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Detected Text Blocks per Page { [pageNumber]: Block[] }
  const [pageTextBlocks, setPageTextBlocks] = useState({});
  const [activeEditingBlockId, setActiveEditingBlockId] = useState(null);
  const [inlineEditText, setInlineEditText] = useState('');
  const [activeBlockStyle, setActiveBlockStyle] = useState({});

  // Structured Elements & Freehand Canvas Drawings
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [pageDrawings, setPageDrawings] = useState({});

  // Refs
  const pdfCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const drawingContextRef = useRef(null);
  const imageInputRef = useRef(null);

  // 1. Initialize PDF Document & Thumbnails
  useEffect(() => {
    let isMounted = true;
    async function initPdf() {
      if (!file) return;
      setLoading(true);
      setThumbnails([]);
      try {
        const doc = await loadPdfDocument(file);
        if (isMounted) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false); // Unblock immediately so page 1 and canvas mount instantly!

          // Generate lightweight thumbnails asynchronously in background
          setTimeout(async () => {
            if (!isMounted) return;
            const thumbs = [];
            for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
              if (!isMounted) break;
              try {
                const t = await getPageThumbnail(doc, i, 120);
                thumbs.push({ pageNumber: i, thumbnail: t });
              } catch {}
            }
            if (isMounted) {
              setThumbnails(thumbs);
            }
          }, 100);
        }
      } catch (err) {
        console.error('Error initializing PDF in editor:', err);
        if (isMounted) setLoading(false);
      }
    }
    initPdf();
    return () => { isMounted = false; };
  }, [file]);

  // 2. Render Page Canvas and Auto-Extract Text Layer
  useEffect(() => {
    let isMounted = true;
    async function renderPage() {
      if (!pdfDoc || !pdfCanvasRef.current) return;
      try {
        const vp = await renderPageToCanvas(pdfDoc, currentPage, pdfCanvasRef.current, scale);

        // Sync drawing canvas overlay
        if (drawingCanvasRef.current) {
          drawingCanvasRef.current.width = vp.width;
          drawingCanvasRef.current.height = vp.height;
          const ctx = drawingCanvasRef.current.getContext('2d');
          drawingContextRef.current = ctx;
          ctx.clearRect(0, 0, vp.width, vp.height);

          const savedDrawing = pageDrawings[currentPage - 1];
          if (savedDrawing) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = savedDrawing;
          }
        }

        // Auto extract native text layer if not already cached
        if (!pageTextBlocks[currentPage]) {
          const textData = await getPageTextBlocks(pdfDoc, currentPage);
          if (textData.blocks && textData.blocks.length > 0) {
            if (isMounted) {
              setPageTextBlocks(prev => ({
                ...prev,
                [currentPage]: textData.blocks
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error rendering page in editor:', err);
      }
    }
    renderPage();
    return () => { isMounted = false; };
  }, [pdfDoc, currentPage, scale]);

  // 3. Scan Page with Deep Neural OCR in selected World Language
  const handleScanPageWithOcr = async () => {
    if (!pdfCanvasRef.current) return;
    setIsScanningOcr(true);
    setOcrProgressText(`Deep scanning with OCR (${ocrLang})...`);
    setOcrProgressPercent(15);

    try {
      const detectedBlocks = await scanPageWithOcr(
        pdfCanvasRef.current,
        ocrLang,
        (p) => {
          setOcrProgressText(p.status);
          setOcrProgressPercent(p.progress);
        }
      );

      if (detectedBlocks && detectedBlocks.length > 0) {
        setPageTextBlocks(prev => ({
          ...prev,
          [currentPage]: detectedBlocks
        }));
      } else {
        alert('OCR scan complete. No text detected on this page.');
      }
      setActiveTool('editText');
    } catch (err) {
      console.error('OCR scan failed:', err);
      alert('OCR scan error: ' + err.message);
    } finally {
      setIsScanningOcr(false);
      setOcrProgressPercent(0);
    }
  };

  // 4. Click to Edit Existing Page Text Block (Exact typography & color preservation)
  const handleStartEditingBlock = (block) => {
    setActiveEditingBlockId(block.id);
    setInlineEditText(block.text);
    const blkColor = block.color || '#0f172a';
    const blkSize = block.fontSize || 12;
    const blkFont = block.fontFamily || 'helvetica';
    const blkBold = block.isBold || false;
    const blkItalic = block.isItalic || false;

    setActiveBlockStyle({
      color: blkColor,
      fontSize: blkSize,
      fontFamily: blkFont,
      isBold: blkBold,
      isItalic: blkItalic
    });

    setTextColor(blkColor);
    setFontSize(blkSize);
    setFontFamily(blkFont);
    setIsBold(blkBold);
    setIsItalic(blkItalic);
    setSelectedElementId(null);
  };

  const handleConfirmEditBlock = (block) => {
    if (!inlineEditText.trim()) {
      // Whiteout deletion
      const whiteoutElement = {
        id: `whiteout-del-${block.id}`,
        type: 'whiteout',
        pageIndex: currentPage - 1,
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        color: '#ffffff'
      };
      setElements(prev => [...prev, whiteoutElement]);
      setPageTextBlocks(prev => ({
        ...prev,
        [currentPage]: (prev[currentPage] || []).filter(b => b.id !== block.id)
      }));
      setActiveEditingBlockId(null);
      return;
    }

    // Exact typography & background color preservation
    const replacementElement = {
      id: `rep-${block.id}`,
      type: 'text_replacement',
      pageIndex: currentPage - 1,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      pdfX: block.pdfX,
      pdfY: block.pdfY,
      pdfWidth: block.pdfWidth,
      pdfFontSize: block.pdfFontSize,
      text: inlineEditText,
      originalText: block.originalText,
      fontSize: activeBlockStyle.fontSize || block.fontSize || fontSize || 12,
      fontFamily: activeBlockStyle.fontFamily || block.fontFamily || fontFamily || 'helvetica',
      color: activeBlockStyle.color || block.color || textColor || '#0f172a',
      backgroundColor: block.backgroundColor || '#ffffff',
      isBold: activeBlockStyle.isBold !== undefined ? activeBlockStyle.isBold : (block.isBold !== undefined ? block.isBold : isBold),
      isItalic: activeBlockStyle.isItalic !== undefined ? activeBlockStyle.isItalic : (block.isItalic !== undefined ? block.isItalic : isItalic)
    };

    setElements(prev => {
      const filtered = prev.filter(e => e.id !== replacementElement.id);
      return [...filtered, replacementElement];
    });

    setPageTextBlocks(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).map(b =>
        b.id === block.id ? { ...b, text: inlineEditText, isEdited: true } : b
      )
    }));

    setActiveEditingBlockId(null);
    setInlineEditText('');
  };

  // 5. Canvas Click Handlers (Add Text, Shapes, Symbols, Whiteout)
  const handleCanvasClick = (e) => {
    if (activeTool === 'select' || activeTool === 'editText' || activeTool === 'draw' || activeTool === 'highlighter') return;
    const rect = pdfCanvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(0.9, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(0.9, (e.clientY - rect.top) / rect.height));

    if (activeTool === 'addText') {
      const newText = {
        id: `text-${Date.now()}`,
        type: 'text',
        pageIndex: currentPage - 1,
        x,
        y,
        width: 0.35,
        height: 0.06,
        text: 'Type your text here...',
        fontSize,
        fontFamily,
        color: textColor,
        backgroundColor: textBgColor,
        isBold,
        isItalic
      };
      setElements(prev => [...prev, newText]);
      setSelectedElementId(newText.id);
      setActiveTool('select');
    } else if (activeTool === 'whiteout') {
      const newWhiteout = {
        id: `whiteout-${Date.now()}`,
        type: 'whiteout',
        pageIndex: currentPage - 1,
        x,
        y,
        width: 0.25,
        height: 0.05,
        color: '#ffffff'
      };
      setElements(prev => [...prev, newWhiteout]);
      setSelectedElementId(newWhiteout.id);
    } else if (activeTool === 'shapes') {
      const newShape = {
        id: `shape-${Date.now()}`,
        type: shapeType,
        pageIndex: currentPage - 1,
        x,
        y,
        width: shapeType === 'highlight' ? 0.35 : 0.25,
        height: shapeType === 'highlight' ? 0.04 : 0.15,
        color: drawColor,
        isFilled: shapeFillColor !== 'transparent' || shapeType === 'highlight',
        fillColor: shapeFillColor,
        opacity: shapeType === 'highlight' ? 0.45 : shapeOpacity,
        borderWidth: strokeWidth
      };
      setElements(prev => [...prev, newShape]);
      setSelectedElementId(newShape.id);
    }
  };

  // Add Stamp Symbol
  const handleAddSymbol = (sym) => {
    const isTextBadge = sym.length > 2;
    const newSymElement = {
      id: `symbol-${Date.now()}`,
      type: 'text',
      pageIndex: currentPage - 1,
      x: 0.35,
      y: 0.35,
      width: isTextBadge ? 0.28 : 0.08,
      height: 0.06,
      text: sym,
      fontSize: isTextBadge ? 18 : 28,
      fontFamily: 'helvetica',
      color: sym === '✓' || sym === 'APPROVED' || sym === 'PAID' ? '#16a34a' :
             sym === '✕' || sym === 'REJECTED' ? '#dc2626' :
             sym === '★' ? '#f59e0b' : '#2563eb',
      backgroundColor: isTextBadge ? '#ffffff' : 'transparent',
      isBold: true
    };
    setElements(prev => [...prev, newSymElement]);
    setSelectedElementId(newSymElement.id);
    setActiveTool('select');
  };

  // 6. Freehand Drawing & Highlighter Pen Handlers (Mouse & Touch compatible for iOS, Android, macOS, Windows)
  const getCanvasCoords = (clientX, clientY) => {
    if (!drawingCanvasRef.current) return { x: 0, y: 0 };
    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) * (drawingCanvasRef.current.width / rect.width);
    const y = (clientY - rect.top) * (drawingCanvasRef.current.height / rect.height);
    return { x, y };
  };

  const startDrawStroke = (clientX, clientY) => {
    if (activeTool !== 'draw' && activeTool !== 'highlighter') return;
    isDrawingRef.current = true;
    const ctx = drawingContextRef.current;
    if (!ctx) return;

    const { x, y } = getCanvasCoords(clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'highlighter') {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = strokeWidth * 4.5;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1.0;
    }
  };

  const moveDrawStroke = (clientX, clientY) => {
    if (!isDrawingRef.current || (activeTool !== 'draw' && activeTool !== 'highlighter')) return;
    const ctx = drawingContextRef.current;
    if (!ctx) return;

    const { x, y } = getCanvasCoords(clientX, clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawStroke = () => {
    if (isDrawingRef.current && drawingCanvasRef.current) {
      isDrawingRef.current = false;
      const dataUrl = drawingCanvasRef.current.toDataURL('image/png');
      setPageDrawings(prev => ({
        ...prev,
        [currentPage - 1]: dataUrl
      }));
    }
  };

  const handleMouseDownDraw = (e) => startDrawStroke(e.clientX, e.clientY);
  const handleMouseMoveDraw = (e) => moveDrawStroke(e.clientX, e.clientY);
  const handleMouseUpDraw = () => endDrawStroke();

  const handleTouchStartDraw = (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      startDrawStroke(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchMoveDraw = (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      moveDrawStroke(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchEndDraw = (e) => {
    e.preventDefault();
    endDrawStroke();
  };

  // 7. Image / Stamp Upload
  const handleImageUpload = (e) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target.result;
      const newImgElement = {
        id: `img-${Date.now()}`,
        type: 'image',
        pageIndex: currentPage - 1,
        x: 0.3,
        y: 0.3,
        width: 0.3,
        height: 0.2,
        dataUrl,
        opacity: 1
      };
      setElements(prev => [...prev, newImgElement]);
      setSelectedElementId(newImgElement.id);
      setActiveTool('select');
    };
    reader.readAsDataURL(imgFile);
  };

  // 8. Element Management (Duplicate, Delete, Clear)
  const handleDuplicateSelected = () => {
    if (!selectedElementId) return;
    const el = elements.find(e => e.id === selectedElementId);
    if (!el) return;
    const clone = {
      ...el,
      id: `clone-${Date.now()}`,
      x: Math.min(0.85, el.x + 0.04),
      y: Math.min(0.85, el.y + 0.04)
    };
    setElements(prev => [...prev, clone]);
    setSelectedElementId(clone.id);
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    setElements(prev => prev.filter(e => e.id !== selectedElementId));
    setSelectedElementId(null);
  };

  const handleClearCurrentPage = () => {
    setElements(prev => prev.filter(e => e.pageIndex !== currentPage - 1));
    setPageDrawings(prev => {
      const copy = { ...prev };
      delete copy[currentPage - 1];
      return copy;
    });
    if (drawingContextRef.current && drawingCanvasRef.current) {
      drawingContextRef.current.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    }
  };

  // 9. Save & Download Edited PDF
  const handleSave = async () => {
    try {
      setProcessing(true);
      const result = await applyFullPdfEdits(file, {
        elements,
        pageDrawings
      });
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      onComplete(result);
    } catch (err) {
      console.error('Error saving PDF:', err);
      alert('Error saving PDF edits: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const currentPageElements = elements.filter(e => e.pageIndex === currentPage - 1);
  const currentTextBlocks = pageTextBlocks[currentPage] || [];
  const selectedElement = elements.find(e => e.id === selectedElementId);

  return (
    <div className="flex flex-col h-full space-y-3 select-none">
      {/* Top iLovePDF-style Header Tools Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 shadow-md">
        {/* Main Action Tools */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTool('editText')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTool === 'editText'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md glow-rose'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Click and edit any existing text on the PDF directly"
          >
            <ScanText className="w-4 h-4 text-rose-300" />
            <span>Edit PDF Text</span>
          </button>

          <button
            onClick={() => setActiveTool('addText')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTool === 'addText' ? 'bg-rose-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Add text anywhere on document"
          >
            <Type className="w-4 h-4" />
            <span>Add Text</span>
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Add Image or Stamp"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Add Image</span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </button>

          <button
            onClick={() => setActiveTool('shapes')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTool === 'shapes' ? 'bg-rose-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Add Rectangles & Shapes"
          >
            <Square className="w-4 h-4" />
            <span>Add Shape</span>
          </button>

          <button
            onClick={() => setActiveTool('draw')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTool === 'draw' ? 'bg-rose-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Freehand Pen"
          >
            <Pen className="w-4 h-4" />
            <span>Draw</span>
          </button>

          <button
            onClick={() => setActiveTool('highlighter')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTool === 'highlighter' ? 'bg-amber-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Highlighter Marker"
          >
            <Highlighter className="w-4 h-4 text-amber-300" />
            <span>Highlight</span>
          </button>

          <button
            onClick={() => setActiveTool('symbols')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTool === 'symbols' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Stamps & Symbols (Checkmark, Cross, Badges)"
          >
            <Smile className="w-4 h-4" />
            <span>Symbols</span>
          </button>

          <button
            onClick={() => setActiveTool('whiteout')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTool === 'whiteout' ? 'bg-slate-700 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Whiteout Redaction"
          >
            <Eraser className="w-4 h-4" />
            <span>Whiteout</span>
          </button>
        </div>

        {/* OCR Language Selector & Deep Scan Button + Zoom */}
        <div className="flex items-center space-x-2">
          {/* 100+ World Languages OCR Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
            <Globe className="w-3.5 h-3.5 text-violet-400" />
            <select
              value={ocrLang}
              onChange={(e) => setOcrLang(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-slate-200 border-none outline-none max-w-[130px]"
              title="Select OCR Recognition Language"
            >
              <optgroup label="Popular Languages">
                {OCR_LANGUAGES.filter(l => l.group === 'Popular').map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-white">{l.name} ({l.native})</option>
                ))}
              </optgroup>
              <optgroup label="Indian Languages">
                {OCR_LANGUAGES.filter(l => l.group === 'Indian').map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-white">{l.name} ({l.native})</option>
                ))}
              </optgroup>
              <optgroup label="European Languages">
                {OCR_LANGUAGES.filter(l => l.group === 'European').map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-white">{l.name} ({l.native})</option>
                ))}
              </optgroup>
              <optgroup label="Asian & Other World Languages">
                {OCR_LANGUAGES.filter(l => l.group === 'Asian & Other').map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-white">{l.name} ({l.native})</option>
                ))}
              </optgroup>
            </select>
          </div>

          <button
            onClick={handleScanPageWithOcr}
            disabled={isScanningOcr}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
            title="Perform Deep OCR to make scanned text editable"
          >
            {isScanningOcr ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isScanningOcr ? 'Scanning...' : 'Deep OCR Scan'}</span>
          </button>

          <div className="flex items-center space-x-1 pl-2 border-l border-slate-700">
            <button
              onClick={() => setScale(s => Math.max(0.8, s - 0.15))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(2.0, s + 0.15))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Contextual Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        {/* Typography Controls */}
        {(activeTool === 'editText' || activeTool === 'addText' || selectedElement?.type === 'text') && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Font:</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
              >
                <option value="helvetica">Arial / Helvetica (Sans-serif)</option>
                <option value="times">Times Roman (Serif)</option>
                <option value="courier">Courier (Monospace)</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Size:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
              >
                {[9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48].map(sz => (
                  <option key={sz} value={sz}>{sz}px</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setIsBold(!isBold)}
                className={`p-1 rounded ${isBold ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`p-1 rounded ${isItalic ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Color:</span>
              <div className="flex items-center space-x-1">
                {['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={`w-5 h-5 rounded-full border ${textColor === c ? 'border-rose-400 scale-110 shadow' : 'border-slate-700'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shape / Drawing Controls */}
        {(activeTool === 'draw' || activeTool === 'highlighter' || activeTool === 'shapes') && (
          <div className="flex flex-wrap items-center gap-3">
            {activeTool === 'shapes' && (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Shape:</span>
                <select
                  value={shapeType}
                  onChange={(e) => setShapeType(e.target.value)}
                  className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs"
                >
                  <option value="rect">Rectangle Box</option>
                  <option value="highlight">Highlight Band</option>
                </select>
              </div>
            )}

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Thickness:</span>
              <div className="flex items-center space-x-1">
                {[2, 4, 8].map(w => (
                  <button
                    key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={`px-2 py-0.5 rounded border text-[10px] ${strokeWidth === w ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Color:</span>
              <div className="flex items-center space-x-1">
                {['#dc2626', '#f59e0b', '#10b981', '#2563eb', '#8b5cf6', '#000000', '#fef08a'].map(c => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    className={`w-5 h-5 rounded-full border ${drawColor === c ? 'border-rose-400 scale-110 shadow' : 'border-slate-700'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Symbols Picker Bar */}
        {activeTool === 'symbols' && (
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            <span className="text-slate-400 mr-1">Click symbol to stamp:</span>
            {STAMP_SYMBOLS.map(sym => (
              <button
                key={sym}
                onClick={() => handleAddSymbol(sym)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 text-xs transition shadow"
              >
                {sym}
              </button>
            ))}
          </div>
        )}

        {/* Element Selection Actions (Duplicate, Delete, Clear) */}
        <div className="flex items-center space-x-2">
          {selectedElementId && (
            <>
              <button
                onClick={handleDuplicateSelected}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center space-x-1 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          <button
            onClick={handleClearCurrentPage}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear Page</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area (Sidebar + Document Canvas) */}
      <div className="flex-1 flex gap-4 min-h-[55vh] max-h-[65vh] overflow-hidden">
        {/* Left Page Thumbnails Strip */}
        <div className="w-28 sm:w-36 bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 overflow-y-auto space-y-2 flex-shrink-0">
          <div className="text-[11px] font-bold text-slate-400 px-1 mb-2">Pages ({totalPages})</div>
          {thumbnails.map(t => (
            <button
              key={t.pageNumber}
              onClick={() => setCurrentPage(t.pageNumber)}
              className={`w-full p-1.5 rounded-xl border text-center flex flex-col items-center transition ${
                currentPage === t.pageNumber
                  ? 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/40'
                  : 'border-slate-800/80 hover:border-slate-700 bg-slate-950/50 opacity-70 hover:opacity-100'
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-300 mb-1">Page {t.pageNumber}</span>
              <img
                src={t.thumbnail}
                alt={`Page ${t.pageNumber}`}
                className="w-full h-auto object-contain rounded-lg shadow-sm"
              />
            </button>
          ))}
        </div>

        {/* Center Canvas Viewport */}
        <div className="flex-1 bg-slate-950/90 rounded-2xl border border-slate-800 overflow-auto flex flex-col items-center p-6 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
              <p className="text-sm text-slate-400">Loading document pages...</p>
            </div>
          ) : (
            <div
              className="relative shadow-2xl rounded border border-slate-800 bg-white"
              style={{ minWidth: '320px' }}
              onClick={handleCanvasClick}
            >
              {/* PDF Document Base Canvas */}
              <canvas ref={pdfCanvasRef} className="block max-w-full rounded" />

              {/* OCR Text Blocks Layer (Clickable In-Place Text Editing with Typography Preservation) */}
              {activeTool === 'editText' && (
                <div className="absolute inset-0 pointer-events-auto">
                  {currentTextBlocks.map(block => {
                    const isEditingThis = activeEditingBlockId === block.id;

                    return (
                      <div
                        key={block.id}
                        style={{
                          position: 'absolute',
                          left: `${block.x * 100}%`,
                          top: `${block.y * 100}%`,
                          width: `${block.width * 100}%`,
                          minHeight: `${block.height * 100}%`,
                        }}
                        className={`group transition ${
                          isEditingThis
                            ? 'z-30'
                            : 'hover:bg-blue-500/20 hover:ring-1 hover:ring-blue-500 cursor-pointer rounded'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isEditingThis) handleStartEditingBlock(block);
                        }}
                      >
                        {isEditingThis ? (
                          <div className="relative bg-white p-1 rounded shadow-2xl border-2 border-rose-500 min-w-[200px] -mt-1 -ml-1">
                            <input
                              type="text"
                              autoFocus
                              value={inlineEditText}
                              onChange={(e) => setInlineEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmEditBlock(block);
                                if (e.key === 'Escape') setActiveEditingBlockId(null);
                              }}
                              className="w-full px-1 py-0.5 text-xs text-slate-900 border-none outline-none font-medium bg-transparent"
                              style={{
                                fontSize: `${(activeBlockStyle.fontSize || block.fontSize || 13)}px`,
                                color: activeBlockStyle.color || block.color || '#0f172a',
                                fontWeight: activeBlockStyle.isBold ? 'bold' : 'normal',
                                fontStyle: activeBlockStyle.isItalic ? 'italic' : 'normal'
                              }}
                            />
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200">
                              <button
                                onClick={() => handleConfirmEditBlock({ ...block, text: '' })}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-medium"
                              >
                                Delete Text
                              </button>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => setActiveEditingBlockId(null)}
                                  className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleConfirmEditBlock(block)}
                                  className="flex items-center space-x-1 px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold shadow"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Apply</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-end pr-0.5">
                            <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded shadow pointer-events-none font-medium">
                              ✎ Edit
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rendered Structured Edits Overlay (Text boxes, Replacements, Shapes, Images) */}
              <div className="absolute inset-0 pointer-events-none">
                {currentPageElements.map(el => {
                  const isSelected = selectedElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(el.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${el.x * 100}%`,
                        top: `${el.y * 100}%`,
                        width: el.width ? `${el.width * 100}%` : 'auto',
                        height: el.height ? `${el.height * 100}%` : 'auto',
                      }}
                      className={`pointer-events-auto cursor-move transition ${
                        isSelected ? 'ring-2 ring-rose-500 rounded' : ''
                      }`}
                    >
                      {/* Text Replacement Overlay */}
                      {el.type === 'text_replacement' && (
                        <div
                          className="px-0.5 py-0 shadow-none rounded-none select-text flex items-center overflow-hidden"
                          style={{
                            backgroundColor: el.backgroundColor || '#ffffff',
                            width: '100%',
                            height: '100%',
                            fontSize: `${(el.fontSize || 12) * scale}px`,
                            color: el.color || '#0f172a',
                            fontFamily: el.fontFamily === 'times' ? 'Times New Roman, serif' : el.fontFamily === 'courier' ? 'Courier New, monospace' : 'Arial, Helvetica, sans-serif',
                            fontWeight: el.isBold ? 'bold' : 'normal',
                            fontStyle: el.isItalic ? 'italic' : 'normal',
                            lineHeight: 1.0,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {el.text}
                        </div>
                      )}

                      {/* Custom Added Text Box */}
                      {el.type === 'text' && (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newTxt = e.currentTarget.textContent;
                            setElements(prev => prev.map(item => item.id === el.id ? { ...item, text: newTxt } : item));
                          }}
                          className="px-1.5 py-0.5 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                          style={{
                            backgroundColor: el.backgroundColor || 'transparent',
                            color: el.color || '#0f172a',
                            fontSize: `${(el.fontSize || 14) * (scale / 1.3)}px`,
                            fontWeight: el.isBold ? 'bold' : 'normal',
                            fontStyle: el.isItalic ? 'italic' : 'normal'
                          }}
                        >
                          {el.text}
                        </div>
                      )}

                      {/* Whiteout / Redaction */}
                      {el.type === 'whiteout' && (
                        <div
                          className="w-full h-full bg-white shadow-sm border border-slate-200/50"
                          style={{ backgroundColor: el.color || '#ffffff' }}
                        />
                      )}

                      {/* Shapes */}
                      {el.type === 'rect' && (
                        <div
                          className="w-full h-full rounded"
                          style={{
                            border: `${el.borderWidth || 2}px solid ${el.color}`,
                            backgroundColor: el.isFilled ? el.fillColor || el.color : 'transparent',
                            opacity: el.opacity || 1
                          }}
                        />
                      )}

                      {/* Highlight Band */}
                      {el.type === 'highlight' && (
                        <div
                          className="w-full h-full rounded"
                          style={{
                            backgroundColor: el.color || '#fef08a',
                            opacity: 0.45
                          }}
                        />
                      )}

                      {/* Embedded Image */}
                      {el.type === 'image' && el.dataUrl && (
                        <img
                          src={el.dataUrl}
                          alt="Added Asset"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Freehand Drawing Canvas Overlay */}
              <canvas
                ref={drawingCanvasRef}
                onMouseDown={handleMouseDownDraw}
                onMouseMove={handleMouseMoveDraw}
                onMouseUp={handleMouseUpDraw}
                onTouchStart={handleTouchStartDraw}
                onTouchMove={handleTouchMoveDraw}
                onTouchEnd={handleTouchEndDraw}
                className={`absolute inset-0 ${
                  activeTool === 'draw' || activeTool === 'highlighter' ? 'cursor-crosshair pointer-events-auto touch-none' : 'pointer-events-none'
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300">
            Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={processing}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-bold rounded-xl shadow-lg glow-rose disabled:opacity-50 transition"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Applying Edits &amp; Saving...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save &amp; Download Edited PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
