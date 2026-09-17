import React, { useState } from 'react';
import { Sparkles, X, Sliders, Check } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const AIReconstructionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { activeProject, batchSetWalls } = useProject();
  const [confidence, setConfidence] = useState<number>(0.8);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleRunReconstruction = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/ai-reconstruct?confidence_threshold=${confidence}`, { method: 'POST' });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      console.error('AI Reconstruction failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGeometry = async () => {
    if (result?.walls) {
      await batchSetWalls(result.walls, true);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
            <Sparkles size={16} />
            <span>AI Automated PDF Floorplan Reconstruction</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Run computer vision vector clustering and closed-loop polygonization to automatically reconstruct wall centerlines and room boundaries from uploaded PDF drawings.
          </p>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Confidence Threshold Filter</span>
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

          {result && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
              <div className="text-emerald-400 font-bold">✓ AI Analysis Complete</div>
              <div>Detected Walls: <span className="text-cyan-300 font-bold">{result.reconstructed_walls_count}</span></div>
              <div>Detected Rooms: <span className="text-blue-300 font-bold">{result.reconstructed_rooms_count}</span></div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end gap-2 text-xs">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          {!result ? (
            <button
              onClick={handleRunReconstruction}
              disabled={loading}
              className="px-4 py-1.5 rounded bg-cyan-600 text-white font-bold hover:bg-cyan-500 flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>{loading ? 'Reconstructing...' : 'Run Reconstruction'}</span>
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
