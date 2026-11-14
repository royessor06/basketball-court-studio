import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import {
  COURT_STANDARDS,
  metersToUnitValue,
  unitValueToMeters,
} from '../constants/courtStandards';
import { useProjectStore } from '../store/useProjectStore';
import {
  CourtEnvironment,
  CourtStandard,
  MeasurementUnit,
  ProjectStatus,
} from '../types/court';

export const ProjectSettingsView: React.FC = () => {
  const {
    activeProject,
    setCurrentView,
    openProjectInWorkspace,
    importProject,
    updateProject,
    duplicateProject,
    deleteProject,
    resetProjectCourt,
  } = useProjectStore();

  const [savedFeedback, setSavedFeedback] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  if (!activeProject) {
    return (
      <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
        <TopNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-sm mb-3">Select a project from the dashboard to configure settings.</p>
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-[#F07827] text-[#111318] text-xs font-semibold rounded-md cursor-pointer"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    );
  }

  const project = activeProject;

  const handleSaveNotify = () => {
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 1800);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const res = importProject(text);
      if (res.ok && res.project) {
        handleSaveNotify();
      } else {
        setImportError(res.error || 'Failed to import JSON specification.');
      }
    } catch {
      setImportError('Unable to read selected file.');
    }
  };

  const handleStandardChange = (std: CourtStandard) => {
    const spec = COURT_STANDARDS[std];
    updateProject(project.id, {
      standard: std,
      dimensions: {
        ...project.dimensions,
        lengthM: std === 'CUSTOM' ? project.dimensions.lengthM : spec.lengthM,
        widthM: std === 'CUSTOM' ? project.dimensions.widthM : spec.widthM,
        isHalfCourt: spec.isHalfCourt,
      },
    });
    handleSaveNotify();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
      <TopNav />

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#9AA4B2] hover:text-[#F2F4F7] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-3">
            {savedFeedback && (
              <span className="inline-flex items-center gap-1 text-xs text-[#4CC38A]">
                <Check className="w-3.5 h-3.5" />
                Changes saved
              </span>
            )}
            <button
              type="button"
              onClick={() => openProjectInWorkspace(project.id)}
              className="px-4 py-2 bg-[#F07827] text-[#111318] text-xs font-semibold rounded-md hover:bg-[#ff8a3d] transition-colors cursor-pointer"
            >
              Open in 3D Editor
            </button>
          </div>
        </div>

        <div className="pb-5 border-b border-white/10">
          <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#9AA4B2] mb-1">
            Project Management &amp; Engineering Settings
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
            {project.name}
          </h1>
        </div>

        {/* General Project Details */}
        <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-4">
          <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
            General Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">Project Name</label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => {
                  updateProject(project.id, { name: e.target.value }, false);
                  handleSaveNotify();
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#F07827]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">Project Status</label>
              <select
                value={project.status}
                onChange={(e) => {
                  updateProject(project.id, { status: e.target.value as ProjectStatus }, false);
                  handleSaveNotify();
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              >
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Specification Ready">Specification Ready</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">Client / Organization</label>
              <input
                type="text"
                value={project.client}
                onChange={(e) => {
                  updateProject(project.id, { client: e.target.value }, false);
                  handleSaveNotify();
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">Site Location</label>
              <input
                type="text"
                value={project.location}
                onChange={(e) => {
                  updateProject(project.id, { location: e.target.value }, false);
                  handleSaveNotify();
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#9AA4B2] mb-1.5">Architectural Notes</label>
            <textarea
              rows={3}
              value={project.notes}
              onChange={(e) => {
                updateProject(project.id, { notes: e.target.value }, false);
                handleSaveNotify();
              }}
              className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
            />
          </div>
        </section>

        {/* Engineering & Dimensions */}
        <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-5">
          <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
            Court Specification &amp; Units
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">Court Standard</label>
              <select
                value={project.standard}
                onChange={(e) => handleStandardChange(e.target.value as CourtStandard)}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              >
                {(Object.keys(COURT_STANDARDS) as CourtStandard[]).map((std) => (
                  <option key={std} value={std}>
                    {COURT_STANDARDS[std].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">Environment</label>
              <select
                value={project.environment}
                onChange={(e) => {
                  updateProject(project.id, {
                    environment: e.target.value as CourtEnvironment,
                  });
                  handleSaveNotify();
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              >
                <option value="indoor">Indoor Arena / Gym</option>
                <option value="outdoor">Outdoor Park / Plaza</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">Measurement Units</label>
              <select
                value={project.unit}
                onChange={(e) => {
                  updateProject(project.id, { unit: e.target.value as MeasurementUnit }, false);
                  handleSaveNotify();
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              >
                <option value="m">Meters (m)</option>
                <option value="ft">Feet (ft)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">
                Length ({project.unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={metersToUnitValue(project.dimensions.lengthM, project.unit)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!Number.isNaN(val)) {
                    updateProject(project.id, {
                      standard: 'CUSTOM',
                      dimensions: {
                        ...project.dimensions,
                        lengthM: Math.max(8, Math.min(42, unitValueToMeters(val, project.unit))),
                      },
                    });
                    handleSaveNotify();
                  }
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md font-mono-tech text-sm text-[#F2F4F7] focus:outline-none focus:border-[#F07827]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">
                Width ({project.unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={metersToUnitValue(project.dimensions.widthM, project.unit)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!Number.isNaN(val)) {
                    updateProject(project.id, {
                      standard: 'CUSTOM',
                      dimensions: {
                        ...project.dimensions,
                        widthM: Math.max(6, Math.min(25, unitValueToMeters(val, project.unit))),
                      },
                    });
                    handleSaveNotify();
                  }
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md font-mono-tech text-sm text-[#F2F4F7] focus:outline-none focus:border-[#F07827]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9AA4B2] mb-1.5">
                Perimeter Apron ({project.unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={metersToUnitValue(project.dimensions.apronM, project.unit)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!Number.isNaN(val)) {
                    updateProject(project.id, {
                      dimensions: {
                        ...project.dimensions,
                        apronM: Math.max(0.5, Math.min(6, unitValueToMeters(val, project.unit))),
                      },
                    });
                    handleSaveNotify();
                  }
                }}
                className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded-md font-mono-tech text-sm text-[#F2F4F7] focus:outline-none focus:border-[#F07827]"
              />
            </div>
          </div>
        </section>

        {/* Actions & Lifecycle */}
        <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-4">
          <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
            Project Actions &amp; Export
          </h2>

          {importError && (
            <div
              role="alert"
              className="p-3 bg-[#261717] border border-red-500/40 rounded text-xs text-red-200 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
              aria-label="Import project JSON file"
            />
            <button
              type="button"
              onClick={handleExportJson}
              className="px-4 py-2.5 bg-[#202630] hover:bg-white/10 border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#1686C9]" />
              Export Specification JSON
            </button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="px-4 py-2.5 bg-[#202630] hover:bg-white/10 border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#4CC38A]" />
              Import Specification JSON
            </button>

            <button
              type="button"
              onClick={() => {
                const copy = duplicateProject(project.id);
                if (copy) openProjectInWorkspace(copy.id);
              }}
              className="px-4 py-2.5 bg-[#202630] hover:bg-white/10 border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-[#9AA4B2]" />
              Duplicate Project
            </button>

            <button
              type="button"
              onClick={() => {
                resetProjectCourt(project.id);
                handleSaveNotify();
              }}
              className="px-4 py-2.5 bg-[#202630] hover:bg-white/10 border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#F07827]" />
              Reset Court Assemblies
            </button>

            {confirmDelete ? (
              <div className="inline-flex items-center gap-2 ml-auto">
                <span className="text-xs text-red-400">Delete permanently?</span>
                <button
                  type="button"
                  onClick={() => {
                    deleteProject(project.id);
                    setConfirmDelete(false);
                    setCurrentView('dashboard');
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-md cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 bg-[#202630] text-xs text-[#9AA4B2] rounded-md cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2.5 bg-[#202630] hover:bg-red-500/15 border border-red-500/25 rounded-md text-xs font-medium text-red-400 inline-flex items-center gap-2 sm:ml-auto cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete Project
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
