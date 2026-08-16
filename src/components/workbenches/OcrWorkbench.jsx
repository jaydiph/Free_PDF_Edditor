import React, { useState, useRef } from 'react';
import { OCR_LANGUAGES } from '../../data/languages';
import { performOcr } from '../../services/ocrEngine';
import {
  ScanText,
  Languages,
  Check,
  Plus,
  X,
  Search,
  Download,
  Copy,
  CheckCheck,
  RefreshCw,
  FileText,
  Sparkles,
  Upload,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function OcrWorkbench({ file, onComplete, onClose }) {
  const [selectedLangs, setSelectedLangs] = useState(['eng']);
  const [searchLang, setSearchLang] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');
  const [outputFormat, setOutputFormat] = useState('text'); // 'text' | 'searchable_pdf' | 'md' | 'json'

  const [processing, setProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState(file || null);

  const fileInputRef = useRef(null);

  const toggleLanguage = (code) => {
    setSelectedLangs(prev => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const filteredLanguages = OCR_LANGUAGES.filter(lang => {
    if (activeGroup !== 'All' && lang.group !== activeGroup) return false;
    if (searchLang.trim()) {
      const q = searchLang.toLowerCase();
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.native.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartOcr = async () => {
    if (!activeFile) {
      alert('Please upload a PDF or image file first.');
      return;
    }

    try {
      setProcessing(true);
      setExtractedText('');
      setConfidence(null);

      const langString = selectedLangs.join('+');

      const ocrResult = await performOcr(activeFile, {
        ocrLanguage: langString,
        ocrOutput: outputFormat === 'searchable_pdf' ? 'searchable_pdf' : 'text',
        onProgress: (p) => {
          setProgressStatus(p.status);
          setProgressPercent(p.progress);
        }
      });

      setExtractedText(ocrResult.text || '');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });

      if (onComplete) {
        onComplete(ocrResult);
      }
    } catch (err) {
      console.error(err);
      alert('OCR failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadOutput = () => {
    if (!extractedText && outputFormat !== 'searchable_pdf') return;

    let blob;
    let filename = 'ocr_extracted_text.txt';

    if (outputFormat === 'md') {
      blob = new Blob([extractedText], { type: 'text/markdown' });
      filename = 'ocr_extracted_text.md';
    } else if (outputFormat === 'json') {
      const jsonContent = JSON.stringify({
        text: extractedText,
        languages: selectedLangs,
        timestamp: new Date().toISOString()
      }, null, 2);
      blob = new Blob([jsonContent], { type: 'application/json' });
      filename = 'ocr_extracted_data.json';
    } else {
      blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* File Select if not yet uploaded */}
      {!activeFile && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-8 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl bg-slate-950/40 cursor-pointer text-center transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
            <Upload className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-200">
            Upload PDF document or Scanned Image for OCR
          </h4>
          <p className="text-[11px] text-slate-500">Supports PDF, PNG, JPG, WebP</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf, image/*"
            onChange={(e) => e.target.files[0] && setActiveFile(e.target.files[0])}
            className="hidden"
          />
        </div>
      )}

      {/* Main Multi-Language Selector Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Language Selection & Config */}
        <div className="lg:col-span-6 flex flex-col space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Languages className="w-4 h-4 text-brand-400" />
              <span>Select Languages ({selectedLangs.length} active)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Multi-language supported</span>
          </div>

          {/* Active Selected Language Chips */}
          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800 min-h-[38px] items-center">
            {selectedLangs.map(code => {
              const langObj = OCR_LANGUAGES.find(l => l.code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-brand-600/30 text-brand-300 border border-brand-500/40 rounded-md text-xs font-medium shadow-sm"
                >
                  <span>{langObj ? `${langObj.name} (${langObj.native})` : code}</span>
                  <button
                    onClick={() => toggleLanguage(code)}
                    disabled={selectedLangs.length <= 1}
                    className="hover:text-white disabled:opacity-30 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>

          {/* Language Group Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {['All', 'Popular', 'Indian', 'European', 'Asian & Other'].map(grp => (
              <button
                key={grp}
                onClick={() => setActiveGroup(grp)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition ${
                  activeGroup === grp
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchLang}
              onChange={(e) => setSearchLang(e.target.value)}
              placeholder="Search language by name or native script..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Language Grid List */}
          <div className="max-h-48 overflow-y-auto p-1 grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-slate-950/40 rounded-lg border border-slate-800/80">
            {filteredLanguages.map(l => {
              const isSelected = selectedLangs.includes(l.code);
              return (
                <button
                  key={l.code}
                  onClick={() => toggleLanguage(l.code)}
                  className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition border ${
                    isSelected
                      ? 'bg-brand-600/20 border-brand-500 text-white font-semibold'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="truncate pr-1">
                    <span className="block truncate text-[11px] leading-tight">{l.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{l.native}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Output Format selector */}
          <div className="pt-2 border-t border-slate-700/60">
            <label className="text-xs text-slate-300 font-medium block mb-1.5">Output Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setOutputFormat('text')}
                className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                  outputFormat === 'text' ? 'bg-brand-600 text-white border-brand-500 shadow' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Plain Text (.txt)
              </button>
              <button
                onClick={() => setOutputFormat('md')}
                className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                  outputFormat === 'md' ? 'bg-brand-600 text-white border-brand-500 shadow' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Markdown (.md)
              </button>
              <button
                onClick={() => setOutputFormat('searchable_pdf')}
                className={`py-1.5 text-xs font-medium rounded-lg border transition ${
                  outputFormat === 'searchable_pdf' ? 'bg-brand-600 text-white border-brand-500 shadow' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Searchable PDF
              </button>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartOcr}
            disabled={processing || !activeFile}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition mt-2"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{progressStatus || 'Running OCR...'} ({progressPercent}%)</span>
              </>
            ) : (
              <>
                <ScanText className="w-4 h-4" />
                <span>Recognize Text ({selectedLangs.join(', ')})</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: OCR Results & Live Text Editor */}
        <div className="lg:col-span-6 flex flex-col space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Extracted Text Result</span>
            </h3>

            {extractedText && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyText}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadOutput}
                  className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {processing && (
            <div className="space-y-1.5 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs text-violet-300 font-medium">
                <span>{progressStatus}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Result Textarea */}
          <div className="flex-1 min-h-[260px] flex flex-col">
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Extracted OCR text will appear here. You can edit, format, or copy it directly before saving..."
              className="w-full flex-1 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
        <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
          Close
        </button>
      </div>
    </div>
  );
}
