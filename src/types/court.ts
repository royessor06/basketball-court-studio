export type AppView = 'landing' | 'dashboard' | 'create' | 'workspace' | 'engineering' | 'settings';

export type CourtStandard = 'NBA' | 'FIBA' | 'NCAA' | 'FIBA_3X3' | 'CUSTOM';

export type CourtEnvironment = 'indoor' | 'outdoor';

export type MeasurementUnit = 'm' | 'ft';

export type ProjectStatus = 'Draft' | 'In Review' | 'Specification Ready' | 'Archived';

export type ProjectTemplate = 'standard' | 'blank';

export type SurfaceMaterialType =
  | 'hardwood_maple'
  | 'hardwood_dark'
  | 'acrylic_pro'
  | 'asphalt_textured'
  | 'modular_tile';

export type SceneObjectType =
  | 'court_slab'
  | 'playing_surface'
  | 'boundary_lines'
  | 'centre_markings'
  | 'free_throw_areas'
  | 'three_point_lines'
  | 'court_markings'
  | 'hoop_assembly'
  | 'player_bench'
  | 'scorer_table'
  | 'lighting_mast'
  | 'scoreboard'
  | 'perimeter_fence'
  | 'bleachers'
  | 'ball_rack';

export type ToolMode = 'select' | 'move' | 'rotate' | 'measure';

export type CameraPreset = 'perspective' | 'top' | 'front' | 'side';

export type CameraProjection = 'perspective' | 'orthographic';

export type LightingMode = 'daylight' | 'sunset' | 'night';

export type SurroundingsPreset = 'minimal' | 'arena' | 'park' | 'rooftop';

export type RenderMode = 'realistic' | 'architectural' | 'technical';

export type BackboardStyle =
  | 'tempered_glass'
  | 'frosted_acrylic'
  | 'solid_steel'
  | 'fan_outdoor';

export type SupportStyle = 'hydraulic_boom' | 'gooseneck_post' | 'wall_mount';

export interface SceneObject {
  id: string;
  name: string;
  type: SceneObjectType;
  visible: boolean;
  locked: boolean;
  position: [number, number, number]; // meters (1 Three.js unit = 1 metre)
  rotationY: number; // radians
  color: string;
  secondaryColor?: string;
  metadata?: {
    rimHeightM?: number;
    extensionArmM?: number;
    backboardType?: BackboardStyle;
    supportStyle?: SupportStyle;
    fenceLengthM?: number;
  };
}

export interface CourtMaterials {
  surfaceType: SurfaceMaterialType;
  surfaceColor: string;
  apronColor: string;
  paintColor: string;
  lineColor: string;
}

export interface CourtDimensions {
  lengthM: number;
  widthM: number;
  apronM: number;
  isHalfCourt: boolean;
  orientationDeg: number;
  showSafetyZone: boolean;
}

export interface EnvironmentSettings {
  lightingMode: LightingMode;
  shadowsEnabled: boolean;
  surroundings: SurroundingsPreset;
  renderMode: RenderMode;
}

export interface CameraSettings {
  preset: CameraPreset;
  projection: CameraProjection;
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface EngineeringAssumptions {
  slabThicknessM: number;
  subBaseThicknessM: number;
  excavationDepthM: number;
  wasteFactorPct: number;
}

export interface CostConfig {
  contingencyPct: number;
  unitPriceOverrides: Record<string, number>;
}

export interface CourtProject {
  id: string;
  name: string;
  client: string;
  location: string;
  notes: string;
  standard: CourtStandard;
  environment: CourtEnvironment;
  template: ProjectTemplate;
  status: ProjectStatus;
  unit: MeasurementUnit;
  dimensions: CourtDimensions;
  materials: CourtMaterials;
  environmentSettings: EnvironmentSettings;
  cameraSettings: CameraSettings;
  engineeringAssumptions?: EngineeringAssumptions;
  costConfig?: CostConfig;
  objects: SceneObject[];
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}
