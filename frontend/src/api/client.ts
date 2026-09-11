import { Project, VerticalConfig, Drawing } from '../types/project';
import { Wall, Room, Door, Window, ScaleCalibrationRequest, ScaleCalibrationResponse, DetectedGeometryResponse } from '../types/geometry';
import { Equipment, EquipmentType, HVACSystem, ControlAssociation } from '../types/hvac';

const BASE_URL = '/api';

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${BASE_URL}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async getProject(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to fetch project');
    return res.json();
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },

  // Drawings & PDF
  async uploadDrawing(projectId: string, file: File, fileType: string = 'floorplan'): Promise<Drawing> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    const res = await fetch(`${BASE_URL}/projects/${projectId}/drawings`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async processFloorplan(projectId: string, drawingId?: string): Promise<DetectedGeometryResponse> {
    const url = drawingId 
      ? `${BASE_URL}/projects/${projectId}/process-floorplan?drawing_id=${drawingId}`
      : `${BASE_URL}/projects/${projectId}/process-floorplan`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to process floorplan');
    return res.json();
  },

  async setScale(projectId: string, data: ScaleCalibrationRequest): Promise<ScaleCalibrationResponse> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/scale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Scale calibration failed' }));
      throw new Error(err.detail || 'Scale calibration failed');
    }
    return res.json();
  },

  async analyzeCrossSection(projectId: string, drawingId?: string): Promise<any> {
    const url = drawingId
      ? `${BASE_URL}/projects/${projectId}/analyze-cross-section?drawing_id=${drawingId}`
      : `${BASE_URL}/projects/${projectId}/analyze-cross-section`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to analyze cross section');
    return res.json();
  },

  // Walls
  async getWalls(projectId: string): Promise<Wall[]> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/walls`);
    if (!res.ok) throw new Error('Failed to fetch walls');
    return res.json();
  },

  async createWall(projectId: string, data: Partial<Wall>): Promise<Wall> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/walls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create wall');
    return res.json();
  },

  async batchCreateWalls(projectId: string, walls: Partial<Wall>[], replace: boolean = false): Promise<Wall[]> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/walls/batch?replace_existing=${replace}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(walls)
    });
    if (!res.ok) throw new Error('Failed to batch create walls');
    return res.json();
  },

  async updateWall(id: string, data: Partial<Wall>): Promise<Wall> {
    const res = await fetch(`${BASE_URL}/walls/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update wall');
    return res.json();
  },

  async deleteWall(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/walls/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete wall');
  },

  // Equipment & Types
  async getEquipmentTypes(): Promise<EquipmentType[]> {
    const res = await fetch(`${BASE_URL}/equipment-types`);
    if (!res.ok) throw new Error('Failed to fetch equipment types');
    return res.json();
  },

  async import3DEquipmentType(projectId: string, formData: FormData): Promise<EquipmentType> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/equipment-types/import-3d`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to import 3D model');
    }
    return res.json();
  },

  async getEquipment(projectId: string): Promise<Equipment[]> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/equipment`);
    if (!res.ok) throw new Error('Failed to fetch equipment');
    return res.json();
  },

  async placeEquipment(projectId: string, data: Partial<Equipment>): Promise<Equipment> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to place equipment');
    return res.json();
  },

  async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
    const res = await fetch(`${BASE_URL}/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update equipment');
    return res.json();
  },

  async deleteEquipment(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/equipment/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete equipment');
  },

  // Vertical Config
  async getVerticalConfig(projectId: string): Promise<VerticalConfig> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/vertical-config`);
    if (!res.ok) throw new Error('Failed to fetch vertical config');
    return res.json();
  },

  async updateVerticalConfig(projectId: string, data: Partial<VerticalConfig>): Promise<VerticalConfig> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/vertical-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update vertical config');
    return res.json();
  },

  // Controls & Systems
  async getSystems(projectId: string): Promise<HVACSystem[]> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/systems`);
    if (!res.ok) throw new Error('Failed to fetch HVAC systems');
    return res.json();
  },

  async getControls(projectId: string): Promise<ControlAssociation[]> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/controls`);
    if (!res.ok) throw new Error('Failed to fetch control associations');
    return res.json();
  },

  async createControl(projectId: string, data: Partial<ControlAssociation>): Promise<ControlAssociation> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/controls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create control link');
    return res.json();
  },

  // Demo
  async seedDemo(): Promise<Project> {
    const res = await fetch(`${BASE_URL}/demo/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed demo project');
    return res.json();
  }
};
