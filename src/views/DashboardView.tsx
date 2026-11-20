import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  FileEdit,
  FileText,
  FolderOpen,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import {
  COURT_STANDARDS,
  formatLength,
  GROUND_SYSTEM_PRESETS,
  SPORT_DISCIPLINES,
} from '../constants/courtStandards';
import { useProjectStore } from '../store/useProjectStore';
import { CourtEnvironment, CourtProject, ProjectStatus, SportDiscipline } from '../types/court';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const StatusDisplay: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  if (status === 'Specification Ready') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4CC38A]">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Specification Ready
      </span>
    );
  }
  if (status === 'In Review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1686C9]">
        <Clock className="w-3.5 h-3.5" />
        In Review
      </span>
    );
  }
  if (status === 'Archived') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9AA4B2]">
        <FolderOpen className="w-3.5 h-3.5" />
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F07827]">
      <FileEdit className="w-3.5 h-3.5" />
      Draft
    </span>
  );
};

export const DashboardView: React.FC = () => {
  const {
    projects,
    setCurrentView,
    openProjectInWorkspace,
    openProjectEngineering,
    openProjectSettings,
    importProject,
    restoreSampleProjects,
    duplicateProject,
    deleteProject,
  } = useProjectStore();

  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<'ALL' | SportDiscipline>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [envFilter, setEnvFilter] = useState<'ALL' | CourtEnvironment>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const res = importProject(text);
      if (res.ok && res.project) {
        setImportStatus({ type: 'ok', text: `Imported "${res.project.name}".` });
      } else {
        setImportStatus({ type: 'err', text: res.error || 'Import failed.' });
      }
    } catch {
      setImportStatus({ type: 'err', text: 'Failed to read selected JSON file.' });
    }
    window.setTimeout(() => setImportStatus(null), 4000);
  };

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
        .slice(0, 3),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const pSport = p.sport ?? COURT_STANDARDS[p.standard].sport;
      const matchesQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.client.toLowerCase().includes(query.toLowerCase()) ||
        p.location.toLowerCase().includes(query.toLowerCase());
      const matchesSport = sportFilter === 'ALL' || pSport === sportFilter;
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesEnv = envFilter === 'ALL' || p.environment === envFilter;
      return matchesQuery && matchesSport && matchesStatus && matchesEnv;
    });
  }, [projects, query, sportFilter, statusFilter, envFilter]);

  const counts = useMemo(
    () => ({
      total: projects.length,
      ready: projects.filter((p) => p.status === 'Specification Ready').length,
      review: projects.filter((p) => p.status === 'In Review').length,
      draft: projects.filter((p) => p.status === 'Draft').length,
    }),
    [projects]
  );

  const getGroundShortLabel = (p: CourtProject) => {
    const sys = p.groundSystem ?? COURT_STANDARDS[p.standard].defaultGroundSystem;
    return GROUND_SYSTEM_PRESETS.find((g) => g.id === sys)?.shortLabel ?? 'Concrete Slab';
  };

  const renderProjectMeta = (p: CourtProject) => (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#9AA4B2]">
      <span>{COURT_STANDARDS[p.standard].shortLabel}</span>
      <span aria-hidden="true">·</span>
      <span>{getGroundShortLabel(p)}</span>
      <span aria-hidden="true">·</span>
      <span className="capitalize">{p.environment}</span>
      <span aria-hidden="true">·</span>
      <span className="font-mono-tech">
        {formatLength(p.dimensions.lengthM, p.unit)} × {formatLength(p.dimensions.widthM, p.unit)}
      </span>
      <span aria-hidden="true">·</span>
      <span>{p.objects.length} assemblies</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
      <TopNav />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#9AA4B2] mb-1.5">
              Project Workspace Hub
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
              Court Architecture Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
              aria-label="Import court project JSON file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Import previously exported court specification (.json)"
              className="px-4 py-2.5 bg-[#1A2029] hover:bg-[#202630] border border-white/15 text-[#F2F4F7] text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#1686C9]" />
              Import JSON
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('create')}
              className="px-5 py-2.5 bg-[#F07827] text-[#111318] text-sm font-semibold rounded-md hover:bg-[#ff8a3d] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Project
            </button>
          </div>
        </div>

        {importStatus && (
          <div
            role="status"
            className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
              importStatus.type === 'ok'
                ? 'bg-[#13221D] border-[#4CC38A]/40 text-[#F2F4F7]'
                : 'bg-[#261717] border-red-500/40 text-red-200'
            }`}
          >
            {importStatus.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-[#4CC38A] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{importStatus.text}</span>
          </div>
        )}

        {/* Summary Strip (clean unboxed metrics) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
            <div className="text-xs text-[#9AA4B2]">Total Projects</div>
            <div className="font-mono-tech text-2xl font-semibold text-[#F2F4F7] mt-1">
              {counts.total}
            </div>
          </div>
          <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
            <div className="text-xs text-[#9AA4B2]">Specification Ready</div>
            <div className="font-mono-tech text-2xl font-semibold text-[#4CC38A] mt-1">
              {counts.ready}
            </div>
          </div>
          <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
            <div className="text-xs text-[#9AA4B2]">In Review</div>
            <div className="font-mono-tech text-2xl font-semibold text-[#1686C9] mt-1">
              {counts.review}
            </div>
          </div>
          <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
            <div className="text-xs text-[#9AA4B2]">Active Drafts</div>
            <div className="font-mono-tech text-2xl font-semibold text-[#F07827] mt-1">
              {counts.draft}
            </div>
          </div>
        </section>

        {/* Recent Projects + Quick Create */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-[#F2F4F7]">Recent Projects</h2>
            <span className="text-xs text-[#9AA4B2]">Quick access to 3D editor</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Create Project Quick Entry */}
            <button
              type="button"
              onClick={() => setCurrentView('create')}
              className="p-5 bg-[#1A2029] border border-dashed border-white/20 hover:border-[#F07827] rounded-lg flex flex-col justify-between text-left transition-colors group min-h-[168px] cursor-pointer"
            >
              <div className="w-10 h-10 rounded-md bg-[#202630] border border-white/10 flex items-center justify-center text-[#F07827] group-hover:bg-[#F07827] group-hover:text-[#111318] transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <div className="font-display font-semibold text-[#F2F4F7]">New Facility Design</div>
                <div className="text-xs text-[#9AA4B2] mt-1">
                  Basketball, Football, Handball, Volleyball, Tennis &amp; Multi-Sport
                </div>
              </div>
            </button>

            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="p-5 bg-[#1A2029] border border-white/10 rounded-lg flex flex-col justify-between min-h-[168px]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <StatusDisplay status={project.status} />
                    <span className="text-xs text-[#9AA4B2] font-mono-tech">
                      {formatRelativeTime(project.lastOpenedAt)}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-[#F2F4F7] line-clamp-1 mb-1">
                    {project.name}
                  </h3>
                  {renderProjectMeta(project)}
                </div>

                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => openProjectInWorkspace(project.id)}
                    className="flex-1 px-3 py-2 bg-[#202630] hover:bg-[#1686C9] text-[#F2F4F7] text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Open 3D Editor
                  </button>
                  <button
                    type="button"
                    aria-label={`Project settings for ${project.name}`}
                    onClick={() => openProjectSettings(project.id)}
                    className="p-2 bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] rounded transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Projects Directory */}
        <section className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold text-[#F2F4F7]">Saved Projects</h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial min-w-[220px]">
                <Search className="w-4 h-4 text-[#9AA4B2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, client, site..."
                  className="w-full pl-9 pr-3 py-2 bg-[#1A2029] border border-white/10 rounded-md text-xs text-[#F2F4F7] placeholder-[#9AA4B2] focus:outline-none focus:border-[#1686C9]"
                />
              </div>

              {/* Sport Discipline Filter */}
              <select
                aria-label="Filter by sport discipline"
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value as 'ALL' | SportDiscipline)}
                className="px-3 py-2 bg-[#1A2029] border border-white/10 rounded-md text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              >
                <option value="ALL">All Sports</option>
                {SPORT_DISCIPLINES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.shortLabel}
                  </option>
                ))}
              </select>

              {/* Environment Filter */}
              <div className="flex items-center bg-[#1A2029] border border-white/10 rounded-md p-0.5">
                {(['ALL', 'indoor', 'outdoor'] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvFilter(env)}
                    className={`px-3 py-1.5 text-xs font-medium rounded capitalize transition-colors cursor-pointer ${
                      envFilter === env
                        ? 'bg-[#202630] text-[#F2F4F7]'
                        : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                    }`}
                  >
                    {env === 'ALL' ? 'All Sites' : env}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <select
                aria-label="Filter by project status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ProjectStatus)}
                className="px-3 py-2 bg-[#1A2029] border border-white/10 rounded-md text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Specification Ready">Specification Ready</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-12 bg-[#1A2029] border border-white/10 rounded-lg text-center">
              <p className="text-sm font-medium text-[#F2F4F7] mb-1">
                {projects.length === 0 ? 'No saved court projects yet' : 'No matching court projects'}
              </p>
              <p className="text-xs text-[#9AA4B2] mb-5">
                {projects.length === 0
                  ? 'Initialize a new court design, import a JSON specification, or load sample presets.'
                  : 'Adjust your search filter or initialize a new court specification.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentView('create')}
                  className="px-4 py-2 bg-[#F07827] text-[#111318] text-xs font-semibold rounded-md hover:bg-[#ff8a3d] transition-colors cursor-pointer"
                >
                  Create New Project
                </button>
                {projects.length === 0 && (
                  <button
                    type="button"
                    onClick={restoreSampleProjects}
                    className="px-4 py-2 bg-[#202630] hover:bg-white/10 border border-white/15 text-[#F2F4F7] text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#1686C9]" />
                    Restore Sample Projects
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#1A2029] border border-white/10 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#202630] text-xs font-medium text-[#9AA4B2]">
                    <th className="py-3 px-4">Project &amp; Client</th>
                    <th className="py-3 px-4">Specification</th>
                    <th className="py-3 px-4">Dimensions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 text-sm">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-[#202630]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#F2F4F7]">{p.name}</div>
                        <div className="text-xs text-[#9AA4B2] mt-0.5">
                          {p.client} · {p.location}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#F2F4F7] whitespace-nowrap">
                        {COURT_STANDARDS[p.standard].shortLabel} · {getGroundShortLabel(p)} ·{' '}
                        <span className="capitalize text-[#9AA4B2]">{p.environment}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono-tech text-xs text-[#F2F4F7] whitespace-nowrap">
                        {formatLength(p.dimensions.lengthM, p.unit)} ×{' '}
                        {formatLength(p.dimensions.widthM, p.unit)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusDisplay status={p.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono-tech text-xs text-[#9AA4B2] whitespace-nowrap">
                        {formatRelativeTime(p.updatedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openProjectInWorkspace(p.id)}
                            className="px-3 py-1.5 bg-[#1686C9] hover:bg-[#1e96de] text-white text-xs font-medium rounded transition-colors cursor-pointer"
                          >
                            3D Editor
                          </button>
                          <button
                            type="button"
                            title="Technical Plans, BOM & FCFA Cost"
                            aria-label={`Plans and cost for ${p.name}`}
                            onClick={() => openProjectEngineering(p.id)}
                            className="px-2.5 py-1.5 bg-[#202630] hover:bg-white/10 text-[#F2F4F7] text-xs font-medium rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#F07827]" />
                            Plans
                          </button>
                          <button
                            type="button"
                            title="Duplicate Project"
                            aria-label={`Duplicate ${p.name}`}
                            onClick={() => duplicateProject(p.id)}
                            className="p-1.5 bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] rounded transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Project Settings"
                            aria-label={`Settings for ${p.name}`}
                            onClick={() => openProjectSettings(p.id)}
                            className="p-1.5 bg-[#202630] hover:bg-white/10 text-[#9AA4B2] hover:text-[#F2F4F7] rounded transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === p.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteProject(p.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded cursor-pointer"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Delete Project"
                              aria-label={`Delete ${p.name}`}
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="p-1.5 bg-[#202630] hover:bg-red-500/20 text-[#9AA4B2] hover:text-red-400 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
