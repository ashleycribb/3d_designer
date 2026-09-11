import React, { useState, useEffect } from 'react';
import { AlertTriangle, Crosshair, Scale, HelpCircle, Terminal } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { formatFeetToImperial } from '../../utils/imperial';

export const StatusBar: React.FC = () => {
  const {
    activeProject,
    cursorCoords,
    activeTool,
    activeModifierHint,
    measuredDistance,
    selectedWall,
    selectedEquipment,
    precisionInput,
    setPrecisionInput,
    commitPrecisionInput
  } = useProject();

  const [localInput, setLocalInput] = useState<string>('');

  // Synchronize local input with external precision values
  useEffect(() => {
    if (measuredDistance !== null) {
      setLocalInput(formatFeetToImperial(measuredDistance));
    } else if (selectedWall) {
      const dx = selectedWall.end_x - selectedWall.start_x;
      const dy = selectedWall.end_y - selectedWall.start_y;
      const len = Math.hypot(dx, dy);
      setLocalInput(formatFeetToImperial(len));
    } else if (selectedEquipment) {
      setLocalInput(selectedEquipment.airflow_max ? `${selectedEquipment.airflow_max} CFM` : `${selectedEquipment.width}' x ${selectedEquipment.length}'`);
    } else if (precisionInput) {
      setLocalInput(precisionInput);
    }
  }, [measuredDistance, selectedWall, selectedEquipment, precisionInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitPrecisionInput(localInput);
      setPrecisionInput(localInput);
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  // Determine tool guidance text (SketchUp-style contextual instruction)
  const getToolHint = () => {
    if (activeModifierHint) return activeModifierHint;
    switch (activeTool) {
      case 'SELECT':
        return 'Click entity to inspect. Drag to reposition. [Del] to delete. Esc to deselect.';
      case 'DRAW_WALL':
        return 'Click to set wall start. Click again to set endpoint. Type exact length in Measurements box. Esc to cancel.';
      case 'CALIBRATE_SCALE':
        return 'Click point 1, then point 2 on a known dimension string. Type real length in Measurements box.';
      case 'PLACE_EQUIPMENT':
        return 'Click on floorplan to place unit. Shift to snap to grid. Esc to cancel.';
      case 'MEASURE_3D':
        return 'Click two 3D points on building walls or equipment to measure distance.';
      default:
        return 'Click canvas or select tool to begin.';
    }
  };

  const scaleStr = activeProject?.settings?.scale_factor 
    ? `1 px = ${activeProject.settings.scale_factor.toFixed(4)} ft` 
    : 'Scale: Not Set';

  return (
    <footer className="sketchup-status-bar">
      {/* 1. Contextual Modifier & Tool Hint (SketchUp Web style) */}
      <div className="status-hint-section">
        <HelpCircle size={13} className="text-cyan-400 shrink-0" />
        <span className="status-hint-text" title="Active tool instructions">
          {getToolHint()}
        </span>
      </div>

      {/* 2. Coordinates & Scale */}
      <div className="status-coords-section">
        <div className="coord-chip">
          <Crosshair size={12} className="text-blue-400" />
          <span className="font-mono text-[11px]">
            {cursorCoords 
              ? `X: ${cursorCoords.x.toFixed(1)}' (${formatFeetToImperial(cursorCoords.x)})  Y: ${cursorCoords.y.toFixed(1)}' (${formatFeetToImperial(cursorCoords.y)})`
              : 'X: --  Y: --'}
          </span>
        </div>

        <div className="coord-chip" title="Calibrated drawing scale">
          <Scale size={12} className="text-amber-400" />
          <span className="font-mono text-[11px]">{scaleStr}</span>
        </div>
      </div>

      {/* 3. Measurements / Value Control Box (SketchUp VCB) */}
      <div className="status-vcb-section">
        <label className="vcb-label">
          <Terminal size={12} className="text-slate-400 mr-1" />
          <span>Measurements:</span>
        </label>
        <input
          type="text"
          className="vcb-input"
          placeholder="e.g. 14'-6&quot; or CFM"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          onKeyDown={handleKeyDown}
          title="Type dimension (e.g. 12'-6&quot;, 15, or 800 CFM) and press Enter to commit"
        />
      </div>

      {/* 4. Compact Verification Disclaimer */}
      <div className="status-disclaimer-chip" title="Generated geometry must be reviewed by qualified engineers.">
        <AlertTriangle size={12} className="text-amber-400 shrink-0" />
        <span>Verify geometry before engineering decisions</span>
      </div>
    </footer>
  );
};
