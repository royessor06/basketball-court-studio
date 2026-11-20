import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Cloud,
  CloudOff,
  Compass,
  Grid3x3,
  History,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Redo2,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Undo2,
  X,
} from 'lucide-react';
import {
  StudioCameraPreset,
  StudioCloudSyncStatus,
  StudioProjection,
} from './types';

export interface StudioShellProps {
  title: string;
  moduleTag?: string;
  onBack: () => void;
  backLabel?: string;
  cloudBacked?: boolean;
  cloudSyncStatus?: StudioCloudSyncStatus;
  hasUnsavedChanges?: boolean;
  headerBadgeSlot?: React.ReactNode;
  headerRightActions?: React.ReactNode;
  cameraPreset: StudioCameraPreset;
  projection: StudioProjection;
  onSelectCamera: (preset: StudioCameraPreset) => void;
  onToggleProjection: (projection: StudioProjection) => void;
  onResetCamera: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showDimensions: boolean;
  onToggleDimensions: () => void;
  canRestoreSaved?: boolean;
  restoredNotice?: boolean;
  onRestore?: () => void;
  savedNotice?: boolean;
  onSave: () => void;
  leftSidebarTitle?: string;
  leftSidebar: React.ReactNode;
  rightSidebarTitle?: string;
  rightSidebar: React.ReactNode;
  viewport: React.ReactNode;
  viewportHint?: string;
  mobileQuickAction?: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
}

export const StudioShell: React.FC<StudioShellProps> = ({
  title,
  moduleTag,
  onBack,
  backLabel = 'Back to Workspaces',
  cloudBacked = false,
  cloudSyncStatus = 'idle',
  hasUnsavedChanges = false,
  headerBadgeSlot,
  headerRightActions,
  cameraPreset,
  projection,
  onSelectCamera,
  onToggleProjection,
  onResetCamera,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showGrid,
  onToggleGrid,
  showDimensions,
  onToggleDimensions,
  canRestoreSaved = false,
  restoredNotice = false,
  onRestore,
  savedNotice = false,
  onSave,
  leftSidebarTitle = 'Tools & Outliner',
  leftSidebar,
  rightSidebarTitle = 'Inspector',
  rightSidebar,
  viewport,
  viewportHint = 'Orbit: Left-drag · Pan: Right-drag · Zoom: Scroll',
  mobileQuickAction,
  footerLeft,
  footerRight,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && viewportContainerRef.current?.requestFullscreen) {
        await viewportContainerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        setIsFullscreen((f) => !f);
      }
    } catch {
      setIsFullscreen((f) => !f);
    }
  };

  return (
    <div className="h-dvh w-full flex flex-col bg-[#111318] text-[#F2F4F7] overflow-hidden">
      {/* Top CAD Toolbar */}
      <header className="h-13 shrink-0 bg-[#1A2029] border-b border-white/10 px-3 sm:px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] transition-colors cursor-pointer shrink-0"
            title={backLabel}
            aria-label={backLabel}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            {moduleTag && (
              <span className="hidden xl:inline text-[11px] font-mono-tech uppercase tracking-wider text-[#F07827]">
                {moduleTag}
              </span>
            )}
            <span className="font-display text-sm font-semibold text-[#F2F4F7] truncate max-w-[120px] sm:max-w-[200px]">
              {title}
            </span>
            {cloudBacked ? (
              <span
                className={`hidden md:inline-flex items-center gap-1 text-[11px] font-mono-tech ${
                  cloudSyncStatus === 'saving'
                    ? 'text-[#1686C9]'
                    : cloudSyncStatus === 'error'
                    ? 'text-red-400'
                    : 'text-[#4CC38A]'
                }`}
                title={
                  cloudSyncStatus === 'saving'
                    ? 'Saving specification to Firestore...'
                    : cloudSyncStatus === 'error'
                    ? 'Cloud sync failed — click Save to retry'
                    : 'Synced to Cloud Firestore'
                }
              >
                {cloudSyncStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : cloudSyncStatus === 'error' ? (
                  <CloudOff className="w-3 h-3" />
                ) : (
                  <Cloud className="w-3 h-3" />
                )}
                <span>
                  {cloudSyncStatus === 'saving'
                    ? 'Syncing'
                    : cloudSyncStatus === 'error'
                    ? 'Sync Error'
                    : 'Cloud'}
                </span>
              </span>
            ) : (
              hasUnsavedChanges && (
                <span className="hidden md:inline text-[11px] font-mono-tech text-[#F07827]">
                  Local Draft
                </span>
              )
            )}
            {headerBadgeSlot}
          </div>
        </div>

        {/* Center Camera Presets & Projection */}
        <div className="hidden lg:flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-[#111318] p-1 rounded-md border border-white/10">
            {(
              [
                { id: 'perspective', label: 'Perspective' },
                { id: 'top', label: 'Top' },
                { id: 'front', label: 'Front' },
                { id: 'side', label: 'Side' },
              ] as Array<{ id: StudioCameraPreset; label: string }>
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onSelectCamera(cam.id)}
                className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                  cameraPreset === cam.id
                    ? 'bg-[#202630] text-[#F07827] font-semibold'
                    : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 bg-[#111318] p-1 rounded-md border border-white/10">
            {(
              [
                { id: 'perspective', label: 'Persp' },
                { id: 'orthographic', label: 'Ortho' },
              ] as Array<{ id: StudioProjection; label: string }>
            ).map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => onToggleProjection(proj.id)}
                className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                  projection === proj.id
                    ? 'bg-[#1686C9] text-white font-medium'
                    : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                }`}
              >
                {proj.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onResetCamera}
            title="Reset Camera (R)"
            aria-label="Reset Camera"
            className="p-2 rounded bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className="p-2 rounded bg-[#202630] text-[#9AA4B2] hover:text-[#F2F4F7] disabled:opacity-35 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
              className="p-2 rounded bg-[#202630] text-[#9AA4B2] hover:text-[#F2F4F7] disabled:opacity-35 cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleGrid}
            title="Toggle Grid"
            aria-label="Toggle Grid"
            className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition-colors cursor-pointer ${
              showGrid
                ? 'bg-[#202630] border-[#1686C9]/60 text-[#1686C9]'
                : 'bg-[#202630] border-transparent text-[#9AA4B2]'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleDimensions}
            title="Toggle Dimensions"
            aria-label="Toggle Dimensions"
            className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition-colors cursor-pointer ${
              showDimensions
                ? 'bg-[#202630] border-[#F07827]/60 text-[#F07827]'
                : 'bg-[#202630] border-transparent text-[#9AA4B2]'
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Viewport'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Viewport'}
            className="hidden sm:flex p-2 min-w-[36px] min-h-[36px] items-center justify-center rounded bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {canRestoreSaved && onRestore && (
            <button
              type="button"
              onClick={onRestore}
              title="Restore last saved project state"
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] bg-[#202630] hover:bg-white/10 text-xs text-[#9AA4B2] hover:text-[#F2F4F7] rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5" />
              <span>{restoredNotice ? 'Restored' : 'Restore'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            title="Save project checkpoint (Ctrl+S)"
            aria-label="Save project checkpoint"
            className="px-3 py-1.5 min-h-[36px] bg-[#F07827] hover:bg-[#ff8a3d] text-[#111318] text-xs font-semibold rounded transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{savedNotice ? 'Saved' : 'Save'}</span>
          </button>

          {headerRightActions}
        </div>
      </header>

      {/* Main 3-Pane Workspace */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {!isFullscreen && (
          <aside className="hidden lg:block w-[256px] shrink-0 border-r border-white/10 h-full overflow-hidden">
            {leftSidebar}
          </aside>
        )}

        <main
          ref={viewportContainerRef}
          className={`flex-1 relative min-w-0 h-full bg-[#111318] ${
            isFullscreen ? 'fixed inset-0 z-50' : ''
          }`}
        >
          {viewport}

          {isFullscreen && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#1A2029]/95 border border-white/15 rounded-md p-1.5">
              {(['perspective', 'top', 'front', 'side'] as StudioCameraPreset[]).map((cam) => (
                <button
                  key={cam}
                  type="button"
                  onClick={() => onSelectCamera(cam)}
                  className={`px-2.5 py-1 text-xs capitalize rounded cursor-pointer ${
                    cameraPreset === cam
                      ? 'bg-[#F07827] text-[#111318] font-semibold'
                      : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                  }`}
                >
                  {cam}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  onToggleProjection(
                    projection === 'perspective' ? 'orthographic' : 'perspective'
                  )
                }
                className="px-2.5 py-1 text-xs rounded bg-[#1686C9] text-white cursor-pointer"
              >
                {projection === 'perspective' ? 'Persp' : 'Ortho'}
              </button>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="px-2.5 py-1 text-xs rounded bg-[#202630] text-[#F2F4F7] inline-flex items-center gap-1 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Exit
              </button>
            </div>
          )}

          {/* Subtle navigation & gizmo hint */}
          <div className="hidden lg:flex pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 bg-[#111318]/85 border border-white/10 rounded text-[11px] text-[#9AA4B2] items-center gap-2">
            <span>{viewportHint}</span>
          </div>

          {/* Mobile quick camera & drawer toggles */}
          <div className="lg:hidden absolute bottom-3 left-3 right-3 flex items-center justify-between gap-1.5 pointer-events-none">
            <button
              type="button"
              onClick={() => {
                setMobileRightOpen(false);
                setMobileLeftOpen((v) => !v);
              }}
              aria-label={`Open ${leftSidebarTitle}`}
              className="pointer-events-auto px-2.5 py-2.5 min-h-[44px] bg-[#1A2029]/95 border border-white/15 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 shadow-lg"
            >
              <Layers className="w-4 h-4 text-[#F07827]" />
              Tools
            </button>

            <div className="pointer-events-auto flex items-center gap-0.5 bg-[#1A2029]/95 border border-white/15 rounded-md p-1">
              <button
                type="button"
                aria-label="Perspective view"
                title="Perspective view"
                onClick={() => onSelectCamera('perspective')}
                className={`px-2 py-2 text-xs rounded min-h-[36px] ${
                  cameraPreset === 'perspective' ? 'text-[#F07827]' : 'text-[#9AA4B2]'
                }`}
              >
                <Compass className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Top view"
                title="Top view"
                onClick={() => onSelectCamera('top')}
                className={`px-2 py-2 text-xs rounded min-h-[36px] ${
                  cameraPreset === 'top' ? 'text-[#F07827] font-semibold' : 'text-[#9AA4B2]'
                }`}
              >
                Top
              </button>
              <button
                type="button"
                aria-label="Toggle Perspective or Orthographic projection"
                title="Toggle 3D Perspective / 2D Orthographic"
                onClick={() =>
                  onToggleProjection(
                    projection === 'perspective' ? 'orthographic' : 'perspective'
                  )
                }
                className="px-2 py-2 text-xs rounded text-[#1686C9] font-medium min-h-[36px]"
              >
                {projection === 'perspective' ? '3D' : '2D'}
              </button>
              {mobileQuickAction}
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileLeftOpen(false);
                setMobileRightOpen((v) => !v);
              }}
              aria-label={`Open ${rightSidebarTitle}`}
              className="pointer-events-auto px-2.5 py-2.5 min-h-[44px] bg-[#1A2029]/95 border border-white/15 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 shadow-lg"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#1686C9]" />
              Inspect
            </button>
          </div>

          {mobileLeftOpen && (
            <div className="lg:hidden absolute inset-y-0 left-0 w-[280px] max-w-[85vw] z-30 border-r border-white/15 shadow-2xl flex flex-col bg-[#1A2029]">
              <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-semibold">{leftSidebarTitle}</span>
                <button
                  type="button"
                  onClick={() => setMobileLeftOpen(false)}
                  className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#9AA4B2]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">{leftSidebar}</div>
            </div>
          )}

          {mobileRightOpen && (
            <div className="lg:hidden absolute inset-y-0 right-0 w-[290px] max-w-[88vw] z-30 border-l border-white/15 shadow-2xl flex flex-col bg-[#1A2029]">
              <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-semibold">{rightSidebarTitle}</span>
                <button
                  type="button"
                  onClick={() => setMobileRightOpen(false)}
                  className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#9AA4B2]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">{rightSidebar}</div>
            </div>
          )}
        </main>

        {!isFullscreen && (
          <aside className="hidden lg:block w-[300px] shrink-0 border-l border-white/10 h-full overflow-hidden">
            {rightSidebar}
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      {(footerLeft || footerRight) && (
        <footer className="h-8 shrink-0 bg-[#1A2029] border-t border-white/10 px-3 sm:px-4 flex items-center justify-between gap-4 text-[11px] text-[#9AA4B2]">
          <div className="flex items-center gap-3 sm:gap-5 overflow-hidden">{footerLeft}</div>
          <div className="hidden md:flex items-center gap-4 shrink-0">{footerRight}</div>
        </footer>
      )}
    </div>
  );
};
