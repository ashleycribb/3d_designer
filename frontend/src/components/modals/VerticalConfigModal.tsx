import React, { useState, useEffect } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { formatFeetToImperial, parseImperialToFeet } from '../../utils/imperial';

export const VerticalConfigModal: React.FC = () => {
  const { modalOpen, setModalOpen, verticalConfig, updateVerticalConfig } = useProject();

  const [extHeight, setExtHeight] = useState("10'-0\"");
  const [intHeight, setIntHeight] = useState("9'-0\"");
  const [extThick, setExtThick] = useState("0'-8\"");
  const [intThick, setIntThick] = useState("0'-4 1/2\"");
  const [floorThick, setFloorThick] = useState("0'-6\"");
  const [ceilHeight, setCeilHeight] = useState("9'-0\"");
  const [ceilThick, setCeilThick] = useState("0'-1\"");
  const [plenumHeight, setPlenumHeight] = useState("3'-0\"");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (verticalConfig) {
      setExtHeight(formatFeetToImperial(verticalConfig.exterior_wall_height));
      setIntHeight(formatFeetToImperial(verticalConfig.interior_wall_height));
      setExtThick(formatFeetToImperial(verticalConfig.exterior_wall_thickness));
      setIntThick(formatFeetToImperial(verticalConfig.interior_wall_thickness));
      setFloorThick(formatFeetToImperial(verticalConfig.floor_thickness));
      setCeilHeight(formatFeetToImperial(verticalConfig.ceiling_height));
      setCeilThick(formatFeetToImperial(verticalConfig.ceiling_thickness));
      setPlenumHeight(formatFeetToImperial(verticalConfig.plenum_height));
    }
  }, [verticalConfig, modalOpen.verticalConfig]);

  if (!modalOpen.verticalConfig) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateVerticalConfig({
        exterior_wall_height: parseImperialToFeet(extHeight) ?? 10.0,
        interior_wall_height: parseImperialToFeet(intHeight) ?? 9.0,
        exterior_wall_thickness: parseImperialToFeet(extThick) ?? 0.6667,
        interior_wall_thickness: parseImperialToFeet(intThick) ?? 0.375,
        floor_thickness: parseImperialToFeet(floorThick) ?? 0.5,
        ceiling_height: parseImperialToFeet(ceilHeight) ?? 9.0,
        ceiling_thickness: parseImperialToFeet(ceilThick) ?? 0.0833,
        plenum_height: parseImperialToFeet(plenumHeight) ?? 3.0,
      });
      setModalOpen(m => ({ ...m, verticalConfig: false }));
    } catch (err) {
      console.error('Failed to update vertical parameters', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="flex items-center">
            <Sliders className="text-blue-400 mr-2" size={20} />
            <h3 className="text-base font-bold text-slate-100">Building Vertical Parameters</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setModalOpen(m => ({ ...m, verticalConfig: false }))}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <p className="text-xs text-slate-400 mb-2">
            Configure vertical extrusion parameters. Dimensions apply parametrically to 3D walls, ceiling grid, and plenum space.
          </p>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Exterior Wall Height</label>
              <input
                className="form-input font-mono"
                value={extHeight}
                onChange={(e) => setExtHeight(e.target.value)}
                placeholder="10'-0&quot;"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Interior Wall Height</label>
              <input
                className="form-input font-mono"
                value={intHeight}
                onChange={(e) => setIntHeight(e.target.value)}
                placeholder="9'-0&quot;"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Exterior Wall Thickness</label>
              <input
                className="form-input font-mono"
                value={extThick}
                onChange={(e) => setExtThick(e.target.value)}
                placeholder="8&quot;"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Interior Wall Thickness</label>
              <input
                className="form-input font-mono"
                value={intThick}
                onChange={(e) => setIntThick(e.target.value)}
                placeholder="4 1/2&quot;"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Drop Ceiling Height (AFF)</label>
              <input
                className="form-input font-mono text-emerald-300 font-bold"
                value={ceilHeight}
                onChange={(e) => setCeilHeight(e.target.value)}
                placeholder="9'-0&quot;"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Plenum Cavity Height</label>
              <input
                className="form-input font-mono text-blue-300 font-bold"
                value={plenumHeight}
                onChange={(e) => setPlenumHeight(e.target.value)}
                placeholder="3'-0&quot;"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Floor Slab Thickness</label>
              <input
                className="form-input font-mono"
                value={floorThick}
                onChange={(e) => setFloorThick(e.target.value)}
                placeholder="6&quot;"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Acoustical Ceiling Thickness</label>
              <input
                className="form-input font-mono"
                value={ceilThick}
                onChange={(e) => setCeilThick(e.target.value)}
                placeholder="1&quot;"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(m => ({ ...m, verticalConfig: false }))}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Updating 3D Model...' : 'Apply Dimensions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
