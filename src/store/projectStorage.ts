import { normalizeProject } from '../constants/courtStandards';
import { CourtProject } from '../types/court';

export interface StorageResult {
  ok: boolean;
  error?: string;
}

export interface ProjectStorageAdapter {
  loadProjects: () => { projects: CourtProject[] | null; error?: string };
  saveProjects: (projects: CourtProject[]) => StorageResult;
  loadSavedSnapshots: () => Record<string, CourtProject>;
  saveSnapshot: (project: CourtProject) => StorageResult;
  removeSnapshot: (projectId: string) => StorageResult;
}

const PROJECTS_KEY = 'bcs_projects_v1';
const SNAPSHOTS_KEY = 'bcs_saved_snapshots_v1';
const ACTIVE_ID_KEY = 'bcs_active_project_id_v1';
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function stripUnsafeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUnsafeKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = stripUnsafeKeys(v);
    }
    return out;
  }
  return value;
}

export function validateImportedProjectJson(rawText: string): {
  project?: CourtProject;
  error?: string;
} {
  if (rawText.length > MAX_IMPORT_BYTES) {
    return { error: 'JSON specification file exceeds the 5 MB safety limit.' };
  }
  try {
    const parsed = stripUnsafeKeys(JSON.parse(rawText));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'Invalid JSON structure: expected a project specification object.' };
    }
    const candidate = parsed as Partial<CourtProject>;
    if (
      typeof candidate.name !== 'string' ||
      !candidate.dimensions ||
      typeof candidate.dimensions.lengthM !== 'number' ||
      !Number.isFinite(candidate.dimensions.lengthM) ||
      typeof candidate.dimensions.widthM !== 'number' ||
      !Number.isFinite(candidate.dimensions.widthM)
    ) {
      return {
        error: 'Missing required facility fields (name, dimensions.lengthM, dimensions.widthM).',
      };
    }

    const now = new Date().toISOString();
    const normalized = normalizeProject({
      ...(candidate as CourtProject),
      id: `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: candidate.createdAt || now,
      updatedAt: now,
      lastOpenedAt: now,
    });
    return { project: normalized };
  } catch {
    return { error: 'Unable to parse file: invalid JSON syntax.' };
  }
}

export function loadPersistedActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function persistActiveProjectId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_ID_KEY, id);
    else localStorage.removeItem(ACTIVE_ID_KEY);
  } catch {
    // Ignore private mode storage restriction
  }
}

export const localProjectStorage: ProjectStorageAdapter = {
  loadProjects() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return { projects: null };
      const parsed = stripUnsafeKeys(JSON.parse(raw));
      if (!Array.isArray(parsed)) {
        return {
          projects: null,
          error: 'Stored project archive was corrupted and reset to defaults.',
        };
      }
      if (parsed.length === 0) return { projects: [] };
      const valid = parsed
        .filter((item) => item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
        .map((item) => normalizeProject(item as CourtProject));
      return { projects: valid };
    } catch {
      return {
        projects: null,
        error: 'Unable to read local project storage; initialized default workspace.',
      };
    }
  },

  saveProjects(projects) {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      return { ok: true };
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'QuotaExceededError'
          ? 'Browser storage quota exceeded. Export JSON backups or remove unused projects.'
          : 'Unable to persist projects to browser storage.';
      return { ok: false, error: msg };
    }
  },

  loadSavedSnapshots() {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (!raw) return {};
      const parsed = stripUnsafeKeys(JSON.parse(raw));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const cleaned: Record<string, CourtProject> = {};
      Object.entries(parsed).forEach(([key, val]) => {
        if (val && typeof val === 'object') {
          cleaned[key] = normalizeProject(val as CourtProject);
        }
      });
      return cleaned;
    } catch {
      return {};
    }
  },

  saveSnapshot(project) {
    try {
      const existing = localProjectStorage.loadSavedSnapshots();
      existing[project.id] = project;
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(existing));
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Unable to save checkpoint snapshot due to browser storage limits.',
      };
    }
  },

  removeSnapshot(projectId) {
    try {
      const existing = localProjectStorage.loadSavedSnapshots();
      if (existing[projectId]) {
        delete existing[projectId];
        localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(existing));
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
};
