import React, { useState } from 'react';
import { X, Upload, Building, FileText, CheckCircle2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { api } from '../../api/client';

export const NewProjectModal: React.FC = () => {
  const { modalOpen, setModalOpen, createProject, selectProject, loadProjects } = useProject();

  const [name, setName] = useState('New Engineering Facility');
  const [buildingName, setBuildingName] = useState('Science & Engineering Hall');
  const [campus, setCampus] = useState('Central Campus');
  const [buildingNumber, setBuildingNumber] = useState('Bldg 204');
  const [floorName, setFloorName] = useState('Floor 1');
  const [description, setDescription] = useState('Floorplan reconstruction and HVAC terminal layout.');
  
  const [floorplanFile, setFloorplanFile] = useState<File | null>(null);
  const [sectionFile, setSectionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useSampleFloorplan, setUseSampleFloorplan] = useState(false);

  if (!modalOpen.newProject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Create project
      const newProj = await createProject({
        name,
        building_name: buildingName,
        campus,
        building_number: buildingNumber,
        floor_name: floorName,
        description
      });

      // 2. Upload primary floorplan PDF if provided
      if (floorplanFile) {
        await api.uploadDrawing(newProj.id, floorplanFile, 'floorplan');
      } else if (useSampleFloorplan) {
        // Fetch sample floorplan from backend and upload
        const sampleBlob = await fetch('/api/sample-files/floorplan').then(r => r.blob());
        const sampleFile = new File([sampleBlob], 'sample_architectural_floorplan.pdf', { type: 'application/pdf' });
        await api.uploadDrawing(newProj.id, sampleFile, 'floorplan');
      }

      // 3. Upload cross section PDF if provided
      if (sectionFile) {
        await api.uploadDrawing(newProj.id, sectionFile, 'wall_section');
      }

      await loadProjects();
      await selectProject(newProj.id);
      setModalOpen(m => ({ ...m, newProject: false }));
    } catch (err: any) {
      console.error('Failed to create project', err);
      alert(err.message || 'Error creating project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="flex items-center">
            <Building className="text-blue-400 mr-2" size={20} />
            <h3 className="text-base font-bold text-slate-100">Create New Facilities Project</h3>
          </div>
          <button 
            className="modal-close-btn" 
            onClick={() => setModalOpen(m => ({ ...m, newProject: false }))}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              className="form-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Life Sciences Center Floor 2 Controls"
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Building Name</label>
              <input
                className="form-input"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. Engineering Tower"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Building Number</label>
              <input
                className="form-input"
                value={buildingNumber}
                onChange={(e) => setBuildingNumber(e.target.value)}
                placeholder="e.g. BLDG-104"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Campus</label>
              <input
                className="form-input"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                placeholder="e.g. North Campus"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                className="form-input"
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                placeholder="e.g. Floor 1 / Level 2"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Scope</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="upload-box-group">
            <label className="form-label">Primary Floorplan PDF *</label>
            <div className="file-dropzone">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFloorplanFile(e.target.files[0]);
                    setUseSampleFloorplan(false);
                  }
                }}
                className="file-input-hidden"
                id="floorplan-file"
              />
              <label htmlFor="floorplan-file" className="dropzone-label">
                <Upload size={22} className="text-blue-400 mb-1" />
                <span className="font-medium text-slate-200">
                  {floorplanFile ? floorplanFile.name : 'Click to select floorplan PDF (or drag & drop)'}
                </span>
                <span className="text-xs text-slate-400 mt-1">Supports vector PDFs and scanned documents (up to 50MB)</span>
              </label>
            </div>

            <div className="sample-checkbox-row">
              <input
                type="checkbox"
                id="sample-check"
                checked={useSampleFloorplan}
                onChange={(e) => {
                  setUseSampleFloorplan(e.target.checked);
                  if (e.target.checked) setFloorplanFile(null);
                }}
              />
              <label htmlFor="sample-check" className="text-xs text-blue-300 font-medium cursor-pointer">
                Use built-in vector architectural test floorplan (instant testing)
              </label>
            </div>
          </div>

          <div className="upload-box-group">
            <label className="form-label">Optional Wall / Ceiling Cross-Section PDF</label>
            <div className="file-dropzone file-dropzone-sm">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => e.target.files?.[0] && setSectionFile(e.target.files[0])}
                className="file-input-hidden"
                id="section-file"
              />
              <label htmlFor="section-file" className="dropzone-label">
                <FileText size={18} className="text-slate-400 mr-2" />
                <span className="text-xs text-slate-300">
                  {sectionFile ? sectionFile.name : 'Upload cross-section PDF to auto-detect ceiling/plenum heights'}
                </span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(m => ({ ...m, newProject: false }))}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Project...' : 'Create Project & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
