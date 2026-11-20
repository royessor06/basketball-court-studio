import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  MousePointer,
  Move,
  Plus,
  RotateCw,
  Ruler,
  Settings,
  Sun,
  Moon,
  Sunset,
  Trash2,
} from 'lucide-react';
import {
  buildSportLayersForFacility,
  COURT_STANDARDS,
  formatArea,
  formatLength,
  GROUND_SYSTEM_PRESETS,
  metersToUnitValue,
  SURFACE_PRESETS,
  unitValueToMeters,
} from '../constants/courtStandards';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { StudioShell } from '../core/StudioShell';
import { resolveEffectiveSportLayers } from '../sports/markingPrimitives';
import { useProjectStore } from '../store/useProjectStore';
import { CourtViewport } from '../three/CourtScene';
import {
  BackboardStyle,
  CameraPreset,
  CameraProjection,
  CameraSettings,
  CourtEnvironment,
  CourtStandard,
  GroundSystemType,
  LayerSportType,
  LightingMode,
  ProjectStatus,
  RenderMode,
  SceneObject,
  SceneObjectType,
  SupportStyle,
  SurroundingsPreset,
  ToolMode,
} from '../types/court';

export const WorkspaceView: React.FC = () => {
  const {
    activeProject,
    setCurrentView,
    openProjectEngineering,
    openProjectSettings,
    updateProject,
    updateEnvironmentSettings,
    updateCameraSettings,
    updateProjectObject,
    addSceneObject,
    duplicateSceneObject,
    removeSceneObject,
    addSportLayer,
    updateSportLayer,
    removeSportLayer,
    setGroundSystem,
    saveProjectSnapshot,
    restoreSavedSnapshot,
    updateProjectStatus,
    undo,
    redo,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    canRestoreSaved,
    cloudSyncStatus,
    isActiveProjectCloudBacked,
  } = useProjectStore();

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'selection' | 'court'>('court');
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(
    activeProject?.cameraSettings?.preset ?? 'perspective'
  );
  const [projection, setProjection] = useState<CameraProjection>(
    activeProject?.cameraSettings?.projection ?? 'perspective'
  );
  const [presetVersion, setPresetVersion] = useState(0);
  const [cameraSyncKey, setCameraSyncKey] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState(false);

  useEffect(() => {
    if (activeProject?.cameraSettings) {
      setCameraPreset(activeProject.cameraSettings.preset);
      setProjection(activeProject.cameraSettings.projection);
    }
  }, [activeProject?.id]);

  const handleSelectObject = useCallback((id: string | null) => {
    setSelectedObjectId(id);
    if (id) {
      setInspectorTab('selection');
    }
  }, []);

  const handleSelectCamera = useCallback(
    (preset: CameraPreset) => {
      setCameraPreset(preset);
      setPresetVersion((v) => v + 1);
      if (activeProject) {
        updateCameraSettings(activeProject.id, { preset });
      }
    },
    [activeProject, updateCameraSettings]
  );

  const handleToggleProjection = useCallback(
    (nextProj: CameraProjection) => {
      setProjection(nextProj);
      if (activeProject) {
        updateCameraSettings(activeProject.id, { projection: nextProj });
      }
    },
    [activeProject, updateCameraSettings]
  );

  const handleResetCamera = useCallback(() => {
    setPresetVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeProject && saveProjectSnapshot(activeProject.id)) {
          setSavedNotice(true);
          window.setTimeout(() => setSavedNotice(false), 1800);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (selectedObjectId) {
          setSelectedObjectId(null);
          return;
        }
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && activeProject && selectedObjectId) {
        e.preventDefault();
        const dup = duplicateSceneObject(activeProject.id, selectedObjectId);
        if (dup) setSelectedObjectId(dup.id);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeProject && selectedObjectId) {
        const obj = activeProject.objects.find((o) => o.id === selectedObjectId);
        if (obj && !obj.locked) {
          e.preventDefault();
          removeSceneObject(activeProject.id, selectedObjectId);
          setSelectedObjectId(null);
        }
        return;
      }
      if (e.key === '1') handleSelectCamera('perspective');
      else if (e.key === '2') handleSelectCamera('top');
      else if (e.key === '3') handleSelectCamera('front');
      else if (e.key === '4') handleSelectCamera('side');
      else if (e.key === 'v' || e.key === 'V') setToolMode('select');
      else if (e.key === 'g' || e.key === 'G') setToolMode('move');
      else if (e.key === 'e' || e.key === 'E') setToolMode('rotate');
      else if (e.key === 'r' || e.key === 'R') handleResetCamera();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeProject,
    selectedObjectId,
    saveProjectSnapshot,
    undo,
    redo,
    duplicateSceneObject,
    removeSceneObject,
    handleSelectCamera,
    handleResetCamera,
  ]);

  if (!activeProject) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#111318] text-[#F2F4F7] p-6">
        <p className="text-sm font-medium mb-3">No active project selected.</p>
        <button
          type="button"
          onClick={() => setCurrentView('dashboard')}
          className="px-4 py-2 bg-[#F07827] text-[#111318] text-xs font-semibold rounded-md cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const project = activeProject;
  const spec = COURT_STANDARDS[project.standard];
  const selectedObject: SceneObject | undefined = project.objects.find(
    (o) => o.id === selectedObjectId
  );

  const handleSave = () => {
    if (saveProjectSnapshot(project.id)) {
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 1800);
    }
  };

  const handleRestore = () => {
    if (restoreSavedSnapshot(project.id)) {
      setSelectedObjectId(null);
      setPresetVersion(0);
      setCameraSyncKey((k) => k + 1);
      setRestoredNotice(true);
      window.setTimeout(() => setRestoredNotice(false), 1800);
    }
  };

  const handleAddObject = (type: SceneObjectType) => {
    const created = addSceneObject(project.id, type);
    if (created) {
      setSelectedObjectId(created.id);
      setInspectorTab('selection');
    }
  };

  const handleDuplicateSelected = () => {
    if (!selectedObject) return;
    const dup = duplicateSceneObject(project.id, selectedObject.id);
    if (dup) setSelectedObjectId(dup.id);
  };

  const handleTransformCommit = useCallback(
    (id: string, pos: [number, number, number], rotY: number) => {
      updateProjectObject(project.id, id, { position: pos, rotationY: rotY });
    },
    [project.id, updateProjectObject]
  );

  const handleCameraSettled = useCallback(
    (cam: Partial<CameraSettings>) => {
      updateCameraSettings(project.id, cam);
    },
    [project.id, updateCameraSettings]
  );

  const handleSelectFromOutliner = (id: string) => {
    handleSelectObject(id);
  };

  const playingAreaSqM = project.dimensions.lengthM * project.dimensions.widthM;
  const totalLenM = project.dimensions.lengthM + project.dimensions.apronM * 2;
  const totalWidM = project.dimensions.widthM + project.dimensions.apronM * 2;
  const totalAreaSqM = totalLenM * totalWidM;

  const LeftSidebarContent = (
    <div className="flex flex-col h-full bg-[#1A2029] text-[#F2F4F7]">
      {/* Tool Palette */}
      <div className="p-3 border-b border-white/10">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2] mb-2">
          Transform &amp; Tools
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: 'select' as ToolMode, label: 'Select', icon: MousePointer },
            { id: 'move' as ToolMode, label: 'Move', icon: Move },
            { id: 'rotate' as ToolMode, label: 'Rotate', icon: RotateCw },
            { id: 'measure' as ToolMode, label: 'Measure', icon: Ruler },
          ].map((tool) => {
            const Icon = tool.icon;
            const active = toolMode === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setToolMode(tool.id);
                  if (tool.id === 'measure') setShowDimensions(true);
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded text-[10px] font-medium transition-colors cursor-pointer min-h-[44px] ${
                  active
                    ? 'bg-[#F07827] text-[#111318] font-semibold'
                    : 'bg-[#202630] text-[#9AA4B2] hover:text-[#F2F4F7]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Equipment Palette */}
      <div className="p-3 border-b border-white/10">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2] mb-2">
          Add Sports Equipment
        </div>
        <div className="grid grid-cols-2 gap-1 max-h-[210px] overflow-y-auto pr-0.5">
          {(
            [
              { type: 'hoop_assembly', label: 'Basket Hoop' },
              { type: 'football_goal', label: 'Football Goal' },
              { type: 'handball_goal', label: 'Handball Goal' },
              { type: 'volleyball_net', label: 'Volley Net' },
              { type: 'tennis_net', label: 'Tennis Net' },
              { type: 'multisport_combo_goal', label: 'Combo Goal' },
              { type: 'dugout_shelter', label: 'Dugout Shelter' },
              { type: 'corner_flag', label: 'Corner Flag' },
              { type: 'player_bench', label: 'Team Bench' },
              { type: 'scorer_table', label: 'Scorer Table' },
              { type: 'lighting_mast', label: 'Light Mast' },
              { type: 'perimeter_fence', label: 'Fence Span' },
              { type: 'scoreboard', label: 'Scoreboard' },
              { type: 'bleachers', label: 'Bleachers' },
              { type: 'ball_rack', label: 'Ball Rack' },
            ] as Array<{ type: SceneObjectType; label: string }>
          ).map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => handleAddObject(item.type)}
              className="w-full px-2 py-1.5 bg-[#202630] hover:bg-[#28303d] border border-white/8 rounded text-[11px] text-[#F2F4F7] flex items-center justify-between gap-1 transition-colors cursor-pointer min-h-[32px]"
            >
              <span className="truncate">{item.label}</span>
              <Plus className="w-3 h-3 text-[#F07827] shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Project Structure / Outliner */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2]">
            Scene Objects
          </span>
          <span className="font-mono-tech text-[11px] text-[#9AA4B2]">
            {project.objects.length}
          </span>
        </div>

        <div className="space-y-1">
          {project.objects.map((obj) => {
            const isSelected = obj.id === selectedObjectId;
            return (
              <div
                key={obj.id}
                className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded text-xs transition-colors min-h-[34px] ${
                  isSelected
                    ? 'bg-[#1686C9]/25 border border-[#1686C9] text-[#F2F4F7]'
                    : 'hover:bg-[#202630] border border-transparent text-[#9AA4B2]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectFromOutliner(obj.id)}
                  className="flex-1 text-left truncate cursor-pointer text-[#F2F4F7]"
                >
                  {obj.name}
                </button>
                <button
                  type="button"
                  aria-label={obj.visible ? `Hide ${obj.name}` : `Show ${obj.name}`}
                  onClick={() =>
                    updateProjectObject(project.id, obj.id, { visible: !obj.visible })
                  }
                  className="p-1 text-[#9AA4B2] hover:text-[#F2F4F7] cursor-pointer"
                >
                  {obj.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const RightSidebarContent = (
    <div className="flex flex-col h-full bg-[#1A2029] text-[#F2F4F7] overflow-hidden">
      {/* Inspector Mode Tabs */}
      <div className="p-2 border-b border-white/10 grid grid-cols-2 gap-1 bg-[#161B23]">
        <button
          type="button"
          onClick={() => setInspectorTab('selection')}
          className={`py-1.5 px-2 text-xs font-medium rounded transition-colors cursor-pointer ${
            inspectorTab === 'selection'
              ? 'bg-[#202630] text-[#F2F4F7] border border-white/10'
              : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
          }`}
        >
          Object Properties
        </button>
        <button
          type="button"
          onClick={() => setInspectorTab('court')}
          className={`py-1.5 px-2 text-xs font-medium rounded transition-colors cursor-pointer ${
            inspectorTab === 'court'
              ? 'bg-[#202630] text-[#F2F4F7] border border-white/10'
              : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
          }`}
        >
          Court &amp; Environment
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {inspectorTab === 'selection' ? (
          selectedObject ? (
            <div className="p-4 space-y-5">
              <div>
                <label className="block text-[11px] text-[#9AA4B2] mb-1">Object Name</label>
                <input
                  type="text"
                  value={selectedObject.name}
                  onChange={(e) =>
                    updateProjectObject(project.id, selectedObject.id, { name: e.target.value })
                  }
                  className="w-full px-2.5 py-2 bg-[#111318] border border-white/15 rounded text-xs text-[#F2F4F7] focus:outline-none focus:border-[#F07827]"
                />
                <div className="mt-1.5 text-[11px] font-mono-tech text-[#9AA4B2]">
                  Class: {selectedObject.type}
                </div>
              </div>

              {/* Transform Position & Rotation */}
              <div className="space-y-2.5 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F2F4F7]">
                    Position ({project.unit})
                  </span>
                  {!selectedObject.locked && (
                    <span className="text-[10px] text-[#9AA4B2]">Use Move/Rotate gizmo or type</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                    <div key={axis}>
                      <label className="block text-[10px] font-mono-tech text-[#9AA4B2] mb-1">
                        {axis}
                      </label>
                      <input
                        type="number"
                        step="0.2"
                        disabled={selectedObject.locked}
                        value={metersToUnitValue(selectedObject.position[idx], project.unit)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (Number.isNaN(val)) return;
                          const nextPos = [...selectedObject.position] as [number, number, number];
                          nextPos[idx] = unitValueToMeters(val, project.unit);
                          updateProjectObject(project.id, selectedObject.id, { position: nextPos });
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7] disabled:opacity-50 focus:outline-none focus:border-[#1686C9]"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-[#9AA4B2]">Rotation (deg)</label>
                    {!selectedObject.locked && (
                      <button
                        type="button"
                        onClick={() =>
                          updateProjectObject(project.id, selectedObject.id, {
                            rotationY: selectedObject.rotationY + Math.PI / 2,
                          })
                        }
                        className="text-[10px] text-[#1686C9] hover:underline cursor-pointer"
                      >
                        +90°
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="15"
                    disabled={selectedObject.locked}
                    value={Math.round((selectedObject.rotationY * 180) / Math.PI)}
                    onChange={(e) => {
                      const deg = parseFloat(e.target.value);
                      if (!Number.isNaN(deg)) {
                        updateProjectObject(project.id, selectedObject.id, {
                          rotationY: (deg * Math.PI) / 180,
                        });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7] disabled:opacity-50 focus:outline-none focus:border-[#1686C9]"
                  />
                </div>
              </div>

              {/* Hoop & Support Customization */}
              {selectedObject.type === 'hoop_assembly' && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="text-xs font-semibold text-[#F2F4F7]">
                    Hoop &amp; Support Structure
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#9AA4B2] mb-1">
                      Backboard Style
                    </label>
                    <select
                      value={selectedObject.metadata?.backboardType ?? 'tempered_glass'}
                      onChange={(e) =>
                        updateProjectObject(project.id, selectedObject.id, {
                          metadata: {
                            ...selectedObject.metadata,
                            backboardType: e.target.value as BackboardStyle,
                          },
                        })
                      }
                      className="w-full px-2.5 py-2 bg-[#111318] border border-white/15 rounded text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
                    >
                      <option value="tempered_glass">Tempered Glass (Arena Pro)</option>
                      <option value="frosted_acrylic">Frosted Acrylic</option>
                      <option value="solid_steel">Solid Steel Rectangular</option>
                      <option value="fan_outdoor">Outdoor Fan-Shaped Steel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#9AA4B2] mb-1">
                      Support Structure
                    </label>
                    <select
                      value={selectedObject.metadata?.supportStyle ?? 'hydraulic_boom'}
                      onChange={(e) =>
                        updateProjectObject(project.id, selectedObject.id, {
                          metadata: {
                            ...selectedObject.metadata,
                            supportStyle: e.target.value as SupportStyle,
                          },
                        })
                      }
                      className="w-full px-2.5 py-2 bg-[#111318] border border-white/15 rounded text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
                    >
                      <option value="hydraulic_boom">Hydraulic Arena Boom</option>
                      <option value="gooseneck_post">Gooseneck Outdoor Post</option>
                      <option value="wall_mount">Wall-Mount Truss Rig</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#9AA4B2] mb-1">
                        Rim Height (m)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="2.2"
                        max="3.2"
                        value={selectedObject.metadata?.rimHeightM ?? 3.05}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                rimHeightM: Math.max(2.2, Math.min(3.2, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9AA4B2] mb-1">
                        Arm Reach (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="3.4"
                        value={selectedObject.metadata?.extensionArmM ?? 2.05}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                extensionArmM: Math.max(1.0, Math.min(3.4, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Goal Properties (Football & Handball) */}
              {(selectedObject.type === 'football_goal' ||
                selectedObject.type === 'handball_goal') && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="text-xs font-semibold text-[#F2F4F7]">
                    Goal Frame Dimensions
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="goal-width" className="block text-[10px] text-[#9AA4B2] mb-1">
                        Width (m)
                      </label>
                      <input
                        id="goal-width"
                        type="number"
                        step="0.1"
                        min="2.0"
                        max="8.0"
                        value={
                          selectedObject.metadata?.goalWidthM ??
                          (selectedObject.type === 'football_goal' ? 7.32 : 3.0)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                goalWidthM: Math.max(2.0, Math.min(8.0, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                    <div>
                      <label htmlFor="goal-height" className="block text-[10px] text-[#9AA4B2] mb-1">
                        Height (m)
                      </label>
                      <input
                        id="goal-height"
                        type="number"
                        step="0.05"
                        min="1.5"
                        max="2.6"
                        value={
                          selectedObject.metadata?.goalHeightM ??
                          (selectedObject.type === 'football_goal' ? 2.44 : 2.0)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                goalHeightM: Math.max(1.5, Math.min(2.6, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                    <div>
                      <label htmlFor="goal-depth" className="block text-[10px] text-[#9AA4B2] mb-1">
                        Depth (m)
                      </label>
                      <input
                        id="goal-depth"
                        type="number"
                        step="0.1"
                        min="0.8"
                        max="2.5"
                        value={
                          selectedObject.metadata?.goalDepthM ??
                          (selectedObject.type === 'football_goal' ? 2.0 : 1.0)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                goalDepthM: Math.max(0.8, Math.min(2.5, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Combo Goal Properties */}
              {selectedObject.type === 'multisport_combo_goal' && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="text-xs font-semibold text-[#F2F4F7]">
                    Multi-Sport Combo Goal
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="combo-goal-w" className="block text-[10px] text-[#9AA4B2] mb-1">
                        Goal Width (m)
                      </label>
                      <input
                        id="combo-goal-w"
                        type="number"
                        step="0.2"
                        min="2.0"
                        max="4.0"
                        value={selectedObject.metadata?.goalWidthM ?? 3.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                goalWidthM: Math.max(2.0, Math.min(4.0, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                    <div>
                      <label htmlFor="combo-rim-h" className="block text-[10px] text-[#9AA4B2] mb-1">
                        Rim Height (m)
                      </label>
                      <input
                        id="combo-rim-h"
                        type="number"
                        step="0.05"
                        min="2.2"
                        max="3.2"
                        value={selectedObject.metadata?.rimHeightM ?? 3.05}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                rimHeightM: Math.max(2.2, Math.min(3.2, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Net Properties (Volleyball & Tennis) */}
              {(selectedObject.type === 'volleyball_net' ||
                selectedObject.type === 'tennis_net') && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="text-xs font-semibold text-[#F2F4F7]">
                    Net &amp; Post Geometry
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="net-height" className="block text-[10px] text-[#9AA4B2] mb-1">
                        Net Top Height (m)
                      </label>
                      <input
                        id="net-height"
                        type="number"
                        step="0.02"
                        min="0.8"
                        max="2.6"
                        value={
                          selectedObject.metadata?.netHeightM ??
                          (selectedObject.type === 'tennis_net' ? 1.07 : 2.43)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                netHeightM: Math.max(0.8, Math.min(2.6, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                    <div>
                      <label htmlFor="net-width" className="block text-[10px] text-[#9AA4B2] mb-1">
                        Post Span (m)
                      </label>
                      <input
                        id="net-width"
                        type="number"
                        step="0.2"
                        min="6.0"
                        max="15.0"
                        value={
                          selectedObject.metadata?.netWidthM ??
                          (selectedObject.type === 'tennis_net' ? 12.8 : 10.0)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateProjectObject(project.id, selectedObject.id, {
                              metadata: {
                                ...selectedObject.metadata,
                                netWidthM: Math.max(6.0, Math.min(15.0, val)),
                              },
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Lighting Mast Height */}
              {selectedObject.type === 'lighting_mast' && (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9AA4B2]">Mast Height</span>
                    <span className="font-mono-tech">
                      {formatLength(selectedObject.metadata?.poleHeightM ?? 6.5, project.unit, 1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Lighting mast height in meters"
                    min="4"
                    max="18"
                    step="0.5"
                    value={selectedObject.metadata?.poleHeightM ?? 6.5}
                    onChange={(e) =>
                      updateProjectObject(project.id, selectedObject.id, {
                        metadata: {
                          ...selectedObject.metadata,
                          poleHeightM: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#F07827]"
                  />
                </div>
              )}

              {/* Perimeter Fence Span & Height */}
              {selectedObject.type === 'perimeter_fence' && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#9AA4B2]">Fence Span</span>
                      <span className="font-mono-tech">
                        {formatLength(selectedObject.metadata?.fenceLengthM ?? 18, project.unit, 1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Perimeter fence span length"
                      min="4"
                      max="90"
                      step="1"
                      value={selectedObject.metadata?.fenceLengthM ?? 18}
                      onChange={(e) =>
                        updateProjectObject(project.id, selectedObject.id, {
                          metadata: {
                            ...selectedObject.metadata,
                            fenceLengthM: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-[#F07827]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#9AA4B2]">Fence Height</span>
                      <span className="font-mono-tech">
                        {formatLength(selectedObject.metadata?.fenceHeightM ?? 3.2, project.unit, 1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Perimeter fence height"
                      min="1.2"
                      max="6.0"
                      step="0.2"
                      value={selectedObject.metadata?.fenceHeightM ?? 3.2}
                      onChange={(e) =>
                        updateProjectObject(project.id, selectedObject.id, {
                          metadata: {
                            ...selectedObject.metadata,
                            fenceHeightM: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-[#1686C9]"
                    />
                  </div>
                </div>
              )}

              {/* Component Finishes */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="text-xs font-semibold text-[#F2F4F7]">Component Finishes</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9AA4B2]">Primary Colour</span>
                  <input
                    type="color"
                    aria-label="Primary color"
                    value={selectedObject.color}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedObjects = project.objects.map((o) =>
                        o.id === selectedObject.id ? { ...o, color: val } : o
                      );
                      if (selectedObject.type === 'court_slab') {
                        updateProject(project.id, {
                          objects: updatedObjects,
                          materials: { ...project.materials, apronColor: val },
                        });
                      } else if (selectedObject.type === 'playing_surface') {
                        updateProject(project.id, {
                          objects: updatedObjects,
                          materials: { ...project.materials, surfaceColor: val },
                        });
                      } else if (
                        selectedObject.type === 'boundary_lines' ||
                        selectedObject.type === 'centre_markings' ||
                        selectedObject.type === 'free_throw_areas' ||
                        selectedObject.type === 'three_point_lines'
                      ) {
                        updateProject(project.id, {
                          objects: updatedObjects,
                          materials: { ...project.materials, lineColor: val },
                        });
                      } else {
                        updateProjectObject(project.id, selectedObject.id, { color: val });
                      }
                    }}
                    className="w-9 h-7 rounded bg-transparent border border-white/20 cursor-pointer"
                  />
                </div>
                {selectedObject.secondaryColor && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9AA4B2]">Accent / Padding</span>
                    <input
                      type="color"
                      aria-label="Accent color"
                      value={selectedObject.secondaryColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updatedObjects = project.objects.map((o) =>
                          o.id === selectedObject.id ? { ...o, secondaryColor: val } : o
                        );
                        if (
                          selectedObject.type === 'free_throw_areas' ||
                          selectedObject.type === 'centre_markings' ||
                          selectedObject.type === 'playing_surface'
                        ) {
                          updateProject(project.id, {
                            objects: updatedObjects,
                            materials: { ...project.materials, paintColor: val },
                          });
                        } else {
                          updateProjectObject(project.id, selectedObject.id, {
                            secondaryColor: val,
                          });
                        }
                      }}
                      className="w-9 h-7 rounded bg-transparent border border-white/20 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Object Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    updateProjectObject(project.id, selectedObject.id, {
                      visible: !selectedObject.visible,
                    })
                  }
                  className="flex-1 py-2 px-2 bg-[#202630] hover:bg-white/10 text-xs font-medium rounded transition-colors cursor-pointer min-h-[38px]"
                >
                  {selectedObject.visible ? 'Hide' : 'Show'}
                </button>
                {!selectedObject.locked && (
                  <>
                    <button
                      type="button"
                      onClick={handleDuplicateSelected}
                      title="Duplicate (Ctrl+D)"
                      className="py-2 px-2.5 bg-[#202630] hover:bg-[#1686C9]/25 text-xs font-medium text-[#F2F4F7] rounded inline-flex items-center gap-1 transition-colors cursor-pointer min-h-[38px]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Dup
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeSceneObject(project.id, selectedObject.id);
                        setSelectedObjectId(null);
                      }}
                      className="p-2 bg-[#202630] hover:bg-red-500/20 text-[#9AA4B2] hover:text-red-400 rounded transition-colors cursor-pointer min-h-[38px]"
                      title="Delete Object"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-[#F2F4F7] font-medium">No scene object selected</p>
              <p className="text-xs text-[#9AA4B2]">
                Click any hoop, bench, lighting pole, or court layer in the 3D scene to edit its
                properties, or switch to Court &amp; Environment.
              </p>
              <button
                type="button"
                onClick={() => setInspectorTab('court')}
                className="px-3.5 py-2 bg-[#202630] hover:bg-white/10 text-xs rounded text-[#F07827] cursor-pointer"
              >
                Open Court &amp; Environment
              </button>
            </div>
          )
        ) : (
          /* Court & Environment Customization Panel */
          <div className="p-4 space-y-5">
            {/* Environment & Lighting */}
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2]">
                Environment &amp; Lighting
              </div>

              {/* Indoor / Outdoor */}
              <div className="grid grid-cols-2 gap-1.5">
                {(['indoor', 'outdoor'] as CourtEnvironment[]).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() =>
                      updateProject(project.id, {
                        environment: env,
                        environmentSettings: {
                          ...project.environmentSettings,
                          surroundings: env === 'indoor' ? 'arena' : 'park',
                        },
                      })
                    }
                    className={`py-2 px-2 text-xs capitalize rounded border transition-colors cursor-pointer ${
                      project.environment === env
                        ? 'bg-[#202630] border-[#1686C9] text-[#F2F4F7] font-medium'
                        : 'bg-[#111318] border-white/10 text-[#9AA4B2]'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>

              {/* Lighting Mode: Daylight / Sunset / Night */}
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'daylight', label: 'Daylight', icon: Sun },
                    { id: 'sunset', label: 'Sunset', icon: Sunset },
                    { id: 'night', label: 'Night', icon: Moon },
                  ] as Array<{ id: LightingMode; label: string; icon: React.ComponentType<{ className?: string }> }>
                ).map((l) => {
                  const Icon = l.icon;
                  const active = project.environmentSettings.lightingMode === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => updateEnvironmentSettings(project.id, { lightingMode: l.id })}
                      className={`py-2 px-1 rounded border text-[11px] flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#202630] border-[#F07827] text-[#F2F4F7] font-medium'
                          : 'bg-[#111318] border-white/10 text-[#9AA4B2]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{l.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Surroundings Preset */}
              <div>
                <label className="block text-[11px] text-[#9AA4B2] mb-1">Court Surroundings</label>
                <select
                  value={project.environmentSettings.surroundings}
                  onChange={(e) =>
                    updateEnvironmentSettings(project.id, {
                      surroundings: e.target.value as SurroundingsPreset,
                    })
                  }
                  className="w-full px-2.5 py-2 bg-[#111318] border border-white/15 rounded text-xs text-[#F2F4F7]"
                >
                  <option value="arena">Arena Walls &amp; Roof Trusses</option>
                  <option value="park">Park Plaza &amp; Trees</option>
                  <option value="rooftop">Rooftop Deck &amp; Parapet</option>
                  <option value="minimal">Minimal CAD Plinth</option>
                </select>
              </div>

              {/* Visualization Mode & Shadows */}
              <div>
                <div className="text-[11px] text-[#9AA4B2] mb-1">Visualization Mode</div>
                <div className="grid grid-cols-3 gap-1 bg-[#111318] p-1 rounded border border-white/10">
                  {(
                    [
                      { id: 'realistic', label: 'Realistic' },
                      { id: 'architectural', label: 'Arch.' },
                      { id: 'technical', label: 'Technical' },
                    ] as Array<{ id: RenderMode; label: string }>
                  ).map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => updateEnvironmentSettings(project.id, { renderMode: rm.id })}
                      className={`py-1.5 px-1 text-[11px] rounded transition-colors cursor-pointer ${
                        project.environmentSettings.renderMode === rm.id
                          ? rm.id === 'technical'
                            ? 'bg-[#1686C9] text-white font-medium'
                            : 'bg-[#F07827] text-[#111318] font-semibold'
                          : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                      }`}
                    >
                      {rm.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateEnvironmentSettings(project.id, {
                    shadowsEnabled: !project.environmentSettings.shadowsEnabled,
                  })
                }
                className={`w-full py-2 px-2 text-[11px] rounded border transition-colors cursor-pointer ${
                  project.environmentSettings.shadowsEnabled
                    ? 'bg-[#202630] border-[#F07827]/70 text-[#F2F4F7]'
                    : 'bg-[#111318] border-white/10 text-[#9AA4B2]'
                }`}
              >
                Shadows: {project.environmentSettings.shadowsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Dimensions, Safety Zones & Orientation */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2]">
                Dimensions &amp; Orientation
              </div>

              <div>
                <label htmlFor="ws-standard" className="block text-[11px] text-[#9AA4B2] mb-1">
                  Facility Standard
                </label>
                <select
                  id="ws-standard"
                  value={project.standard}
                  onChange={(e) => {
                    const std = e.target.value as CourtStandard;
                    const s = COURT_STANDARDS[std];
                    const nextLen = std === 'CUSTOM' ? project.dimensions.lengthM : s.lengthM;
                    const nextWid = std === 'CUSTOM' ? project.dimensions.widthM : s.widthM;
                    updateProject(project.id, {
                      sport: s.sport,
                      standard: std,
                      dimensions: {
                        ...project.dimensions,
                        lengthM: nextLen,
                        widthM: nextWid,
                        isHalfCourt: s.isHalfCourt,
                      },
                      sportLayers: buildSportLayersForFacility(
                        std,
                        nextLen,
                        nextWid,
                        project.materials
                      ),
                    });
                  }}
                  className="w-full px-2.5 py-2 bg-[#111318] border border-white/15 rounded text-xs text-[#F2F4F7]"
                >
                  {(Object.keys(COURT_STANDARDS) as CourtStandard[]).map((std) => (
                    <option key={std} value={std}>
                      {COURT_STANDARDS[std].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="ws-len" className="block text-[10px] text-[#9AA4B2] mb-1">
                    Length ({project.unit})
                  </label>
                  <input
                    id="ws-len"
                    type="number"
                    step="0.5"
                    value={metersToUnitValue(project.dimensions.lengthM, project.unit)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        updateProject(project.id, {
                          standard: 'CUSTOM',
                          dimensions: {
                            ...project.dimensions,
                            lengthM: Math.max(8, Math.min(135, unitValueToMeters(val, project.unit))),
                          },
                        });
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                  />
                </div>
                <div>
                  <label htmlFor="ws-wid" className="block text-[10px] text-[#9AA4B2] mb-1">
                    Width ({project.unit})
                  </label>
                  <input
                    id="ws-wid"
                    type="number"
                    step="0.5"
                    value={metersToUnitValue(project.dimensions.widthM, project.unit)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        updateProject(project.id, {
                          standard: 'CUSTOM',
                          dimensions: {
                            ...project.dimensions,
                            widthM: Math.max(6, Math.min(95, unitValueToMeters(val, project.unit))),
                          },
                        });
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                  />
                </div>
                <div>
                  <label htmlFor="ws-apron" className="block text-[10px] text-[#9AA4B2] mb-1">
                    Safety ({project.unit})
                  </label>
                  <input
                    id="ws-apron"
                    type="number"
                    step="0.2"
                    value={metersToUnitValue(project.dimensions.apronM, project.unit)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        updateProject(project.id, {
                          dimensions: {
                            ...project.dimensions,
                            apronM: Math.max(0.5, Math.min(12, unitValueToMeters(val, project.unit))),
                          },
                        });
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#9AA4B2]">Court Orientation</span>
                  <span className="font-mono-tech text-[#F2F4F7]">
                    {project.dimensions.orientationDeg ?? 0}°
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Court orientation angle"
                  min="0"
                  max="355"
                  step="5"
                  value={project.dimensions.orientationDeg ?? 0}
                  onChange={(e) =>
                    updateProject(project.id, {
                      dimensions: {
                        ...project.dimensions,
                        orientationDeg: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full accent-[#1686C9]"
                />
              </div>

              <label className="flex items-center justify-between text-xs text-[#9AA4B2] cursor-pointer">
                <span>Highlight Safety Zone Boundary</span>
                <input
                  type="checkbox"
                  checked={project.dimensions.showSafetyZone ?? true}
                  onChange={(e) =>
                    updateProject(project.id, {
                      dimensions: {
                        ...project.dimensions,
                        showSafetyZone: e.target.checked,
                      },
                    })
                  }
                  className="accent-[#1686C9]"
                />
              </label>
            </div>

            {/* Sport Marking Layers */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2]">
                  Sport Marking Layers
                </span>
                <select
                  aria-label="Add sport marking layer"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value as LayerSportType;
                    if (val) addSportLayer(project.id, val);
                  }}
                  className="px-2 py-1 bg-[#202630] border border-white/15 rounded text-[11px] text-[#F07827] cursor-pointer focus:outline-none"
                >
                  <option value="">+ Add Layer</option>
                  <option value="basketball">Basketball</option>
                  <option value="football">Football / 5v5</option>
                  <option value="handball">Handball (IHF)</option>
                  <option value="volleyball">Volleyball</option>
                  <option value="tennis">Tennis (ITF)</option>
                </select>
              </div>

              <div className="space-y-2">
                {resolveEffectiveSportLayers(project).map((layer, idx, arr) => (
                  <div
                    key={layer.id}
                    className="p-2.5 bg-[#111318] border border-white/10 rounded space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#F2F4F7] truncate">
                          {layer.name}
                        </div>
                        <div className="text-[10px] font-mono-tech text-[#9AA4B2]">
                          {layer.lengthM.toFixed(1)}×{layer.widthM.toFixed(1)} m
                        </div>
                      </div>
                      <input
                        type="color"
                        aria-label={`Line colour for ${layer.name}`}
                        value={layer.lineColor}
                        onChange={(e) =>
                          updateSportLayer(project.id, layer.id, { lineColor: e.target.value })
                        }
                        className="w-6 h-6 rounded bg-transparent border border-white/20 cursor-pointer shrink-0"
                      />
                      <button
                        type="button"
                        aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                        onClick={() =>
                          updateSportLayer(project.id, layer.id, { visible: !layer.visible })
                        }
                        className="p-1 text-[#9AA4B2] hover:text-[#F2F4F7] cursor-pointer"
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {arr.length > 1 && idx >= 0 && (
                        <button
                          type="button"
                          aria-label={`Remove ${layer.name}`}
                          onClick={() => removeSportLayer(project.id, layer.id)}
                          className="p-1 text-[#9AA4B2] hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[9px] text-[#9AA4B2]">Off X (m)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={layer.offsetX}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isNaN(v)) {
                              updateSportLayer(project.id, layer.id, { offsetX: v });
                            }
                          }}
                          className="w-full px-1.5 py-1 bg-[#1A2029] border border-white/10 rounded font-mono-tech text-[11px] text-[#F2F4F7]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#9AA4B2]">Off Z (m)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={layer.offsetZ}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isNaN(v)) {
                              updateSportLayer(project.id, layer.id, { offsetZ: v });
                            }
                          }}
                          className="w-full px-1.5 py-1 bg-[#1A2029] border border-white/10 rounded font-mono-tech text-[11px] text-[#F2F4F7]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#9AA4B2]">Rot</label>
                        <button
                          type="button"
                          onClick={() =>
                            updateSportLayer(project.id, layer.id, {
                              rotationDeg: (layer.rotationDeg + 90) % 360,
                            })
                          }
                          className="w-full py-1 bg-[#1A2029] hover:bg-[#202630] border border-white/10 rounded font-mono-tech text-[11px] text-[#1686C9] cursor-pointer"
                        >
                          {layer.rotationDeg}°
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ground Construction System & Floor Materials */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2]">
                Ground System &amp; Surfaces
              </div>

              <div>
                <label htmlFor="ws-ground-system" className="block text-[11px] text-[#9AA4B2] mb-1">
                  Ground Build-Up System
                </label>
                <select
                  id="ws-ground-system"
                  value={project.groundSystem ?? spec.defaultGroundSystem}
                  onChange={(e) => setGroundSystem(project.id, e.target.value as GroundSystemType)}
                  className="w-full px-2.5 py-2 bg-[#111318] border border-white/15 rounded text-xs text-[#F2F4F7]"
                >
                  {GROUND_SYSTEM_PRESETS.map((gs) => (
                    <option key={gs.id} value={gs.id}>
                      {gs.shortLabel} — {gs.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-0.5">
                {SURFACE_PRESETS.map((preset) => {
                  const active = project.materials.surfaceType === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        updateProject(project.id, {
                          materials: {
                            ...project.materials,
                            surfaceType: preset.id,
                            surfaceColor: preset.defaultSurfaceColor,
                            apronColor: preset.defaultApronColor,
                            paintColor: preset.defaultPaintColor,
                          },
                        })
                      }
                      className={`w-full px-3 py-2 rounded border text-left text-xs flex items-center justify-between transition-colors cursor-pointer min-h-[36px] ${
                        active
                          ? 'bg-[#202630] border-[#F07827] text-[#F2F4F7]'
                          : 'bg-[#111318] border-white/10 text-[#9AA4B2] hover:text-[#F2F4F7]'
                      }`}
                    >
                      <span className="truncate">{preset.label}</span>
                      <span
                        className="w-4 h-4 rounded-sm border border-white/20 shrink-0"
                        style={{ backgroundColor: preset.defaultSurfaceColor }}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { key: 'surfaceColor' as const, label: 'Playing Surface Colour' },
                  { key: 'paintColor' as const, label: 'Key & Zone Paint' },
                  { key: 'apronColor' as const, label: 'Safety Clearance Slab' },
                  { key: 'lineColor' as const, label: 'Primary Line Markings' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-xs text-[#9AA4B2]">{item.label}</span>
                    <input
                      type="color"
                      aria-label={item.label}
                      value={project.materials[item.key]}
                      onChange={(e) =>
                        updateProject(project.id, {
                          materials: { ...project.materials, [item.key]: e.target.value },
                        })
                      }
                      className="w-9 h-7 rounded bg-transparent border border-white/20 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const viewportHint =
    toolMode === 'measure'
      ? 'Click two points on the ground or surface to measure 3D distance'
      : toolMode === 'move' && selectedObject && !selectedObject.locked
      ? 'Drag XYZ gizmo to move object'
      : toolMode === 'rotate' && selectedObject && !selectedObject.locked
      ? 'Drag rotation ring to rotate object'
      : 'Orbit: Left-drag · Pan: Right-drag · Zoom: Scroll';

  return (
    <StudioShell
      title={project.name}
      moduleTag="Sports Ground Studio"
      onBack={() => setCurrentView('dashboard')}
      backLabel="Back to Dashboard"
      cloudBacked={isActiveProjectCloudBacked}
      cloudSyncStatus={cloudSyncStatus}
      hasUnsavedChanges={hasUnsavedChanges}
      headerBadgeSlot={
        <select
          aria-label="Project Status"
          value={project.status}
          onChange={(e) => updateProjectStatus(project.id, e.target.value as ProjectStatus)}
          className="hidden xl:block px-2 py-0.5 bg-[#202630] border border-white/10 rounded text-[11px] text-[#9AA4B2] focus:outline-none"
        >
          <option value="Draft">Draft</option>
          <option value="In Review">In Review</option>
          <option value="Specification Ready">Specification Ready</option>
          <option value="Archived">Archived</option>
        </select>
      }
      headerRightActions={
        <>
          <button
            type="button"
            onClick={() => openProjectEngineering(project.id)}
            title="Technical Plans, BOM, Cost Estimate & Construction"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] bg-[#202630] hover:bg-[#1686C9] border border-white/10 text-xs font-medium text-[#F2F4F7] rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Plans &amp; Cost</span>
          </button>

          <button
            type="button"
            onClick={() => openProjectSettings(project.id)}
            title="Project Settings"
            aria-label="Project Settings"
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </>
      }
      cameraPreset={cameraPreset}
      projection={projection}
      onSelectCamera={handleSelectCamera}
      onToggleProjection={handleToggleProjection}
      onResetCamera={handleResetCamera}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={undo}
      onRedo={redo}
      showGrid={showGrid}
      onToggleGrid={() => setShowGrid((g) => !g)}
      showDimensions={showDimensions}
      onToggleDimensions={() => setShowDimensions((d) => !d)}
      canRestoreSaved={canRestoreSaved}
      restoredNotice={restoredNotice}
      onRestore={handleRestore}
      savedNotice={savedNotice}
      onSave={handleSave}
      leftSidebarTitle="Tools & Equipment"
      leftSidebar={LeftSidebarContent}
      rightSidebarTitle="Inspector"
      rightSidebar={RightSidebarContent}
      viewport={
        <ErrorBoundary
          fallbackTitle="3D Viewport Interrupted"
          fallbackDescription="WebGL rendering hit a temporary issue. Your court configuration is preserved."
        >
          <CourtViewport
            project={project}
            selectedObjectId={selectedObjectId}
            onSelectObject={handleSelectObject}
            toolMode={toolMode}
            onTransformCommit={handleTransformCommit}
            onCameraSettled={handleCameraSettled}
            showGrid={showGrid}
            showDimensions={showDimensions}
            cameraPreset={cameraPreset}
            projection={projection}
            presetVersion={presetVersion}
            cameraSyncKey={cameraSyncKey}
          />
        </ErrorBoundary>
      }
      viewportHint={viewportHint}
      mobileQuickAction={
        <button
          type="button"
          aria-label="Open Technical Plans and FCFA Cost"
          title="Plans & Cost"
          onClick={() => openProjectEngineering(project.id)}
          className="px-2 py-2 text-xs rounded text-[#F2F4F7] min-h-[36px]"
        >
          <FileText className="w-4 h-4 text-[#F07827]" />
        </button>
      }
      footerLeft={
        <>
          <span className="font-mono-tech whitespace-nowrap text-[#F2F4F7]">
            Playing: {formatLength(project.dimensions.lengthM, project.unit)} ×{' '}
            {formatLength(project.dimensions.widthM, project.unit)} ({formatArea(playingAreaSqM, project.unit)})
          </span>
          <span className="hidden sm:inline font-mono-tech whitespace-nowrap">
            Total Slab: {formatLength(totalLenM, project.unit)} × {formatLength(totalWidM, project.unit)}{' '}
            ({formatArea(totalAreaSqM, project.unit)})
          </span>
          <span className="hidden xl:inline whitespace-nowrap">
            {project.environmentSettings.lightingMode} · {project.environmentSettings.renderMode} ·{' '}
            {spec.shortLabel}
          </span>
        </>
      }
      footerRight={
        <>
          <button
            type="button"
            onClick={() =>
              updateProject(
                project.id,
                { unit: project.unit === 'm' ? 'ft' : 'm' },
                false
              )
            }
            className="font-mono-tech text-[#F2F4F7] hover:text-[#F07827] transition-colors cursor-pointer inline-flex items-center gap-1"
            title="Switch measurement units"
          >
            Units: {project.unit.toUpperCase()}
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="hidden sm:inline font-mono-tech capitalize">
            {projection === 'orthographic' ? 'Ortho' : 'Persp'} · {cameraPreset}
          </span>
        </>
      }
    />
  );
};
