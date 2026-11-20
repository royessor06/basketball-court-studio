export type AppView = 'landing' | 'dashboard' | 'create' | 'workspace' | 'engineering' | 'settings' | 'container';

export type SportDiscipline =
  | 'basketball'
  | 'football'
  | 'volleyball'
  | 'tennis'
  | 'handball'
  | 'multisport'
  | 'custom';

export type LayerSportType = 'basketball' | 'football' | 'volleyball' | 'tennis' | 'handball';

export type CourtStandard =
  | 'NBA'
  | 'FIBA'
  | 'NCAA'
  | 'FIBA_3X3'
  | 'FOOTBALL_11'
  | 'FOOTBALL_7'
  | 'FOOTBALL_5'
  | 'VOLLEYBALL_STD'
  | 'BEACH_VOLLEY'
  | 'TENNIS_DOUBLES'
  | 'HANDBALL_IHF'
  | 'MULTISPORT_40X20'
  | 'MULTISPORT_30X18'
  | 'CUSTOM';

export type CourtEnvironment = 'indoor' | 'outdoor';

export type MeasurementUnit = 'm' | 'ft';

export type ProjectStatus = 'Draft' | 'In Review' | 'Specification Ready' | 'Archived';

export type ProjectTemplate = 'standard' | 'blank';

export type GroundSystemType =
  | 'concrete_slab'
  | 'asphalt_base'
  | 'sprung_wood'
  | 'synthetic_turf'
  | 'natural_grass'
  | 'clay_court'
  | 'sand_court'
  | 'existing_slab';

export type SurfaceMaterialType =
  | 'hardwood_maple'
  | 'hardwood_dark'
  | 'acrylic_pro'
  | 'asphalt_textured'
  | 'modular_tile'
  | 'pu_multisport'
  | 'synthetic_turf'
  | 'natural_grass'
  | 'clay_red'
  | 'beach_sand';

export type SceneObjectType =
  | 'court_slab'
  | 'playing_surface'
  | 'boundary_lines'
  | 'centre_markings'
  | 'free_throw_areas'
  | 'three_point_lines'
  | 'court_markings'
  | 'hoop_assembly'
  | 'football_goal'
  | 'handball_goal'
  | 'volleyball_net'
  | 'tennis_net'
  | 'multisport_combo_goal'
  | 'dugout_shelter'
  | 'corner_flag'
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

export interface SportMarkingLayer {
  id: string;
  sport: LayerSportType;
  presetId: CourtStandard;
  name: string;
  visible: boolean;
  lengthM: number;
  widthM: number;
  lineColor: string;
  paintColor?: string;
  lineWidthM: number;
  offsetX: number;
  offsetZ: number;
  rotationDeg: number;
  isHalfCourt?: boolean;
}

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
    fenceHeightM?: number;
    goalWidthM?: number;
    goalHeightM?: number;
    goalDepthM?: number;
    netHeightM?: number;
    netWidthM?: number;
    poleHeightM?: number;
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
  schemaVersion?: number;
  name: string;
  client: string;
  location: string;
  notes: string;
  sport?: SportDiscipline;
  standard: CourtStandard;
  groundSystem?: GroundSystemType;
  environment: CourtEnvironment;
  template: ProjectTemplate;
  status: ProjectStatus;
  unit: MeasurementUnit;
  dimensions: CourtDimensions;
  materials: CourtMaterials;
  sportLayers?: SportMarkingLayer[];
  environmentSettings: EnvironmentSettings;
  cameraSettings: CameraSettings;
  engineeringAssumptions?: EngineeringAssumptions;
  costConfig?: CostConfig;
  objects: SceneObject[];
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}
