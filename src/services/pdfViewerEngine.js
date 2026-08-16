import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker safely
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

/**
 * Load PDF Document from File or ArrayBuffer
 */
export async function loadPdfDocument(fileOrBytes) {
  let arrayBuffer;
  if (fileOrBytes instanceof ArrayBuffer) {
    arrayBuffer = fileOrBytes;
  } else if (fileOrBytes instanceof Uint8Array) {
    arrayBuffer = fileOrBytes.buffer;
  } else {
    arrayBuffer = await fileOrBytes.arrayBuffer();
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  return await loadingTask.promise;
}

/**
 * Render specific page to a Canvas element with task cancellation safety
 */
export async function renderPageToCanvas(pdfDoc, pageNumber, canvas, scale = 1.0) {
  if (!pdfDoc || !canvas) return null;

  // Cancel any ongoing render task on this canvas before starting a new one
  if (canvas._renderTask) {
    try {
      canvas._renderTask.cancel();
    } catch {}
    canvas._renderTask = null;
  }

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  const renderTask = page.render(renderContext);
  canvas._renderTask = renderTask;

  try {
    await renderTask.promise;
    canvas._renderTask = null;
    return viewport;
  } catch (err) {
    if (err.name === 'RenderingCancelledException') {
      return viewport;
    }
    canvas._renderTask = null;
    throw err;
  }
}

/**
 * Generate lightweight DataURL thumbnail for a given page
 */
export async function getPageThumbnail(pdfDoc, pageNumber, targetWidth = 160) {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = Math.max(0.1, (targetWidth || 160) / (unscaledViewport.width || 600));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.warn(`Failed to render thumbnail for page ${pageNumber}:`, err);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="220" viewBox="0 0 160 220"><rect width="160" height="220" fill="#1e293b" rx="8"/><text x="80" y="110" fill="#94a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Page ${pageNumber}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

/**
 * Extract all text from a PDF file
 */
export async function extractTextFromPdf(fileOrDoc, outputFormat = 'txt') {
  const pdf = fileOrDoc.getPage ? fileOrDoc : await loadPdfDocument(fileOrDoc);
  const numPages = pdf.numPages;
  const fullText = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    const pageText = strings.join(' ');
    if (outputFormat === 'md') {
      fullText.push(`## Page ${i}\n\n${pageText}`);
    } else {
      fullText.push(`--- Page ${i} ---\n${pageText}`);
    }
  }

  const result = fullText.join('\n\n');
  return {
    text: result,
    blob: new Blob([result], { type: outputFormat === 'md' ? 'text/markdown' : 'text/plain' }),
    filename: outputFormat === 'md' ? 'extracted_text.md' : 'extracted_text.txt'
  };
}

/**
 * Render all pages of PDF to high-res images for download (ZIP or single)
 */
export async function convertPdfToImages(file, { imgFormat = 'image/png', dpi = '2', pageRange = '' }) {
  const JSZip = (await import('jszip')).default;
  const pdf = await loadPdfDocument(file);
  const total = pdf.numPages;
  const scale = Number(dpi) || 2; // 1 = 72dpi, 2 = 150dpi, 3 = 300dpi

  const targetPages = [];
  if (!pageRange || !pageRange.trim()) {
    for (let i = 1; i <= total; i++) targetPages.push(i);
  } else {
    const parts = pageRange.split(',');
    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const [s, e] = part.split('-').map(Number);
        if (!isNaN(s) && !isNaN(e)) {
          for (let i = Math.max(1, s); i <= Math.min(total, e); i++) targetPages.push(i);
        }
      } else {
        const num = Number(part);
        if (!isNaN(num) && num >= 1 && num <= total) targetPages.push(num);
      }
    }
  }

  const ext = imgFormat === 'image/jpeg' ? 'jpg' : (imgFormat === 'image/webp' ? 'webp' : 'png');

  if (targetPages.length === 1) {
    const pNum = targetPages[0];
    const page = await pdf.getPage(pNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve({
          data: blob,
          filename: `page_${pNum}.${ext}`,
          isZip: false
        });
      }, imgFormat, 0.95);
    });
  }

  const zip = new JSZip();
  for (const pNum of targetPages) {
    const page = await pdf.getPage(pNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    const dataUrl = canvas.toDataURL(imgFormat, 0.95);
    const base64 = dataUrl.split(',')[1];
    zip.file(`page_${pNum}.${ext}`, base64, { base64: true });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    data: zipBlob,
    filename: 'pdf_images.zip',
    isZip: true
  };
}

/**
 * Compute visual difference between two PDF pages and paint to diffCanvas
 */
export async function computePageDiff(pageA, pageB, diffCanvas, scale = 1.0) {
  const vpA = pageA.getViewport({ scale });
  const vpB = pageB.getViewport({ scale });

  const maxW = Math.max(vpA.width, vpB.width);
  const maxH = Math.max(vpA.height, vpB.height);

  const canvasA = document.createElement('canvas');
  canvasA.width = maxW;
  canvasA.height = maxH;
  await pageA.render({ canvasContext: canvasA.getContext('2d'), viewport: vpA }).promise;

  const canvasB = document.createElement('canvas');
  canvasB.width = maxW;
  canvasB.height = maxH;
  await pageB.render({ canvasContext: canvasB.getContext('2d'), viewport: vpB }).promise;

  diffCanvas.width = maxW;
  diffCanvas.height = maxH;
  const ctxDiff = diffCanvas.getContext('2d');

  const imgDataA = canvasA.getContext('2d').getImageData(0, 0, maxW, maxH);
  const imgDataB = canvasB.getContext('2d').getImageData(0, 0, maxW, maxH);
  const diffImgData = ctxDiff.createImageData(maxW, maxH);

  const dataA = imgDataA.data;
  const dataB = imgDataB.data;
  const dataD = diffImgData.data;

  let totalDiffPixels = 0;

  for (let i = 0; i < dataA.length; i += 4) {
    const rA = dataA[i], gA = dataA[i + 1], bA = dataA[i + 2], aA = dataA[i + 3];
    const rB = dataB[i], gB = dataB[i + 1], bB = dataB[i + 2], aB = dataB[i + 3];

    const isDifferent = Math.abs(rA - rB) > 20 || Math.abs(gA - gB) > 20 || Math.abs(bA - bB) > 20;

    if (isDifferent) {
      totalDiffPixels++;
      // Highlight changes in bright coral/red
      dataD[i] = 239;     // R
      dataD[i + 1] = 68;  // G
      dataD[i + 2] = 68;  // B
      dataD[i + 3] = 255; // Alpha
    } else {
      // Light grayscale background
      const avg = Math.round((rA + gA + bA) / 3);
      dataD[i] = avg;
      dataD[i + 1] = avg;
      dataD[i + 2] = avg;
      dataD[i + 3] = 160;
    }
  }

  ctxDiff.putImageData(diffImgData, 0, 0);
  return {
    diffPixels: totalDiffPixels,
    width: maxW,
    height: maxH
  };
}

/**
 * Extract structured text items at word and phrase level with exact native PDF coordinates
 */
export async function getPageTextBlocks(pdfDoc, pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const blocks = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i];
    const fullStr = item.str;
    if (!fullStr || !fullStr.trim()) continue;

    // Transform matrix: [scaleX, skewY, skewX, scaleY, transformX, transformY]
    const tx = item.transform;
    const itemX = tx[4];
    const itemY = tx[5];
    const fontSize = Math.hypot(tx[2], tx[3]) || Math.abs(tx[0]) || 12;
    const fontName = item.fontName || 'Helvetica';
    const isBold = /bold|black|heavy|semibold|700|800|900/i.test(fontName);
    const isItalic = /italic|oblique/i.test(fontName);
    const fontFamily = /times|serif/i.test(fontName) ? 'times' : /courier|mono/i.test(fontName) ? 'courier' : 'helvetica';

    const itemWidth = item.width || (fullStr.length * fontSize * 0.55);
    const totalChars = fullStr.length || 1;
    const avgCharWidth = itemWidth / totalChars;

    // Split item into individual words so users can click & edit exact words
    const wordsWithSpaces = fullStr.split(/(\s+)/);
    let curXOffset = 0;

    for (let wIdx = 0; wIdx < wordsWithSpaces.length; wIdx++) {
      const part = wordsWithSpaces[wIdx];
      const partWidth = part.length * avgCharWidth;

      if (part.trim().length > 0) {
        const wordX = itemX + curXOffset;
        const normX = Math.max(0, Math.min(1, wordX / viewport.width));
        const normY = Math.max(0, Math.min(1, (viewport.height - itemY - fontSize) / viewport.height));
        const normWidth = Math.max(0.008, partWidth / viewport.width);
        const normHeight = Math.max(0.008, (fontSize * 1.25) / viewport.height);

        blocks.push({
          id: `text-item-${pageNumber}-${i}-${wIdx}-${Date.now()}`,
          pageIndex: pageNumber - 1,
          text: part,
          originalText: part,
          x: normX,
          y: normY,
          width: normWidth,
          height: normHeight,
          pdfX: wordX,
          pdfY: itemY,
          pdfWidth: partWidth,
          pdfFontSize: fontSize,
          fontSize: Math.round(fontSize),
          fontFamily,
          isBold,
          isItalic,
          color: '#000000',
          backgroundColor: '#ffffff',
          isEdited: false
        });
      }
      curXOffset += partWidth;
    }
  }

  return {
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    blocks
  };
}

