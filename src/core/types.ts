import { ProjectModule } from '../types/workspace';

export type StudioModuleId = ProjectModule;

export type StudioCameraPreset = 'perspective' | 'top' | 'front' | 'side';
export type StudioProjection = 'perspective' | 'orthographic';
export type StudioLightingMode = 'daylight' | 'sunset' | 'night';
export type StudioRenderMode = 'realistic' | 'architectural' | 'technical';
export type StudioCloudSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface StudioCameraState {
  preset: StudioCameraPreset;
  projection: StudioProjection;
  position: [number, number, number];
  target: [number, number, number];
  zoom?: number;
}

export interface GenericBomLine {
  id: string;
  category: string;
  item: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPriceFcfa: number;
  totalFcfa: number;
}

export interface GenericCostSummary {
  currency: 'FCFA';
  materialsSubtotalFcfa: number;
  labourSubtotalFcfa: number;
  contingencyPct: number;
  contingencyFcfa: number;
  grandTotalFcfa: number;
  disclaimer: string;
}
