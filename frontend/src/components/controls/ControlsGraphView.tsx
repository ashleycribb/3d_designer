import React, { useState } from 'react';
import { Cpu, Wind, Thermometer, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { api } from '../../api/client';

export const ControlsGraphView: React.FC = () => {
  const {
    activeProject,
    equipment,
    controls,
    refreshProjectData,
    selectItem
  } = useProject();

  const [primaryId, setPrimaryId] = useState<string>('');
  const [associatedId, setAssociatedId] = useState<string>('');
  const [relType, setRelType] = useState<string>('CONTROLS');
  const [desc, setDesc] = useState<string>('');

  const handleAddControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !primaryId || !associatedId) return;
    try {
      await api.createControl(activeProject.id, {
        primary_equipment_id: primaryId,
        associated_equipment_id: associatedId,
        relationship_type: relType,
        description: desc
      });
      setDesc('');
      await refreshProjectData();
    } catch (err) {
      console.error('Failed to create control link', err);
    }
  };

  const handleDeleteControl = async (id: string) => {
    if (!activeProject) return;
    try {
      await fetch(`/api/projects/${activeProject.id}/controls/${id}`, { method: 'DELETE' });
      await refreshProjectData();
    } catch (err) {
      console.error('Failed to delete control link', err);
    }
  };

  // Group controls by primary equipment
  const primaryIds = Array.from(new Set(controls.map(c => c.primary_equipment_id)));

  return (
    <div className="controls-view-container">
      <div className="controls-header">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center">
            <Cpu className="text-indigo-400 mr-2" size={20} />
            DDC Controls & HVAC Association Topology
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Map relationships between field controllers, thermostats, VAV terminals, dampers, and central air handlers.
          </p>
        </div>

        {/* Quick Link Form */}
        <form onSubmit={handleAddControl} className="add-control-bar">
          <select 
            className="ctrl-select"
            value={primaryId}
            onChange={(e) => setPrimaryId(e.target.value)}
            required
          >
            <option value="">Select Controller / Source Equipment...</option>
            {equipment.map(e => (
              <option key={e.id} value={e.id}>{e.tag} ({e.name})</option>
            ))}
          </select>

          <select 
            className="ctrl-select"
            value={relType}
            onChange={(e) => setRelType(e.target.value)}
          >
            <option value="CONTROLS">CONTROLS</option>
            <option value="MONITORS">MONITORS</option>
            <option value="FEEDS">FEEDS</option>
            <option value="INTERLOCKED_WITH">INTERLOCKED WITH</option>
          </select>

          <select 
            className="ctrl-select"
            value={associatedId}
            onChange={(e) => setAssociatedId(e.target.value)}
            required
          >
            <option value="">Select Target Equipment...</option>
            {equipment.filter(e => e.id !== primaryId).map(e => (
              <option key={e.id} value={e.id}>{e.tag} ({e.name})</option>
            ))}
          </select>

          <button type="submit" className="btn-primary-sm">
            <Plus size={14} className="mr-1" />
            Link Controls
          </button>
        </form>
      </div>

      <div className="controls-grid">
        {primaryIds.map(pId => {
          const primaryEq = equipment.find(e => e.id === pId);
          const links = controls.filter(c => c.primary_equipment_id === pId);
          if (!primaryEq) return null;

          return (
            <div key={pId} className="control-node-card">
              <div 
                className="node-card-header cursor-pointer"
                onClick={() => selectItem('equipment', primaryEq.id)}
              >
                <div className="flex items-center">
                  <span className="node-badge">{primaryEq.equipment_type_id}</span>
                  <span className="node-tag">{primaryEq.tag}</span>
                </div>
                <span className="node-name">{primaryEq.name}</span>
              </div>

              <div className="node-links-list">
                {links.map(l => {
                  const targetEq = equipment.find(e => e.id === l.associated_equipment_id);
                  return (
                    <div key={l.id} className="link-row">
                      <span className="rel-tag">{l.relationship_type}</span>
                      <ArrowRight size={13} className="text-slate-500 mx-1.5" />
                      <span 
                        className="target-tag cursor-pointer hover:underline"
                        onClick={() => targetEq && selectItem('equipment', targetEq.id)}
                      >
                        {targetEq?.tag || 'Equipment'} ({targetEq?.type_name})
                      </span>

                      <button
                        className="btn-link-del"
                        onClick={() => handleDeleteControl(l.id)}
                        title="Remove Link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {controls.length === 0 && (
          <div className="empty-controls-banner">
            <Cpu size={36} className="text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No controls associations defined yet.</p>
            <p className="text-xs text-slate-500 mt-1">Use the bar above to link thermostats to VAV boxes, or air handlers to terminal units.</p>
          </div>
        )}
      </div>
    </div>
  );
};
