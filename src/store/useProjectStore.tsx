import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDefaultObjects,
  buildSportLayersForFacility,
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
  GroundSystemType,
  LayerSportType,
  MeasurementUnit,
  ProjectStatus,
  ProjectTemplate,
  SceneObject,
  SceneObjectType,
  SportDiscipline,
  SportMarkingLayer,
  SurfaceMaterialType,
} from '../types/court';
import {
  loadPersistedActiveProjectId,
  localProjectStorage,
  persistActiveProjectId,
  validateImportedProjectJson,
} from './projectStorage';

export interface CreateProjectInput {
  name: string;
  client?: string;
  location?: string;
  sport?: SportDiscipline;
  standard: CourtStandard;
  groundSystem?: GroundSystemType;
  surfaceType?: SurfaceMaterialType;
  overlaySports?: LayerSportType[];
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
  addSportLayer: (projectId: string, sport: LayerSportType) => SportMarkingLayer | null;
  updateSportLayer: (projectId: string, layerId: string, patch: Partial<SportMarkingLayer>) => void;
  removeSportLayer: (projectId: string, layerId: string) => void;
  setGroundSystem: (projectId: string, groundSystem: GroundSystemType) => void;
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
  const projectsRef = useRef<CourtProject[]>(projects);
  projectsRef.current = projects;

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

  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    const savedId = loadPersistedActiveProjectId();
    if (savedId && initialBoot.projects.some((p) => p.id === savedId)) {
      return savedId;
    }
    return initialBoot.projects[0]?.id ?? null;
  });

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    persistActiveProjectId(id);
  }, []);

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
    [setActiveProjectId, setCurrentView]
  );

  const openProjectEngineering = useCallback(
    (id: string) => {
      setActiveProjectId(id);
      setCurrentView('engineering');
    },
    [setActiveProjectId, setCurrentView]
  );

  const openProjectSettings = useCallback(
    (id: string) => {
      setActiveProjectId(id);
      setCurrentView('settings');
    },
    [setActiveProjectId, setCurrentView]
  );

  const createProject = useCallback(
    (input: CreateProjectInput): CourtProject => {
      const spec = COURT_STANDARDS[input.standard] ?? COURT_STANDARDS.FIBA;
      const lengthM =
        (input.standard === 'CUSTOM' || input.customLengthM) && input.customLengthM
          ? Math.max(8, Math.min(135, input.customLengthM))
          : spec.lengthM;
      const widthM =
        (input.standard === 'CUSTOM' || input.customWidthM) && input.customWidthM
          ? Math.max(6, Math.min(95, input.customWidthM))
          : spec.widthM;
      const apronM = input.apronM ?? spec.defaultApronM;

      const groundSystem: GroundSystemType = input.groundSystem ?? spec.defaultGroundSystem;
      const chosenSurfaceId =
        input.surfaceType ??
        spec.defaultSurfaceType ??
        (input.environment === 'indoor' ? 'hardwood_maple' : 'acrylic_pro');
      const surfacePreset =
        SURFACE_PRESETS.find((s) => s.id === chosenSurfaceId) ?? SURFACE_PRESETS[0];

      const materials: CourtMaterials = {
        surfaceType: surfacePreset.id,
        surfaceColor: surfacePreset.defaultSurfaceColor,
        apronColor: surfacePreset.defaultApronColor,
        paintColor: surfacePreset.defaultPaintColor,
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

      const sportLayers = buildSportLayersForFacility(
        input.standard,
        lengthM,
        widthM,
        materials,
        input.overlaySports
      );

      const now = new Date().toISOString();
      const newProject: CourtProject = {
        id: `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        schemaVersion: 2,
        name: input.name.trim() || 'Untitled Sports Facility',
        client: input.client?.trim() || 'Private Architectural Study',
        location: input.location?.trim() || 'Site Unassigned',
        notes:
          input.template === 'blank'
            ? 'Blank structural base initialized for custom sports placement.'
            : `${spec.label} layout initialized for ${input.environment} installation.`,
        sport: input.sport ?? spec.sport,
        standard: input.standard,
        groundSystem,
        environment: input.environment,
        template: input.template,
        status: 'Draft',
        unit: input.unit,
        dimensions,
        materials,
        sportLayers,
        environmentSettings: defaultEnvironmentSettings(input.environment),
        cameraSettings: defaultCameraSettings(lengthM, widthM),
        engineeringAssumptions: defaultEngineeringAssumptions(input.environment, groundSystem),
        costConfig: defaultCostConfig(),
        objects: buildDefaultObjects(
          dimensions,
          input.environment,
          input.template,
          materials,
          input.standard,
          sportLayers
        ),
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
    [commitProjects, setActiveProjectId, setCurrentView]
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

  const updateCameraSettings = useCallback((id: string, patch: Partial<CameraSettings>) => {
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
  }, []);

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
                    ...(p.engineeringAssumptions ??
                      defaultEngineeringAssumptions(p.environment, p.groundSystem)),
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
      const target = projectsRef.current.find((p) => p.id === projectId);
      if (!target) return null;

      const count = target.objects.filter((o) => o.type === type).length + 1;
      const halfW = target.dimensions.widthM / 2;
      const halfL = target.dimensions.lengthM / 2;
      const isPitch = target.dimensions.lengthM >= 45;

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
            backboardType: target.environment === 'indoor' ? 'tempered_glass' : 'frosted_acrylic',
            supportStyle: target.environment === 'indoor' ? 'hydraulic_boom' : 'gooseneck_post',
          },
        },
        football_goal: {
          name: `Football Goal ${count}`,
          type: 'football_goal',
          visible: true,
          locked: false,
          position: [count % 2 === 1 ? -halfL : halfL, 0, 0],
          rotationY: count % 2 === 1 ? 0 : Math.PI,
          color: '#F2F4F7',
          secondaryColor: '#D1D5DB',
          metadata: {
            goalWidthM: target.dimensions.lengthM >= 75 ? 7.32 : target.dimensions.lengthM >= 50 ? 6.0 : 3.0,
            goalHeightM: target.dimensions.lengthM >= 75 ? 2.44 : target.dimensions.lengthM >= 50 ? 2.1 : 2.0,
            goalDepthM: target.dimensions.lengthM >= 75 ? 2.0 : 1.4,
          },
        },
        handball_goal: {
          name: `Handball Goal (3×2 m) ${count}`,
          type: 'handball_goal',
          visible: true,
          locked: false,
          position: [count % 2 === 1 ? -halfL : halfL, 0, 0],
          rotationY: count % 2 === 1 ? 0 : Math.PI,
          color: '#DC2626',
          secondaryColor: '#F2F4F7',
          metadata: { goalWidthM: 3.0, goalHeightM: 2.0, goalDepthM: 1.0 },
        },
        volleyball_net: {
          name: `Volleyball Net ${count}`,
          type: 'volleyball_net',
          visible: true,
          locked: false,
          position: [0, 0, (count - 1) * 1.5],
          rotationY: 0,
          color: '#1686C9',
          secondaryColor: '#F2F4F7',
          metadata: { netHeightM: 2.43, netWidthM: Math.min(10.5, target.dimensions.widthM + 1.0) },
        },
        tennis_net: {
          name: `Tennis Net ${count}`,
          type: 'tennis_net',
          visible: true,
          locked: false,
          position: [0, 0, (count - 1) * 1.5],
          rotationY: 0,
          color: '#1A2029',
          secondaryColor: '#F2F4F7',
          metadata: { netHeightM: 1.07, netWidthM: Math.min(12.8, target.dimensions.widthM + 1.82) },
        },
        multisport_combo_goal: {
          name: `Multi-Sport Combo Goal ${count}`,
          type: 'multisport_combo_goal',
          visible: true,
          locked: false,
          position: [count % 2 === 1 ? -halfL : halfL, 0, 0],
          rotationY: count % 2 === 1 ? 0 : Math.PI,
          color: '#202630',
          secondaryColor: '#F07827',
          metadata: { goalWidthM: 3.0, goalHeightM: 2.0, rimHeightM: 3.05 },
        },
        dugout_shelter: {
          name: `Team Dugout Shelter ${count}`,
          type: 'dugout_shelter',
          visible: true,
          locked: false,
          position: [(count % 2 === 0 ? 1 : -1) * Math.min(10, halfL * 0.35), 0, halfW + 1.9],
          rotationY: Math.PI,
          color: '#202630',
          secondaryColor: '#1686C9',
        },
        corner_flag: {
          name: `Corner Flag ${count}`,
          type: 'corner_flag',
          visible: true,
          locked: false,
          position: [-halfL, 0, -halfW],
          rotationY: 0,
          color: '#F2F4F7',
          secondaryColor: '#F07827',
        },
        player_bench: {
          name: `Team Bench ${count}`,
          type: 'player_bench',
          visible: true,
          locked: false,
          position: [(count % 2 === 0 ? 1 : -1) * Math.min(4.5, halfL * 0.35), 0, halfW + 1.25],
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
            (count % 2 === 0 ? 1 : -1) * (halfL + target.dimensions.apronM - 0.5),
            0,
            -(halfW + target.dimensions.apronM - 0.5),
          ],
          rotationY: 0,
          color: '#2A313D',
          secondaryColor: '#F2F4F7',
          metadata: { poleHeightM: isPitch ? 12.0 : 6.0 },
        },
        scoreboard: {
          name: `LED Scoreboard ${count}`,
          type: 'scoreboard',
          visible: true,
          locked: false,
          position: [0, 4.4, -(halfW + target.dimensions.apronM + 0.5)],
          rotationY: 0,
          color: '#171B22',
          secondaryColor: '#F07827',
        },
        perimeter_fence: {
          name: `Ball-Stop Fence ${count}`,
          type: 'perimeter_fence',
          visible: true,
          locked: false,
          position: [0, 0, halfW + target.dimensions.apronM + 0.1],
          rotationY: 0,
          color: '#2C3440',
          metadata: { fenceLengthM: Math.round(target.dimensions.lengthM * 0.72), fenceHeightM: 3.2 },
        },
        bleachers: {
          name: `Spectator Bleachers ${count}`,
          type: 'bleachers',
          visible: true,
          locked: false,
          position: [0, 0, -(halfW + target.dimensions.apronM + 1.65)],
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
          color: target.materials.apronColor,
        },
        playing_surface: {
          name: 'Playing Surface',
          type: 'playing_surface',
          visible: true,
          locked: true,
          position: [0, 0, 0],
          rotationY: 0,
          color: target.materials.surfaceColor,
        },
        boundary_lines: {
          name: 'Boundary Lines (5 cm)',
          type: 'boundary_lines',
          visible: true,
          locked: true,
          position: [0, 0.005, 0],
          rotationY: 0,
          color: target.materials.lineColor,
        },
        centre_markings: {
          name: 'Centre Line & Circle',
          type: 'centre_markings',
          visible: true,
          locked: true,
          position: [0, 0.005, 0],
          rotationY: 0,
          color: target.materials.lineColor,
        },
        free_throw_areas: {
          name: 'Free-Throw Areas',
          type: 'free_throw_areas',
          visible: true,
          locked: true,
          position: [0, 0.004, 0],
          rotationY: 0,
          color: target.materials.lineColor,
          secondaryColor: target.materials.paintColor,
        },
        three_point_lines: {
          name: 'Three-Point Lines',
          type: 'three_point_lines',
          visible: true,
          locked: true,
          position: [0, 0.006, 0],
          rotationY: 0,
          color: target.materials.lineColor,
        },
        court_markings: {
          name: 'Regulation Court Markings',
          type: 'court_markings',
          visible: true,
          locked: true,
          position: [0, 0.004, 0],
          rotationY: 0,
          color: target.materials.lineColor,
        },
      };

      const created: SceneObject = {
        id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        ...presets[type],
      };

      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, updatedAt: now, objects: [...p.objects, created] } : p
          ),
        true,
        projectId
      );
      return created;
    },
    [commitProjects]
  );

  const duplicateSceneObject = useCallback(
    (projectId: string, objectId: string): SceneObject | null => {
      const target = projectsRef.current.find((p) => p.id === projectId);
      const source = target?.objects.find((o) => o.id === objectId);
      if (!source || source.locked) return null;

      const duplicated: SceneObject = {
        ...source,
        id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${source.name} (Copy)`,
        position: [source.position[0] + 1.5, source.position[1], source.position[2] + 1.5],
        metadata: source.metadata ? { ...source.metadata } : undefined,
      };

      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, updatedAt: now, objects: [...p.objects, duplicated] }
              : p
          ),
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

  const addSportLayer = useCallback(
    (projectId: string, sport: LayerSportType): SportMarkingLayer | null => {
      const target = projectsRef.current.find((p) => p.id === projectId);
      if (!target) return null;

      const presetBySport: Record<LayerSportType, CourtStandard> = {
        basketball: 'FIBA',
        football: target.dimensions.lengthM >= 75 ? 'FOOTBALL_11' : target.dimensions.lengthM >= 50 ? 'FOOTBALL_7' : 'FOOTBALL_5',
        volleyball: 'VOLLEYBALL_STD',
        tennis: 'TENNIS_DOUBLES',
        handball: 'HANDBALL_IHF',
      };
      const colorBySport: Record<LayerSportType, string> = {
        basketball: '#FACC15',
        football: '#F2F4F7',
        volleyball: '#38BDF8',
        tennis: '#F97316',
        handball: '#E2E8F0',
      };
      const presetId = presetBySport[sport];
      const sp = COURT_STANDARDS[presetId];
      const existingLayers = target.sportLayers ?? [];

      const created: SportMarkingLayer = {
        id: `layer-${sport}-${Date.now().toString(36).slice(-4)}`,
        sport,
        presetId,
        name: `${sp.shortLabel} Overlay`,
        visible: true,
        lengthM: Math.min(target.dimensions.lengthM, sp.lengthM),
        widthM: Math.min(target.dimensions.widthM, sp.widthM),
        lineColor: existingLayers.length === 0 ? target.materials.lineColor : colorBySport[sport],
        lineWidthM: sp.lineWidthM,
        offsetX: 0,
        offsetZ: 0,
        rotationDeg: 0,
        isHalfCourt: false,
      };

      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  sport: existingLayers.length >= 1 ? 'multisport' : p.sport,
                  updatedAt: now,
                  sportLayers: [...(p.sportLayers ?? []), created],
                }
              : p
          ),
        true,
        projectId
      );
      return created;
    },
    [commitProjects]
  );

  const updateSportLayer = useCallback(
    (projectId: string, layerId: string, patch: Partial<SportMarkingLayer>) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            const layers = p.sportLayers ?? [];
            return {
              ...p,
              updatedAt: now,
              sportLayers: layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
            };
          }),
        true,
        projectId
      );
    },
    [commitProjects]
  );

  const removeSportLayer = useCallback(
    (projectId: string, layerId: string) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            const next = (p.sportLayers ?? []).filter((l) => l.id !== layerId);
            return { ...p, updatedAt: now, sportLayers: next };
          }),
        true,
        projectId
      );
    },
    [commitProjects]
  );

  const setGroundSystem = useCallback(
    (projectId: string, groundSystem: GroundSystemType) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  updatedAt: now,
                  groundSystem,
                  engineeringAssumptions: defaultEngineeringAssumptions(p.environment, groundSystem),
                }
              : p
          ),
        true,
        projectId
      );
    },
    [commitProjects]
  );

  const duplicateProject = useCallback(
    (id: string): CourtProject | null => {
      const source = projectsRef.current.find((p) => p.id === id);
      if (!source) return null;
      const now = new Date().toISOString();
      const copy: CourtProject = {
        ...cloneProject(source),
        id: `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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
    [commitProjects]
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
    [activeProjectId, setActiveProjectId]
  );

  const importProject = useCallback(
    (rawJson: string): { ok: boolean; project?: CourtProject; error?: string } => {
      const result = validateImportedProjectJson(rawJson);
      if (!result.project) {
        return { ok: false, error: result.error || 'Invalid facility project JSON.' };
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
    [commitProjects, setActiveProjectId]
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
  }, [setActiveProjectId]);

  const resetProjectCourt = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      commitProjects(
        (prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const layers = buildSportLayersForFacility(
              p.standard,
              p.dimensions.lengthM,
              p.dimensions.widthM,
              p.materials
            );
            return {
              ...p,
              updatedAt: now,
              sportLayers: layers,
              objects: buildDefaultObjects(
                p.dimensions,
                p.environment,
                'standard',
                p.materials,
                p.standard,
                layers
              ),
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
      const target = projectsRef.current.find((p) => p.id === id);
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
    []
  );

  const restoreSavedSnapshot = useCallback(
    (id: string): boolean => {
      const snap = savedSnapshots[id];
      if (!snap) return false;
      const restored = normalizeProject(cloneProject(snap));
      commitProjects((prev) => prev.map((p) => (p.id === id ? restored : p)), true);
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
    addSportLayer,
    updateSportLayer,
    removeSportLayer,
    setGroundSystem,
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
