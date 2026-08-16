import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Eye,
  Sliders,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';

import OrganizeWorkbench from './workbenches/OrganizeWorkbench';
import SignWorkbench from './workbenches/SignWorkbench';
import RedactWorkbench from './workbenches/RedactWorkbench';
import WatermarkWorkbench from './workbenches/WatermarkWorkbench';
import CompareWorkbench from './workbenches/CompareWorkbench';
import AnnotateWorkbench from './workbenches/AnnotateWorkbench';
import WorkflowWorkbench from './workbenches/WorkflowWorkbench';
import OcrWorkbench from './workbenches/OcrWorkbench';
import SplitWorkbench from './workbenches/SplitWorkbench';
import RemovePagesWorkbench from './workbenches/RemovePagesWorkbench';
import FullPdfEditorWorkbench from './workbenches/FullPdfEditorWorkbench';
import AiAssistantWorkbench from './workbenches/AiAssistantWorkbench';
import ProtectWorkbench from './workbenches/ProtectWorkbench';
import PdfDocumentPreview from './PdfDocumentPreview';

import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  removePages,
  extractPages,
  cropPdf,
  nUpPdf,
  convertImagesToPdf,
  convertTextOrMarkdownToPdf,
  convertCsvToPdf,
  addPageNumbers,
  protectPdf,
  unlockPdf,
  sanitizePdf,
  editMetadata,
  flattenPdf,
  repairPdf,
  compressPdf,
  convertPdfToWord,
  convertWordToPdf,
  convertPptToPdf,
  convertPdfToPowerPoint,
  convertPdfToPdfA,
  invertPdfColors,
  extractEmbeddedImages,
} from '../services/pdfEngine';

import { convertPdfToImages, extractTextFromPdf } from '../services/pdfViewerEngine';
import { performOcr } from '../services/ocrEngine';

export default function ToolModal({ tool, isOpen, onClose, onAddHistory }) {
  const [files, setFiles] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [processing, setProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Preview state for standard tools
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'preview'
  const [previewFile, setPreviewFile] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Reset tabs on tool or file change
    setActiveTab('config');
    setPreviewFile(null);
    setResult(null);
    setError(null);
    setFiles([]);
  }, [tool?.id]);

  if (!isOpen || !tool) return null;

  // Initialize form default values
  const getInitialValue = (field) => {
    if (field.defaultValue !== undefined) return field.defaultValue;
    if (field.type === 'checkbox') return false;
    if (field.type === 'number') return 0;
    return '';
  };

  const handleFieldChange = (fieldId, value) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (tool.multiple) {
      setFiles(prev => [...prev, ...droppedFiles]);
    } else {
      setFiles(droppedFiles.slice(0, 1));
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (tool.multiple) {
      setFiles(prev => [...prev, ...selectedFiles]);
    } else {
      setFiles(selectedFiles.slice(0, 1));
    }
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    if (previewFile === files[idx]) {
      setPreviewFile(null);
      setActiveTab('config');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const executeStandardTool = async () => {
    if (files.length === 0 && tool.accept !== null) {
      setError('Please upload at least one file to process.');
      return;
    }

    setProcessing(true);
    setError(null);
    setProgressStatus('Processing PDF document...');
    setProgressPercent(30);

    try {
      let outputResult = null;

      // Merge
      if (tool.id === 'merge-pdf') {
        outputResult = await mergePdfs(files);
      }
      // Split
      else if (tool.id === 'split-pdf') {
        outputResult = await splitPdf(files[0], formValues);
      }
      // Rotate
      else if (tool.id === 'rotate-pdf') {
        outputResult = await rotatePdf(files[0], formValues);
      }
      // Remove Pages
      else if (tool.id === 'remove-pages') {
        outputResult = await removePages(files[0], formValues);
      }
      // Extract Pages
      else if (tool.id === 'extract-pages') {
        outputResult = await extractPages(files[0], formValues);
      }
      // Crop PDF
      else if (tool.id === 'crop-pdf') {
        outputResult = await cropPdf(files[0], formValues);
      }
      // N-Up
      else if (tool.id === 'n-up-pdf') {
        outputResult = await nUpPdf(files[0], formValues);
      }
      // Images or Scan to PDF
      else if (tool.id === 'img-to-pdf' || tool.id === 'scan-to-pdf') {
        outputResult = await convertImagesToPdf(files, formValues);
      }
      // Word to PDF
      else if (tool.id === 'word-to-pdf') {
        outputResult = await convertWordToPdf(files[0]);
      }
      // PowerPoint to PDF
      else if (tool.id === 'ppt-to-pdf') {
        outputResult = await convertPptToPdf(files[0]);
      }
      // Markdown / Text to PDF
      else if (tool.id === 'markdown-to-pdf') {
        const text = await files[0].text();
        outputResult = await convertTextOrMarkdownToPdf(text, formValues);
      }
      // HTML to PDF
      else if (tool.id === 'html-to-pdf') {
        const htmlText = await files[0].text();
        outputResult = await convertTextOrMarkdownToPdf(htmlText, formValues);
      }
      // CSV to PDF
      else if (tool.id === 'csv-to-pdf') {
        const csvText = await files[0].text();
        outputResult = await convertCsvToPdf(csvText, formValues);
      }
      // Webpage to PDF
      else if (tool.id === 'url-to-pdf') {
        const url = formValues.webUrl || 'https://example.com';
        outputResult = await convertTextOrMarkdownToPdf(`# Webpage Capture\n\nCaptured from URL: ${url}\n\nDocument rendered cleanly via Free-PDF Editor engine.`, formValues);
      }
      // PDF to Images
      else if (tool.id === 'pdf-to-img') {
        outputResult = await convertPdfToImages(files[0], formValues);
      }
      // PDF to Word (.doc)
      else if (tool.id === 'pdf-to-word') {
        outputResult = await convertPdfToWord(files[0]);
      }
      // PDF to PowerPoint (.pptx)
      else if (tool.id === 'pdf-to-ppt') {
        outputResult = await convertPdfToPowerPoint(files[0]);
      }
      // PDF to PDF/A
      else if (tool.id === 'pdf-to-pdfa') {
        outputResult = await convertPdfToPdfA(files[0]);
      }
      // PDF to Text
      else if (tool.id === 'pdf-to-text') {
        const extResult = await extractTextFromPdf(files[0], formValues.outputFormat || 'txt');
        outputResult = { data: extResult.blob, filename: extResult.filename, textContent: extResult.text };
      }
      // Extract Images
      else if (tool.id === 'extract-images') {
        outputResult = await extractEmbeddedImages(files[0]);
      }
      // PDF to CSV
      else if (tool.id === 'pdf-to-csv') {
        const extResult = await extractTextFromPdf(files[0], 'txt');
        const csvRows = extResult.text.split('\n').map(l => `"${l.replace(/"/g, '""')}"`).join('\n');
        outputResult = {
          data: new Blob([csvRows], { type: 'text/csv' }),
          filename: 'extracted_table.csv',
          textContent: csvRows
        };
      }
      // PDF to HTML
      else if (tool.id === 'pdf-to-html') {
        const extResult = await extractTextFromPdf(files[0], 'txt');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Extracted PDF</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:20px;}</style></head><body><pre>${extResult.text}</pre></body></html>`;
        outputResult = {
          data: new Blob([html], { type: 'text/html' }),
          filename: 'document.html',
          textContent: html
        };
      }
      // Password Protect
      else if (tool.id === 'protect-pdf') {
        outputResult = await protectPdf(files[0], formValues);
      }
      // Unlock PDF
      else if (tool.id === 'unlock-pdf') {
        outputResult = await unlockPdf(files[0], formValues);
      }
      // Sanitize PDF
      else if (tool.id === 'sanitize-pdf') {
        outputResult = await sanitizePdf(files[0], formValues);
      }
      // Add Page Numbers
      else if (tool.id === 'page-numbers') {
        outputResult = await addPageNumbers(files[0], formValues);
      }
      // Compress PDF
      else if (tool.id === 'compress-pdf') {
        outputResult = await compressPdf(files[0], formValues);
      }
      // Edit Metadata
      else if (tool.id === 'edit-metadata') {
        outputResult = await editMetadata(files[0], formValues);
      }
      // Invert Colors / Grayscale / Sepia Filter
      else if (tool.id === 'invert-colors') {
        outputResult = await invertPdfColors(files[0], formValues);
      }
      // Flatten PDF
      else if (tool.id === 'flatten-pdf') {
        outputResult = await flattenPdf(files[0]);
      }
      // Repair PDF
      else if (tool.id === 'repair-pdf') {
        outputResult = await repairPdf(files[0]);
      }
      // OCR Text Recognition
      else if (tool.id === 'ocr-pdf') {
        outputResult = await performOcr(files[0], {
          ocrLanguage: formValues.ocrLanguage || 'eng',
          ocrOutput: formValues.ocrOutput || 'text',
          onProgress: (p) => {
            setProgressStatus(p.status);
            setProgressPercent(p.progress);
          }
        });
      }

      setProgressPercent(100);
      setResult(outputResult);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });

      if (onAddHistory) {
        onAddHistory({
          toolId: tool.id,
          toolTitle: tool.title,
          filename: outputResult?.filename || 'processed_file.pdf',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while processing the PDF file.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !result.data) return;
    const url = URL.createObjectURL(result.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename || 'freepdf_output.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWorkbenchComplete = (wbResult) => {
    setResult(wbResult);
    if (onAddHistory) {
      onAddHistory({
        toolId: tool.id,
        toolTitle: tool.title,
        filename: wbResult.filename || 'processed_document.pdf',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const isWorkbench = tool.type === 'workbench';

  // Check if result is a PDF Blob that can be rendered in PdfDocumentPreview
  const isResultPdf = result?.data && (result.filename?.endsWith('.pdf') || result.data.type === 'application/pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full ${isWorkbench || result ? 'max-w-6xl max-h-[92vh]' : 'max-w-3xl max-h-[90vh]'} bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center font-bold text-xs shadow-md`}>
              PDF
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{tool.title}</h2>
              <p className="text-xs text-slate-400">{tool.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* If Result Ready, show Download Screen + LIVE PREVIEW */}
          {result ? (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg border border-emerald-500/30 flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Your File is Ready!</h3>
                    <p className="text-xs text-slate-400">
                      Generated: <span className="text-brand-300 font-semibold">{result.filename}</span>
                    </p>
                    {result.stats && (
                      <p className="text-xs text-emerald-400 mt-0.5">
                        Reduced by <span className="font-bold">{result.stats.percentage}%</span> (Saved {formatFileSize(result.stats.savings)})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => { setResult(null); setFiles([]); setActiveTab('config'); }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                  >
                    Process Another File
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-emerald transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              {/* Live Preview of the Result Document */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Eye className="w-4 h-4 text-brand-400" />
                    <span>Live Result Preview</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Interactive preview before downloading</span>
                </div>

                {isResultPdf ? (
                  <PdfDocumentPreview fileOrBlob={result.data} className="w-full shadow-xl" />
                ) : result.filename?.match(/\.(png|jpg|jpeg|webp|gif)$/i) && result.data ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-center">
                    <img
                      src={URL.createObjectURL(result.data)}
                      alt="Result Preview"
                      className="max-h-96 object-contain rounded-lg shadow-lg"
                    />
                  </div>
                ) : result.textContent ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 max-h-80 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap">
                    {result.textContent}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                    ZIP archive ready for download. Contains all extracted document assets.
                  </div>
                )}
              </div>
            </div>
          ) : isWorkbench ? (
            /* Render Specialized Interactive Workbench */
            <div>
              {files.length === 0 && tool.workbenchId !== 'workflow' && tool.workbenchId !== 'compare' ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-xl p-10 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl bg-slate-950/40 hover:bg-slate-900/60 cursor-pointer text-center transition group space-y-3"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200">
                      Drop your PDF file here, or <span className="text-brand-400 underline">browse</span>
                    </h4>
                    <p className="text-xs text-slate-500">Supports PDF documents of any size</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={tool.accept || '.pdf'}
                      multiple={tool.multiple}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  {tool.workbenchId === 'organize' && (
                    <OrganizeWorkbench files={files} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'sign' && (
                    <SignWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'redact' && (
                    <RedactWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'watermark' && (
                    <WatermarkWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'compare' && (
                    <CompareWorkbench files={files} onClose={onClose} />
                  )}
                  {(tool.workbenchId === 'full-editor' || tool.workbenchId === 'annotate') && (
                    <FullPdfEditorWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'workflow' && (
                    <WorkflowWorkbench files={files} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'ocr' && (
                    <OcrWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'split' && (
                    <SplitWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'remove-pages' && (
                    <RemovePagesWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'ai-assistant' && (
                    <AiAssistantWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                  {tool.workbenchId === 'protect' && (
                    <ProtectWorkbench file={files[0]} onComplete={handleWorkbenchComplete} onClose={onClose} />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Standard Tool Execution Form with INPUT DOCUMENT PREVIEW */
            <div className="space-y-5">
              {/* File Upload Zone */}
              {tool.accept !== null && (
                <div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl bg-slate-950/40 hover:bg-slate-900/60 cursor-pointer text-center transition group space-y-2"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-200">
                      Drag &amp; drop files here, or <span className="text-brand-400 underline">browse</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Accepted formats: {tool.accept || 'PDF'}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={tool.accept || '*'}
                      multiple={tool.multiple}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Uploaded Files List with Interactive Preview Button */}
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
                          <div className="flex items-center space-x-2.5 truncate max-w-sm">
                            <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
                            <span className="text-slate-200 font-medium truncate">{f.name}</span>
                            <span className="text-slate-500 text-[11px]">({formatFileSize(f.size)})</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {f.type === 'application/pdf' || f.name.endsWith('.pdf') ? (
                              <button
                                onClick={() => {
                                  setPreviewFile(f);
                                  setActiveTab('preview');
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded-lg border border-brand-500/30 transition text-[11px]"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview Document</span>
                              </button>
                            ) : null}

                            <button
                              onClick={() => removeFile(idx)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Switcher (Options vs Document Preview) when PDF is uploaded */}
              {files.length > 0 && (files[0].type === 'application/pdf' || files[0].name?.endsWith('.pdf')) && (
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'config'
                        ? 'bg-brand-600 text-white shadow'
                        : 'text-slate-400 hover:text-white bg-slate-800/60'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Tool Options</span>
                  </button>

                  <button
                    onClick={() => {
                      setPreviewFile(files[0]);
                      setActiveTab('preview');
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'preview'
                        ? 'bg-brand-600 text-white shadow'
                        : 'text-slate-400 hover:text-white bg-slate-800/60'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Document Preview ({files.length} {files.length === 1 ? 'file' : 'files'})</span>
                  </button>
                </div>
              )}

              {/* Tab Content: Preview Tab */}
              {activeTab === 'preview' && (previewFile || files[0]) ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-slate-300 font-medium">
                      Previewing: <span className="text-brand-300 font-bold">{previewFile?.name || files[0]?.name}</span>
                    </span>
                    {files.length > 1 && (
                      <select
                        onChange={(e) => setPreviewFile(files[Number(e.target.value)])}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200"
                      >
                        {files.map((f, i) => (
                          <option key={i} value={i}>{f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <PdfDocumentPreview fileOrBlob={previewFile || files[0]} className="w-full" />
                </div>
              ) : (
                /* Tab Content: Configuration Options */
                <div className="space-y-4">
                  {/* Dynamic Option Fields */}
                  {tool.fields && tool.fields.length > 0 && (
                    <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-4">
                      <h4 className="text-xs font-semibold text-slate-300">Tool Configuration</h4>

                      <div className="space-y-3">
                        {tool.fields.map(field => {
                          if (field.showIf && !field.showIf(formValues)) return null;

                          const val = formValues[field.id] !== undefined ? formValues[field.id] : getInitialValue(field);

                          if (field.type === 'info') {
                            return (
                              <div key={field.id} className="p-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded-lg text-xs text-indigo-300">
                                {field.text}
                              </div>
                            );
                          }

                          if (field.type === 'select') {
                            return (
                              <div key={field.id}>
                                <label className="text-xs text-slate-300 font-medium block mb-1">{field.label}</label>
                                <select
                                  value={val}
                                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                                >
                                  {field.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          }

                          if (field.type === 'checkbox') {
                            return (
                              <label key={field.id} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!val}
                                  onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                                  className="w-4 h-4 rounded text-brand-500 bg-slate-800 border-slate-700 focus:ring-brand-400"
                                />
                                <span className="text-xs text-slate-300 font-medium">{field.label}</span>
                              </label>
                            );
                          }

                          return (
                            <div key={field.id}>
                              <label className="text-xs text-slate-300 font-medium block mb-1">{field.label}</label>
                              <input
                                type={field.type}
                                value={val}
                                placeholder={field.placeholder || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress & Error Displays */}
              {processing && (
                <div className="p-4 bg-brand-950/30 border border-brand-500/20 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-brand-300 font-medium">
                    <span>{progressStatus || 'Processing PDF...'}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Action */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
                  Cancel
                </button>
                <button
                  onClick={executeStandardTool}
                  disabled={processing}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute {tool.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
