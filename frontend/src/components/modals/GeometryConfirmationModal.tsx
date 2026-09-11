import React from 'react';
import { X, CheckCircle2, AlertTriangle, Layers, DoorOpen, Maximize, Home } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const GeometryConfirmationModal: React.FC = () => {
  const {
    modalOpen,
    setModalOpen,
    detectedGeometryData,
    batchSetWalls,
    setViewMode
  } = useProject();

  if (!modalOpen.geometryConfirm || !detectedGeometryData) return null;

  const summary = detectedGeometryData.summary || {
    walls_count: 0,
    doors_count: 0,
    windows_count: 0,
    rooms_count: 0,
    dimensions_count: 0
  };

  const handleAcceptAll = async () => {
    if (detectedGeometryData.walls && detectedGeometryData.walls.length > 0) {
      await batchSetWalls(detectedGeometryData.walls, true);
    }
    setModalOpen(m => ({ ...m, geometryConfirm: false }));
    setViewMode('VIEW_3D');
  };

  const handleEdit = () => {
    // Keep user in 2D Floorplan editor with detected elements active
    setModalOpen(m => ({ ...m, geometryConfirm: false }));
    setViewMode('FLOORPLAN_2D');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="flex items-center">
            <Layers className="text-blue-400 mr-2" size={20} />
            <h3 className="text-base font-bold text-slate-100">Floorplan Vector Geometry Detected</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setModalOpen(m => ({ ...m, geometryConfirm: false }))}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-xs text-slate-300">
            Vector analysis identified architectural elements from the uploaded PDF. Please review the detection summary before extruding into 3D:
          </p>

          <div className="detection-summary-grid">
            <div className="summary-stat-box">
              <Layers className="stat-icon text-blue-400" size={20} />
              <div className="stat-value">{summary.walls_count}</div>
              <div className="stat-label">Walls Detected</div>
            </div>

            <div className="summary-stat-box">
              <Home className="stat-icon text-emerald-400" size={20} />
              <div className="stat-value">{summary.rooms_count}</div>
              <div className="stat-label">Rooms Identified</div>
            </div>

            <div className="summary-stat-box">
              <DoorOpen className="stat-icon text-amber-400" size={20} />
              <div className="stat-value">{summary.doors_count}</div>
              <div className="stat-label">Door Openings</div>
            </div>

            <div className="summary-stat-box">
              <Maximize className="stat-icon text-indigo-400" size={20} />
              <div className="stat-value">{summary.dimensions_count}</div>
              <div className="stat-label">Dimensions</div>
            </div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded border border-slate-700 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 mb-1">Human-in-the-Loop Workflow:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong>ACCEPT ALL:</strong> Instantly commits the detected geometry into editable walls and switches to the parametric 3D view.</li>
              <li><strong>EDIT:</strong> Opens the vector floorplan in the 2D editor to adjust, delete, or add wall segments before 3D generation.</li>
            </ul>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleEdit}
            >
              EDIT IN 2D
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAcceptAll}
            >
              <CheckCircle2 size={16} className="mr-1.5" />
              ACCEPT ALL & GENERATE 3D
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
