/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastViewport } from './components/common/ToastViewport';
import { AuthWorkspaceProvider } from './store/useAuthWorkspaceStore';
import { ProjectProvider, useProjectStore } from './store/useProjectStore';

const LandingPage = lazy(() =>
  import('./views/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const DashboardView = lazy(() =>
  import('./views/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const CreateProjectView = lazy(() =>
  import('./views/CreateProjectView').then((m) => ({ default: m.CreateProjectView }))
);
const WorkspaceView = lazy(() =>
  import('./views/WorkspaceView').then((m) => ({ default: m.WorkspaceView }))
);
const EngineeringView = lazy(() =>
  import('./views/EngineeringView').then((m) => ({ default: m.EngineeringView }))
);
const ProjectSettingsView = lazy(() =>
  import('./views/ProjectSettingsView').then((m) => ({ default: m.ProjectSettingsView }))
);
const ContainerProjectView = lazy(() =>
  import('./views/ContainerProjectView').then((m) => ({ default: m.ContainerProjectView }))
);

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

const ViewLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#111318] text-[#F2F4F7] gap-3">
    <Loader2 className="w-7 h-7 text-[#F07827] animate-spin" />
    <span className="text-xs font-mono-tech text-[#9AA4B2] tracking-wide">
      Loading studio module...
    </span>
  </div>
);

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
      case 'container':
        return <ContainerProjectView />;
      case 'landing':
      default:
        return <LandingPage />;
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Application View Error">
      <StorageWarningBar />
      <Suspense fallback={<ViewLoadingFallback />}>{renderView()}</Suspense>
      <ToastViewport />
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <AuthWorkspaceProvider>
      <ProjectProvider>
        <AppRouter />
      </ProjectProvider>
    </AuthWorkspaceProvider>
  );
}
