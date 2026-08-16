import React, { useState } from 'react';
import {
  mergePdfs,
  addWatermark,
  addPageNumbers,
  compressPdf,
  sanitizePdf,
  protectPdf,
  rotatePdf
} from '../../services/pdfEngine';
import {
  Workflow,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  RefreshCw,
  Download,
  ArrowDown,
  Layers,
  Stamp,
  Hash,
  Minimize2,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

const AVAILABLE_STEPS = [
  { id: 'merge', name: 'Merge Files', icon: Layers, desc: 'Combine multiple inputs' },
  { id: 'watermark', name: 'Add Watermark', icon: Stamp, desc: 'Overlay text or stamp' },
  { id: 'pagenumbers', name: 'Add Page Numbers', icon: Hash, desc: 'Insert footer numbering' },
  { id: 'rotate', name: 'Rotate Pages', icon: RotateCw, desc: 'Rotate 90° clockwise' },
  { id: 'compress', name: 'Compress & Optimize', icon: Minimize2, desc: 'Reduce file size' },
  { id: 'sanitize', name: 'Sanitize & Purge Metadata', icon: ShieldCheck, desc: 'Remove sensitive tags' },
];

export default function WorkflowWorkbench({ files = [], onComplete, onClose }) {
  const [pipeline, setPipeline] = useState([
    { id: 1, type: 'merge', config: {} },
    { id: 2, type: 'watermark', config: { text: 'CONFIDENTIAL', opacity: 0.2, angle: 45, color: '#ef4444' } },
    { id: 3, type: 'pagenumbers', config: { position: 'bottom-center', format: 'Page {n} of {total}', fontSize: 10 } },
    { id: 4, type: 'compress', config: { compressionLevel: 'medium' } }
  ]);

  const [running, setRunning] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [stepLogs, setStepLogs] = useState([]);

  const addStep = (type) => {
    let defaultConfig = {};
    if (type === 'watermark') defaultConfig = { text: 'CONFIDENTIAL', opacity: 0.2, angle: 45, color: '#ef4444' };
    if (type === 'pagenumbers') defaultConfig = { position: 'bottom-center', format: 'Page {n} of {total}', fontSize: 10 };
    if (type === 'compress') defaultConfig = { compressionLevel: 'medium' };
    if (type === 'rotate') defaultConfig = { angle: '90', pageSelection: 'all' };

    setPipeline(prev => [...prev, { id: Date.now(), type, config: defaultConfig }]);
  };

  const removeStep = (id) => {
    setPipeline(prev => prev.filter(s => s.id !== id));
  };

  const updateStepConfig = (id, key, val) => {
    setPipeline(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, config: { ...s.config, [key]: val } };
      }
      return s;
    }));
  };

  const executePipeline = async () => {
    if (files.length === 0) {
      alert('Please upload PDF files first.');
      return;
    }

    try {
      setRunning(true);
      setStepLogs([]);
      let currentFile = files[0];
      let intermediateBlob = null;

      for (let i = 0; i < pipeline.length; i++) {
        setCurrentStepIdx(i);
        const step = pipeline[i];
        const stepDef = AVAILABLE_STEPS.find(s => s.id === step.type);
        setStepLogs(prev => [...prev, `Executing Step ${i + 1}: ${stepDef?.name}...`]);

        let stepResult;
        if (step.type === 'merge') {
          stepResult = await mergePdfs(files);
        } else if (step.type === 'watermark') {
          const target = intermediateBlob || currentFile;
          stepResult = await addWatermark(target, step.config);
        } else if (step.type === 'pagenumbers') {
          const target = intermediateBlob || currentFile;
          stepResult = await addPageNumbers(target, step.config);
        } else if (step.type === 'rotate') {
          const target = intermediateBlob || currentFile;
          stepResult = await rotatePdf(target, step.config);
        } else if (step.type === 'compress') {
          const target = intermediateBlob || currentFile;
          stepResult = await compressPdf(target, step.config);
        } else if (step.type === 'sanitize') {
          const target = intermediateBlob || currentFile;
          stepResult = await sanitizePdf(target, step.config || {});
        }

        if (stepResult && stepResult.data) {
          intermediateBlob = stepResult.data;
        }

        // Small pause for visual feedback
        await new Promise(r => setTimeout(r, 400));
      }

      setStepLogs(prev => [...prev, '✓ Pipeline execution completed successfully!']);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });

      onComplete({
        data: intermediateBlob,
        filename: 'pipeline_output.pdf'
      });
    } catch (err) {
      setStepLogs(prev => [...prev, `❌ Error: ${err.message}`]);
      alert('Pipeline execution failed: ' + err.message);
    } finally {
      setRunning(false);
      setCurrentStepIdx(-1);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-slate-900/60 rounded-xl border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-cyan-300 flex items-center space-x-2">
            <Workflow className="w-4 h-4 text-cyan-400" />
            <span>Automated Multi-Tool Pipeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Chain multiple PDF transformations together in sequence and execute in a single click.
          </p>
        </div>

        {/* Add Step Dropdown / Buttons */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1">+ Add Step:</span>
          {AVAILABLE_STEPS.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => addStep(s.id)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Pipeline Flow List */}
      <div className="flex-1 overflow-y-auto max-h-[50vh] p-2 space-y-3">
        {pipeline.map((step, idx) => {
          const stepDef = AVAILABLE_STEPS.find(s => s.id === step.type);
          const Icon = stepDef ? stepDef.icon : Workflow;
          const isCurrent = running && currentStepIdx === idx;
          const isDone = running && currentStepIdx > idx;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`relative p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCurrent
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-lg glow-brand'
                    : isDone
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600'
                }`}
              >
                {/* Step info */}
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 font-bold text-xs flex items-center justify-center shadow">
                    {idx + 1}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{stepDef?.name}</h4>
                    <p className="text-[11px] text-slate-400">{stepDef?.desc}</p>
                  </div>
                </div>

                {/* Inline Step Configuration */}
                <div className="flex items-center space-x-3 text-xs">
                  {step.type === 'watermark' && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={step.config.text || ''}
                        onChange={(e) => updateStepConfig(step.id, 'text', e.target.value)}
                        placeholder="Watermark text"
                        className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
                      />
                    </div>
                  )}

                  {step.type === 'pagenumbers' && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={step.config.position || 'bottom-center'}
                        onChange={(e) => updateStepConfig(step.id, 'position', e.target.value)}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
                      >
                        <option value="bottom-center">Bottom Center</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="top-right">Top Right</option>
                      </select>
                    </div>
                  )}

                  {step.type === 'compress' && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={step.config.compressionLevel || 'medium'}
                        onChange={(e) => updateStepConfig(step.id, 'compressionLevel', e.target.value)}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
                      >
                        <option value="low">Low (Fast)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => removeStep(step.id)}
                    disabled={pipeline.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 transition"
                    title="Remove Step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {idx < pipeline.length - 1 && (
                <div className="flex justify-center -my-1">
                  <ArrowDown className="w-4 h-4 text-cyan-500/60" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Log feed when running */}
      {stepLogs.length > 0 && (
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono max-h-24 overflow-y-auto space-y-1">
          {stepLogs.map((log, lIdx) => (
            <div key={lIdx} className={log.startsWith('✓') ? 'text-emerald-400' : (log.startsWith('❌') ? 'text-rose-400' : 'text-slate-300')}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <span className="text-xs text-slate-400">
          Steps Configured: <span className="text-cyan-400 font-bold">{pipeline.length}</span>
        </span>

        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={executePipeline}
            disabled={running || pipeline.length === 0}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg glow-brand disabled:opacity-50 transition"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Complete Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
