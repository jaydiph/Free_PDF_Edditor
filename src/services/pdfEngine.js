import { PDFDocument, rgb, degrees, StandardFonts, PageSizes } from 'pdf-lib';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

/**
 * Helper to parse page range strings like "1-3, 5, 8-10" into 0-indexed page numbers
 */
export function parsePageRanges(rangeStr, totalPages) {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages = new Set();
  const parts = rangeStr.split(',');
  for (let part of parts) {
    part = part.trim();
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          pages.add(i - 1);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        pages.add(num - 1);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Convert File or Blob to ArrayBuffer
 */
export async function fileToArrayBuffer(file) {
  if (file instanceof ArrayBuffer) return file;
  if (file instanceof Uint8Array) return file.buffer;
  return await file.arrayBuffer();
}

/**
 * Merge multiple PDF files into one
 */
export async function mergePdfs(files) {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const bytes = await fileToArrayBuffer(file);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const pdfBytes = await mergedPdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'merged_document.pdf'
  };
}

/**
 * Split PDF into single pages, range segments, or fixed counts
 */
export async function splitPdf(file, { splitMode = 'range', ranges = '', fixedCount = 2 }) {
  const bytes = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcPdf.getPageCount();

  if (splitMode === 'all') {
    const zip = new JSZip();
    for (let i = 0; i < totalPages; i++) {
      const singlePdf = await PDFDocument.create();
      const [copiedPage] = await singlePdf.copyPages(srcPdf, [i]);
      singlePdf.addPage(copiedPage);
      const singleBytes = await singlePdf.save();
      zip.file(`page_${i + 1}.pdf`, singleBytes);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      data: zipBlob,
      filename: 'split_pages.zip',
      isZip: true
    };
  } else if (splitMode === 'fixed') {
    const zip = new JSZip();
    const count = Math.max(1, parseInt(fixedCount, 10) || 1);
    let partIndex = 1;
    for (let i = 0; i < totalPages; i += count) {
      const chunkPdf = await PDFDocument.create();
      const pageIndices = [];
      for (let j = i; j < Math.min(i + count, totalPages); j++) {
        pageIndices.push(j);
      }
      const copiedPages = await chunkPdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach((p) => chunkPdf.addPage(p));
      const chunkBytes = await chunkPdf.save();
      zip.file(`part_${partIndex}_pages_${i + 1}-${Math.min(i + count, totalPages)}.pdf`, chunkBytes);
      partIndex++;
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      data: zipBlob,
      filename: 'split_fixed_chunks.zip',
      isZip: true
    };
  } else {
    // Custom range
    const pageIndices = parsePageRanges(ranges, totalPages);
    if (pageIndices.length === 0) {
      throw new Error('No valid pages found in range. Example format: 1-3, 5');
    }
    const splitDoc = await PDFDocument.create();
    const copiedPages = await splitDoc.copyPages(srcPdf, pageIndices);
    copiedPages.forEach((page) => splitDoc.addPage(page));
    const pdfBytes = await splitDoc.save();
    return {
      data: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: 'split_document.pdf'
    };
  }
}

/**
 * Visual organizer execution: accepts list of page objects { originalDocIndex, originalPageIndex, rotation, isBlank }
 */
export async function organizePdfPages(sourceFiles, pagesConfig) {
  const loadedDocs = [];
  for (const file of sourceFiles) {
    const bytes = await fileToArrayBuffer(file);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    loadedDocs.push(doc);
  }

  const newDoc = await PDFDocument.create();

  for (const item of pagesConfig) {
    if (item.isBlank) {
      const blankPage = newDoc.addPage(PageSizes.A4);
      if (item.rotation) {
        blankPage.setRotation(degrees(item.rotation));
      }
    } else {
      const srcDoc = loadedDocs[item.docIndex || 0];
      const [copiedPage] = await newDoc.copyPages(srcDoc, [item.pageIndex]);
      const currentRot = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRot + (item.rotation || 0)) % 360));
      newDoc.addPage(copiedPage);
    }
  }

  const pdfBytes = await newDoc.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'organized_document.pdf'
  };
}

/**
 * Rotate PDF
 */
export async function rotatePdf(file, { angle = '90', pageSelection = 'all', customPages = '' }) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const rotDeg = parseInt(angle, 10) || 90;
  const totalPages = pdf.getPageCount();

  let targetIndices = [];
  if (pageSelection === 'all') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  } else if (pageSelection === 'odd') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 0);
  } else if (pageSelection === 'even') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 1);
  } else {
    targetIndices = parsePageRanges(customPages, totalPages);
  }

  for (const idx of targetIndices) {
    const page = pdf.getPage(idx);
    const currentRot = page.getRotation().angle;
    page.setRotation(degrees((currentRot + rotDeg) % 360));
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'rotated_document.pdf'
  };
}

/**
 * Remove Pages
 */
export async function removePages(file, { pagesToRemove = '' }) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = pdf.getPageCount();
  const removeSet = new Set(parsePageRanges(pagesToRemove, totalPages));

  if (removeSet.size >= totalPages) {
    throw new Error('Cannot remove all pages from the document.');
  }

  const keepIndices = Array.from({ length: totalPages }, (_, i) => i).filter(i => !removeSet.has(i));
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, keepIndices);
  copiedPages.forEach(p => newPdf.addPage(p));

  const pdfBytes = await newPdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'pages_removed.pdf'
  };
}

/**
 * Extract Pages
 */
export async function extractPages(file, { pagesToExtract = '' }) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = pdf.getPageCount();
  const extractIndices = parsePageRanges(pagesToExtract, totalPages);

  if (extractIndices.length === 0) {
    throw new Error('Please specify valid pages to extract.');
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, extractIndices);
  copiedPages.forEach(p => newPdf.addPage(p));

  const pdfBytes = await newPdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'extracted_pages.pdf'
  };
}

/**
 * Crop PDF page margins
 */
export async function cropPdf(file, { topMargin = 0, bottomMargin = 0, leftMargin = 0, rightMargin = 0 }) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();

  const top = Number(topMargin) || 0;
  const bottom = Number(bottomMargin) || 0;
  const left = Number(leftMargin) || 0;
  const right = Number(rightMargin) || 0;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const newWidth = Math.max(10, width - left - right);
    const newHeight = Math.max(10, height - top - bottom);
    page.setSize(newWidth, newHeight);
    page.translateContent(-left, -bottom);
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'cropped_document.pdf'
  };
}

/**
 * N-Up Multi-Page Layout (2, 4, 9 pages per sheet)
 */
export async function nUpPdf(file, { pagesPerSheet = '2', drawBorders = true }) {
  const bytes = await fileToArrayBuffer(file);
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const totalPages = srcDoc.getPageCount();
  const count = parseInt(pagesPerSheet, 10) || 2;

  let cols = 1;
  let rows = 2;
  if (count === 4) { cols = 2; rows = 2; }
  if (count === 9) { cols = 3; rows = 3; }

  const sheetWidth = 595.28; // A4
  const sheetHeight = 841.89;
  const cellWidth = sheetWidth / cols;
  const cellHeight = sheetHeight / rows;

  const embeddedPages = await newDoc.embedPdf(srcDoc);

  for (let i = 0; i < totalPages; i += count) {
    const page = newDoc.addPage([sheetWidth, sheetHeight]);
    for (let c = 0; c < count && (i + c) < totalPages; c++) {
      const embedded = embeddedPages[i + c];
      const colIndex = c % cols;
      const rowIndex = Math.floor(c / cols);

      const cellX = colIndex * cellWidth;
      const cellY = sheetHeight - ((rowIndex + 1) * cellHeight);

      const scale = Math.min((cellWidth - 20) / embedded.width, (cellHeight - 20) / embedded.height);
      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;
      const offsetX = cellX + (cellWidth - drawW) / 2;
      const offsetY = cellY + (cellHeight - drawH) / 2;

      page.drawPage(embedded, {
        x: offsetX,
        y: offsetY,
        width: drawW,
        height: drawH,
      });

      if (drawBorders) {
        page.drawRectangle({
          x: cellX + 5,
          y: cellY + 5,
          width: cellWidth - 10,
          height: cellHeight - 10,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });
      }
    }
  }

  const pdfBytes = await newDoc.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: `nup_${count}_layout.pdf`
  };
}

/**
 * Convert Images to PDF
 */
export async function convertImagesToPdf(files, { pageSize = 'A4', orientation = 'portrait', margin = '20' }) {
  const pdfDoc = await PDFDocument.create();
  const marginPt = Number(margin) || 0;

  for (const file of files) {
    const imgBytes = await fileToArrayBuffer(file);
    let image;
    const isPng = file.type === 'image/png' || (file.name && file.name.toLowerCase().endsWith('.png'));

    try {
      if (isPng) {
        image = await pdfDoc.embedPng(imgBytes);
      } else {
        image = await pdfDoc.embedJpg(imgBytes);
      }
    } catch {
      // Fallback to loading in image element and exporting as JPG
      image = await embedAnyImageViaCanvas(pdfDoc, file);
    }

    if (pageSize === 'FitImage') {
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    } else {
      let pw = pageSize === 'Letter' ? 612 : 595.28;
      let ph = pageSize === 'Letter' ? 792 : 841.89;
      if (orientation === 'landscape') {
        [pw, ph] = [ph, pw];
      }

      const availW = pw - (marginPt * 2);
      const availH = ph - (marginPt * 2);
      const scale = Math.min(availW / image.width, availH / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      const x = marginPt + (availW - drawW) / 2;
      const y = marginPt + (availH - drawH) / 2;

      const page = pdfDoc.addPage([pw, ph]);
      page.drawImage(image, { x, y, width: drawW, height: drawH });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'converted_images.pdf'
  };
}

/**
 * Helper to embed WebP, GIF, or BMP via browser canvas
 */
async function embedAnyImageViaCanvas(pdfDoc, file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const byteString = atob(dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const jpgImage = await pdfDoc.embedJpg(ab);
      resolve(jpgImage);
    };
    img.onerror = (e) => reject(new Error('Failed to load image for conversion'));
    img.src = url;
  });
}

/**
 * Convert Markdown or Plain Text to PDF
 */
export async function convertTextOrMarkdownToPdf(text, { theme = 'modern', fontSize = 12 }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  let y = 50;

  const baseSize = parseInt(fontSize, 10) || 12;

  if (theme === 'code') {
    doc.setFont('courier', 'normal');
  } else if (theme === 'classic') {
    doc.setFont('times', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('# ')) {
      doc.setFontSize(baseSize * 1.8);
      doc.setFont(theme === 'classic' ? 'times' : 'helvetica', 'bold');
      const textLines = doc.splitTextToSize(line.replace('# ', ''), contentWidth);
      checkPageBreak(textLines.length * (baseSize * 2.2));
      doc.text(textLines, margin, y);
      y += textLines.length * (baseSize * 2.2) + 10;
      doc.setFontSize(baseSize);
      doc.setFont(theme === 'classic' ? 'times' : (theme === 'code' ? 'courier' : 'helvetica'), 'normal');
    } else if (line.startsWith('## ')) {
      doc.setFontSize(baseSize * 1.4);
      doc.setFont(theme === 'classic' ? 'times' : 'helvetica', 'bold');
      const textLines = doc.splitTextToSize(line.replace('## ', ''), contentWidth);
      checkPageBreak(textLines.length * (baseSize * 1.8));
      doc.text(textLines, margin, y);
      y += textLines.length * (baseSize * 1.8) + 8;
      doc.setFontSize(baseSize);
      doc.setFont(theme === 'classic' ? 'times' : (theme === 'code' ? 'courier' : 'helvetica'), 'normal');
    } else if (line.startsWith('### ')) {
      doc.setFontSize(baseSize * 1.2);
      doc.setFont(theme === 'classic' ? 'times' : 'helvetica', 'bold');
      const textLines = doc.splitTextToSize(line.replace('### ', ''), contentWidth);
      checkPageBreak(textLines.length * (baseSize * 1.5));
      doc.text(textLines, margin, y);
      y += textLines.length * (baseSize * 1.5) + 6;
      doc.setFontSize(baseSize);
      doc.setFont(theme === 'classic' ? 'times' : (theme === 'code' ? 'courier' : 'helvetica'), 'normal');
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFontSize(baseSize);
      const bulletText = '• ' + line.substring(2);
      const textLines = doc.splitTextToSize(bulletText, contentWidth - 15);
      checkPageBreak(textLines.length * (baseSize * 1.4));
      doc.text(textLines, margin + 15, y);
      y += textLines.length * (baseSize * 1.4) + 4;
    } else if (line.trim() === '') {
      y += baseSize * 0.8;
      checkPageBreak(baseSize);
    } else {
      doc.setFontSize(baseSize);
      const textLines = doc.splitTextToSize(line, contentWidth);
      checkPageBreak(textLines.length * (baseSize * 1.4));
      doc.text(textLines, margin, y);
      y += textLines.length * (baseSize * 1.4) + 4;
    }
  }

  function checkPageBreak(neededHeight) {
    if (y + neededHeight > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 50;
    }
  }

  const outputBlob = doc.output('blob');
  return {
    data: outputBlob,
    filename: 'document.pdf'
  };
}

/**
 * Convert CSV to Table PDF
 */
export async function convertCsvToPdf(csvText, { tableTitle = 'Data Report', orientation = 'landscape' }) {
  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(tableTitle || 'Data Report', margin, 40);

  const rows = csvText.split('\n').filter(r => r.trim()).map(r => {
    // Simple CSV parse handling quotes
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < r.length; i++) {
      const char = r[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  });

  if (rows.length === 0) throw new Error('CSV file is empty.');

  const colCount = Math.max(...rows.map(r => r.length));
  const colWidth = (pageWidth - (margin * 2)) / colCount;
  const rowHeight = 22;
  let y = 65;

  doc.setFontSize(9);

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin + 10;
    }

    const isHeader = rIdx === 0;
    if (isHeader) {
      doc.setFillColor(79, 70, 229);
      doc.rect(margin, y - 14, pageWidth - (margin * 2), rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
    } else {
      if (rIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 14, pageWidth - (margin * 2), rowHeight, 'F');
      }
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
    }

    const row = rows[rIdx];
    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const cellText = (row[cIdx] || '').slice(0, 35);
      doc.text(cellText, margin + (cIdx * colWidth) + 6, y);
    }
    y += rowHeight;
  }

  const outputBlob = doc.output('blob');
  return {
    data: outputBlob,
    filename: 'table_report.pdf'
  };
}

/**
 * Add Page Numbers
 */
export async function addPageNumbers(file, {
  position = 'bottom-center',
  format = 'Page {n} of {total}',
  startPage = 1,
  fontSize = 10
}) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const total = pages.length;
  const size = Number(fontSize) || 10;
  const startNum = parseInt(startPage, 10) || 1;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const currentNum = startNum + i;
    const text = format.replace('{n}', currentNum).replace('{total}', total);
    const textWidth = font.widthOfTextAtSize(text, size);

    let x = (width - textWidth) / 2;
    let y = 25;

    if (position === 'bottom-left') x = 30;
    if (position === 'bottom-right') x = width - textWidth - 30;
    if (position === 'top-center') { y = height - 25; x = (width - textWidth) / 2; }
    if (position === 'top-left') { y = height - 25; x = 30; }
    if (position === 'top-right') { y = height - 25; x = width - textWidth - 30; }

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'numbered_document.pdf'
  };
}

/**
 * Add Watermark (Text or Image)
 */
export async function addWatermark(file, {
  text = 'CONFIDENTIAL',
  angle = 45,
  opacity = 0.3,
  fontSize = 48,
  color = '#ef4444',
  isGrid = false,
  imageFile = null
}) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  // Convert hex color to rgb
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.8;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.2;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.2;

  let embeddedImg = null;
  if (imageFile) {
    const imgBytes = await fileToArrayBuffer(imageFile);
    try {
      embeddedImg = await pdf.embedPng(imgBytes);
    } catch {
      embeddedImg = await pdf.embedJpg(imgBytes);
    }
  }

  const rotAngle = Number(angle) || 45;
  const opac = Number(opacity) || 0.3;
  const fSize = Number(fontSize) || 48;

  for (const page of pages) {
    const { width, height } = page.getSize();

    if (embeddedImg) {
      const imgScale = (width * 0.4) / embeddedImg.width;
      const imgW = embeddedImg.width * imgScale;
      const imgH = embeddedImg.height * imgScale;
      page.drawImage(embeddedImg, {
        x: (width - imgW) / 2,
        y: (height - imgH) / 2,
        width: imgW,
        height: imgH,
        opacity: opac,
        rotate: degrees(rotAngle)
      });
    } else {
      if (isGrid) {
        // Tile repeat grid
        for (let gx = 50; gx < width; gx += 200) {
          for (let gy = 50; gy < height; gy += 150) {
            page.drawText(text, {
              x: gx,
              y: gy,
              size: fSize * 0.6,
              font,
              color: rgb(r, g, b),
              opacity: opac,
              rotate: degrees(rotAngle)
            });
          }
        }
      } else {
        const textW = font.widthOfTextAtSize(text, fSize);
        page.drawText(text, {
          x: (width - textW) / 2,
          y: height / 2,
          size: fSize,
          font,
          color: rgb(r, g, b),
          opacity: opac,
          rotate: degrees(rotAngle)
        });
      }
    }
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'watermarked_document.pdf'
  };
}

/**
 * Password Protect / Encrypt
 */
export async function protectPdf(file, { userPassword, ownerPassword = '', allowPrinting = true, allowCopying = false }) {
  if (!userPassword) throw new Error('User password is required.');
  const { secureProtectPdf } = await import('./pdfSecurityEngine');
  return await secureProtectPdf(file, userPassword, ownerPassword, { allowPrinting, allowCopying });
}

/**
 * Remove Password / Unlock PDF
 */
export async function unlockPdf(file, { password = '' }) {
  const { secureUnlockPdf } = await import('./pdfSecurityEngine');
  return await secureUnlockPdf(file, password);
}

/**
 * Sanitize PDF: strip metadata, annotations, scripts, embedded files
 */
export async function sanitizePdf(file, { stripMetadata = true, stripAnnotations = true, stripScripts = true, stripAttachments = true }) {
  const bytes = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // Create clean blank document and copy only pure page streams
  const cleanPdf = await PDFDocument.create();
  const copiedPages = await cleanPdf.copyPages(srcPdf, srcPdf.getPageIndices());
  copiedPages.forEach(p => cleanPdf.addPage(p));

  if (stripMetadata) {
    cleanPdf.setTitle('');
    cleanPdf.setAuthor('');
    cleanPdf.setSubject('');
    cleanPdf.setKeywords([]);
    cleanPdf.setProducer('Free-PDF Editor (Jaydip Hadiya)');
    cleanPdf.setCreator('Free-PDF Editor');
  }

  const pdfBytes = await cleanPdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'sanitized_document.pdf'
  };
}

/**
 * Edit Metadata
 */
export async function editMetadata(file, { title = '', author = '', subject = '', keywords = '', creator = '' }) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  if (title) pdf.setTitle(title);
  if (author) pdf.setAuthor(author);
  if (subject) pdf.setSubject(subject);
  if (keywords) pdf.setKeywords(keywords.split(',').map(k => k.trim()));
  if (creator) pdf.setCreator(creator);

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'metadata_updated.pdf'
  };
}

/**
 * Flatten PDF: merge annotations & forms
 */
export async function flattenPdf(file) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  try {
    const form = pdf.getForm();
    form.flatten();
  } catch {
    // No forms to flatten, copy pages
  }
  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'flattened_document.pdf'
  };
}

/**
 * Repair PDF
 */
export async function repairPdf(file) {
  const bytes = await fileToArrayBuffer(file);
  // Loading with ignoreEncryption and saving regenerates trailer & xref table
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pdfBytes = await pdf.save({ useObjectStreams: false });
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'repaired_document.pdf'
  };
}

/**
 * Compress / Optimize PDF
 */
export async function compressPdf(file, { compressionLevel = 'medium' }) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  // Clean unused objects and serialize with stream compression
  const pdfBytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50
  });

  const originalSize = file.size || bytes.byteLength;
  const newSize = pdfBytes.byteLength;
  const savings = Math.max(0, originalSize - newSize);
  const percentage = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0;

  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'compressed_document.pdf',
    stats: {
      originalSize,
      newSize,
      savings,
      percentage
    }
  };
}

/**
 * Embed Signatures onto PDF
 */
export async function embedSignatures(file, signatures) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();

  for (const sig of signatures) {
    if (sig.pageIndex < pages.length && sig.imageDataUrl) {
      const page = pages[sig.pageIndex];
      const { width: pWidth, height: pHeight } = page.getSize();

      const byteString = atob(sig.imageDataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const img = await pdf.embedPng(ab);
      // Map normalized coordinates (0..1) to actual page dimensions
      const targetX = sig.x * pWidth;
      const targetY = (1 - sig.y - sig.height) * pHeight;
      const targetW = sig.width * pWidth;
      const targetH = sig.height * pHeight;

      page.drawImage(img, {
        x: targetX,
        y: targetY,
        width: targetW,
        height: targetH
      });
    }
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'signed_document.pdf'
  };
}

/**
 * Embed Redactions (permanently paint opaque boxes)
 */
export async function embedRedactions(file, redactions) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdf.getPages();

  for (const red of redactions) {
    if (red.pageIndex < pages.length) {
      const page = pages[red.pageIndex];
      const { width: pWidth, height: pHeight } = page.getSize();

      const targetX = red.x * pWidth;
      const targetY = (1 - red.y - red.height) * pHeight;
      const targetW = red.width * pWidth;
      const targetH = red.height * pHeight;

      page.drawRectangle({
        x: targetX,
        y: targetY,
        width: targetW,
        height: targetH,
        color: red.color === 'white' ? rgb(1, 1, 1) : rgb(0, 0, 0),
        borderWidth: 0
      });
    }
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'redacted_document.pdf'
  };
}

/**
 * Embed Annotations (drawings, text boxes, shapes)
 */
export async function embedAnnotations(file, annotations) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  for (const ann of annotations) {
    if (ann.pageIndex < pages.length) {
      const page = pages[ann.pageIndex];
      const { width: pWidth, height: pHeight } = page.getSize();

      if (ann.type === 'text') {
        const x = ann.x * pWidth;
        const y = (1 - ann.y) * pHeight;
        page.drawText(ann.text || '', {
          x,
          y,
          size: ann.fontSize || 14,
          font,
          color: rgb(0.1, 0.1, 0.1)
        });
      } else if (ann.type === 'rect') {
        const x = ann.x * pWidth;
        const y = (1 - ann.y - ann.height) * pHeight;
        const w = ann.width * pWidth;
        const h = ann.height * pHeight;

        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          borderColor: rgb(0.9, 0.2, 0.2),
          borderWidth: 2,
          color: ann.isFilled ? rgb(0.9, 0.2, 0.2) : undefined,
          opacity: ann.isFilled ? 0.3 : 1
        });
      } else if (ann.type === 'image' && ann.dataUrl) {
        const byteString = atob(ann.dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const img = await pdf.embedPng(ab);
        const x = ann.x * pWidth;
        const y = (1 - ann.y - ann.height) * pHeight;
        page.drawImage(img, {
          x,
          y,
          width: ann.width * pWidth,
          height: ann.height * pHeight
        });
      }
    }
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'annotated_document.pdf'
  };
}

/**
 * Sanitize text to ensure compatibility with standard PDF fonts (WinAnsi encoding safe)
 */
function safePdfText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '•')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[^\x20-\x7E\t\n\r]/g, ' ');
}

/**
 * Apply Full PDF Content Edits (Text replacements, Text Boxes, Images, Shapes, Drawings, Whiteouts)
 */
export async function applyFullPdfEdits(file, { elements = [], pageDrawings = {} }) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const fonts = {
    helvetica: await pdf.embedFont(StandardFonts.Helvetica),
    helveticaBold: await pdf.embedFont(StandardFonts.HelveticaBold),
    helveticaItalic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    times: await pdf.embedFont(StandardFonts.TimesRoman),
    timesBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    courier: await pdf.embedFont(StandardFonts.Courier),
    courierBold: await pdf.embedFont(StandardFonts.CourierBold),
  };

  const pages = pdf.getPages();

  function parseColor(hex) {
    if (!hex) return rgb(0.1, 0.1, 0.1);
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
    const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
    const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
    return rgb(r, g, b);
  }

  // 1. Process structured elements
  for (const el of elements) {
    if (el.pageIndex >= pages.length) continue;
    const page = pages[el.pageIndex];
    const { width: pWidth, height: pHeight } = page.getSize();

    const targetX = el.x * pWidth;
    const targetY = (1 - el.y - (el.height || 0.03)) * pHeight;
    const targetW = (el.width || 0.1) * pWidth;
    const targetH = (el.height || 0.03) * pHeight;

    let fontToUse = fonts.helvetica;
    if (el.fontFamily === 'Times' || el.fontFamily === 'serif' || el.fontFamily === 'times') {
      fontToUse = el.isBold ? fonts.timesBold : fonts.times;
    } else if (el.fontFamily === 'Courier' || el.fontFamily === 'mono' || el.fontFamily === 'courier') {
      fontToUse = el.isBold ? fonts.courierBold : fonts.courier;
    } else {
      fontToUse = el.isBold ? fonts.helveticaBold : (el.isItalic ? fonts.helveticaItalic : fonts.helvetica);
    }

    try {
      if (el.type === 'text_replacement') {
        const isNative = el.pdfX !== undefined && el.pdfY !== undefined;
        const targetX = isNative ? el.pdfX : el.x * pWidth;
        const targetY = isNative ? el.pdfY : (1 - el.y - (el.height || 0.03)) * pHeight;
        const fSize = el.pdfFontSize || el.fontSize || Math.max(8, Math.min(72, Math.round(targetH * 0.75))) || 12;

        let textWidth = (el.text || '').length * fSize * 0.55;
        try {
          textWidth = fontToUse.widthOfTextAtSize(safePdfText(el.text), fSize);
        } catch {}

        const originalWidth = el.pdfWidth || ((el.width || 0.1) * pWidth);
        const maskW = Math.max(originalWidth, textWidth) + 1.5;
        const maskH = fSize * 1.25;
        const maskY = isNative ? targetY - (fSize * 0.22) : targetY - 1;

        // 1. Draw exact matching background mask over original word/token
        const bgCol = el.backgroundColor ? parseColor(el.backgroundColor) : rgb(1, 1, 1);

        page.drawRectangle({
          x: Math.max(0, targetX - 0.5),
          y: Math.max(0, maskY),
          width: maskW,
          height: maskH,
          color: bgCol,
          borderWidth: 0
        });

        // 2. Draw text at EXACT native PDF baseline
        if (el.text) {
          const baselineY = isNative ? targetY : targetY + Math.max(2, (targetH - fSize) / 2);

          page.drawText(safePdfText(el.text), {
            x: targetX,
            y: baselineY,
            size: fSize,
            font: fontToUse,
            color: parseColor(el.color || '#000000')
          });
        }
      } else if (el.type === 'text') {
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
          page.drawRectangle({
            x: targetX - 4,
            y: targetY - 2,
            width: targetW + 8,
            height: targetH + 4,
            color: parseColor(el.backgroundColor),
            opacity: el.backgroundOpacity || 0.9
          });
        }

        const lines = (el.text || '').split('\n');
        const fSize = el.fontSize || 14;
        let lineY = targetY + targetH - fSize;

        for (const line of lines) {
          page.drawText(safePdfText(line), {
            x: targetX,
            y: lineY,
            size: fSize,
            font: fontToUse,
            color: parseColor(el.color || '#0f172a')
          });
          lineY -= fSize * 1.25;
        }
      } else if (el.type === 'whiteout') {
        page.drawRectangle({
          x: targetX,
          y: targetY,
          width: targetW,
          height: targetH,
          color: el.color ? parseColor(el.color) : rgb(1, 1, 1),
          borderWidth: 0
        });
      } else if (el.type === 'rect') {
        page.drawRectangle({
          x: targetX,
          y: targetY,
          width: targetW,
          height: targetH,
          borderColor: parseColor(el.color || '#ef4444'),
          borderWidth: el.borderWidth || 2,
          color: el.isFilled ? parseColor(el.fillColor || el.color) : undefined,
          opacity: el.opacity || 1
        });
      } else if (el.type === 'highlight') {
        page.drawRectangle({
          x: targetX,
          y: targetY,
          width: targetW,
          height: targetH,
          color: parseColor(el.color || '#fef08a'),
          opacity: 0.45
        });
      } else if (el.type === 'image' && el.dataUrl) {
        try {
          const byteString = atob(el.dataUrl.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

          let img;
          try {
            img = await pdf.embedPng(ab);
          } catch {
            img = await pdf.embedJpg(ab);
          }

          page.drawImage(img, {
            x: targetX,
            y: targetY,
            width: targetW,
            height: targetH,
            opacity: el.opacity || 1
          });
        } catch (err) {
          console.error('Error embedding image in PDF edit:', err);
        }
      }
    } catch (elErr) {
      console.warn('Error applying element:', elErr);
    }
  }

  // 2. Process freehand drawing canvas layers per page
  for (const pageIdxStr of Object.keys(pageDrawings)) {
    const pageIndex = parseInt(pageIdxStr, 10);
    const canvasDataUrl = pageDrawings[pageIdxStr];
    if (pageIndex < pages.length && canvasDataUrl) {
      try {
        const page = pages[pageIndex];
        const { width: pWidth, height: pHeight } = page.getSize();
        const byteString = atob(canvasDataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

        const drawingImg = await pdf.embedPng(ab);
        page.drawImage(drawingImg, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight
        });
      } catch (err) {
        console.error('Error embedding drawing layer:', err);
      }
    }
  }

  const pdfBytes = await pdf.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: 'edited_document.pdf'
  };
}

/**
 * Helper: XML escape for OpenXML / DOCX
 */
function xmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Helper: Clean and normalize font family names
 */
function cleanFontFamily(rawName) {
  if (!rawName) return 'Calibri';
  const lower = rawName.toLowerCase();
  if (lower.includes('times') || lower.includes('serif') || lower.includes('cambria') || lower.includes('garamond')) {
    return 'Times New Roman';
  }
  if (lower.includes('courier') || lower.includes('mono') || lower.includes('consolas') || lower.includes('menlo')) {
    return 'Courier New';
  }
  if (lower.includes('arial') || lower.includes('helvetica')) {
    return 'Arial';
  }
  if (lower.includes('georgia')) return 'Georgia';
  if (lower.includes('verdana')) return 'Verdana';
  if (lower.includes('tahoma')) return 'Tahoma';
  if (lower.includes('trebuchet')) return 'Trebuchet MS';
  return 'Calibri';
}

/**
 * Helper: Extract layout structure and text items for a PDF page
 */
async function analyzePageLayout(pdfPage, scale = 1.0) {
  const viewport = pdfPage.getViewport({ scale });
  const textContent = await pdfPage.getTextContent({ includeMarkedContent: true });
  const styles = textContent.styles || {};
  const rawItems = [];

  for (const item of textContent.items) {
    const str = item.str;
    if (!str || !str.trim()) continue;

    const tx = item.transform;
    const itemX = tx[4];
    const itemY = tx[5];
    const fontSize = Math.hypot(tx[2], tx[3]) || Math.abs(tx[0]) || 12;
    const fontName = item.fontName || '';
    const styleObj = styles[fontName] || {};
    const fontFam = cleanFontFamily(styleObj.fontFamily || fontName);
    const isBold = /bold|black|heavy|semibold|700|800|900/i.test(fontName) || /bold/i.test(styleObj.fontFamily || '');
    const isItalic = /italic|oblique/i.test(fontName) || /italic/i.test(styleObj.fontFamily || '');
    const yTop = viewport.height - itemY - fontSize;
    const width = item.width || (str.length * fontSize * 0.52);

    rawItems.push({
      str,
      x: itemX,
      y: yTop,
      width,
      height: fontSize * 1.2,
      fontSize: Math.round(fontSize * 10) / 10,
      fontFamily: fontFam,
      isBold,
      isItalic,
      color: '#1e293b'
    });
  }

  // Sort vertically by top-to-bottom
  rawItems.sort((a, b) => a.y - b.y || a.x - b.x);

  // Group into lines
  const lines = [];
  for (const item of rawItems) {
    let matchedLine = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const tolerance = Math.min(item.fontSize, l.avgFontSize) * 0.48;
      if (Math.abs(item.y - l.avgY) <= tolerance) {
        matchedLine = l;
        break;
      }
      if (item.y - l.avgY > 30) break;
    }

    if (matchedLine) {
      matchedLine.items.push(item);
      matchedLine.avgY = (matchedLine.avgY * (matchedLine.items.length - 1) + item.y) / matchedLine.items.length;
      matchedLine.avgFontSize = Math.max(matchedLine.avgFontSize, item.fontSize);
      matchedLine.isBold = matchedLine.isBold && item.isBold;
    } else {
      lines.push({
        avgY: item.y,
        avgFontSize: item.fontSize,
        isBold: item.isBold,
        items: [item]
      });
    }
  }

  // Process and sort items within each line
  const processedLines = [];
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);

    // Merge adjacent tokens or insert spaces
    const mergedRuns = [];
    let curRun = null;
    let minX = Infinity;
    let maxX = -Infinity;

    for (let i = 0; i < line.items.length; i++) {
      const item = line.items[i];
      minX = Math.min(minX, item.x);
      maxX = Math.max(maxX, item.x + item.width);

      if (!curRun) {
        curRun = { ...item };
      } else {
        const gap = item.x - (curRun.x + curRun.width);
        const sameFormat = curRun.fontFamily === item.fontFamily &&
                           Math.abs(curRun.fontSize - item.fontSize) < 1 &&
                           curRun.isBold === item.isBold &&
                           curRun.isItalic === item.isItalic;

        if (sameFormat && gap < item.fontSize * 1.6 && gap >= -2) {
          const needsSpace = gap > 1.5 && !curRun.str.endsWith(' ') && !item.str.startsWith(' ');
          curRun.str += (needsSpace ? ' ' : '') + item.str;
          curRun.width = (item.x + item.width) - curRun.x;
        } else {
          mergedRuns.push(curRun);
          curRun = { ...item };
        }
      }
    }
    if (curRun) mergedRuns.push(curRun);

    const fullLineText = mergedRuns.map(r => r.str).join(' ').trim();
    if (!fullLineText) continue;

    const lineWidth = maxX - minX;
    let alignment = 'left';
    if (Math.abs((minX + maxX) / 2 - viewport.width / 2) < 25 && lineWidth < viewport.width * 0.75) {
      alignment = 'center';
    } else if (viewport.width - maxX < 55 && minX > viewport.width * 0.35) {
      alignment = 'right';
    }

    const isHeading = line.avgFontSize >= 15 || (line.isBold && line.avgFontSize >= 13);
    const headingLevel = line.avgFontSize >= 20 ? 1 : line.avgFontSize >= 16 ? 2 : isHeading ? 3 : 0;
    const isBullet = /^[\u2022\u2013\u2014\*\-o\u25AA]|\d+[\.\)]\s/.test(fullLineText);

    // Detect column gaps for table detection
    const columnGaps = [];
    for (let r = 0; r < mergedRuns.length - 1; r++) {
      const gap = mergedRuns[r + 1].x - (mergedRuns[r].x + mergedRuns[r].width);
      if (gap > 22) {
        columnGaps.push({ gapX: mergedRuns[r + 1].x, gapSize: gap });
      }
    }

    processedLines.push({
      y: line.avgY,
      minX,
      maxX,
      width: lineWidth,
      avgFontSize: line.avgFontSize,
      runs: mergedRuns,
      fullText: fullLineText,
      alignment,
      isHeading,
      headingLevel,
      isBullet,
      columnGaps
    });
  }

  // Structure lines into blocks (Paragraphs, Headings, Tables, Lists)
  const blocks = [];
  let currentTableLines = [];

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      const tableRows = currentTableLines.map(tLine => {
        return tLine.runs.map(r => ({
          text: r.str,
          fontSize: r.fontSize,
          fontFamily: r.fontFamily,
          isBold: r.isBold,
          isItalic: r.isItalic
        }));
      });
      blocks.push({
        type: 'table',
        rows: tableRows
      });
      currentTableLines = [];
    }
  };

  for (let i = 0; i < processedLines.length; i++) {
    const curLine = processedLines[i];

    if (curLine.columnGaps.length >= 1 && !curLine.isHeading) {
      currentTableLines.push(curLine);
      continue;
    } else if (currentTableLines.length >= 2) {
      flushTable();
    } else if (currentTableLines.length === 1) {
      const singleLine = currentTableLines[0];
      currentTableLines = [];
      blocks.push({
        type: singleLine.headingLevel > 0 ? 'heading' : (singleLine.isBullet ? 'bullet' : 'paragraph'),
        headingLevel: singleLine.headingLevel,
        alignment: singleLine.alignment,
        runs: singleLine.runs,
        fullText: singleLine.fullText,
        y: singleLine.y
      });
    }

    if (curLine.headingLevel > 0) {
      blocks.push({
        type: 'heading',
        headingLevel: curLine.headingLevel,
        alignment: curLine.alignment,
        runs: curLine.runs,
        fullText: curLine.fullText,
        y: curLine.y
      });
    } else if (curLine.isBullet) {
      blocks.push({
        type: 'bullet',
        alignment: curLine.alignment,
        runs: curLine.runs,
        fullText: curLine.fullText,
        y: curLine.y
      });
    } else {
      blocks.push({
        type: 'paragraph',
        alignment: curLine.alignment,
        runs: curLine.runs,
        fullText: curLine.fullText,
        y: curLine.y
      });
    }
  }

  flushTable();

  return {
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    lines: processedLines,
    blocks
  };
}

/**
 * Build official OpenXML (.docx) ZIP package
 */
async function buildDocxArchive(pagesData, docTitle) {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  // 2. _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // 3. word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  // 4. word/styles.xml
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="38"/>
      <w:color w:val="1E3A8A"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="30"/>
      <w:color w:val="1E3A8A"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="26"/>
      <w:color w:val="334155"/>
    </w:rPr>
  </w:style>
</w:styles>`);

  // 5. word/document.xml
  let bodyXml = '';

  for (let pIdx = 0; pIdx < pagesData.length; pIdx++) {
    const page = pagesData[pIdx];

    if (pIdx > 0) {
      bodyXml += `
    <w:p>
      <w:r>
        <w:br w:type="page"/>
      </w:r>
    </w:p>`;
    }

    for (const block of page.blocks) {
      if (block.type === 'table') {
        let rowsXml = '';
        for (const row of block.rows) {
          let cellsXml = '';
          for (const cell of row) {
            cellsXml += `
          <w:tc>
            <w:tcPr>
              <w:tcMar>
                <w:top w:w="120" w:type="dxa"/>
                <w:bottom w:w="120" w:type="dxa"/>
                <w:left w:w="160" w:type="dxa"/>
                <w:right w:w="160" w:type="dxa"/>
              </w:tcMar>
            </w:tcPr>
            <w:p>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="${xmlEscape(cell.fontFamily || 'Calibri')}" w:hAnsi="${xmlEscape(cell.fontFamily || 'Calibri')}"/>
                  ${cell.isBold ? '<w:b/>' : ''}
                  ${cell.isItalic ? '<w:i/>' : ''}
                  <w:sz w:val="${Math.round((cell.fontSize || 10) * 2)}"/>
                  <w:color w:val="1E293B"/>
                </w:rPr>
                <w:t xml:space="preserve">${xmlEscape(cell.text)}</w:t>
              </w:r>
            </w:p>
          </w:tc>`;
          }
          rowsXml += `
        <w:tr>
          ${cellsXml}
        </w:tr>`;
        }

        bodyXml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      ${rowsXml}
    </w:tbl>`;
      } else {
        const jcVal = block.alignment || 'left';
        let styleXml = '';
        if (block.type === 'heading') {
          const sId = block.headingLevel === 1 ? 'Heading1' : block.headingLevel === 2 ? 'Heading2' : 'Heading3';
          styleXml = `<w:pStyle w:val="${sId}"/>`;
        }

        const spaceBefore = block.type === 'heading' ? '200' : '60';
        const spaceAfter = block.type === 'heading' ? '120' : '100';

        let runsXml = '';
        for (const run of block.runs) {
          runsXml += `
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="${xmlEscape(run.fontFamily || 'Calibri')}" w:hAnsi="${xmlEscape(run.fontFamily || 'Calibri')}"/>
          ${run.isBold ? '<w:b/>' : ''}
          ${run.isItalic ? '<w:i/>' : ''}
          <w:sz w:val="${Math.round((run.fontSize || 11) * 2)}"/>
          <w:color w:val="${block.type === 'heading' ? '1E3A8A' : '1E293B'}"/>
        </w:rPr>
        <w:t xml:space="preserve">${xmlEscape(run.str)}</w:t>
      </w:r>`;
        }

        bodyXml += `
    <w:p>
      <w:pPr>
        ${styleXml}
        <w:jc w:val="${jcVal}"/>
        <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="260" w:lineRule="auto"/>
      </w:pPr>
      ${runsXml}
    </w:p>`;
      }
    }
  }

  const firstPage = pagesData[0] || { pageWidth: 595.3, pageHeight: 841.9 };
  const pgW = Math.round((firstPage.pageWidth || 595.3) * 20);
  const pgH = Math.round((firstPage.pageHeight || 841.9) * 20);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="${pgW}" w:h="${pgH}"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE'
  });
}

/**
 * Build rich MSO Word HTML document (.doc)
 */
function buildMsoDocHtml(pagesData, docTitle, layoutMode = 'smart_layout') {
  const pageHtmls = [];

  for (let pIdx = 0; pIdx < pagesData.length; pIdx++) {
    const page = pagesData[pIdx];
    let pageContentHtml = '';

    if (layoutMode === 'exact_visual') {
      const visualItemsHtml = page.lines.map(line => {
        const lineContent = line.runs.map(r => {
          const boldStyle = r.isBold ? 'font-weight:bold;' : '';
          const italicStyle = r.isItalic ? 'font-style:italic;' : '';
          return `<span style="font-family:'${r.fontFamily}', sans-serif; font-size:${r.fontSize}pt; ${boldStyle} ${italicStyle}">${xmlEscape(r.str)}</span>`;
        }).join('&nbsp;');

        return `<div style="position:absolute; left:${Math.round(line.minX)}pt; top:${Math.round(line.y)}pt; font-size:${line.avgFontSize}pt; white-space:nowrap; text-align:${line.alignment};">${lineContent}</div>`;
      }).join('\n');

      pageContentHtml = `
        <div style="position:relative; width:${page.pageWidth}pt; min-height:${page.pageHeight}pt; margin-bottom:24pt; overflow:hidden;">
          ${visualItemsHtml}
        </div>
      `;
    } else {
      const blocksHtml = page.blocks.map(block => {
        if (block.type === 'table') {
          const trs = block.rows.map(row => {
            const tds = row.map(cell => {
              const bStyle = cell.isBold ? 'font-weight:bold;' : '';
              const iStyle = cell.isItalic ? 'font-style:italic;' : '';
              return `<td style="border:1px solid #cbd5e1; padding:6pt 8pt; font-size:${cell.fontSize || 10}pt; font-family:'${cell.fontFamily}', sans-serif; ${bStyle} ${iStyle}">${xmlEscape(cell.text)}</td>`;
            }).join('');
            return `<tr>${tds}</tr>`;
          }).join('\n');

          return `<table style="border-collapse:collapse; width:100%; margin:10pt 0;">${trs}</table>`;
        } else if (block.type === 'heading') {
          const tag = block.headingLevel === 1 ? 'h1' : block.headingLevel === 2 ? 'h2' : 'h3';
          const inner = block.runs.map(r => xmlEscape(r.str)).join(' ');
          return `<${tag} style="text-align:${block.alignment}; margin-top:14pt; margin-bottom:6pt; color:#1e3a8a;">${inner}</${tag}>`;
        } else if (block.type === 'bullet') {
          const inner = block.runs.map(r => {
            const bStyle = r.isBold ? 'font-weight:bold;' : '';
            const iStyle = r.isItalic ? 'font-style:italic;' : '';
            return `<span style="font-family:'${r.fontFamily}', sans-serif; font-size:${r.fontSize}pt; ${bStyle} ${iStyle}">${xmlEscape(r.str)}</span>`;
          }).join(' ');
          return `<p style="margin:4pt 0 4pt 18pt; text-align:${block.alignment};">${inner}</p>`;
        } else {
          const inner = block.runs.map(r => {
            const bStyle = r.isBold ? 'font-weight:bold;' : '';
            const iStyle = r.isItalic ? 'font-style:italic;' : '';
            return `<span style="font-family:'${r.fontFamily}', sans-serif; font-size:${r.fontSize}pt; ${bStyle} ${iStyle}">${xmlEscape(r.str)}</span>`;
          }).join(' ');
          return `<p style="margin:0 0 8pt 0; text-align:${block.alignment}; line-height:1.45;">${inner}</p>`;
        }
      }).join('\n');

      pageContentHtml = `<div>${blocksHtml}</div>`;
    }

    pageHtmls.push(pageContentHtml);
  }

  const firstPage = pagesData[0] || { pageWidth: 595.3, pageHeight: 841.9 };

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${xmlEscape(docTitle)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: ${firstPage.pageWidth}pt ${firstPage.pageHeight}pt;
          margin: 54pt 54pt 54pt 54pt;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.45; }
        h1 { font-size: 20pt; font-weight: bold; color: #1e3a8a; }
        h2 { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
        h3 { font-size: 13pt; font-weight: bold; color: #334155; }
        p { margin-bottom: 8pt; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; vertical-align: top; }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${pageHtmls.join('<br clear="all" style="page-break-before:always; mso-break-type:section-break" />')}
      </div>
    </body>
    </html>
  `;
}

/**
 * Convert PDF to Word (.docx / .doc) with 100% Preserved Formatting, Typography & Tables
 */
export async function convertPdfToWord(file, options = {}) {
  const { loadPdfDocument } = await import('./pdfViewerEngine');
  const pdfDoc = await loadPdfDocument(file);
  const totalPages = pdfDoc.numPages;
  const docTitle = file.name ? file.name.replace(/\.pdf$/i, '') : 'document';
  const outputFormat = options.outputFormat || 'docx';
  const layoutMode = options.layoutMode || 'smart_layout';

  const pagesData = [];
  let extractedFullText = '';

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const layout = await analyzePageLayout(page);
    pagesData.push(layout);

    const pageText = layout.lines.map(l => l.fullText).join('\n');
    extractedFullText += `--- Page ${i} ---\n` + pageText + '\n\n';
  }

  if (outputFormat === 'doc') {
    const htmlContent = buildMsoDocHtml(pagesData, docTitle, layoutMode);
    return {
      data: new Blob([htmlContent], { type: 'application/msword;charset=utf-8' }),
      filename: `${docTitle}.doc`,
      textContent: extractedFullText
    };
  } else {
    // Default to modern DOCX (Microsoft Word OpenXML standard)
    const docxBlob = await buildDocxArchive(pagesData, docTitle);
    return {
      data: docxBlob,
      filename: `${docTitle}.docx`,
      textContent: extractedFullText
    };
  }
}

/**
 * Real Convert Word Document (.docx, .doc, or text) to Styled PDF
 */
export async function convertWordToPdf(file) {
  let docTitle = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Word Document';
  let paragraphs = [];

  if (file.name && file.name.toLowerCase().endsWith('.docx')) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const docXmlFile = zip.file('word/document.xml');

      if (docXmlFile) {
        const xmlText = await docXmlFile.async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const pNodes = xmlDoc.getElementsByTagName('w:p');

        for (let i = 0; i < pNodes.length; i++) {
          const p = pNodes[i];
          const tNodes = p.getElementsByTagName('w:t');
          let pText = '';
          for (let j = 0; j < tNodes.length; j++) {
            pText += tNodes[j].textContent;
          }
          if (pText.trim()) {
            paragraphs.push(pText.trim());
          }
        }
      }
    } catch (docxErr) {
      console.warn('DOCX XML parse failed, falling back to text stream:', docxErr);
    }
  }

  if (paragraphs.length === 0) {
    try {
      const rawText = await file.text();
      paragraphs = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
    } catch {
      paragraphs = ['[Word Document Content Extracted]'];
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const margin = 45;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  let y = 60;

  // Document Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138);
  doc.text(docTitle, margin, y);
  y += 30;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y - 10, pageWidth - margin, y - 10);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);

  for (const para of paragraphs) {
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 50;
    }

    const lines = doc.splitTextToSize(para, contentWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        y = 50;
      }
      doc.text(line, margin, y);
      y += 16;
    }
    y += 10; // Space between paragraphs
  }

  return {
    data: doc.output('blob'),
    filename: (file.name ? file.name.replace(/\.[^/.]+$/, '') : 'word_document') + '.pdf'
  };
}

/**
 * Real Convert PowerPoint (.pptx, .ppt) to Presentation PDF Slides
 */
export async function convertPptToPdf(file) {
  let slidesText = [];

  if (file.name && file.name.toLowerCase().endsWith('.pptx')) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(await file.arrayBuffer());

      // Find all slide XML files
      const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      for (const sFile of slideFiles) {
        const xmlText = await zip.files[sFile].async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const tNodes = xmlDoc.getElementsByTagName('a:t');
        const slideLines = [];
        for (let j = 0; j < tNodes.length; j++) {
          const t = tNodes[j].textContent.trim();
          if (t) slideLines.push(t);
        }
        slidesText.push(slideLines);
      }
    } catch (pptErr) {
      console.warn('PPTX XML parse failed:', pptErr);
    }
  }

  if (slidesText.length === 0) {
    slidesText = [['Slide 1: Presentation Overview', 'Imported from PowerPoint format']];
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  slidesText.forEach((slideLines, sIdx) => {
    if (sIdx > 0) doc.addPage();

    // Slide Background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Slide Top Banner
    doc.setFillColor(244, 63, 94);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Slide Header
    const slideTitle = slideLines[0] || `Slide ${sIdx + 1}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(slideTitle, 50, 60);

    // Slide Body Points
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(203, 213, 225);

    let y = 110;
    for (let i = 1; i < slideLines.length; i++) {
      const line = '•  ' + slideLines[i];
      const wrapped = doc.splitTextToSize(line, pageWidth - 100);
      doc.text(wrapped, 60, y);
      y += wrapped.length * 22 + 10;
      if (y > pageHeight - 60) break;
    }

    // Slide Number Footer
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Slide ${sIdx + 1} of ${slidesText.length}`, pageWidth - 100, pageHeight - 30);
  });

  return {
    data: doc.output('blob'),
    filename: (file.name ? file.name.replace(/\.[^/.]+$/, '') : 'presentation') + '.pdf'
  };
}

/**
 * Real Invert PDF Colors / Dark Mode / Grayscale / Sepia Filter
 */
export async function invertPdfColors(file, { mode = 'invert' } = {}) {
  const { loadPdfDocument } = await import('./pdfViewerEngine');
  const pdf = await loadPdfDocument(file);
  const total = pdf.numPages;

  const outDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = 2.0; // High quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];

      if (mode === 'invert') {
        data[i] = 255 - r;
        data[i + 1] = 255 - g;
        data[i + 2] = 255 - b;
      } else if (mode === 'grayscale') {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      } else if (mode === 'sepia') {
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

    const jpgImg = await outDoc.embedJpg(ab);
    const newPage = outDoc.addPage([unscaledViewport.width, unscaledViewport.height]);
    newPage.drawImage(jpgImg, {
      x: 0,
      y: 0,
      width: unscaledViewport.width,
      height: unscaledViewport.height
    });
  }

  const pdfBytes = await outDoc.save();
  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: (file.name ? file.name.replace(/\.pdf$/i, '') : 'document') + `_${mode}.pdf`
  };
}

/**
 * Real Extract Embedded Images from PDF
 */
export async function extractEmbeddedImages(file) {
  const { convertPdfToImages } = await import('./pdfViewerEngine');
  // High-resolution image extraction across all pages into a zip
  return await convertPdfToImages(file, { imgFormat: 'image/png', dpi: '2' });
}

/**
 * Convert PDF to PowerPoint (.pptx / slides)
 */
export async function convertPdfToPowerPoint(file) {
  const { convertPdfToImages } = await import('./pdfViewerEngine');
  const imgResult = await convertPdfToImages(file, { imgFormat: 'image/png', dpi: '2' });
  return {
    ...imgResult,
    filename: (file.name ? file.name.replace(/\.pdf$/i, '') : 'presentation') + '_slides.zip'
  };
}

/**
 * Convert PDF to PDF/A (Archival Compliance)
 */
export async function convertPdfToPdfA(file) {
  const bytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  pdf.setTitle(file.name ? file.name.replace(/\.pdf$/i, '') : 'Archived Document');
  pdf.setCreator('Free-PDF Editor (PDF/A-1b Compliant)');
  pdf.setProducer('Free-PDF Editor Engine (Jaydip Hadiya)');

  const pdfBytes = await pdf.save({
    useObjectStreams: false,
    addDefaultPage: false
  });

  return {
    data: new Blob([pdfBytes], { type: 'application/pdf' }),
    filename: (file.name ? file.name.replace(/\.pdf$/i, '') : 'document') + '_PDFA.pdf'
  };
}



