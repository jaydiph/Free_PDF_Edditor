import { createWorker } from 'tesseract.js';
import { loadPdfDocument } from './pdfViewerEngine';
import jsPDF from 'jspdf';

/**
 * Pre-processes an image canvas for optimal OCR character recognition
 */
function preprocessCanvasForOcr(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const processedCanvas = document.createElement('canvas');
  processedCanvas.width = width;
  processedCanvas.height = height;
  const ctx = processedCanvas.getContext('2d', { willReadFrequently: true });

  ctx.drawImage(sourceCanvas, 0, 0);

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      const contrast = 1.3;
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
      const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
      const finalVal = enhanced < 190 ? enhanced * 0.75 : Math.min(255, enhanced * 1.1);

      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }

    ctx.putImageData(imgData, 0, 0);
    return processedCanvas;
  } catch (err) {
    console.warn('Canvas filter fallback:', err);
    return sourceCanvas;
  }
}

/**
 * Sample background color around bounding box on original canvas
 */
function sampleBackgroundColor(ctx, x0, y0, canvasW, canvasH) {
  try {
    const px = Math.min(canvasW - 1, Math.max(0, Math.round(x0) - 2));
    const py = Math.min(canvasH - 1, Math.max(0, Math.round(y0) - 2));
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    // Return hex string
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  } catch {
    return '#ffffff';
  }
}

/**
 * Perform Deep OCR on a PDF file or Image file in any World Language
 */
export async function performOcr(file, {
  ocrLanguage = 'eng',
  ocrOutput = 'text',
  onProgress = () => {}
}) {
  onProgress({ status: `Initializing Deep OCR Worker for language (${ocrLanguage})...`, progress: 5 });

  const worker = await createWorker(ocrLanguage, 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        const p = Math.round((m.progress || 0) * 100);
        onProgress({ status: `Deep OCR text recognition (${p}%)...`, progress: 10 + Math.round(p * 0.85) });
      } else if (m.status === 'loading tesseract core') {
        onProgress({ status: 'Loading neural OCR engine...', progress: 8 });
      } else if (m.status === 'loading language traineddata') {
        onProgress({ status: `Downloading & loading ${ocrLanguage} trained model...`, progress: 12 });
      }
    }
  });

  try {
    const isPdf = file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'));
    let extractedPages = [];

    if (isPdf) {
      onProgress({ status: 'Rendering high-resolution PDF pages for Deep OCR...', progress: 15 });
      const pdf = await loadPdfDocument(file);
      const numPages = pdf.numPages;

      for (let i = 1; i <= numPages; i++) {
        onProgress({
          status: `Deep OCR processing page ${i} of ${numPages}...`,
          progress: 15 + Math.round((i / numPages) * 75)
        });

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const enhancedCanvas = preprocessCanvasForOcr(canvas);
        const { data: { text, confidence, words } } = await worker.recognize(enhancedCanvas);
        extractedPages.push({ pageNumber: i, text: text.trim(), confidence, words });
      }
    } else {
      const { data: { text, confidence, words } } = await worker.recognize(file);
      extractedPages.push({ pageNumber: 1, text: text.trim(), confidence, words });
    }

    onProgress({ status: 'Finalizing Deep OCR document...', progress: 98 });

    if (ocrOutput === 'searchable_pdf') {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;

      extractedPages.forEach((p, idx) => {
        if (idx > 0) doc.addPage();
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(p.text, 515);
        doc.text(lines, margin, margin);
      });

      const pdfBlob = doc.output('blob');
      return {
        data: pdfBlob,
        filename: (file.name ? file.name.replace(/\.[^/.]+$/, '') : 'document') + '_Searchable_OCR.pdf',
        text: extractedPages.map(p => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n')
      };
    } else {
      const fullText = extractedPages.map(p => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');
      return {
        data: new Blob([fullText], { type: 'text/plain;charset=utf-8' }),
        filename: (file.name ? file.name.replace(/\.[^/.]+$/, '') : 'document') + '_OCR_Text.txt',
        text: fullText
      };
    }
  } finally {
    await worker.terminate();
  }
}

/**
 * Deep OCR Scanner for single page canvas to extract word/line bounding boxes and exact typography
 */
export async function scanPageWithOcr(canvas, language = 'eng', onProgress = () => {}) {
  onProgress({ status: `Loading Deep OCR Engine for (${language})...`, progress: 10 });

  const worker = await createWorker(language, 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        const p = Math.round((m.progress || 0) * 100);
        onProgress({ status: `Scanning page text with Deep OCR (${p}%)...`, progress: 10 + Math.round(p * 0.85) });
      }
    }
  });

  try {
    const rawCtx = canvas.getContext('2d', { willReadFrequently: true });
    const enhancedCanvas = preprocessCanvasForOcr(canvas);
    const { data } = await worker.recognize(enhancedCanvas);
    const canvasW = canvas.width || 1;
    const canvasH = canvas.height || 1;

    const blocks = [];
    const lines = data.lines || [];

    if (lines.length > 0) {
      lines.forEach((line, idx) => {
        const text = (line.text || '').trim();
        if (!text) return;
        const bbox = line.bbox;
        const x = Math.max(0, bbox.x0 / canvasW);
        const y = Math.max(0, bbox.y0 / canvasH);
        const width = Math.max(0.01, (bbox.x1 - bbox.x0) / canvasW);
        const height = Math.max(0.01, (bbox.y1 - bbox.y0) / canvasH);
        // Accurate typography cap-height font sizing
        const rawH = bbox.y1 - bbox.y0;
        const fontSize = Math.max(9, Math.round(rawH * 0.72));
        const bgCol = sampleBackgroundColor(rawCtx, bbox.x0, bbox.y0, canvasW, canvasH);

        blocks.push({
          id: `ocr-line-${idx}-${Date.now()}`,
          text,
          originalText: text,
          x,
          y,
          width,
          height,
          fontSize,
          fontFamily: 'helvetica',
          color: '#0f172a',
          backgroundColor: bgCol,
          confidence: line.confidence,
          isEdited: false
        });
      });
    } else if (data.words && data.words.length > 0) {
      data.words.forEach((w, idx) => {
        const text = (w.text || '').trim();
        if (!text) return;
        const bbox = w.bbox;
        const x = Math.max(0, bbox.x0 / canvasW);
        const y = Math.max(0, bbox.y0 / canvasH);
        const width = Math.max(0.01, (bbox.x1 - bbox.x0) / canvasW);
        const height = Math.max(0.01, (bbox.y1 - bbox.y0) / canvasH);
        const rawH = bbox.y1 - bbox.y0;
        const fontSize = Math.max(9, Math.round(rawH * 0.72));
        const bgCol = sampleBackgroundColor(rawCtx, bbox.x0, bbox.y0, canvasW, canvasH);

        blocks.push({
          id: `ocr-word-${idx}-${Date.now()}`,
          text,
          originalText: text,
          x,
          y,
          width,
          height,
          fontSize,
          fontFamily: 'helvetica',
          color: '#0f172a',
          backgroundColor: bgCol,
          confidence: w.confidence,
          isEdited: false
        });
      });
    }

    onProgress({ status: 'Deep OCR Scan complete!', progress: 100 });
    return blocks;
  } finally {
    await worker.terminate();
  }
}
