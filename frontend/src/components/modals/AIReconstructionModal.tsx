import React, { useState, useEffect } from 'react';
import { Sparkles, X, Key, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const AIReconstructionModal: React.FC = () => {
  const { modalOpen, setModalOpen, activeProject, batchSetWalls, refreshProjectData } = useProject();
  const [confidence, setConfidence] = useState<number>(0.8);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    setApiKey(savedKey);
  }, []);

  if (!modalOpen.aiReconstruction) return null;

  const handleClose = () => {
    setModalOpen(m => ({ ...m, aiReconstruction: false }));
    setResult(null);
    setErrorMsg(null);
  };

  const handleSaveKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
  };

  const handleRunReconstruction = async () => {
    if (!activeProject) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const keyParam = apiKey.trim() ? `&api_key=${encodeURIComponent(apiKey.trim())}` : '';
      const res = await fetch(`/api/projects/${activeProject.id}/ai-reconstruct?confidence_threshold=${confidence}${keyParam}`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Reconstruction failed' }));
        throw new Error(errData.detail || 'Reconstruction failed');
      }
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      console.error('AI Reconstruction failed', err);
      setErrorMsg(err.message || 'AI Reconstruction failed. Make sure a floorplan PDF drawing is uploaded first.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGeometry = async () => {
    if (result?.walls && result.walls.length > 0) {
      await batchSetWalls(result.walls, true);
      await refreshProjectData();
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
            <Sparkles size={16} />
            <span>Google AI Studio • Blueprint Floorplan Extruder</span>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Uses Google AI Studio's multimodal Gemini vision intelligence to automatically analyze uploaded architectural blueprints, extracting structural wall centerlines, room boundaries, and HVAC symbols.
          </p>

          {/* Gemini API Key input */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Key size={13} className="text-amber-400" />
                <span>Google AI Studio API Key (Gemini)</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                placeholder="AIzaSy... (optional, falls back to local vector analysis)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onBlur={handleSaveKey}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Key is saved locally in your browser. No university workstation installation required.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Detection Sensitivity</span>
              <span className="font-mono text-cyan-300">{(confidence * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.05}
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>✓ AI Analysis Complete</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 uppercase">
                  {result.ai_engine || 'Gemini'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-300">
                <div>Reconstructed Walls: <span className="text-cyan-300 font-bold">{result.reconstructed_walls_count}</span></div>
                <div>Detected Rooms: <span className="text-blue-300 font-bold">{result.reconstructed_rooms_count}</span></div>
                {result.equipment_candidates_count > 0 && (
                  <div>HVAC Symbols: <span className="text-purple-300 font-bold">{result.equipment_candidates_count}</span></div>
                )}
              </div>
              {result.notice && (
                <p className="text-[10px] text-slate-500 mt-1 font-sans">{result.notice}</p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end gap-2 text-xs">
          <button onClick={handleClose} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          {!result ? (
            <button
              onClick={handleRunReconstruction}
              disabled={loading}
              className="px-4 py-1.5 rounded bg-cyan-600 text-white font-bold hover:bg-cyan-500 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles size={13} />
              <span>{loading ? 'Analyzing with AI...' : 'Run Reconstruction'}</span>
            </button>
          ) : (
            <button
              onClick={handleApplyGeometry}
              className="px-4 py-1.5 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500 flex items-center gap-1.5"
            >
              <Check size={13} />
              <span>Apply 3D Geometry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
