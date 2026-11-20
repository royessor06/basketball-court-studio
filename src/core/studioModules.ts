import { StudioModuleId } from './types';

export interface StudioModuleDefinition {
  id: StudioModuleId;
  name: string;
  shortLabel: string;
  tagline: string;
  description: string;
  accentHex: string;
  editorReady: boolean;
  capabilities: string[];
}

export const STUDIO_MODULES: Record<StudioModuleId, StudioModuleDefinition> = {
  sports: {
    id: 'sports',
    name: 'Sports Ground Studio',
    shortLabel: 'Sports',
    tagline: '3D Courts, Pitches & Civil Engineering',
    description:
      'Parametric 3D CAD for basketball, football, handball, volleyball, tennis, and multi-sport facilities with technical plans, BOM, and FCFA costing.',
    accentHex: '#F07827',
    editorReady: true,
    capabilities: [
      'Regulation & Custom 3D Geometry',
      '8 Civil Ground & Surfacing Systems',
      '7 Technical SVG / PDF CAD Sheets',
      'BOM & Indicative FCFA Estimator',
    ],
  },
  furniture: {
    id: 'furniture',
    name: 'Furniture Studio',
    shortLabel: 'Furniture',
    tagline: 'Parametric Cabinetry, Woodwork & Cut-Lists',
    description:
      'Modular 3D furniture & millwork containers ready for sheet cut-lists, edge-banding meters, hardware BOM, and FCFA workshop costing.',
    accentHex: '#4CC38A',
    editorReady: false,
    capabilities: [
      'Parametric Cabinets, Desks & Shelving',
      'Sheet Material Cut-Lists (122×244 cm)',
      'Hardware & Edge-Banding Takeoff',
      'FCFA Workshop Cost Estimation',
    ],
  },
  house: {
    id: 'house',
    name: 'House Studio',
    shortLabel: 'House',
    tagline: 'Residential Architecture, Structural Shell & BOQ',
    description:
      'Architectural residential containers ready for parametric floor plans, openings, roofing systems, structural takeoffs, and FCFA construction budgets.',
    accentHex: '#1686C9',
    editorReady: false,
    capabilities: [
      'Parcel, Foundations & Load-Bearing Walls',
      'Parametric Doors, Windows & Roofing',
      '2D Floor Plans & Elevation Sheets',
      'Structural Materials & FCFA BOQ',
    ],
  },
};

export const STUDIO_MODULE_LIST: StudioModuleDefinition[] = [
  STUDIO_MODULES.sports,
  STUDIO_MODULES.furniture,
  STUDIO_MODULES.house,
];
