import React from 'react';
import { 
  Sliders, Trash2, Box, Cpu, Info, Check, Wind, Move, Layers,
  ChevronLeft, ChevronRight, RotateCw, Copy, ArrowUp, ArrowDown
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { formatFeetToImperial, parseImperialToFeet } from '../../utils/imperial';

export const RightPanel: React.FC = () => {
  const {
    activeProject,
    selectedType,
    selectedWall,
    selectedEquipment,
    selectedRoom,
    updateWall,
    deleteWall,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    rooms,
    hvacSystems,
    controls,
    equipment,
    verticalConfig,
    rightPanelOpen,
    setRightPanelOpen,
    alignEquipment
  } = useProject();

  // Wall length calculation
  const getWallLength = (w: typeof selectedWall) => {
    if (!w) return 0;
    const dx = w.end_x - w.start_x;
    const dy = w.end_y - w.start_y;
    return Math.hypot(dx, dy);
  };

  // Connected controls for selected equipment
  const connectedControls = selectedEquipment ? controls.filter(
    c => c.primary_equipment_id === selectedEquipment.id || c.associated_equipment_id === selectedEquipment.id
  ) : [];

  // Quick action: Rotate equipment 90 deg
  const handleRotateEquipment = () => {
    if (!selectedEquipment) return;
    const nextRot = ((selectedEquipment.rotation_z || 0) + Math.PI / 2) % (2 * Math.PI);
    updateEquipment(selectedEquipment.id, { rotation_z: nextRot });
  };

  // Quick action: Snap elevation to drop ceiling
  const handleSnapToCeiling = () => {
    if (!selectedEquipment) return;
    const ceilingH = verticalConfig?.ceiling_height || 9.0;
    updateEquipment(selectedEquipment.id, { elevation: ceilingH, position_z: ceilingH });
  };

  // Quick action: Snap elevation to plenum center
  const handleSnapToPlenum = () => {
    if (!selectedEquipment) return;
    const ceilingH = verticalConfig?.ceiling_height || 9.0;
    const plenumH = verticalConfig?.plenum_height || 3.0;
    const targetElev = ceilingH + plenumH / 2;
    updateEquipment(selectedEquipment.id, { elevation: targetElev, position_z: targetElev });
  };

  // Quick action: Duplicate equipment
  const handleDuplicateEquipment = () => {
    if (!selectedEquipment) return;
    addEquipment({
      ...selectedEquipment,
      id: undefined as any,
      tag: `${selectedEquipment.tag}-CPY`,
      position_x: selectedEquipment.position_x + 2.0,
      position_y: selectedEquipment.position_y + 2.0
    });
  };

  // Collapsed icon rail (SketchUp-style)
  if (!rightPanelOpen) {
    return (
      <aside className="sketchup-icon-rail-right">
        <button
          className="rail-btn"
          onClick={() => setRightPanelOpen(true)}
          title="Expand Entity Info Inspector (\)"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="rail-separator" />
        <button
          className={`rail-btn ${selectedType ? 'active' : ''}`}
          onClick={() => setRightPanelOpen(true)}
          title={selectedType ? `Inspect Selected ${selectedType}` : 'Entity Info Inspector'}
        >
          <Sliders size={16} />
        </button>
        <button
          className="rail-btn"
          onClick={() => setRightPanelOpen(true)}
          title="Model Overview & Stats"
        >
          <Info size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="right-panel-container">
      {/* Drawer Header with Title & Collapse Button */}
      <div className="drawer-header">
        <div className="flex items-center gap-2">
          <Sliders size={15} className="text-blue-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            {selectedType === 'wall' ? 'Entity Info: Wall' :
             selectedType === 'equipment' ? 'Entity Info: HVAC Unit' :
             selectedType === 'room' ? 'Entity Info: Room' :
             'Model Overview'}
          </span>
        </div>
        <button
          className="drawer-close-btn"
          onClick={() => setRightPanelOpen(false)}
          title="Collapse Panel (\)"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="panel-content-scroll">
        {/* Wall Inspector */}
        {selectedType === 'wall' && selectedWall && (
          <div className="inspector-section">
            <div className="inspector-badge-row">
              <span className="type-tag">{selectedWall.wall_type.toUpperCase()} WALL</span>
              <button 
                className="btn-danger-sm" 
                onClick={() => deleteWall(selectedWall.id)}
                title="Delete Wall"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>

            <div className="property-group">
              <label className="prop-label">Wall ID</label>
              <input 
                className="prop-input-readonly" 
                value={selectedWall.id} 
                readOnly 
              />
            </div>

            <div className="property-group">
              <label className="prop-label">Wall Type</label>
              <select
                className="prop-select"
                value={selectedWall.wall_type}
                onChange={(e) => updateWall(selectedWall.id, { wall_type: e.target.value as 'interior' | 'exterior' })}
              >
                <option value="interior">Interior Partition</option>
                <option value="exterior">Exterior Wall</option>
              </select>
            </div>

            <div className="prop-row-2">
              <div className="property-group">
                <label className="prop-label">Thickness</label>
                <input
                  className="prop-input"
                  value={formatFeetToImperial(selectedWall.thickness)}
                  onChange={(e) => {
                    const val = parseImperialToFeet(e.target.value);
                    if (val !== null && val > 0) updateWall(selectedWall.id, { thickness: val });
                  }}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Height</label>
                <input
                  className="prop-input"
                  value={formatFeetToImperial(selectedWall.height)}
                  onChange={(e) => {
                    const val = parseImperialToFeet(e.target.value);
                    if (val !== null && val > 0) updateWall(selectedWall.id, { height: val });
                  }}
                />
              </div>
            </div>

            <div className="property-group">
              <label className="prop-label">Calculated Length</label>
              <input
                className="prop-input-readonly"
                value={`${formatFeetToImperial(getWallLength(selectedWall))} (${getWallLength(selectedWall).toFixed(2)} ft)`}
                readOnly
              />
            </div>

            <div className="property-group">
              <label className="prop-label">Material</label>
              <input
                className="prop-input"
                value={selectedWall.material || ''}
                onChange={(e) => updateWall(selectedWall.id, { material: e.target.value })}
              />
            </div>

            <div className="property-group">
              <label className="prop-label">Start Point (X, Y ft)</label>
              <div className="prop-row-2">
                <input
                  type="number"
                  step="0.5"
                  className="prop-input"
                  value={selectedWall.start_x}
                  onChange={(e) => updateWall(selectedWall.id, { start_x: parseFloat(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  step="0.5"
                  className="prop-input"
                  value={selectedWall.start_y}
                  onChange={(e) => updateWall(selectedWall.id, { start_y: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="property-group">
              <label className="prop-label">End Point (X, Y ft)</label>
              <div className="prop-row-2">
                <input
                  type="number"
                  step="0.5"
                  className="prop-input"
                  value={selectedWall.end_x}
                  onChange={(e) => updateWall(selectedWall.id, { end_x: parseFloat(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  step="0.5"
                  className="prop-input"
                  value={selectedWall.end_y}
                  onChange={(e) => updateWall(selectedWall.id, { end_y: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {selectedWall.confidence && (
              <div className="confidence-indicator">
                Detection Confidence: {(selectedWall.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        )}

        {/* Equipment Inspector */}
        {selectedType === 'equipment' && selectedEquipment && (
          <div className="inspector-section">
            <div className="inspector-badge-row">
              <span className="type-tag bg-blue-900/50 text-blue-300 border-blue-700">
                {selectedEquipment.equipment_type_id}
              </span>
              <button
                className="btn-danger-sm"
                onClick={() => deleteEquipment(selectedEquipment.id)}
                title="Delete Equipment"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>

            {/* CAD Quick Actions Bar */}
            <div className="inspector-quick-actions">
              <button
                className="quick-action-btn"
                onClick={handleRotateEquipment}
                title="Rotate 90° clockwise"
              >
                <RotateCw size={12} />
                <span>Rotate 90°</span>
              </button>
              <button
                className="quick-action-btn"
                onClick={handleSnapToCeiling}
                title="Snap elevation to Drop Ceiling"
              >
                <ArrowDown size={12} className="text-cyan-400" />
                <span>To Ceiling</span>
              </button>
              <button
                className="quick-action-btn"
                onClick={handleSnapToPlenum}
                title="Snap elevation into Plenum cavity"
              >
                <ArrowUp size={12} className="text-purple-400" />
                <span>To Plenum</span>
              </button>
              <button
                className="quick-action-btn"
                onClick={handleDuplicateEquipment}
                title="Duplicate equipment"
              >
                <Copy size={12} />
                <span>Clone</span>
              </button>
            </div>

            {/* Alignment & Distribution (openPlan3D-inspired) */}
            <div className="inspector-align-section">
              <div className="inspector-sublabel">Ceiling Grid & Group Align</div>
              <div className="inspector-align-row">
                <button
                  type="button"
                  className="align-tool-btn"
                  onClick={() => alignEquipment('align-center-x')}
                  title="Align equipment to center X axis"
                >
                  Align X
                </button>
                <button
                  type="button"
                  className="align-tool-btn"
                  onClick={() => alignEquipment('align-center-y')}
                  title="Align equipment to center Y axis"
                >
                  Align Y
                </button>
                <button
                  type="button"
                  className="align-tool-btn"
                  onClick={() => alignEquipment('distribute-x')}
                  title="Distribute equipment evenly along X axis"
                >
                  Dist X
                </button>
                <button
                  type="button"
                  className="align-tool-btn"
                  onClick={() => alignEquipment('distribute-y')}
                  title="Distribute equipment evenly along Y axis"
                >
                  Dist Y
                </button>
              </div>
            </div>

            <div className="prop-row-2">
              <div className="property-group">
                <label className="prop-label">Equipment Tag *</label>
                <input
                  className="prop-input font-mono font-bold text-blue-300"
                  value={selectedEquipment.tag}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { tag: e.target.value })}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Equipment Name</label>
                <input
                  className="prop-input"
                  value={selectedEquipment.name}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { name: e.target.value })}
                />
              </div>
            </div>

            <div className="prop-row-2">
              <div className="property-group">
                <label className="prop-label">Manufacturer</label>
                <input
                  className="prop-input"
                  value={selectedEquipment.manufacturer || ''}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { manufacturer: e.target.value })}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Model</label>
                <input
                  className="prop-input"
                  value={selectedEquipment.model || ''}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { model: e.target.value })}
                />
              </div>
            </div>

            <div className="property-section-title">Dimensions (W × L × H)</div>
            <div className="prop-row-3">
              <div className="property-group">
                <label className="prop-label">Width (ft)</label>
                <input
                  type="number"
                  step="0.25"
                  className="prop-input"
                  value={selectedEquipment.width}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { width: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Length (ft)</label>
                <input
                  type="number"
                  step="0.25"
                  className="prop-input"
                  value={selectedEquipment.length}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { length: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Height (ft)</label>
                <input
                  type="number"
                  step="0.25"
                  className="prop-input"
                  value={selectedEquipment.height}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { height: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="property-section-title">3D Position & Elevation</div>
            <div className="prop-row-3">
              <div className="property-group">
                <label className="prop-label">X (ft)</label>
                <input
                  type="number"
                  step="0.5"
                  className="prop-input"
                  value={selectedEquipment.position_x}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { position_x: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Y (ft)</label>
                <input
                  type="number"
                  step="0.5"
                  className="prop-input"
                  value={selectedEquipment.position_y}
                  onChange={(e) => updateEquipment(selectedEquipment.id, { position_y: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Elevation AFF</label>
                <input
                  type="number"
                  step="0.25"
                  className="prop-input text-emerald-300 font-semibold"
                  value={selectedEquipment.elevation}
                  onChange={(e) => {
                    const el = parseFloat(e.target.value) || 0;
                    updateEquipment(selectedEquipment.id, { elevation: el, position_z: el });
                  }}
                />
              </div>
            </div>

            <div className="property-group">
              <label className="prop-label">Rotation Z (degrees)</label>
              <input
                type="number"
                step="15"
                className="prop-input"
                value={Math.round((selectedEquipment.rotation_z || 0) * (180 / Math.PI))}
                onChange={(e) => {
                  const deg = parseFloat(e.target.value) || 0;
                  updateEquipment(selectedEquipment.id, { rotation_z: deg * (Math.PI / 180) });
                }}
              />
            </div>

            <div className="property-section-title">Airflow & Capacity</div>
            <div className="prop-row-2">
              <div className="property-group">
                <label className="prop-label">Min Airflow (CFM)</label>
                <input
                  type="number"
                  className="prop-input"
                  value={selectedEquipment.airflow_min || ''}
                  placeholder="e.g. 150"
                  onChange={(e) => updateEquipment(selectedEquipment.id, { airflow_min: parseFloat(e.target.value) || null })}
                />
              </div>
              <div className="property-group">
                <label className="prop-label">Max Airflow (CFM)</label>
                <input
                  type="number"
                  className="prop-input"
                  value={selectedEquipment.airflow_max || ''}
                  placeholder="e.g. 600"
                  onChange={(e) => updateEquipment(selectedEquipment.id, { airflow_max: parseFloat(e.target.value) || null })}
                />
              </div>
            </div>

            <div className="property-section-title">System & Room Context</div>
            <div className="property-group">
              <label className="prop-label">Associated Room</label>
              <select
                className="prop-select"
                value={selectedEquipment.room_id || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { room_id: e.target.value || null })}
              >
                <option value="">(None / Corridor / Unassigned)</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.room_number || 'Room'})</option>
                ))}
              </select>
            </div>

            <div className="property-group">
              <label className="prop-label">HVAC System Loop</label>
              <select
                className="prop-select"
                value={selectedEquipment.hvac_system_id || ''}
                onChange={(e) => updateEquipment(selectedEquipment.id, { hvac_system_id: e.target.value || null })}
              >
                <option value="">(Unassigned Loop)</option>
                {hvacSystems.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Controls Links */}
            <div className="property-section-title">Connected Controls ({connectedControls.length})</div>
            {connectedControls.length === 0 ? (
              <div className="text-xs text-slate-500 italic">No control associations linked.</div>
            ) : (
              <div className="controls-list">
                {connectedControls.map(c => {
                  const isPrimary = c.primary_equipment_id === selectedEquipment.id;
                  const otherId = isPrimary ? c.associated_equipment_id : c.primary_equipment_id;
                  const otherEq = equipment.find(e => e.id === otherId);
                  return (
                    <div key={c.id} className="control-card-mini">
                      <Cpu size={13} className="text-indigo-400 mr-1.5" />
                      <span className="font-mono text-xs font-semibold mr-1">{otherEq?.tag || 'Eq'}:</span>
                      <span className="text-xs text-slate-300">{c.relationship_type}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Room Inspector */}
        {selectedType === 'room' && selectedRoom && (
          <div className="inspector-section">
            <div className="inspector-badge-row">
              <span className="type-tag bg-emerald-900/50 text-emerald-300 border-emerald-700">ROOM</span>
            </div>

            <div className="property-group">
              <label className="prop-label">Room Name</label>
              <input className="prop-input" value={selectedRoom.name} readOnly />
            </div>

            <div className="property-group">
              <label className="prop-label">Room Number</label>
              <input className="prop-input font-mono" value={selectedRoom.room_number || 'N/A'} readOnly />
            </div>

            <div className="prop-row-2">
              <div className="property-group">
                <label className="prop-label">Area (sq ft)</label>
                <input className="prop-input-readonly" value={`${selectedRoom.area_sq_ft} sq ft`} readOnly />
              </div>
              <div className="property-group">
                <label className="prop-label">Ceiling Height</label>
                <input className="prop-input-readonly" value={formatFeetToImperial(selectedRoom.ceiling_height)} readOnly />
              </div>
            </div>

            <div className="property-section-title">Equipment Inside Room</div>
            {equipment.filter(e => e.room_id === selectedRoom.id).length === 0 ? (
              <div className="text-xs text-slate-500 italic">No equipment placed in this room.</div>
            ) : (
              <div className="room-eq-list">
                {equipment.filter(e => e.room_id === selectedRoom.id).map(e => (
                  <div key={e.id} className="room-eq-item">
                    <Box size={13} className="text-blue-400 mr-2" />
                    <span className="font-mono font-bold text-xs text-blue-300 mr-1.5">{e.tag}:</span>
                    <span className="text-xs text-slate-300 truncate">{e.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Default: Project Overview & Air Balance Summary */}
        {selectedType === null && (
          <div className="inspector-section">
            <div className="overview-card">
              <div className="overview-title">{activeProject?.name || 'HVAC Project'}</div>
              <div className="text-xs text-slate-400 mt-1">
                {activeProject?.campus ? `${activeProject.campus} • ` : ''}
                {activeProject?.building_name || 'Engineering Bldg'}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {activeProject?.description || 'Select any wall or HVAC equipment in the workspace to view and edit properties.'}
              </p>
            </div>

            <div className="property-section-title">CFM Airflow Balance Summary</div>
            <div className="bg-slate-900/80 p-3 rounded-md border border-slate-700/60 mb-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Placed Diffusers:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {equipment.filter(e => e.type_name.toLowerCase().includes('diffuser') || e.type_name.toLowerCase().includes('supply')).length} Units
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Supply CFM:</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {equipment.filter(e => e.type_name.toLowerCase().includes('diffuser') || e.type_name.toLowerCase().includes('supply')).reduce((s, e) => s + (e.airflow_max || 150), 0)} CFM
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Return CFM:</span>
                <span className="font-mono text-purple-300 font-bold">
                  {equipment.filter(e => e.type_name.toLowerCase().includes('return') || e.type_name.toLowerCase().includes('grille')).reduce((s, e) => s + (e.airflow_max || 150), 0)} CFM
                </span>
              </div>
            </div>

            <div className="property-section-title">Building Vertical Profile</div>
            {verticalConfig && (
              <div className="vertical-summary-table">
                <div className="summary-row">
                  <span>Exterior Wall Height:</span>
                  <span className="font-mono">{formatFeetToImperial(verticalConfig.exterior_wall_height)}</span>
                </div>
                <div className="summary-row">
                  <span>Interior Wall Height:</span>
                  <span className="font-mono">{formatFeetToImperial(verticalConfig.interior_wall_height)}</span>
                </div>
                <div className="summary-row">
                  <span>Ceiling Height AFF:</span>
                  <span className="font-mono text-emerald-300">{formatFeetToImperial(verticalConfig.ceiling_height)}</span>
                </div>
                <div className="summary-row">
                  <span>Plenum Cavity Height:</span>
                  <span className="font-mono text-blue-300">{formatFeetToImperial(verticalConfig.plenum_height)}</span>
                </div>
                <div className="summary-row">
                  <span>Exterior Thickness:</span>
                  <span className="font-mono">{formatFeetToImperial(verticalConfig.exterior_wall_thickness)}</span>
                </div>
                <div className="summary-row">
                  <span>Interior Thickness:</span>
                  <span className="font-mono">{formatFeetToImperial(verticalConfig.interior_wall_thickness)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
