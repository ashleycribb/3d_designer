import React, { useState } from 'react';
import { X, FileText, Upload, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { api } from '../../api/client';
import { formatFeetToImperial, parseImperialToFeet } from '../../utils/imperial';

export const CrossSectionModal: React.FC = () => {
  const {
    activeProject,
    modalOpen,
    setModalOpen,
    updateVerticalConfig,
    verticalConfig
  } = useProject();

  const [sectionFile, setSectionFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [useSampleCrossSection, setUseSampleCrossSection] = useState(false);
  const [detectedValues, setDetectedValues] = useState<any | null>(null);

  // Editable values
  const [wallHeight, setWallHeight] = useState("10'-0\"");
  const [wallThickness, setWallThickness] = useState("0'-8\"");
  const [ceilingHeight, setCeilingHeight] = useState("9'-0\"");
  const [plenumHeight, setPlenumHeight] = useState("3'-0\"");
  const [floorThickness, setFloorThickness] = useState("0'-6\"");

  if (!modalOpen.crossSection) return null;

  const handleAnalyze = async () => {
    if (!activeProject) return;
    setIsAnalyzing(true);
    try {
      // 1. Upload if file provided
      if (sectionFile) {
        await api.uploadDrawing(activeProject.id, sectionFile, 'wall_section');
      } else if (useSampleCrossSection) {
        const sampleBlob = await fetch('/api/sample-files/cross-section').then(r => r.blob());
        const sampleFile = new File([sampleBlob], 'sample_cross_section.pdf', { type: 'application/pdf' });
        await api.uploadDrawing(activeProject.id, sampleFile, 'wall_section');
      }

      // 2. Analyze
      const analysis = await api.analyzeCrossSection(activeProject.id);
      setDetectedValues(analysis);

      // Populate editable fields with detected values
      if (analysis.exterior_wall_height) setWallHeight(analysis.exterior_wall_height.formatted);
      if (analysis.exterior_wall_thickness) setWallThickness(analysis.exterior_wall_thickness.formatted);
      if (analysis.ceiling_height) setCeilingHeight(analysis.ceiling_height.formatted);
      if (analysis.plenum_height) setPlenumHeight(analysis.plenum_height.formatted);
      if (analysis.floor_thickness) setFloorThickness(analysis.floor_thickness.formatted);
    } catch (err: any) {
      console.error('Cross section analysis failed', err);
      alert(err.message || 'Error parsing cross section document.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptAll = async () => {
    try {
      await updateVerticalConfig({
        exterior_wall_height: parseImperialToFeet(wallHeight) ?? 10.0,
        exterior_wall_thickness: parseImperialToFeet(wallThickness) ?? 0.6667,
        ceiling_height: parseImperialToFeet(ceilingHeight) ?? 9.0,
        plenum_height: parseImperialToFeet(plenumHeight) ?? 3.0,
        floor_thickness: parseImperialToFeet(floorThickness) ?? 0.5,
      });
      alert('Vertical dimensions updated from cross-section analysis.');
      setModalOpen(m => ({ ...m, crossSection: false }));
    } catch (err) {
      console.error('Failed to apply vertical dimensions', err);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="flex items-center">
            <FileText className="text-blue-400 mr-2" size={20} />
            <h3 className="text-base font-bold text-slate-100">Upload & Analyze Cross-Section PDF</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setModalOpen(m => ({ ...m, crossSection: false }))}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-xs text-slate-400 mb-2">
            Upload an architectural wall or ceiling cross-section drawing. The parser will detect vertical dimensions (wall thickness, ceiling height, plenum height) and present them for your review.
          </p>

          <div className="upload-box-group">
            <div className="file-dropzone file-dropzone-sm">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSectionFile(e.target.files[0]);
                    setUseSampleCrossSection(false);
                  }
                }}
                className="file-input-hidden"
                id="cross-section-upload"
              />
              <label htmlFor="cross-section-upload" className="dropzone-label">
                <Upload size={18} className="text-blue-400 mr-2" />
                <span className="text-xs text-slate-200">
                  {sectionFile ? sectionFile.name : 'Select Wall/Ceiling Cross-Section Document'}
                </span>
              </label>
            </div>

            <div className="sample-checkbox-row">
              <input
                type="checkbox"
                id="sample-cs-check"
                checked={useSampleCrossSection}
                onChange={(e) => {
                  setUseSampleCrossSection(e.target.checked);
                  if (e.target.checked) setSectionFile(null);
                }}
              />
              <label htmlFor="sample-cs-check" className="text-xs text-blue-300 font-medium cursor-pointer">
                Use built-in architectural cross-section test document
              </label>
            </div>

            <button
              className="btn-primary w-full mt-2"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!sectionFile && !useSampleCrossSection)}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center">
                  <RefreshCw size={15} className="animate-spin mr-2" />
                  Analyzing Cross-Section PDF...
                </span>
              ) : (
                'Analyze Document'
              )}
            </button>
          </div>

          {detectedValues && (
            <div className="detected-section-box">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-2">
                Detected Vertical Values (Human-in-the-Loop Review)
              </div>

              <div className="detected-row">
                <span className="text-xs text-slate-300">Exterior Wall Height</span>
                <input
                  className="detected-input font-mono"
                  value={wallHeight}
                  onChange={(e) => setWallHeight(e.target.value)}
                />
                <span className="confidence-pill">
                  {detectedValues.exterior_wall_height ? `${(detectedValues.exterior_wall_height.confidence * 100).toFixed(0)}%` : 'Manual'}
                </span>
              </div>

              <div className="detected-row">
                <span className="text-xs text-slate-300">Exterior Wall Thickness</span>
                <input
                  className="detected-input font-mono"
                  value={wallThickness}
                  onChange={(e) => setWallThickness(e.target.value)}
                />
                <span className="confidence-pill">
                  {detectedValues.exterior_wall_thickness ? `${(detectedValues.exterior_wall_thickness.confidence * 100).toFixed(0)}%` : 'Manual'}
                </span>
              </div>

              <div className="detected-row">
                <span className="text-xs text-slate-300">Drop Ceiling Height AFF</span>
                <input
                  className="detected-input font-mono text-emerald-300"
                  value={ceilingHeight}
                  onChange={(e) => setCeilingHeight(e.target.value)}
                />
                <span className="confidence-pill">
                  {detectedValues.ceiling_height ? `${(detectedValues.ceiling_height.confidence * 100).toFixed(0)}%` : 'Manual'}
                </span>
              </div>

              <div className="detected-row">
                <span className="text-xs text-slate-300">Plenum Cavity Height</span>
                <input
                  className="detected-input font-mono text-blue-300"
                  value={plenumHeight}
                  onChange={(e) => setPlenumHeight(e.target.value)}
                />
                <span className="confidence-pill">
                  {detectedValues.plenum_height ? `${(detectedValues.plenum_height.confidence * 100).toFixed(0)}%` : 'Manual'}
                </span>
              </div>

              <div className="detected-row">
                <span className="text-xs text-slate-300">Floor Slab Thickness</span>
                <input
                  className="detected-input font-mono"
                  value={floorThickness}
                  onChange={(e) => setFloorThickness(e.target.value)}
                />
                <span className="confidence-pill">
                  {detectedValues.floor_thickness ? `${(detectedValues.floor_thickness.confidence * 100).toFixed(0)}%` : 'Manual'}
                </span>
              </div>

              {detectedValues.extracted_notes?.length > 0 && (
                <div className="text-xs text-slate-500 mt-2 italic">
                  Matched notes: "{detectedValues.extracted_notes.slice(0, 3).join(', ')}"
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(m => ({ ...m, crossSection: false }))}
            >
              Close
            </button>
            {detectedValues && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleAcceptAll}
              >
                Accept & Update Building Model
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
