import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { FloorplanCanvas } from './Floorplan2D/FloorplanCanvas';
import { Scene3D } from './Viewport3D/Scene3D';
import { ControlsGraphView } from '../controls/ControlsGraphView';

export const Workspace: React.FC = () => {
  const { viewMode } = useProject();

  return (
    <main className="main-workspace-container">
      {viewMode === 'FLOORPLAN_2D' && <FloorplanCanvas />}
      {viewMode === 'VIEW_3D' && <Scene3D />}
      {viewMode === 'CONTROLS' && <ControlsGraphView />}
      {viewMode === 'SPLIT_VIEW' && (
        <div className="split-workspace-container">
          <div className="split-pane-2d">
            <FloorplanCanvas />
          </div>
          <div className="split-pane-divider" />
          <div className="split-pane-3d">
            <Scene3D />
          </div>
        </div>
      )}
    </main>
  );
};
