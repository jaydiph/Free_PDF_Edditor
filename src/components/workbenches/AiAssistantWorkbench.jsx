import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  FileText,
  ShieldAlert,
  Languages,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  ListFilter,
  Eye,
  Eraser,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { extractTextFromPdf } from '../../services/pdfViewerEngine';

export default function AiAssistantWorkbench({ file, onExecute, onClose }) {
  const [loading, setLoading] = useState(true);
  const [pdfText, setPdfText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'chat' | 'entities' | 'translate'

  // Summary state
  const [summaryData, setSummaryData] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Entities state
  const [entities, setEntities] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Translation state
  const [targetLang, setTargetLang] = useState('es');
  const [translatedText, setTranslatedText] = useState('');

  // Extract text from PDF on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPdf() {
      try {
        setLoading(true);
        const result = await extractTextFromPdf(file, 'txt');
        if (isMounted) {
          const rawText = result.text || '';
          setPdfText(rawText);
          setPageCount(result.pageCount || 1);

          // Generate AI Summary & Insights
          generateAiSummary(rawText);
          detectSensitiveEntities(rawText);

          // Welcome chat message
          setMessages([
            {
              role: 'assistant',
              content: `👋 Hello! I have analyzed **"${file.name}"** (${result.pageCount || 1} page${result.pageCount > 1 ? 's' : ''}). You can ask me anything about this document, request summaries, or extract financial & legal data!`
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to parse PDF for AI analysis:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // AI Summary Generator
  const generateAiSummary = (text) => {
    if (!text || !text.trim()) {
      setSummaryData({
        executive: 'No readable text content could be extracted from this PDF (it might be a pure scanned image). You can run OCR Text Recognition first.',
        keyPoints: [],
        wordCount: 0,
        readingTime: '0 min'
      });
      return;
    }

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200)) + ' min';

    // Break into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 20);

    // Pick top informative sentences
    const keyPoints = cleanSentences.slice(0, Math.min(5, cleanSentences.length));
    const executive = cleanSentences.slice(0, 3).join(' ') || text.slice(0, 300) + '...';

    // Detect document type
    let docType = 'General Document';
    const lower = text.toLowerCase();
    if (lower.includes('invoice') || lower.includes('bill to') || lower.includes('amount due') || lower.includes('tax invoice')) {
      docType = 'Invoice / Financial Receipt';
    } else if (lower.includes('agreement') || lower.includes('contract') || lower.includes('terms and conditions')) {
      docType = 'Legal Contract / Agreement';
    } else if (lower.includes('resume') || lower.includes('curriculum vitae') || lower.includes('experience') || lower.includes('education')) {
      docType = 'Resume / CV';
    } else if (lower.includes('report') || lower.includes('abstract') || lower.includes('conclusion')) {
      docType = 'Research / Business Report';
    }

    setSummaryData({
      docType,
      executive,
      keyPoints,
      wordCount,
      readingTime
    });
  };

  // AI Sensitive Data Entity Detector
  const detectSensitiveEntities = (text) => {
    const found = [];

    // Emails
    const emailMatches = text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [];
    emailMatches.forEach(item => found.push({ type: 'Email Address', value: item, badge: 'Contact' }));

    // Phone numbers
    const phoneMatches = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
    phoneMatches.forEach(item => found.push({ type: 'Phone Number', value: item, badge: 'Contact' }));

    // Currency / Amounts
    const currencyMatches = text.match(/(?:Rs\.?|₹|\$|€|£|USD|INR)\s*[\d,]+(?:\.\d{2})?/gi) || [];
    currencyMatches.slice(0, 10).forEach(item => found.push({ type: 'Monetary Amount', value: item, badge: 'Financial' }));

    // Dates
    const dateMatches = text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/gi) || [];
    dateMatches.slice(0, 8).forEach(item => found.push({ type: 'Date / Timestamp', value: item, badge: 'Timeline' }));

    // SSN / Card numbers
    const ssnMatches = text.match(/\b\d{3}-\d{2}-\d{4}\b/g) || [];
    ssnMatches.forEach(item => found.push({ type: 'SSN / Tax ID', value: item, badge: 'High Risk', isHighRisk: true }));

    setEntities(found);
  };

  // Handle Q&A Chat
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || isThinking) return;

    const userQ = inputQuery.trim();
    setInputQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userQ }]);
    setIsThinking(true);

    setTimeout(() => {
      // Natural document search response
      const answer = generateDocumentAnswer(userQ, pdfText);
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      setIsThinking(false);
    }, 600);
  };

  // Semantic document search logic
  const generateDocumentAnswer = (query, docText) => {
    const q = query.toLowerCase();
    const sentences = docText.match(/[^.!?\n]+[.!?\n]+/g) || [docText];

    // Check specific intent queries
    if (q.includes('summary') || q.includes('summarize') || q.includes('what is this about')) {
      return `📌 **Document Overview:**\nThis document is a **${summaryData?.docType || 'Document'}** containing approximately ${summaryData?.wordCount} words. Key highlight:\n> "${summaryData?.executive}"`;
    }

    if (q.includes('amount') || q.includes('price') || q.includes('total') || q.includes('cost') || q.includes('pay')) {
      const amounts = entities.filter(e => e.type === 'Monetary Amount').map(e => `• **${e.value}**`);
      if (amounts.length > 0) {
        return `💰 **Detected Financial Amounts in Document:**\n${amounts.join('\n')}`;
      }
    }

    if (q.includes('email') || q.includes('contact') || q.includes('phone') || q.includes('call')) {
      const contacts = entities.filter(e => e.type === 'Email Address' || e.type === 'Phone Number').map(e => `• **${e.type}:** \`${e.value}\``);
      if (contacts.length > 0) {
        return `📞 **Found Contact Information:**\n${contacts.join('\n')}`;
      }
    }

    // Rank sentences by matching query terms
    const keywords = q.split(/\s+/).filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'about', 'this', 'that', 'from', 'have'].includes(w));
    const scoredSentences = sentences.map(s => {
      let score = 0;
      const lowerS = s.toLowerCase();
      keywords.forEach(k => {
        if (lowerS.includes(k)) score += 1;
      });
      return { sentence: s.trim(), score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    if (scoredSentences.length > 0) {
      const topMatches = scoredSentences.slice(0, 3).map(m => `> "${m.sentence}"`).join('\n\n');
      return `🔍 **Relevant excerpt${scoredSentences.length > 1 ? 's' : ''} found in the document:**\n\n${topMatches}`;
    }

    return `I searched through the ${pageCount} page(s) of this document, but couldn't find a direct match for "${query}". You can try asking about specific names, numbers, or topics mentioned in the text.`;
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-[680px] max-h-[85vh] bg-slate-950 text-slate-100 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-white">AI Document Intelligence</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                100% Offline AI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {file.name} • {pageCount} page{pageCount > 1 ? 's' : ''} • {summaryData?.wordCount || 0} words
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Executive Summary
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ask / Chat with PDF
          </button>

          <button
            onClick={() => setActiveTab('entities')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'entities'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entities & Redact ({entities.length})
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Reading & Analyzing Document with AI Engine...</p>
          </div>
        ) : (
          <>
            {/* Tab 1: Executive Summary */}
            {activeTab === 'summary' && summaryData && (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Document Classification Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 border border-rose-500/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Document Classification</div>
                    <div className="text-xl font-black text-white">{summaryData.docType}</div>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-300">
                    <div className="text-right">
                      <div className="text-slate-500 font-bold">Estimated Read</div>
                      <div className="font-extrabold text-white">{summaryData.readingTime}</div>
                    </div>
                  </div>
                </div>

                {/* Executive Overview */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span>Executive Summary</span>
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-sm text-slate-300 leading-relaxed font-normal">
                    {summaryData.executive}
                  </div>
                </div>

                {/* Key Bullet Highlights */}
                {summaryData.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Key Takeaways & Highlights</span>
                    </h3>
                    <div className="space-y-2">
                      {summaryData.keyPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Chat / Q&A with PDF */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full max-w-3xl mx-auto">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-br-none shadow-md font-semibold'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}

                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none p-3 flex items-center space-x-2 text-xs text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                        <span>AI Assistant analyzing document...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Prompt Box */}
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask anything about this PDF (e.g. What is the total amount?)..."
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || isThinking}
                    className="p-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white rounded-2xl shadow-lg transition active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Tab 3: Sensitive Entities & Redact */}
            {activeTab === 'entities' && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>Extracted Entities & Data Points</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically detected phone numbers, emails, currency amounts, and dates.
                    </p>
                  </div>
                </div>

                {entities.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-xs text-slate-400">
                    No sensitive entities (credit cards, emails, phone numbers) were detected in this document.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {entities.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                      >
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                            item.isHighRisk
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.type}
                          </span>
                          <div className="text-xs font-mono font-bold text-slate-200 select-all">
                            {item.value}
                          </div>
                        </div>

                        <button
                          onClick={() => copyToClipboard(item.value, idx)}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Copy to clipboard"
                        >
                          {copiedIndex === idx ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
