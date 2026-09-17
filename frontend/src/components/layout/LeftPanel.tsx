import React, { useState } from 'react';
import { 
  Folder, Layers, Box, Cpu, ChevronRight, ChevronDown, 
  Wind, Thermometer, ShieldAlert, Sliders, Radio, Zap, LayoutGrid
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { EquipmentType } from '../../types/hvac';

export const LeftPanel: React.FC = () => {
  const {
    activeProject,
    rooms,
    equipment,
    equipmentTypes,
    hvacSystems,
    selectedType,
    selectedId,
    selectItem,
    setActiveTool,
    setPendingEquipmentTypeId,
    pendingEquipmentTypeId,
    leftPanelOpen,
    setLeftPanelOpen,
    modalOpen,
    setModalOpen
  } = useProject();

  const [activeTab, setActiveTab] = useState<'TREE' | 'LIBRARY'>('LIBRARY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState({
    building: true,
    floor: true,
    rooms: true,
    systems: true,
    equipment: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectEquipmentType = (typeId: string) => {
    if (pendingEquipmentTypeId === typeId) {
      setPendingEquipmentTypeId(null);
      setActiveTool('SELECT');
    } else {
      setPendingEquipmentTypeId(typeId);
      setActiveTool('PLACE_EQUIPMENT');
    }
  };

  // Group equipment types by category and MEP discipline
  const categories = [
    { key: 'all', label: 'All' },
    { key: 'air_handler', label: 'Air Handlers' },
    { key: 'distribution', label: 'Distribution' },
    { key: 'fan', label: 'Fans' },
    { key: 'electrical', label: '⚡ Electrical' },
    { key: 'plumbing', label: '🚰 Plumbing' },
    { key: 'fire_protection', label: '🔥 Fire' },
    { key: 'sensor', label: 'Sensors' },
    { key: 'custom_3d', label: '📦 3D Vendor' },
  ];

  // Collapsed icon rail (SketchUp-style)
  if (!leftPanelOpen) {
    return (
      <aside className="sketchup-icon-rail-left">
        <button
          className="rail-btn"
          onClick={() => setLeftPanelOpen(true)}
          title="Expand Left Panel (\)"
        >
          <ChevronRight size={16} />
        </button>
        <div className="rail-separator" />
        <button
          className={`rail-btn ${activeTab === 'LIBRARY' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('LIBRARY');
            setLeftPanelOpen(true);
          }}
          title="Equipment Catalog (17 types)"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`rail-btn ${activeTab === 'TREE' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('TREE');
            setLeftPanelOpen(true);
          }}
          title="Project Hierarchy & Rooms"
        >
          <Folder size={16} />
        </button>
      </aside>
    );
  }

  const filteredEquipment = equipmentTypes.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = t.name.toLowerCase().includes(query) || 
                          t.id.toLowerCase().includes(query) ||
                          t.category.toLowerCase().includes(query) ||
                          (t.discipline && t.discipline.toLowerCase().includes(query));
    
    let matchesCat = true;
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'custom_3d') {
        matchesCat = Boolean(t.model_url || t.category === 'custom_3d');
      } else if (selectedCategory === 'electrical' || selectedCategory === 'plumbing' || selectedCategory === 'fire_protection') {
        matchesCat = t.discipline === selectedCategory || t.category === selectedCategory;
      } else {
        matchesCat = t.category === selectedCategory;
      }
    }
    return matchesSearch && matchesCat;
  });

  return (
    <aside className="left-panel-container">
      {/* Panel Drawer Header */}
      <div className="drawer-header">
        <div className="flex items-center gap-2">
          {activeTab === 'LIBRARY' ? (
            <LayoutGrid size={15} className="text-cyan-400" />
          ) : (
            <Folder size={15} className="text-blue-400" />
          )}
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            {activeTab === 'LIBRARY' ? 'HVAC Components' : 'Model Hierarchy'}
          </span>
        </div>
        <button
          className="drawer-close-btn"
          onClick={() => setLeftPanelOpen(false)}
          title="Collapse Panel (\)"
        >
          <ChevronRight size={14} className="rotate-180" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="panel-tab-bar">
        <button
          className={`panel-tab ${activeTab === 'LIBRARY' ? 'active' : ''}`}
          onClick={() => setActiveTab('LIBRARY')}
        >
          <LayoutGrid size={14} />
          <span>Catalog ({equipmentTypes.length})</span>
        </button>
        <button
          className={`panel-tab ${activeTab === 'TREE' ? 'active' : ''}`}
          onClick={() => setActiveTab('TREE')}
        >
          <Folder size={14} />
          <span>Hierarchy</span>
        </button>
      </div>

      <div className="panel-content-scroll">
        {activeTab === 'TREE' ? (
          <div className="project-tree">
            {/* Building root */}
            <div className="tree-node">
              <div 
                className="tree-node-header"
                onClick={() => toggleSection('building')}
              >
                {expandedSections.building ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} className="node-icon text-blue-400" />
                <span className="font-semibold text-slate-200">
                  {activeProject?.building_name || activeProject?.name || 'Building'}
                </span>
              </div>

              {expandedSections.building && (
                <div className="tree-children">
                  {/* Floor Selector Stack */}
                  <div className="px-2 py-1.5 mb-1 bg-slate-900/60 rounded border border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                      <span>Multi-Story Floors</span>
                      <button
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-xs"
                        onClick={() => {
                          const fName = prompt('Enter new floor name (e.g. Level 2, Penthouse):');
                          if (fName && activeProject) {
                            fetch(`/api/projects/${activeProject.id}/floors`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: fName, floor_number: 2.0, elevation_ft: 12.0, height_ft: 12.0 })
                            });
                          }
                        }}
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs px-2 py-1 bg-cyan-950/40 border border-cyan-800/60 rounded text-cyan-200 font-semibold">
                        <span>Roof / Mechanical Deck</span>
                        <span className="font-mono text-[10px] text-cyan-400">24.0' AFF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs px-2 py-1 bg-blue-950/60 border border-blue-600 rounded text-white font-bold">
                        <span>Level 1 (Active)</span>
                        <span className="font-mono text-[10px] text-blue-300">0.0' AFF</span>
                      </div>
                    </div>
                  </div>

                  {/* Floor */}
                  <div className="tree-node">
                    <div 
                      className="tree-node-header"
                      onClick={() => toggleSection('floor')}
                    >
                      {expandedSections.floor ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <Layers size={14} className="node-icon text-indigo-400" />
                      <span>{activeProject?.floor_name || 'Floor 1'}</span>
                    </div>

                    {expandedSections.floor && (
                      <div className="tree-children">
                        {/* Rooms Group */}
                        <div className="tree-node">
                          <div 
                            className="tree-node-header"
                            onClick={() => toggleSection('rooms')}
                          >
                            {expandedSections.rooms ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className="text-xs uppercase tracking-wider text-slate-400">
                              Rooms ({rooms.length})
                            </span>
                          </div>

                          {expandedSections.rooms && (
                            <div className="tree-children">
                              {rooms.map(room => (
                                <div
                                  key={room.id}
                                  className={`tree-leaf ${selectedType === 'room' && selectedId === room.id ? 'selected' : ''}`}
                                  onClick={() => selectItem('room', room.id)}
                                >
                                  <span className="room-bullet" />
                                  <span className="truncate">{room.name}</span>
                                  <span className="text-xs text-slate-500 ml-auto">{room.area_sq_ft} sq ft</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* HVAC Systems Group */}
                        <div className="tree-node">
                          <div 
                            className="tree-node-header"
                            onClick={() => toggleSection('systems')}
                          >
                            {expandedSections.systems ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className="text-xs uppercase tracking-wider text-slate-400">
                              HVAC Systems ({hvacSystems.length})
                            </span>
                          </div>

                          {expandedSections.systems && (
                            <div className="tree-children">
                              {hvacSystems.map(sys => (
                                <div key={sys.id} className="tree-leaf">
                                  <Wind size={13} className="text-emerald-400 mr-2" />
                                  <span className="truncate">{sys.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Placed Equipment Group */}
                        <div className="tree-node">
                          <div 
                            className="tree-node-header"
                            onClick={() => toggleSection('equipment')}
                          >
                            {expandedSections.equipment ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className="text-xs uppercase tracking-wider text-slate-400">
                              Equipment ({equipment.length})
                            </span>
                          </div>

                          {expandedSections.equipment && (
                            <div className="tree-children">
                              {equipment.map(eq => (
                                <div
                                  key={eq.id}
                                  className={`tree-leaf ${selectedType === 'equipment' && selectedId === eq.id ? 'selected' : ''}`}
                                  onClick={() => selectItem('equipment', eq.id)}
                                >
                                  <Box size={13} className="text-blue-400 mr-2 shrink-0" />
                                  <span className="font-mono text-xs text-blue-300 font-semibold mr-1.5">{eq.tag}:</span>
                                  <span className="truncate text-slate-300">{eq.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Equipment Library */
          <div className="equipment-catalog">
            {/* 3D Model Importer Header Action */}
            <div className="catalog-import-banner">
              <button
                type="button"
                className="btn-import-3d"
                onClick={() => setModalOpen(m => ({ ...m, import3D: true }))}
                title="Import vendor 3D model (.GLB/.GLTF) from Trane, Carrier, BIMsmith, etc."
              >
                <Box size={14} className="text-sky-400" />
                <span>+ Import 3D Model (.GLB)</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="catalog-search-wrapper">
              <input
                type="text"
                className="catalog-search-input"
                placeholder="Search AHU, VAV, Fan, Sensor, Pump, Panel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="search-clear-btn" 
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="catalog-pills-row">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  className={`cat-pill ${selectedCategory === cat.key ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Equipment Grid */}
            <div className="catalog-grid">
              {filteredEquipment.length === 0 ? (
                <div className="empty-search-notice">
                  <span>No MEP components match "{searchQuery}"</span>
                </div>
              ) : (
                filteredEquipment.map(item => {
                  const isPending = pendingEquipmentTypeId === item.id;
                  
                  // Color code elevation target
                  let elevClass = 'elev-plenum';
                  if (item.elevation_target === 'ceiling') elevClass = 'elev-ceiling';
                  else if (item.elevation_target === 'wall') elevClass = 'elev-wall';
                  else if (item.elevation_target === 'floor') elevClass = 'elev-floor';

                  return (
                    <div
                      key={item.id}
                      className={`catalog-card ${isPending ? 'pending-placement' : ''}`}
                      onClick={() => handleSelectEquipmentType(item.id)}
                      title={`Click to place ${item.name}\nDefault elevation: ${item.default_elevation}' AFF (${item.elevation_target})`}
                    >
                      <div className="card-top">
                        <span className="type-badge" style={{ borderColor: item.color_hex, color: item.color_hex }}>
                          {item.id}
                        </span>
                        {item.model_url ? (
                          <span className="model-3d-badge">
                            3D GLB
                          </span>
                        ) : (
                          <span className={`target-badge ${elevClass}`}>
                            {item.elevation_target.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="card-name">{item.name}</div>
                      <div className="card-meta-row">
                        <span className="card-dims">
                          {item.default_width}' × {item.default_length}' × {item.default_height}'
                        </span>
                        <span className="card-elev font-mono text-[10px] text-slate-400">
                          {item.default_elevation}' AFF
                        </span>
                      </div>
                      {isPending && (
                        <div className="placement-indicator">
                          ● Click canvas to place
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
