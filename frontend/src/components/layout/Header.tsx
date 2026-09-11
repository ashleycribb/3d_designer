import React from 'react';
import { 
  Building2, Save, Plus, Undo2, Redo2, 
  Ruler, Eye, Layers, Box, Cpu, Sparkles, Upload, MousePointer, Edit3, ChevronDown,
  Columns, Scissors
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ViewMode, VisibilityMode, CameraPreset, ActiveTool } from '../../types/view';

export const Header: React.FC = () => {
  const {
    activeProject,
    projectsList,
    selectProject,
    saveProject,
    createBlankProject,
    loadDemoProject,
    viewMode,
    setViewMode,
    visibilityMode,
    setVisibilityMode,
    cameraPreset,
    setCameraPreset,
    activeTool,
    setActiveTool,
    canUndo,
    canRedo,
    undo,
    redo,
    setModalOpen,
    uploadFloorplanFile,
    isClippingActive,
    setIsClippingActive
  } = useProject();

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      selectProject(e.target.value);
    }
  };

  return (
    <header className="spline-header">
      {/* Hidden file input for quick upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) uploadFloorplanFile(e.target.files[0]);
        }}
      />

      {/* Left: Project title & switcher */}
      <div className="spline-header-left">
        <div className="spline-logo-pill">
          <Building2 size={16} className="text-blue-400" />
          <span className="font-bold text-xs tracking-wide text-slate-100">HVAC 3D</span>
        </div>

        <div className="spline-project-dropdown-wrapper">
          <select 
            className="spline-project-select"
            value={activeProject?.id || ''}
            onChange={handleProjectChange}
          >
            {projectsList.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="select-arrow" />
        </div>

        <button 
          className="spline-btn-ghost" 
          title="Create clean blank modelspace"
          onClick={createBlankProject}
        >
          <Plus size={14} className="text-cyan-400" />
          <span>Blank</span>
        </button>

        <button 
          className="spline-btn-ghost" 
          title="Open project details dialog"
          onClick={() => setModalOpen(m => ({ ...m, newProject: true }))}
        >
          <span>Custom...</span>
        </button>
      </div>

      {/* Center 1: Segmented View Mode Switcher (Spline style: Preview | Edit | Code) */}
      <div className="spline-segmented-tabs">
        <button
          className={`segmented-tab ${viewMode === 'FLOORPLAN_2D' ? 'active' : ''}`}
          onClick={() => setViewMode('FLOORPLAN_2D')}
        >
          <Layers size={14} />
          <span>2D Floorplan</span>
        </button>
        <button
          className={`segmented-tab ${viewMode === 'SPLIT_VIEW' ? 'active' : ''}`}
          onClick={() => setViewMode('SPLIT_VIEW')}
          title="Synchronized 2D Floorplan & 3D Building Side-by-Side (Home_View style)"
        >
          <Columns size={14} />
          <span>Split</span>
        </button>
        <button
          className={`segmented-tab ${viewMode === 'VIEW_3D' ? 'active' : ''}`}
          onClick={() => setViewMode('VIEW_3D')}
        >
          <Box size={14} />
          <span>3D View</span>
        </button>
        <button
          className={`segmented-tab ${viewMode === 'CONTROLS' ? 'active' : ''}`}
          onClick={() => setViewMode('CONTROLS')}
        >
          <Cpu size={14} />
          <span>Controls</span>
        </button>
      </div>

      {/* Center 2: Floating Tool Dock (Spline top tool pill) */}
      <div className="spline-center-dock">
        <button
          className={`dock-btn ${activeTool === 'SELECT' ? 'active' : ''}`}
          onClick={() => setActiveTool('SELECT')}
          title="Select & Move (V)"
        >
          <MousePointer size={15} />
        </button>

        <button
          className={`dock-btn ${activeTool === 'DRAW_WALL' ? 'active' : ''}`}
          onClick={() => {
            if (viewMode !== 'SPLIT_VIEW') setViewMode('FLOORPLAN_2D');
            setActiveTool('DRAW_WALL');
          }}
          title="Draw Wall Tool"
        >
          <Edit3 size={15} />
        </button>

        <button
          className={`dock-btn ${activeTool === 'CALIBRATE_SCALE' ? 'active' : ''}`}
          onClick={() => {
            if (viewMode !== 'SPLIT_VIEW') setViewMode('FLOORPLAN_2D');
            setActiveTool('CALIBRATE_SCALE');
          }}
          title="Set Drawing Scale"
        >
          <Ruler size={15} />
        </button>

        <div className="dock-separator" />

        <button
          className="dock-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload Architectural Floorplan PDF"
        >
          <Upload size={15} />
        </button>

        <button
          className={`dock-btn ${isClippingActive ? 'active' : ''} text-amber-400`}
          onClick={() => setIsClippingActive(prev => !prev)}
          title="Plenum Section Cutting Plane (Slice 3D Building)"
        >
          <Scissors size={15} />
        </button>

        <button
          className="dock-btn text-blue-400"
          onClick={() => setModalOpen(m => ({ ...m, verticalConfig: true }))}
          title="Vertical Heights Configuration"
        >
          <span className="font-mono text-xs font-bold">H↕</span>
        </button>

        <button
          className="dock-btn text-purple-400"
          onClick={() => setModalOpen(m => ({ ...m, crossSection: true }))}
          title="Upload & Parse Cross-Section PDF"
        >
          <span className="font-mono text-xs font-bold">XS</span>
        </button>
      </div>

      {/* Right Controls: 3D Camera, Visibility, Undo/Redo, Save & Demo */}
      <div className="spline-header-right">
        {(viewMode === 'VIEW_3D' || viewMode === 'SPLIT_VIEW') && (
          <>
            {/* Visibility Mode Selector */}
            <div className="spline-dropdown-pill">
              <Eye size={13} className="text-slate-400" />
              <select
                className="spline-inline-select"
                value={visibilityMode}
                onChange={(e) => setVisibilityMode(e.target.value as VisibilityMode)}
              >
                <option value="NORMAL">Normal</option>
                <option value="CEILING_OFF">Ceiling Off</option>
                <option value="XRAY">X-Ray</option>
                <option value="HVAC_ONLY">HVAC Only</option>
                <option value="PLENUM">Plenum</option>
              </select>
            </div>

            {/* Camera Preset Selector */}
            <div className="spline-camera-pill">
              {(['PERSPECTIVE', 'TOP', 'FRONT', 'SIDE'] as CameraPreset[]).map(preset => (
                <button
                  key={preset}
                  className={`cam-tab-btn ${cameraPreset === preset ? 'active' : ''}`}
                  onClick={() => setCameraPreset(preset)}
                >
                  {preset === 'PERSPECTIVE' ? 'Persp' : preset.charAt(0) + preset.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Undo / Redo */}
        <div className="spline-undo-group">
          <button
            className="dock-btn-sm"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            className="dock-btn-sm"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={13} />
          </button>
        </div>

        <button 
          className="spline-btn-save" 
          title="Save Project"
          onClick={saveProject}
        >
          <Save size={13} />
          <span>Save</span>
        </button>

        <button 
          className="spline-btn-demo" 
          title="Load Demo Project"
          onClick={loadDemoProject}
        >
          <Sparkles size={13} />
          <span>Demo</span>
        </button>
      </div>
    </header>
  );
};
