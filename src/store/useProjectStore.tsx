import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  buildDefaultObjects,
  COURT_STANDARDS,
  createInitialProjects,
  defaultCameraSettings,
  defaultCostConfig,
  defaultEngineeringAssumptions,
  defaultEnvironmentSettings,
  normalizeProject,
  SURFACE_PRESETS,
} from '../constants/courtStandards';
import {
  AppView,
  CameraSettings,
  CostConfig,
  CourtEnvironment,
  CourtMaterials,
  CourtProject,
  CourtStandard,
  EngineeringAssumptions,
  EnvironmentSettings,
  MeasurementUnit,
  ProjectStatus,
  ProjectTemplate,
  SceneObject,
  SceneObjectType,
} from '../types/court';
import { localProjectStorage, validateImportedProjectJson } from './projectStorage';

export interface CreateProjectInput {
  name: string;
  client?: string;
  location?: string;
  standard: CourtStandard;
  environment: CourtEnvironment;
  template: ProjectTemplate;
  unit: MeasurementUnit;
  customLengthM?: number;
  customWidthM?: number;
  apronM?: number;
}

interface HistoryEntry {
  projects: CourtProject[];
}

interface ProjectContextValue {
  projects: CourtProject[];
  activeProjectId: string | null;
  activeProject: CourtProject | null;
  currentView: AppView;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  canRestoreSaved: boolean;
  storageWarning: string | null;
  clearStorageWarning: () => void;
  setCurrentView: (view: AppView) => void;
  openProjectInWorkspace: (id: string) => void;
  openProjectEngineering: (id: string) => void;
  openProjectSettings: (id: string) => void;
  createProject: (input: CreateProjectInput) => CourtProject;
  importProject: (rawJson: string) => { ok: boolean; project?: CourtProject; error?: string };
  restoreSampleProjects: () => void;
  updateProject: (id: string, patch: Partial<CourtProject>, recordHistory?: boolean) => void;
  updateEnvironmentSettings: (id: string, patch: Partial<EnvironmentSettings>) => void;
  updateCameraSettings: (id: string, patch: Partial<CameraSettings>) => void;
  updateEngineeringAssumptions: (id: string, patch: Partial<EngineeringAssumptions>) => void;
  updateCostConfig: (id: string, patch: Partial<CostConfig>) => void;
  updateProjectObject: (projectId: string, objectId: string, patch: Partial<SceneObject>) => void;
  addSceneObject: (projectId: string, type: SceneObjectType) => SceneObject | null;
  duplicateSceneObject: (projectId: string, objectId: string) => SceneObject | null;
  removeSceneObject: (projectId: string, objectId: string) => void;
  duplicateProject: (id: string) => CourtProject | null;
  deleteProject: (id: string) => void;
  resetProjectCourt: (id: string) => void;
  saveProjectSnapshot: (id: string) => boolean;
  restoreSavedSnapshot: (id: string) => boolean;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
  undo: () => void;
  redo: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function loadInitialProjectsState(): { projects: CourtProject[]; error?: string } {
  const { projects, error } = localProjectStorage.loadProjects();
  if (projects !== null) {
    return { projects: projects.map(normalizeProject), error };
  }
  return { projects: createInitialProjects(), error };
}

function cloneProject(proj: CourtProject): CourtProject {
  return JSON.parse(JSON.stringify(proj));
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialBoot] = useState(() => loadInitialProjectsState());
  const [projects, setProjects] = useState<CourtProject[]>(initialBoot.projects);
  const [storageWarning, setStorageWarning] = useState<string | null>(initialBoot.error ?? null);

  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, CourtProject>>(() => {
    const snaps = localProjectStorage.loadSavedSnapshots();
    initialBoot.projects.forEach((p) => {
      if (!snaps[p.id]) {
        snaps[p.id] = cloneProject(p);
      }
    });
    return snaps;
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    () => initialBoot.projects[0]?.id ?? null
  );
  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    const hash = window.location.hash.replace('#', '') as AppView;
    const valid: AppView[] = ['landing', 'dashboard', 'create', 'workspace', 'engineering', 'settings'];
    return valid.includes(hash) ? hash : 'landing';
  });

  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [dirtyProjectIds, setDirtyProjectIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const res = localProjectStorage.saveProjects(projects);
    if (!res.ok && res.error) {
      setStorageWarning(res.error);
    }
  }, [projects]);

  const clearStorageWarning = useCallback(() => setStorageWarning(null), []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as AppView;
      const valid: AppView[] = ['landing', 'dashboard', 'create', 'workspace', 'engineering', 'settings'];
      if (valid.includes(hash)) {
        setCurrentViewState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewState(view);
    if (window.location.hash !== `#${view}`) {
      window.location.hash = view;
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const commitProjects = useCallback(
    (
      updater: (prev: CourtProject[]) => CourtProject[],
      recordHistory = true,
      dirtyId?: string
    ) => {
      setProjects((prev) => {
        const next = updater(prev);
        if (recordHistory) {
          setPast((p) => [...p.slice(-29), { projects: prev }]);
          setFuture([]);
        }
        return next;
      });
      if (dirtyId) {
        setDirtyProjectIds((d) => ({ ...d, [dirtyId]: true }));
      }
    },
    []
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [{ projects }, ...prev.slice(0, 29)]);
    setProjects(previous.projects);
    if (activeProjectId) {
      setDirtyProjectIds((d) => ({ ...d, [activeProjectId]: true }));
    }
  }, [past, projects, activeProjectId]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev.slice(-29), { projects }]);
    setProjects(next.projects);
    if (activeProjectId) {
      setDirtyProjectIds((d) => ({ ...d, [activeProjectId]: true }));
    }
  }, [future, projects, activeProjectId]);

  const openProjectInWorkspace = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      setActiveProjectId(id);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, lastOpenedAt: nowIso } : p))
      );
      setPast([]);
      setFuture([]);
      setCurrentView('workspace');
    },
    [setCurrentView]
  );

  const openProjectEngineering = useCallback(
    (id: string) => {
      setActiveProjectId(id);
      setCurrentView('engineering');
    },
    [setCurrentView]
  );

  const openProjectSettings = useCallback(
    (id: string) => {
      setActiveProjectId(id);
      setCurrentView('settings');
    },
    [setCurrentView]
  );

  const createProject = useCallback(
    (input: CreateProjectInput): CourtProject => {
      const spec = COURT_STANDARDS[input.standard];
      const lengthM =
        input.standard === 'CUSTOM' && input.customLengthM
          ? Math.max(8, Math.min(40, input.customLengthM))
          : spec.lengthM;
      const widthM =
        input.standard === 'CUSTOM' && input.customWidthM
          ? Math.max(6, Math.min(25, input.customWidthM))
          : spec.widthM;
      const apronM = input.apronM ?? spec.defaultApronM;

      const defaultPreset =
        input.environment === 'indoor' ? SURFACE_PRESETS[0] : SURFACE_PRESETS[2];

      const materials: CourtMaterials = {
        surfaceType: defaultPreset.id,
        surfaceColor: defaultPreset.defaultSurfaceColor,
        apronColor: defaultPreset.defaultApronColor,
        paintColor: defaultPreset.defaultPaintColor,
        lineColor: '#F2F4F7',
      };

      const dimensions = {
        lengthM,
        widthM,
        apronM,
        isHalfCourt: spec.isHalfCourt,
        orientationDeg: 0,
        showSafetyZone: true,
      };

      const now = new Date().toISOString();
      const newProject: CourtProject = {
        id: `proj-${Date.now().toString(36)}`,
        name: input.name.trim() || 'Untitled Court Project',
        client: input.client?.trim() || 'Private Architectural Study',
        location: input.location?.trim() || 'Site Unassigned',
        notes:
          input.template === 'blank'
            ? 'Blank structural slab initialized for custom assembly placement.'
            : `${spec.label} layout initialized for ${input.environment} installation.`,
        standard: input.standard,
        environment: input.environment,
        template: input.template,
        status: 'Draft',
        unit: input.unit,
        dimensions,
        materials,
        environmentSettings: defaultEnvironmentSettings(input.environment),
        cameraSettings: defaultCameraSettings(lengthM, widthM),
        engineeringAssumptions: defaultEngineeringAssumptions(input.environment),
        costConfig: defaultCostConfig(),
        objects: buildDefaultObjects(dimensions, input.environment, input.template, materials),
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      };

      commitProjects((prev) => [newProject, ...prev], false);
      const snap = cloneProject(newProject);
      localProjectStorage.saveSnapshot(snap);
      setSavedSnapshots((s) => ({ ...s, [newProject.id]: snap }));
      setActiveProjectId(newProject.id);
      setPast([]);
      setFuture([]);
      setCurrentView('workspace');
      return newProject;
    },
    [commitProjects, setCurrentView]
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<CourtProject>, recordHistory = true) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now } : p)),
        recordHistory,
        recordHistory ? id : undefined
      );
    },
    [commitProjects]
  );

  const updateEnvironmentSettings = useCallback(
    (id: string, patch: Partial<EnvironmentSettings>) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  updatedAt: now,
                  environmentSettings: { ...p.environmentSettings, ...patch },
                }
              : p
          ),
        true,
        id
      );
    },
    [commitProjects]
  );

  const updateCameraSettings = useCallback(
    (id: string, patch: Partial<CameraSettings>) => {
      // Camera state updates persist silently without polluting the edit Undo stack
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                cameraSettings: { ...p.cameraSettings, ...patch },
              }
            : p
        )
      );
    },
    []
  );

  const updateEngineeringAssumptions = useCallback(
    (id: string, patch: Partial<EngineeringAssumptions>) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  updatedAt: now,
                  engineeringAssumptions: {
                    ...(p.engineeringAssumptions ?? defaultEngineeringAssumptions(p.environment)),
                    ...patch,
                  },
                }
              : p
          ),
        true,
        id
      );
    },
    [commitProjects]
  );

  const updateCostConfig = useCallback(
    (id: string, patch: Partial<CostConfig>) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const current = p.costConfig ?? defaultCostConfig();
            return {
              ...p,
              updatedAt: now,
              costConfig: {
                ...current,
                ...patch,
                unitPriceOverrides: patch.unitPriceOverrides ?? current.unitPriceOverrides,
              },
            };
          }),
        true,
        id
      );
    },
    [commitProjects]
  );

  const updateProjectObject = useCallback(
    (projectId: string, objectId: string, patch: Partial<SceneObject>) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              updatedAt: now,
              objects: p.objects.map((obj) =>
                obj.id === objectId ? { ...obj, ...patch } : obj
              ),
            };
          }),
        true,
        projectId
      );
    },
    [commitProjects]
  );

  const addSceneObject = useCallback(
    (projectId: string, type: SceneObjectType): SceneObject | null => {
      let created: SceneObject | null = null;
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            const count = p.objects.filter((o) => o.type === type).length + 1;
            const halfW = p.dimensions.widthM / 2;
            const halfL = p.dimensions.lengthM / 2;

            const presets: Record<SceneObjectType, Omit<SceneObject, 'id'>> = {
              hoop_assembly: {
                name: `Hoop Assembly ${count}`,
                type: 'hoop_assembly',
                visible: true,
                locked: false,
                position: [-(halfL + 0.85), 0, (count - 1) * 1.2],
                rotationY: 0,
                color: '#202630',
                secondaryColor: '#F07827',
                metadata: {
                  rimHeightM: 3.05,
                  extensionArmM: 2.05,
                  backboardType: p.environment === 'indoor' ? 'tempered_glass' : 'frosted_acrylic',
                  supportStyle: p.environment === 'indoor' ? 'hydraulic_boom' : 'gooseneck_post',
                },
              },
              player_bench: {
                name: `Team Bench ${count}`,
                type: 'player_bench',
                visible: true,
                locked: false,
                position: [(count % 2 === 0 ? 1 : -1) * 4.5, 0, halfW + 1.25],
                rotationY: Math.PI,
                color: '#262E3B',
                secondaryColor: '#1686C9',
              },
              scorer_table: {
                name: `Scorer's Table ${count}`,
                type: 'scorer_table',
                visible: true,
                locked: false,
                position: [0, 0, halfW + 1.25],
                rotationY: Math.PI,
                color: '#202630',
                secondaryColor: '#F07827',
              },
              lighting_mast: {
                name: `LED Floodlight Mast ${count}`,
                type: 'lighting_mast',
                visible: true,
                locked: false,
                position: [
                  (count % 2 === 0 ? 1 : -1) * (halfL + p.dimensions.apronM - 0.5),
                  0,
                  -(halfW + p.dimensions.apronM - 0.5),
                ],
                rotationY: 0,
                color: '#2A313D',
                secondaryColor: '#F2F4F7',
              },
              scoreboard: {
                name: `LED Scoreboard ${count}`,
                type: 'scoreboard',
                visible: true,
                locked: false,
                position: [0, 4.4, -(halfW + p.dimensions.apronM + 0.5)],
                rotationY: 0,
                color: '#171B22',
                secondaryColor: '#F07827',
              },
              perimeter_fence: {
                name: `Ball-Stop Fence ${count}`,
                type: 'perimeter_fence',
                visible: true,
                locked: false,
                position: [0, 0, halfW + p.dimensions.apronM + 0.1],
                rotationY: 0,
                color: '#2C3440',
                metadata: { fenceLengthM: Math.round(p.dimensions.lengthM * 0.72) },
              },
              bleachers: {
                name: `Spectator Bleachers ${count}`,
                type: 'bleachers',
                visible: true,
                locked: false,
                position: [0, 0, -(halfW + p.dimensions.apronM + 1.65)],
                rotationY: 0,
                color: '#2D3646',
                secondaryColor: '#1686C9',
              },
              ball_rack: {
                name: `Ball Storage Rack ${count}`,
                type: 'ball_rack',
                visible: true,
                locked: false,
                position: [-(halfL + 1.1), 0, halfW - 1.5],
                rotationY: Math.PI / 2,
                color: '#202630',
                secondaryColor: '#D96B27',
              },
              court_slab: {
                name: 'Court Slab (Safety Clearance)',
                type: 'court_slab',
                visible: true,
                locked: true,
                position: [0, -0.1, 0],
                rotationY: 0,
                color: p.materials.apronColor,
              },
              playing_surface: {
                name: 'Playing Surface',
                type: 'playing_surface',
                visible: true,
                locked: true,
                position: [0, 0, 0],
                rotationY: 0,
                color: p.materials.surfaceColor,
              },
              boundary_lines: {
                name: 'Boundary Lines (5 cm)',
                type: 'boundary_lines',
                visible: true,
                locked: true,
                position: [0, 0.005, 0],
                rotationY: 0,
                color: p.materials.lineColor,
              },
              centre_markings: {
                name: 'Centre Line & Circle',
                type: 'centre_markings',
                visible: true,
                locked: true,
                position: [0, 0.005, 0],
                rotationY: 0,
                color: p.materials.lineColor,
              },
              free_throw_areas: {
                name: 'Free-Throw Areas',
                type: 'free_throw_areas',
                visible: true,
                locked: true,
                position: [0, 0.004, 0],
                rotationY: 0,
                color: p.materials.lineColor,
                secondaryColor: p.materials.paintColor,
              },
              three_point_lines: {
                name: 'Three-Point Lines',
                type: 'three_point_lines',
                visible: true,
                locked: true,
                position: [0, 0.006, 0],
                rotationY: 0,
                color: p.materials.lineColor,
              },
              court_markings: {
                name: 'Regulation Court Markings',
                type: 'court_markings',
                visible: true,
                locked: true,
                position: [0, 0.004, 0],
                rotationY: 0,
                color: p.materials.lineColor,
              },
            };

            created = {
              id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              ...presets[type],
            };

            return {
              ...p,
              updatedAt: now,
              objects: [...p.objects, created],
            };
          }),
        true,
        projectId
      );
      return created;
    },
    [commitProjects]
  );

  const duplicateSceneObject = useCallback(
    (projectId: string, objectId: string): SceneObject | null => {
      let duplicated: SceneObject | null = null;
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            const source = p.objects.find((o) => o.id === objectId);
            if (!source || source.locked) return p;
            duplicated = {
              ...source,
              id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              name: `${source.name} (Copy)`,
              position: [source.position[0] + 1.5, source.position[1], source.position[2] + 1.5],
              metadata: source.metadata ? { ...source.metadata } : undefined,
            };
            return {
              ...p,
              updatedAt: now,
              objects: [...p.objects, duplicated],
            };
          }),
        true,
        projectId
      );
      return duplicated;
    },
    [commitProjects]
  );

  const removeSceneObject = useCallback(
    (projectId: string, objectId: string) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              updatedAt: now,
              objects: p.objects.filter((o) => o.id !== objectId),
            };
          }),
        true,
        projectId
      );
    },
    [commitProjects]
  );

  const duplicateProject = useCallback(
    (id: string): CourtProject | null => {
      const source = projects.find((p) => p.id === id);
      if (!source) return null;
      const now = new Date().toISOString();
      const copy: CourtProject = {
        ...cloneProject(source),
        id: `proj-${Date.now().toString(36)}`,
        name: `${source.name} (Copy)`,
        status: 'Draft',
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      };
      commitProjects((prev) => [copy, ...prev], false);
      const snap = cloneProject(copy);
      localProjectStorage.saveSnapshot(snap);
      setSavedSnapshots((s) => ({ ...s, [copy.id]: snap }));
      return copy;
    },
    [projects, commitProjects]
  );

  const deleteProject = useCallback(
    (id: string) => {
      localProjectStorage.removeSnapshot(id);
      setSavedSnapshots((prev) => {
        if (!prev[id]) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setDirtyProjectIds((prev) => {
        if (!prev[id]) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setProjects((prev) => {
        const filtered = prev.filter((p) => p.id !== id);
        if (activeProjectId === id) {
          setActiveProjectId(filtered[0]?.id ?? null);
        }
        return filtered;
      });
    },
    [activeProjectId]
  );

  const importProject = useCallback(
    (rawJson: string): { ok: boolean; project?: CourtProject; error?: string } => {
      const result = validateImportedProjectJson(rawJson);
      if (!result.project) {
        return { ok: false, error: result.error || 'Invalid court project JSON.' };
      }
      const imported = result.project;
      commitProjects((prev) => [imported, ...prev], false);
      const snap = cloneProject(imported);
      const snapRes = localProjectStorage.saveSnapshot(snap);
      if (!snapRes.ok && snapRes.error) {
        setStorageWarning(snapRes.error);
      }
      setSavedSnapshots((s) => ({ ...s, [imported.id]: snap }));
      setActiveProjectId(imported.id);
      return { ok: true, project: imported };
    },
    [commitProjects]
  );

  const restoreSampleProjects = useCallback(() => {
    const samples = createInitialProjects();
    setProjects(samples);
    const nextSnaps: Record<string, CourtProject> = {};
    samples.forEach((p) => {
      const snap = cloneProject(p);
      nextSnaps[p.id] = snap;
      localProjectStorage.saveSnapshot(snap);
    });
    setSavedSnapshots((prev) => ({ ...prev, ...nextSnaps }));
    setActiveProjectId(samples[0]?.id ?? null);
    setPast([]);
    setFuture([]);
  }, []);

  const resetProjectCourt = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              updatedAt: now,
              objects: buildDefaultObjects(p.dimensions, p.environment, 'standard', p.materials),
            };
          }),
        true,
        id
      );
    },
    [commitProjects]
  );

  const saveProjectSnapshot = useCallback(
    (id: string): boolean => {
      const target = projects.find((p) => p.id === id);
      if (!target) return false;
      const stamped = { ...cloneProject(target), updatedAt: new Date().toISOString() };
      const res = localProjectStorage.saveSnapshot(stamped);
      if (!res.ok && res.error) {
        setStorageWarning(res.error);
        return false;
      }
      setSavedSnapshots((s) => ({ ...s, [id]: stamped }));
      setProjects((prev) => prev.map((p) => (p.id === id ? stamped : p)));
      setDirtyProjectIds((d) => ({ ...d, [id]: false }));
      return true;
    },
    [projects]
  );

  const restoreSavedSnapshot = useCallback(
    (id: string): boolean => {
      const snap = savedSnapshots[id];
      if (!snap) return false;
      const restored = normalizeProject(cloneProject(snap));
      commitProjects(
        (prev) => prev.map((p) => (p.id === id ? restored : p)),
        true
      );
      setDirtyProjectIds((d) => ({ ...d, [id]: false }));
      return true;
    },
    [savedSnapshots, commitProjects]
  );

  const updateProjectStatus = useCallback(
    (id: string, status: ProjectStatus) => {
      updateProject(id, { status }, false);
    },
    [updateProject]
  );

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null,
    [projects, activeProjectId]
  );

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const hasUnsavedChanges = Boolean(activeProject && dirtyProjectIds[activeProject.id]);
  const canRestoreSaved = Boolean(activeProject && savedSnapshots[activeProject.id]);

  const value: ProjectContextValue = {
    projects,
    activeProjectId,
    activeProject,
    currentView,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    canRestoreSaved,
    storageWarning,
    clearStorageWarning,
    setCurrentView,
    openProjectInWorkspace,
    openProjectEngineering,
    openProjectSettings,
    createProject,
    importProject,
    restoreSampleProjects,
    updateProject,
    updateEnvironmentSettings,
    updateCameraSettings,
    updateEngineeringAssumptions,
    updateCostConfig,
    updateProjectObject,
    addSceneObject,
    duplicateSceneObject,
    removeSceneObject,
    duplicateProject,
    deleteProject,
    resetProjectCourt,
    saveProjectSnapshot,
    restoreSavedSnapshot,
    updateProjectStatus,
    undo,
    redo,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export function useProjectStore(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectStore must be used inside ProjectProvider');
  return ctx;
}
