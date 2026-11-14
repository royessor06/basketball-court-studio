import {
  CameraSettings,
  CostConfig,
  CourtDimensions,
  CourtEnvironment,
  CourtMaterials,
  CourtProject,
  CourtStandard,
  EngineeringAssumptions,
  EnvironmentSettings,
  MeasurementUnit,
  ProjectTemplate,
  SceneObject,
  SurfaceMaterialType,
} from '../types/court';

export interface StandardSpecification {
  id: CourtStandard;
  label: string;
  shortLabel: string;
  description: string;
  lengthM: number;
  widthM: number;
  defaultApronM: number;
  isHalfCourt: boolean;
  threePointRadiusM: number;
  threePointCornerInsetM: number;
  basketCenterFromBaselineM: number;
  backboardFromBaselineM: number;
  rimHeightM: number;
  keyWidthM: number;
  keyLengthM: number;
  freeThrowRadiusM: number;
  centerCircleRadiusM: number;
  lineWidthM: number;
}

export const COURT_STANDARDS: Record<CourtStandard, StandardSpecification> = {
  FIBA: {
    id: 'FIBA',
    label: 'FIBA Official',
    shortLabel: 'FIBA',
    description:
      'International regulation 28.00 × 15.00 m (420 m²) playing court with 6.75 m arc and 3.05 m rim.',
    lengthM: 28.0,
    widthM: 15.0,
    defaultApronM: 2.0,
    isHalfCourt: false,
    threePointRadiusM: 6.75,
    threePointCornerInsetM: 0.9,
    basketCenterFromBaselineM: 1.575,
    backboardFromBaselineM: 1.2,
    rimHeightM: 3.05,
    keyWidthM: 4.9,
    keyLengthM: 5.8,
    freeThrowRadiusM: 1.8,
    centerCircleRadiusM: 1.8,
    lineWidthM: 0.05,
  },
  NBA: {
    id: 'NBA',
    label: 'NBA Regulation',
    shortLabel: 'NBA',
    description: 'North American professional arena dimensions with 7.24 m three-point arc.',
    lengthM: 28.65,
    widthM: 15.24,
    defaultApronM: 2.2,
    isHalfCourt: false,
    threePointRadiusM: 7.24,
    threePointCornerInsetM: 0.91,
    basketCenterFromBaselineM: 1.6,
    backboardFromBaselineM: 1.22,
    rimHeightM: 3.05,
    keyWidthM: 4.88,
    keyLengthM: 5.79,
    freeThrowRadiusM: 1.83,
    centerCircleRadiusM: 1.83,
    lineWidthM: 0.05,
  },
  NCAA: {
    id: 'NCAA',
    label: 'NCAA / Collegiate',
    shortLabel: 'NCAA',
    description: 'Collegiate and institutional gymnasium specification with 6.75 m arc.',
    lengthM: 28.65,
    widthM: 15.24,
    defaultApronM: 1.8,
    isHalfCourt: false,
    threePointRadiusM: 6.75,
    threePointCornerInsetM: 1.0,
    basketCenterFromBaselineM: 1.6,
    backboardFromBaselineM: 1.22,
    rimHeightM: 3.05,
    keyWidthM: 3.66,
    keyLengthM: 5.79,
    freeThrowRadiusM: 1.83,
    centerCircleRadiusM: 1.83,
    lineWidthM: 0.05,
  },
  FIBA_3X3: {
    id: 'FIBA_3X3',
    label: 'FIBA 3x3 Half-Court',
    shortLabel: '3x3',
    description: 'Compact urban and tournament half-court footprint with single stanchion assembly.',
    lengthM: 11.0,
    widthM: 15.0,
    defaultApronM: 1.8,
    isHalfCourt: true,
    threePointRadiusM: 6.75,
    threePointCornerInsetM: 0.9,
    basketCenterFromBaselineM: 1.575,
    backboardFromBaselineM: 1.2,
    rimHeightM: 3.05,
    keyWidthM: 4.9,
    keyLengthM: 5.8,
    freeThrowRadiusM: 1.8,
    centerCircleRadiusM: 1.8,
    lineWidthM: 0.05,
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Custom Dimensions',
    shortLabel: 'Custom',
    description: 'User-defined court envelope for residential driveways, rooftops, or training bays.',
    lengthM: 24.0,
    widthM: 14.0,
    defaultApronM: 1.5,
    isHalfCourt: false,
    threePointRadiusM: 6.25,
    threePointCornerInsetM: 0.9,
    basketCenterFromBaselineM: 1.575,
    backboardFromBaselineM: 1.2,
    rimHeightM: 3.05,
    keyWidthM: 4.4,
    keyLengthM: 5.4,
    freeThrowRadiusM: 1.8,
    centerCircleRadiusM: 1.8,
    lineWidthM: 0.05,
  },
};

export const SURFACE_PRESETS: Array<{
  id: SurfaceMaterialType;
  label: string;
  recommendedEnv: CourtEnvironment | 'both';
  defaultSurfaceColor: string;
  defaultApronColor: string;
  defaultPaintColor: string;
  roughness: number;
}> = [
  {
    id: 'hardwood_maple',
    label: 'Northern Hard Maple',
    recommendedEnv: 'indoor',
    defaultSurfaceColor: '#D4A36A',
    defaultApronColor: '#1E2530',
    defaultPaintColor: '#1686C9',
    roughness: 0.32,
  },
  {
    id: 'hardwood_dark',
    label: 'Smoked Arena Maple',
    recommendedEnv: 'indoor',
    defaultSurfaceColor: '#A97C50',
    defaultApronColor: '#151922',
    defaultPaintColor: '#F07827',
    roughness: 0.3,
  },
  {
    id: 'acrylic_pro',
    label: 'Pro Cushioned Acrylic',
    recommendedEnv: 'outdoor',
    defaultSurfaceColor: '#1F4B7A',
    defaultApronColor: '#2B3340',
    defaultPaintColor: '#D45E1A',
    roughness: 0.72,
  },
  {
    id: 'modular_tile',
    label: 'Modular Interlock Tile',
    recommendedEnv: 'outdoor',
    defaultSurfaceColor: '#2E6F9E',
    defaultApronColor: '#232934',
    defaultPaintColor: '#E06D22',
    roughness: 0.65,
  },
  {
    id: 'asphalt_textured',
    label: 'Sealed Asphalt Aggregate',
    recommendedEnv: 'outdoor',
    defaultSurfaceColor: '#313742',
    defaultApronColor: '#232730',
    defaultPaintColor: '#F07827',
    roughness: 0.88,
  },
];

export function defaultEnvironmentSettings(env: CourtEnvironment): EnvironmentSettings {
  return {
    lightingMode: env === 'indoor' ? 'daylight' : 'daylight',
    shadowsEnabled: true,
    surroundings: env === 'indoor' ? 'arena' : 'park',
    renderMode: 'realistic',
  };
}

export function defaultCameraSettings(lengthM: number, widthM: number): CameraSettings {
  const span = Math.max(lengthM, widthM);
  return {
    preset: 'perspective',
    projection: 'perspective',
    position: [span * 0.68, span * 0.46, span * 0.74],
    target: [0, 0.6, 0],
    zoom: 24,
  };
}

export function defaultEngineeringAssumptions(env: CourtEnvironment): EngineeringAssumptions {
  return {
    slabThicknessM: 0.15,
    subBaseThicknessM: env === 'outdoor' ? 0.2 : 0.15,
    excavationDepthM: env === 'outdoor' ? 0.35 : 0.25,
    wasteFactorPct: 7,
  };
}

export function defaultCostConfig(): CostConfig {
  return {
    contingencyPct: 10,
    unitPriceOverrides: {},
  };
}

export function buildCourtMarkingObjects(
  dimensions: CourtDimensions,
  materials: CourtMaterials
): SceneObject[] {
  const list: SceneObject[] = [
    {
      id: 'obj-boundary-lines',
      name: 'Boundary Lines (5 cm)',
      type: 'boundary_lines',
      visible: true,
      locked: true,
      position: [0, 0.005, 0],
      rotationY: 0,
      color: materials.lineColor,
    },
    {
      id: 'obj-free-throw-areas',
      name: 'Free-Throw Areas & Paint',
      type: 'free_throw_areas',
      visible: true,
      locked: true,
      position: [0, 0.004, 0],
      rotationY: 0,
      color: materials.lineColor,
      secondaryColor: materials.paintColor,
    },
    {
      id: 'obj-three-point-lines',
      name: 'Three-Point Lines (6.75 m)',
      type: 'three_point_lines',
      visible: true,
      locked: true,
      position: [0, 0.006, 0],
      rotationY: 0,
      color: materials.lineColor,
    },
  ];

  if (!dimensions.isHalfCourt) {
    list.splice(1, 0, {
      id: 'obj-centre-markings',
      name: 'Centre Line & Circle (1.80 m)',
      type: 'centre_markings',
      visible: true,
      locked: true,
      position: [0, 0.005, 0],
      rotationY: 0,
      color: materials.lineColor,
      secondaryColor: materials.paintColor,
    });
  }

  return list;
}

export function buildDefaultObjects(
  dimensions: CourtDimensions,
  environment: CourtEnvironment,
  template: ProjectTemplate,
  materials: CourtMaterials
): SceneObject[] {
  const halfLen = dimensions.lengthM / 2;
  const halfWid = dimensions.widthM / 2;

  const baseObjects: SceneObject[] = [
    {
      id: 'obj-slab',
      name: 'Court Slab (Safety Clearance)',
      type: 'court_slab',
      visible: true,
      locked: true,
      position: [0, -0.1, 0],
      rotationY: 0,
      color: materials.apronColor,
    },
    {
      id: 'obj-surface',
      name: 'Playing Surface',
      type: 'playing_surface',
      visible: true,
      locked: true,
      position: [0, 0, 0],
      rotationY: 0,
      color: materials.surfaceColor,
      secondaryColor: materials.paintColor,
    },
  ];

  if (template === 'blank') {
    return baseObjects;
  }

  const markingObjects = buildCourtMarkingObjects(dimensions, materials);

  const hoopOffset = 0.85;
  const supportStyle = environment === 'indoor' ? 'hydraulic_boom' : 'gooseneck_post';
  const leftHoop: SceneObject = {
    id: 'obj-hoop-west',
    name: dimensions.isHalfCourt ? 'Primary Hoop & Support' : 'West Hoop & Support',
    type: 'hoop_assembly',
    visible: true,
    locked: false,
    position: [-(halfLen + hoopOffset), 0, 0],
    rotationY: 0,
    color: '#202630',
    secondaryColor: '#F07827',
    metadata: {
      rimHeightM: 3.05,
      extensionArmM: 2.05,
      backboardType: environment === 'indoor' ? 'tempered_glass' : 'frosted_acrylic',
      supportStyle,
    },
  };

  const objects: SceneObject[] = [...baseObjects, ...markingObjects, leftHoop];

  if (!dimensions.isHalfCourt) {
    objects.push({
      id: 'obj-hoop-east',
      name: 'East Hoop & Support',
      type: 'hoop_assembly',
      visible: true,
      locked: false,
      position: [halfLen + hoopOffset, 0, 0],
      rotationY: Math.PI,
      color: '#202630',
      secondaryColor: '#F07827',
      metadata: {
        rimHeightM: 3.05,
        extensionArmM: 2.05,
        backboardType: environment === 'indoor' ? 'tempered_glass' : 'frosted_acrylic',
        supportStyle,
      },
    });
  }

  if (environment === 'indoor') {
    objects.push(
      {
        id: 'obj-scorer-table',
        name: "Scorer's Table & Shot Console",
        type: 'scorer_table',
        visible: true,
        locked: false,
        position: [0, 0, halfWid + 1.25],
        rotationY: Math.PI,
        color: '#202630',
        secondaryColor: '#F07827',
      },
      {
        id: 'obj-bench-home',
        name: 'Home Team Bench',
        type: 'player_bench',
        visible: true,
        locked: false,
        position: [-5.5, 0, halfWid + 1.25],
        rotationY: Math.PI,
        color: '#262E3B',
        secondaryColor: '#1686C9',
      },
      {
        id: 'obj-bench-away',
        name: 'Visitor Team Bench',
        type: 'player_bench',
        visible: true,
        locked: false,
        position: [5.5, 0, halfWid + 1.25],
        rotationY: Math.PI,
        color: '#262E3B',
        secondaryColor: '#F07827',
      },
      {
        id: 'obj-scoreboard',
        name: 'Wall-Mount Scoreboard',
        type: 'scoreboard',
        visible: true,
        locked: false,
        position: [0, 4.6, -(halfWid + dimensions.apronM + 0.6)],
        rotationY: 0,
        color: '#171B22',
        secondaryColor: '#F07827',
      }
    );
  } else {
    objects.push(
      {
        id: 'obj-light-nw',
        name: 'NW Floodlight Mast',
        type: 'lighting_mast',
        visible: true,
        locked: false,
        position: [-(halfLen + dimensions.apronM - 0.35), 0, -(halfWid + dimensions.apronM - 0.35)],
        rotationY: Math.PI * 0.25,
        color: '#2A313D',
        secondaryColor: '#F2F4F7',
      },
      {
        id: 'obj-light-ne',
        name: 'NE Floodlight Mast',
        type: 'lighting_mast',
        visible: true,
        locked: false,
        position: [halfLen + dimensions.apronM - 0.35, 0, -(halfWid + dimensions.apronM - 0.35)],
        rotationY: -Math.PI * 0.25,
        color: '#2A313D',
        secondaryColor: '#F2F4F7',
      },
      {
        id: 'obj-fence-north',
        name: 'North Ball-Stop Fence',
        type: 'perimeter_fence',
        visible: true,
        locked: false,
        position: [0, 0, -(halfWid + dimensions.apronM + 0.08)],
        rotationY: 0,
        color: '#2C3440',
        metadata: { fenceLengthM: (dimensions.lengthM + dimensions.apronM * 2) * 0.72 },
      }
    );
  }

  return objects;
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.min(max, Math.max(min, num));
}

export function normalizeProject(project: CourtProject): CourtProject {
  const validStandard: CourtStandard = COURT_STANDARDS[project.standard]
    ? project.standard
    : 'FIBA';
  const validEnv: CourtEnvironment = project.environment === 'indoor' ? 'indoor' : 'outdoor';
  const validUnit: MeasurementUnit = project.unit === 'ft' ? 'ft' : 'm';

  const dims = project.dimensions ?? ({} as CourtDimensions);
  const lengthM = clampNumber(dims.lengthM, 8, 42, COURT_STANDARDS[validStandard].lengthM);
  const widthM = clampNumber(dims.widthM, 6, 25, COURT_STANDARDS[validStandard].widthM);
  const apronM = clampNumber(dims.apronM, 0.5, 6, COURT_STANDARDS[validStandard].defaultApronM);
  const orientationDeg = clampNumber(dims.orientationDeg, 0, 359, 0);

  const rawObjects = Array.isArray(project.objects) ? project.objects : [];
  let nextObjects: SceneObject[] = rawObjects
    .filter((o) => o && typeof o.id === 'string' && typeof o.type === 'string')
    .map((o) => {
      const pos = Array.isArray(o.position) && o.position.length === 3 ? o.position : [0, 0, 0];
      return {
        ...o,
        name: typeof o.name === 'string' && o.name.trim() ? o.name : 'Scene Object',
        visible: typeof o.visible === 'boolean' ? o.visible : true,
        locked: typeof o.locked === 'boolean' ? o.locked : false,
        position: [
          clampNumber(pos[0], -80, 80, 0),
          clampNumber(pos[1], -10, 30, 0),
          clampNumber(pos[2], -80, 80, 0),
        ] as [number, number, number],
        rotationY: typeof o.rotationY === 'number' && Number.isFinite(o.rotationY) ? o.rotationY : 0,
        color: typeof o.color === 'string' && o.color ? o.color : '#202630',
      };
    });

  const mats: CourtMaterials = {
    surfaceType: project.materials?.surfaceType ?? (validEnv === 'indoor' ? 'hardwood_maple' : 'acrylic_pro'),
    surfaceColor: project.materials?.surfaceColor ?? (validEnv === 'indoor' ? '#D4A36A' : '#1F4B7A'),
    apronColor: project.materials?.apronColor ?? '#1A2029',
    paintColor: project.materials?.paintColor ?? '#1686C9',
    lineColor: project.materials?.lineColor ?? '#F2F4F7',
  };

  const hasLegacyOnly =
    nextObjects.some((o) => o.type === 'court_markings') &&
    !nextObjects.some((o) => o.type === 'boundary_lines');

  if (hasLegacyOnly) {
    const filtered = nextObjects.filter((o) => o.type !== 'court_markings');
    const markings = buildCourtMarkingObjects(
      {
        lengthM,
        widthM,
        apronM,
        isHalfCourt: Boolean(dims.isHalfCourt),
        orientationDeg,
        showSafetyZone: dims.showSafetyZone ?? true,
      },
      mats
    );
    const slabIdx = filtered.findIndex((o) => o.type === 'playing_surface');
    nextObjects = [...filtered];
    nextObjects.splice(slabIdx >= 0 ? slabIdx + 1 : 0, 0, ...markings);
  }

  const rawAssumptions = project.engineeringAssumptions ?? defaultEngineeringAssumptions(validEnv);
  const rawCost = project.costConfig ?? defaultCostConfig();

  return {
    ...project,
    id: typeof project.id === 'string' && project.id.trim() ? project.id : `proj-${Date.now().toString(36)}`,
    name: typeof project.name === 'string' && project.name.trim() ? project.name : 'Untitled Court Project',
    client: typeof project.client === 'string' ? project.client : 'Private Architectural Study',
    location: typeof project.location === 'string' ? project.location : 'Site Unassigned',
    notes: typeof project.notes === 'string' ? project.notes : '',
    standard: validStandard,
    environment: validEnv,
    template: project.template === 'blank' ? 'blank' : 'standard',
    status: project.status ?? 'Draft',
    unit: validUnit,
    dimensions: {
      lengthM,
      widthM,
      apronM,
      isHalfCourt: typeof dims.isHalfCourt === 'boolean' ? dims.isHalfCourt : COURT_STANDARDS[validStandard].isHalfCourt,
      orientationDeg,
      showSafetyZone: dims.showSafetyZone ?? true,
    },
    materials: mats,
    environmentSettings: {
      ...defaultEnvironmentSettings(validEnv),
      ...(project.environmentSettings ?? {}),
    },
    cameraSettings: project.cameraSettings ?? defaultCameraSettings(lengthM, widthM),
    engineeringAssumptions: {
      slabThicknessM: clampNumber(rawAssumptions.slabThicknessM, 0.1, 0.3, 0.15),
      subBaseThicknessM: clampNumber(rawAssumptions.subBaseThicknessM, 0.1, 0.45, validEnv === 'outdoor' ? 0.2 : 0.15),
      excavationDepthM: clampNumber(rawAssumptions.excavationDepthM, 0.15, 0.7, validEnv === 'outdoor' ? 0.35 : 0.25),
      wasteFactorPct: clampNumber(rawAssumptions.wasteFactorPct, 0, 20, 7),
    },
    costConfig: {
      contingencyPct: clampNumber(rawCost.contingencyPct, 0, 30, 10),
      unitPriceOverrides:
        rawCost.unitPriceOverrides && typeof rawCost.unitPriceOverrides === 'object'
          ? rawCost.unitPriceOverrides
          : {},
    },
    objects: nextObjects,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
    lastOpenedAt: project.lastOpenedAt || new Date().toISOString(),
  };
}

export function createInitialProjects(): CourtProject[] {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

  const fibaSpec = COURT_STANDARDS.FIBA;
  const nbaSpec = COURT_STANDARDS.NBA;
  const threeXSpec = COURT_STANDARDS.FIBA_3X3;

  const p1Dim: CourtDimensions = {
    lengthM: fibaSpec.lengthM,
    widthM: fibaSpec.widthM,
    apronM: 2.0,
    isHalfCourt: false,
    orientationDeg: 0,
    showSafetyZone: true,
  };
  const p1Mat: CourtMaterials = {
    surfaceType: 'hardwood_maple',
    surfaceColor: '#D4A36A',
    apronColor: '#1A2029',
    paintColor: '#1686C9',
    lineColor: '#F2F4F7',
  };

  const p2Dim: CourtDimensions = {
    lengthM: nbaSpec.lengthM,
    widthM: nbaSpec.widthM,
    apronM: 2.4,
    isHalfCourt: false,
    orientationDeg: 0,
    showSafetyZone: true,
  };
  const p2Mat: CourtMaterials = {
    surfaceType: 'acrylic_pro',
    surfaceColor: '#1E4670',
    apronColor: '#252D38',
    paintColor: '#F07827',
    lineColor: '#F2F4F7',
  };

  const p3Dim: CourtDimensions = {
    lengthM: threeXSpec.lengthM,
    widthM: threeXSpec.widthM,
    apronM: 1.8,
    isHalfCourt: true,
    orientationDeg: 0,
    showSafetyZone: true,
  };
  const p3Mat: CourtMaterials = {
    surfaceType: 'modular_tile',
    surfaceColor: '#2B628D',
    apronColor: '#202630',
    paintColor: '#E06D22',
    lineColor: '#F2F4F7',
  };

  const projects: CourtProject[] = [
    {
      id: 'proj-meridian-arena',
      name: 'Meridian Civic Arena Main Floor',
      client: 'Meridian Municipal Sports Authority',
      location: 'Portland, OR',
      notes: 'Sprung maple subfloor system (28×15 m playing area, 2.0 m safety clearance apron).',
      standard: 'FIBA',
      environment: 'indoor',
      template: 'standard',
      status: 'Specification Ready',
      unit: 'm',
      dimensions: p1Dim,
      materials: p1Mat,
      environmentSettings: defaultEnvironmentSettings('indoor'),
      cameraSettings: defaultCameraSettings(p1Dim.lengthM, p1Dim.widthM),
      objects: buildDefaultObjects(p1Dim, 'indoor', 'standard', p1Mat),
      createdAt: hoursAgo(96),
      updatedAt: hoursAgo(2),
      lastOpenedAt: hoursAgo(2),
    },
    {
      id: 'proj-harborfront-park',
      name: 'Harborfront Community Park Court',
      client: 'Eastside Parks Department',
      location: 'Seattle, WA',
      notes: 'Post-tensioned concrete slab with 5-coat cushioned acrylic surfacing and 6 m LED masts.',
      standard: 'NBA',
      environment: 'outdoor',
      template: 'standard',
      status: 'In Review',
      unit: 'ft',
      dimensions: p2Dim,
      materials: p2Mat,
      environmentSettings: {
        lightingMode: 'sunset',
        shadowsEnabled: true,
        surroundings: 'park',
        renderMode: 'realistic',
      },
      cameraSettings: defaultCameraSettings(p2Dim.lengthM, p2Dim.widthM),
      objects: buildDefaultObjects(p2Dim, 'outdoor', 'standard', p2Mat),
      createdAt: hoursAgo(140),
      updatedAt: hoursAgo(14),
      lastOpenedAt: hoursAgo(14),
    },
    {
      id: 'proj-rooftop-3x3',
      name: 'Foundry Rooftop 3x3 Complex',
      client: 'Foundry Athletic Club',
      location: 'Chicago, IL',
      notes: 'Lightweight interlocking polymer tile deck engineered for structural rooftop drainage.',
      standard: 'FIBA_3X3',
      environment: 'outdoor',
      template: 'standard',
      status: 'Draft',
      unit: 'm',
      dimensions: p3Dim,
      materials: p3Mat,
      environmentSettings: {
        lightingMode: 'night',
        shadowsEnabled: true,
        surroundings: 'rooftop',
        renderMode: 'realistic',
      },
      cameraSettings: defaultCameraSettings(p3Dim.lengthM, p3Dim.widthM),
      objects: buildDefaultObjects(p3Dim, 'outdoor', 'standard', p3Mat),
      createdAt: hoursAgo(48),
      updatedAt: hoursAgo(30),
      lastOpenedAt: hoursAgo(30),
    },
  ];
  return projects.map(normalizeProject);
}

export function formatLength(meters: number, unit: MeasurementUnit, decimals = 2): string {
  if (unit === 'ft') {
    return `${(meters * 3.28084).toFixed(decimals)} ft`;
  }
  return `${meters.toFixed(decimals)} m`;
}

export function formatArea(sqMeters: number, unit: MeasurementUnit): string {
  if (unit === 'ft') {
    return `${(sqMeters * 10.7639).toFixed(0)} sq ft`;
  }
  return `${sqMeters.toFixed(1)} m²`;
}

export function metersToUnitValue(meters: number, unit: MeasurementUnit): number {
  return unit === 'ft' ? Number((meters * 3.28084).toFixed(2)) : Number(meters.toFixed(2));
}

export function unitValueToMeters(value: number, unit: MeasurementUnit): number {
  return unit === 'ft' ? value / 3.28084 : value;
}
