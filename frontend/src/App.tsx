import React from 'react';
import { ProjectProvider } from './context/ProjectContext';
import { Header } from './components/layout/Header';
import { LeftPanel } from './components/layout/LeftPanel';
import { Workspace } from './components/workspace/Workspace';
import { RightPanel } from './components/layout/RightPanel';
import { StatusBar } from './components/layout/StatusBar';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { ScaleCalibrationModal } from './components/modals/ScaleCalibrationModal';
import { VerticalConfigModal } from './components/modals/VerticalConfigModal';
import { CrossSectionModal } from './components/modals/CrossSectionModal';
import { GeometryConfirmationModal } from './components/modals/GeometryConfirmationModal';
import { Import3DModal } from './components/modals/Import3DModal';
import { AIReconstructionModal } from './components/modals/AIReconstructionModal';

export const App: React.FC = () => {
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  return (
    <ProjectProvider>
      <div className="app-container">
        {/* Top Header */}
        <Header />

        {/* 3-Panel Engineering Workspace */}
        <div className="workspace-layout">
          <LeftPanel />
          <Workspace />
          <RightPanel />
        </div>

        {/* Bottom Status Bar */}
        <StatusBar />

        {/* Modals */}
        <NewProjectModal />
        <ScaleCalibrationModal />
        <VerticalConfigModal />
        <CrossSectionModal />
        <GeometryConfirmationModal />
        <Import3DModal />
        <AIReconstructionModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
      </div>
    </ProjectProvider>
  );
};

export default App;
