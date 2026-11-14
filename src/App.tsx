/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProjectProvider, useProjectStore } from './store/useProjectStore';
import { CreateProjectView } from './views/CreateProjectView';
import { DashboardView } from './views/DashboardView';
import { EngineeringView } from './views/EngineeringView';
import { LandingPage } from './views/LandingPage';
import { ProjectSettingsView } from './views/ProjectSettingsView';
import { WorkspaceView } from './views/WorkspaceView';

const StorageWarningBar: React.FC = () => {
  const { storageWarning, clearStorageWarning } = useProjectStore();
  if (!storageWarning) return null;

  return (
    <div
      role="alert"
      className="bg-[#261C15] border-b border-[#F07827]/50 px-4 py-2 text-xs text-[#F2F4F7] flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-[#F07827] shrink-0" />
        <span className="truncate">{storageWarning}</span>
      </div>
      <button
        type="button"
        onClick={clearStorageWarning}
        aria-label="Dismiss storage alert"
        className="p-1 text-[#9AA4B2] hover:text-[#F2F4F7] cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { currentView } = useProjectStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'create':
        return <CreateProjectView />;
      case 'workspace':
        return <WorkspaceView />;
      case 'engineering':
        return <EngineeringView />;
      case 'settings':
        return <ProjectSettingsView />;
      case 'landing':
      default:
        return <LandingPage />;
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Application View Error">
      <StorageWarningBar />
      {renderView()}
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <AppRouter />
    </ProjectProvider>
  );
}
