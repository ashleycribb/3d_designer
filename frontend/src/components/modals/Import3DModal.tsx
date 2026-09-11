import React, { useState } from 'react';
import { X, Upload, Box, AlertCircle, FileCode } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const Import3DModal: React.FC = () => {
  const { modalOpen, setModalOpen, import3DModel } = useProject();

  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState<'mechanical' | 'electrical' | 'plumbing' | 'fire_protection' | 'custom'>('mechanical');
  const [category, setCategory] = useState('custom_3d');
  const [width, setWidth] = useState(3.0);
  const [length, setLength] = useState(3.0);
  const [height, setHeight] = useState(2.0);
  const [defaultElevation, setDefaultElevation] = useState(9.5);
  const [elevationTarget, setElevationTarget] = useState<'floor' | 'wall' | 'ceiling' | 'plenum' | 'roof'>('plenum');
  const [colorHex, setColorHex] = useState('#38bdf8');
  
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!modalOpen.import3D) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      if (ext !== '.glb' && ext !== '.gltf') {
        setErrorMsg('Please select a .glb or .gltf 3D model file.');
        return;
      }
      setModelFile(f);
      setErrorMsg(null);
      if (!name) {
        // Derive clean name from filename
        const clean = f.name.replace(/\.(glb|gltf)$/i, '').replace(/[-_]/g, ' ');
        setName(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      if (ext !== '.glb' && ext !== '.gltf') {
        setErrorMsg('Please drop a valid .glb or .gltf 3D model file.');
        return;
      }
      setModelFile(f);
      setErrorMsg(null);
      if (!name) {
        const clean = f.name.replace(/\.(glb|gltf)$/i, '').replace(/[-_]/g, ' ');
        setName(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelFile) {
      setErrorMsg('Please provide a .glb or .gltf 3D model file.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please specify a component name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', modelFile);
      formData.append('name', name.trim());
      formData.append('discipline', discipline);
      formData.append('category', category);
      formData.append('default_width', width.toString());
      formData.append('default_length', length.toString());
      formData.append('default_height', height.toString());
      formData.append('default_elevation', defaultElevation.toString());
      formData.append('elevation_target', elevationTarget);
      formData.append('color_hex', colorHex);

      await import3DModel(formData);

      // Close modal on success
      setModalOpen(m => ({ ...m, import3D: false }));
      setModelFile(null);
      setName('');
    } catch (err: any) {
      console.error('Failed to import 3D model', err);
      setErrorMsg(err.message || 'Failed to upload and register 3D model.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setModalOpen(m => ({ ...m, import3D: false }))}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-sky-400" />
            <h3 className="font-bold text-sm text-slate-100">Import 3D MEP Component (.GLB / .GLTF)</h3>
          </div>
          <button 
            type="button"
            className="modal-close-btn"
            onClick={() => setModalOpen(m => ({ ...m, import3D: false }))}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-md text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 3D File Dropzone */}
          <div 
            className="file-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept=".glb,.gltf" 
              id="glb-file-input" 
              className="file-input-hidden" 
              onChange={handleFileChange}
            />
            <label htmlFor="glb-file-input" className="dropzone-label">
              <FileCode size={36} className="text-sky-400 mb-2" />
              {modelFile ? (
                <div className="flex flex-col items-center">
                  <span className="font-bold text-xs text-sky-300">{modelFile.name}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {(modelFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to import
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="font-medium text-xs text-slate-200">
                    Click to browse or drop vendor <span className="text-sky-400 font-bold">.GLB</span> / <span className="text-sky-400 font-bold">.GLTF</span> model
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Download 3D models from Trane, Carrier, BIMsmith, or 3D Warehouse
                  </span>
                </div>
              )}
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Component Name *</label>
            <input 
              className="form-input" 
              placeholder="e.g. Trane Axiom Water-Source Heat Pump"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Discipline</label>
              <select 
                className="form-input"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as any)}
              >
                <option value="mechanical">Mechanical / HVAC</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing & Hydronics</option>
                <option value="fire_protection">Fire Protection</option>
                <option value="custom">Custom / Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="custom_3d">3D Vendor Models</option>
                <option value="air_handler">Air Handlers / RTUs</option>
                <option value="distribution">Air Distribution</option>
                <option value="fan">Fans</option>
                <option value="electrical">Electrical Equipment</option>
                <option value="plumbing">Pumps & Piping</option>
                <option value="fire_protection">Fire Protection</option>
                <option value="sensor">Sensors & Controls</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Width (ft)</label>
              <input 
                type="number"
                step="0.1"
                min="0.2"
                className="form-input" 
                value={width} 
                onChange={(e) => setWidth(parseFloat(e.target.value) || 1.0)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Length (ft)</label>
              <input 
                type="number"
                step="0.1"
                min="0.2"
                className="form-input" 
                value={length} 
                onChange={(e) => setLength(parseFloat(e.target.value) || 1.0)} 
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Height (ft)</label>
              <input 
                type="number"
                step="0.1"
                min="0.2"
                className="form-input" 
                value={height} 
                onChange={(e) => setHeight(parseFloat(e.target.value) || 1.0)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mounting Elevation AFF (ft)</label>
              <input 
                type="number"
                step="0.25"
                className="form-input" 
                value={defaultElevation} 
                onChange={(e) => setDefaultElevation(parseFloat(e.target.value) || 0.0)} 
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Default Elevation Target</label>
              <select 
                className="form-input"
                value={elevationTarget}
                onChange={(e) => {
                  const target = e.target.value as any;
                  setElevationTarget(target);
                  if (target === 'floor') setDefaultElevation(0.0);
                  else if (target === 'ceiling') setDefaultElevation(9.0);
                  else if (target === 'plenum') setDefaultElevation(10.5);
                  else if (target === 'wall') setDefaultElevation(4.0);
                  else if (target === 'roof') setDefaultElevation(12.0);
                }}
              >
                <option value="plenum">Ceiling Plenum Cavity</option>
                <option value="ceiling">Drop Ceiling Grid</option>
                <option value="floor">Floor Mounted</option>
                <option value="wall">Wall Mounted</option>
                <option value="roof">Rooftop</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catalog Accent Color</label>
              <div className="flex items-center gap-3 mt-1">
                <input 
                  type="color"
                  className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                />
                <span className="font-mono text-xs text-slate-400">{colorHex}</span>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setModalOpen(m => ({ ...m, import3D: false }))}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting || !modelFile}
            >
              {isSubmitting ? (
                <span>Importing 3D Model...</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Upload size={14} />
                  <span>Add to Component Catalog</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
