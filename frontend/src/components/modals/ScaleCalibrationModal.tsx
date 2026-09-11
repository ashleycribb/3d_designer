import React, { useState } from 'react';
import { X, Ruler, Check, Info } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { api } from '../../api/client';
import { parseImperialToFeet } from '../../utils/imperial';

export const ScaleCalibrationModal: React.FC = () => {
  const {
    activeProject,
    modalOpen,
    setModalOpen,
    refreshProjectData,
    setActiveTool
  } = useProject();

  const [ptAX, setPtAX] = useState('100');
  const [ptAY, setPtAY] = useState('80');
  const [ptBX, setPtBX] = useState('700');
  const [ptBY, setPtBY] = useState('80');
  const [knownDistanceStr, setKnownDistanceStr] = useState("60'-0\"");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<string | null>(null);

  if (!modalOpen.scaleCalibration) return null;

  const handleApplyScale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const feet = parseImperialToFeet(knownDistanceStr);
    if (!feet || feet <= 0) {
      alert("Please enter a valid real-world distance (e.g. 24'-0\", 20 ft, 15.5)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.setScale(activeProject.id, {
        point_a: { x: parseFloat(ptAX), y: parseFloat(ptAY) },
        point_b: { x: parseFloat(ptBX), y: parseFloat(ptBY) },
        known_distance: knownDistanceStr
      });

      setCalibrationResult(res.formatted_scale);
      await refreshProjectData();
      setTimeout(() => {
        setModalOpen(m => ({ ...m, scaleCalibration: false }));
        setCalibrationResult(null);
      }, 1200);
    } catch (err: any) {
      console.error('Scale calibration failed', err);
      alert(err.message || 'Scale calibration error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="flex items-center">
            <Ruler className="text-amber-400 mr-2" size={20} />
            <h3 className="text-base font-bold text-slate-100">Set Drawing Scale (Calibration)</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setModalOpen(m => ({ ...m, scaleCalibration: false }))}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleApplyScale} className="modal-body">
          <div className="scale-diagram-card">
            <div className="diagram-text">
              <span className="font-mono text-amber-300">Point A</span>
              <span className="diagram-line">───────────────</span>
              <span className="font-mono text-amber-300">Point B</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Select two reference points along a known architectural dimension line or wall length.
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Point A (Drawing X, Y px)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="form-input"
                  value={ptAX}
                  onChange={(e) => setPtAX(e.target.value)}
                  placeholder="X px"
                  required
                />
                <input
                  type="number"
                  className="form-input"
                  value={ptAY}
                  onChange={(e) => setPtAY(e.target.value)}
                  placeholder="Y px"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Point B (Drawing X, Y px)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="form-input"
                  value={ptBX}
                  onChange={(e) => setPtBX(e.target.value)}
                  placeholder="X px"
                  required
                />
                <input
                  type="number"
                  className="form-input"
                  value={ptBY}
                  onChange={(e) => setPtBY(e.target.value)}
                  placeholder="Y px"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Known Real-World Distance * (Imperial Units)</label>
            <input
              className="form-input font-mono font-bold text-amber-300 text-lg"
              required
              value={knownDistanceStr}
              onChange={(e) => setKnownDistanceStr(e.target.value)}
              placeholder="e.g. 24'-0&quot; or 18' 6&quot; or 20"
            />
            <span className="text-xs text-slate-400 mt-1">
              Supports standard architectural formats: <code>24'-0"</code>, <code>15' 6"</code>, <code>20 ft</code>, or decimal feet.
            </span>
          </div>

          {calibrationResult && (
            <div className="calibration-success-banner">
              <Check size={16} className="text-emerald-400 mr-2" />
              <span>{calibrationResult}</span>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModalOpen(m => ({ ...m, scaleCalibration: false }));
                setActiveTool('CALIBRATE_SCALE');
              }}
            >
              Pick Points on Canvas
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Calculating...' : 'APPLY SCALE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
