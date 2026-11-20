import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Compass,
  Download,
  FileText,
  Layers,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import {
  PlanVisualStyle,
  TECHNICAL_SHEETS,
  TechnicalPlanSvg,
  TechnicalSheetId,
} from '../components/engineering/TechnicalPlanSvg';
import {
  COURT_STANDARDS,
  defaultEngineeringAssumptions,
  formatArea,
  formatLength,
} from '../constants/courtStandards';
import {
  BENIN_PRICE_DISCLAIMER,
  computeBom,
  computeConstructionSchedule,
  computeCostEstimate,
  CostSectionId,
  ENGINEERING_VALIDATION_NOTICE,
  formatFcfa,
  getActiveSportEquipment,
} from '../engineering/courtCalculations';
import {
  exportBomPdf,
  exportCompleteProjectReportPdf,
  exportConstructionSchedulePdf,
  exportCostEstimatePdf,
  exportTechnicalPlansPdf,
} from '../engineering/pdfExport';
import { useAuthWorkspace } from '../store/useAuthWorkspaceStore';
import { useProjectStore } from '../store/useProjectStore';

type EngineeringTab = 'plans' | 'bom' | 'cost' | 'schedule';

export const EngineeringView: React.FC = () => {
  const { userProfile, workspaceProjects } = useAuthWorkspace();
  const {
    projects,
    activeProject,
    setCurrentView,
    openProjectInWorkspace,
    openProjectEngineering,
    openSportsWorkspaceProject,
    updateEngineeringAssumptions,
    updateCostConfig,
    cloudSyncStatus,
    isActiveProjectCloudBacked,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<EngineeringTab>('plans');
  const [selectedSheet, setSelectedSheet] = useState<TechnicalSheetId>('top_plan');
  const [planStyle, setPlanStyle] = useState<PlanVisualStyle>('technical');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const project = activeProject ?? projects[0] ?? null;

  const bom = useMemo(() => (project ? computeBom(project) : null), [project]);
  const cost = useMemo(
    () => (project && bom ? computeCostEstimate(project, bom) : null),
    [project, bom]
  );
  const schedule = useMemo(
    () => (project && bom ? computeConstructionSchedule(project, bom) : null),
    [project, bom]
  );

  if (!project || !bom || !cost || !schedule) {
    return (
      <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
        <TopNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-sm mb-3">Create or select a court project to view engineering outputs.</p>
          <button
            type="button"
            onClick={() => setCurrentView('create')}
            className="px-4 py-2 bg-[#F07827] text-[#111318] text-xs font-semibold rounded-md cursor-pointer"
          >
            Create New Project
          </button>
        </div>
      </div>
    );
  }

  const assumptions =
    project.engineeringAssumptions ?? defaultEngineeringAssumptions(project.environment);
  const spec = COURT_STANDARDS[project.standard];
  const totalL = project.dimensions.lengthM + project.dimensions.apronM * 2;
  const totalW = project.dimensions.widthM + project.dimensions.apronM * 2;

  const triggerExportFeedback = (label: string) => {
    setExportNotice(`Generated ${label}`);
    window.setTimeout(() => setExportNotice(null), 2400);
  };

  const equipmentList = getActiveSportEquipment(project);

  const costSections: Array<{ id: CostSectionId; label: string; subtotal: number }> = [
    { id: 'materials', label: 'Materials (Linked to BOM)', subtotal: cost.materialsSubtotalFcfa },
    { id: 'labour', label: 'Labour Costs', subtotal: cost.labourSubtotalFcfa },
    { id: 'equipment', label: 'Equipment & Plant Hire', subtotal: cost.equipmentSubtotalFcfa },
    { id: 'transport', label: 'Transport & Haulage', subtotal: cost.transportSubtotalFcfa },
    { id: 'additional', label: 'Additional Site & Engineering Expenses', subtotal: cost.additionalSubtotalFcfa },
  ];

  const handlePriceOverride = (itemId: string, rawValue: string) => {
    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed)) return;
    const nextOverrides = {
      ...(project.costConfig?.unitPriceOverrides ?? {}),
      [itemId]: Math.max(0, Math.round(parsed)),
    };
    updateCostConfig(project.id, { unitPriceOverrides: nextOverrides });
  };

  const handleResetUnitPrices = () => {
    updateCostConfig(project.id, { unitPriceOverrides: {}, contingencyPct: 10 });
  };

  const hasPriceOverrides =
    Object.keys(project.costConfig?.unitPriceOverrides ?? {}).length > 0 ||
    (project.costConfig?.contingencyPct ?? 10) !== 10;

  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
      <TopNav />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Top Engineering Control Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA4B2]">
              <button
                type="button"
                onClick={() => openProjectInWorkspace(project.id)}
                className="inline-flex items-center gap-1.5 text-[#1686C9] hover:text-[#3ca4e3] font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to 3D Studio
              </button>
              <span aria-hidden="true">·</span>
              <span>{spec.label}</span>
              <span aria-hidden="true">·</span>
              <span>{bom.groundSystemLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{bom.activeSportsSummary}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{project.environment}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tech">
                {formatLength(project.dimensions.lengthM, project.unit)} ×{' '}
                {formatLength(project.dimensions.widthM, project.unit)} (+
                {formatLength(project.dimensions.apronM, project.unit)} apron)
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#F2F4F7]">
              {project.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isActiveProjectCloudBacked && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono-tech text-[#9AA4B2] mr-1">
                {cloudSyncStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-[#1686C9] animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-[#4CC38A]" />
                    Cloud
                  </>
                )}
              </span>
            )}
            {exportNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#4CC38A] font-medium mr-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {exportNotice}
              </span>
            )}

            {userProfile && workspaceProjects.some((wp) => wp.module === 'sports') ? (
              <select
                aria-label="Select workspace project for engineering report"
                value={project.id}
                onChange={(e) => {
                  const chosen = workspaceProjects.find((wp) => wp.projectId === e.target.value);
                  if (chosen) void openSportsWorkspaceProject(chosen, 'engineering');
                }}
                className="px-3 py-2 bg-[#1A2029] border border-white/15 rounded-md text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9] max-w-[220px]"
              >
                {workspaceProjects
                  .filter((wp) => wp.module === 'sports')
                  .map((wp) => (
                    <option key={wp.projectId} value={wp.projectId}>
                      {wp.name}
                    </option>
                  ))}
              </select>
            ) : (
              <select
                aria-label="Select project for engineering report"
                value={project.id}
                onChange={(e) => openProjectEngineering(e.target.value)}
                className="px-3 py-2 bg-[#1A2029] border border-white/15 rounded-md text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9] max-w-[220px]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => openProjectInWorkspace(project.id)}
              className="px-3.5 py-2 bg-[#1A2029] hover:bg-[#202630] border border-white/15 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Box className="w-3.5 h-3.5 text-[#1686C9]" />
              Edit 3D Model
            </button>

            <button
              type="button"
              onClick={() => {
                exportCompleteProjectReportPdf(project, bom, cost, schedule, planStyle);
                triggerExportFeedback('Complete Project Report PDF');
              }}
              className="px-4 py-2 bg-[#F07827] hover:bg-[#ff8a3d] text-[#111318] rounded-md text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Complete Report PDF
            </button>
          </div>
        </div>

        {/* Linked Summary Metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
            <div className="text-xs text-[#9AA4B2]">Playing / Gross Slab Area</div>
            <div className="font-mono-tech text-lg font-semibold text-[#F2F4F7] mt-1">
              {formatArea(bom.playingAreaM2, project.unit)} / {formatArea(bom.totalSlabAreaM2, project.unit)}
            </div>
          </div>
          {(() => {
            const concreteVol = bom.items
              .filter((i) => i.categoryId === 'concrete')
              .reduce((s, i) => s + i.quantity, 0);
            return concreteVol > 0 ? (
              <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
                <div className="text-xs text-[#9AA4B2]">Concrete Volume (Slab + Footings)</div>
                <div className="font-mono-tech text-lg font-semibold text-[#1686C9] mt-1">
                  {concreteVol.toFixed(1)} m³
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
                <div className="text-xs text-[#9AA4B2]">Ground Build-Up &amp; Markings</div>
                <div className="font-mono-tech text-lg font-semibold text-[#1686C9] mt-1 truncate">
                  {bom.groundSystemLabel} · {bom.markingLinearM} m
                </div>
              </div>
            );
          })()}
          <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
            <div className="text-xs text-[#9AA4B2]">Indicative Project Budget</div>
            <div className="font-mono-tech text-lg font-semibold text-[#F07827] mt-1">
              {formatFcfa(cost.grandTotalFcfa)}
            </div>
          </div>
          <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg">
            <div className="text-xs text-[#9AA4B2]">Construction Timeline</div>
            <div className="font-mono-tech text-lg font-semibold text-[#F2F4F7] mt-1">
              {schedule.totalDurationDays} working days
            </div>
          </div>
        </section>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#1A2029] p-1 rounded-md border border-white/10">
            {(
              [
                { id: 'plans', label: 'Technical Plans', icon: Compass },
                { id: 'bom', label: 'Bill of Materials', icon: ClipboardList },
                { id: 'cost', label: 'FCFA Cost Estimate', icon: Calculator },
                { id: 'schedule', label: 'Construction Workflow', icon: CalendarClock },
              ] as Array<{ id: EngineeringTab; label: string; icon: React.ComponentType<{ className?: string }> }>
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#202630] text-[#F07827] border border-white/10'
                      : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'plans' && (
              <button
                type="button"
                onClick={() => {
                  exportTechnicalPlansPdf(project, planStyle);
                  triggerExportFeedback('Technical Plans PDF');
                }}
                className="px-3.5 py-2 bg-[#202630] hover:bg-[#1686C9] border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Plans PDF
              </button>
            )}
            {activeTab === 'bom' && (
              <button
                type="button"
                onClick={() => {
                  exportBomPdf(project, bom);
                  triggerExportFeedback('Bill of Materials PDF');
                }}
                className="px-3.5 py-2 bg-[#202630] hover:bg-[#1686C9] border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export BOM PDF
              </button>
            )}
            {activeTab === 'cost' && (
              <button
                type="button"
                onClick={() => {
                  exportCostEstimatePdf(project, cost);
                  triggerExportFeedback('Cost Estimate PDF');
                }}
                className="px-3.5 py-2 bg-[#202630] hover:bg-[#1686C9] border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Cost Estimate PDF
              </button>
            )}
            {activeTab === 'schedule' && (
              <button
                type="button"
                onClick={() => {
                  exportConstructionSchedulePdf(project, schedule);
                  triggerExportFeedback('Construction Schedule PDF');
                }}
                className="px-3.5 py-2 bg-[#202630] hover:bg-[#1686C9] border border-white/10 rounded-md text-xs font-medium text-[#F2F4F7] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Schedule PDF
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: TECHNICAL PLANS */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sheet Selector Sidebar */}
            <aside className="lg:col-span-3 space-y-4">
              <div className="p-3 bg-[#1A2029] border border-white/10 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2] px-1">
                  Visualization Mode
                </div>
                <div className="grid grid-cols-2 gap-1 bg-[#111318] p-1 rounded border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPlanStyle('technical')}
                    className={`py-1.5 px-2 text-xs rounded transition-colors cursor-pointer ${
                      planStyle === 'technical'
                        ? 'bg-[#1686C9] text-white font-medium'
                        : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                    }`}
                  >
                    Technical CAD
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanStyle('architectural')}
                    className={`py-1.5 px-2 text-xs rounded transition-colors cursor-pointer ${
                      planStyle === 'architectural'
                        ? 'bg-[#F07827] text-[#111318] font-semibold'
                        : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                    }`}
                  >
                    Architectural
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#1A2029] border border-white/10 rounded-lg space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9AA4B2] px-1 mb-2">
                  Drawing Sheets (7)
                </div>
                {TECHNICAL_SHEETS.map((sheet) => {
                  const active = selectedSheet === sheet.id;
                  return (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => setSelectedSheet(sheet.id)}
                      className={`w-full text-left px-3 py-2.5 rounded border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#202630] border-[#F07827] text-[#F2F4F7]'
                          : 'bg-[#111318] border-white/8 text-[#9AA4B2] hover:text-[#F2F4F7]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{sheet.title}</span>
                        <span className="font-mono-tech text-[10px] text-[#1686C9]">
                          {sheet.sheetNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9AA4B2] mt-0.5 line-clamp-1">
                        {sheet.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg space-y-2 text-xs">
                <div className="font-semibold text-[#F2F4F7] inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1686C9]" />
                  Live 3D Sync
                </div>
                <p className="text-[#9AA4B2] leading-relaxed">
                  All vector geometry, safety clearances, and coordinates reflect the active 3D
                  model ({formatLength(totalL, project.unit)} × {formatLength(totalW, project.unit)}{' '}
                  gross slab, {equipmentList.length} placed assemblies).
                </p>
              </div>
            </aside>

            {/* Main CAD Canvas + Coordinate Schedule */}
            <div className="lg:col-span-9 space-y-5">
              <div className="bg-[#1A2029] border border-white/10 rounded-lg overflow-hidden">
                <TechnicalPlanSvg
                  project={project}
                  sheet={selectedSheet}
                  visualStyle={planStyle}
                />
              </div>

              {/* Dynamic Equipment Coordinate Schedule */}
              <div className="bg-[#1A2029] border border-white/10 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#202630] border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F2F4F7]">
                    Equipment Placement Coordinate Schedule
                  </span>
                  <span className="font-mono-tech text-xs text-[#9AA4B2]">
                    Origin (0, 0) = Court Centre · Units: {project.unit}
                  </span>
                </div>
                {equipmentList.length === 0 ? (
                  <div className="p-5 text-xs text-[#9AA4B2]">
                    No equipment assemblies currently placed in the 3D scene. Add hoops, benches,
                    fences, or lighting poles in the 3D Studio to populate this schedule.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[#9AA4B2]">
                          <th className="py-2.5 px-4">Tag</th>
                          <th className="py-2.5 px-4">Assembly Name</th>
                          <th className="py-2.5 px-4">Type</th>
                          <th className="py-2.5 px-4 text-right">X Offset</th>
                          <th className="py-2.5 px-4 text-right">Z Offset</th>
                          <th className="py-2.5 px-4 text-right">Yaw</th>
                          <th className="py-2.5 px-4">Specification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {equipmentList.map((obj, idx) => (
                          <tr key={obj.id} className="hover:bg-[#202630]/50">
                            <td className="py-2 px-4 font-mono-tech font-semibold text-[#F07827]">
                              E{idx + 1}
                            </td>
                            <td className="py-2 px-4 text-[#F2F4F7]">{obj.name}</td>
                            <td className="py-2 px-4 font-mono-tech text-[#9AA4B2]">
                              {obj.type}
                            </td>
                            <td className="py-2 px-4 text-right font-mono-tech">
                              {formatLength(obj.position[0], project.unit)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono-tech">
                              {formatLength(obj.position[2], project.unit)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono-tech">
                              {Math.round((obj.rotationY * 180) / Math.PI)}°
                            </td>
                            <td className="py-2 px-4 text-[#9AA4B2]">
                              {obj.type === 'hoop_assembly'
                                ? `${obj.metadata?.backboardType ?? 'tempered_glass'} · ${
                                    obj.metadata?.supportStyle ?? 'hydraulic_boom'
                                  } · Rim ${formatLength(obj.metadata?.rimHeightM ?? 3.05, project.unit)}`
                                : obj.type === 'football_goal' || obj.type === 'handball_goal'
                                ? `Goal ${formatLength(
                                    obj.metadata?.goalWidthM ?? (obj.type === 'handball_goal' ? 3.0 : 7.32),
                                    project.unit
                                  )} × ${formatLength(
                                    obj.metadata?.goalHeightM ?? (obj.type === 'handball_goal' ? 2.0 : 2.44),
                                    project.unit
                                  )}`
                                : obj.type === 'multisport_combo_goal'
                                ? `Combo ${formatLength(obj.metadata?.goalWidthM ?? 3.0, project.unit)} · Rim ${formatLength(
                                    obj.metadata?.rimHeightM ?? 3.05,
                                    project.unit
                                  )}`
                                : obj.type === 'volleyball_net' || obj.type === 'tennis_net'
                                ? `Net ${formatLength(
                                    obj.metadata?.netWidthM ?? (obj.type === 'tennis_net' ? 12.8 : 9.5),
                                    project.unit
                                  )} × ${formatLength(
                                    obj.metadata?.netHeightM ?? (obj.type === 'tennis_net' ? 1.07 : 2.43),
                                    project.unit
                                  )}`
                                : obj.type === 'lighting_mast'
                                ? `Mast H ${formatLength(obj.metadata?.poleHeightM ?? 9.0, project.unit)}`
                                : obj.type === 'perimeter_fence'
                                ? `Span ${formatLength(
                                    obj.metadata?.fenceLengthM ?? totalL * 0.72,
                                    project.unit
                                  )} · H ${formatLength(obj.metadata?.fenceHeightM ?? 3.6, project.unit)}`
                                : obj.type === 'dugout_shelter'
                                ? 'Covered team shelter (4-seat)'
                                : obj.type === 'corner_flag'
                                ? 'Flexible pitch corner marker'
                                : 'Standard site fixture'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BILL OF MATERIALS */}
        {activeTab === 'bom' && (
          <div className="space-y-5">
            {/* Structural Assumptions Configurator */}
            <section className="p-5 bg-[#1A2029] border border-white/10 rounded-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                    Engineering Takeoff Assumptions · {bom.groundSystemLabel}
                  </h2>
                  <p className="text-xs text-[#9AA4B2] mt-0.5">
                    {bom.groundSystem === 'existing_slab'
                      ? 'Renovation on existing slab: earthworks, excavation, sub-base, and new concrete slab are omitted; waste factor applies to surface resurfacing.'
                      : 'Adjust structural section thickness, excavation depth, and waste allowance; quantities and FCFA estimates recalculate immediately.'}
                  </p>
                </div>
                <span className="font-mono-tech text-xs text-[#1686C9]">
                  {bom.items.length} BOM Line Items · {bom.activeSportsSummary}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {bom.groundSystem !== 'existing_slab' && (
                  <>
                    {(bom.groundSystem === 'concrete_slab' || bom.groundSystem === 'sprung_wood') && (
                      <div>
                        <label htmlFor="bom-slab-thickness" className="block text-[11px] text-[#9AA4B2] mb-1">
                          Concrete Slab Thickness (m)
                        </label>
                        <input
                          id="bom-slab-thickness"
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="0.3"
                          value={assumptions.slabThicknessM}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!Number.isNaN(val)) {
                              updateEngineeringAssumptions(project.id, {
                                slabThicknessM: Math.max(0.1, Math.min(0.3, val)),
                              });
                            }
                          }}
                          className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                        />
                      </div>
                    )}
                    <div>
                      <label htmlFor="bom-subbase-thickness" className="block text-[11px] text-[#9AA4B2] mb-1">
                        Aggregate Sub-Base (m)
                      </label>
                      <input
                        id="bom-subbase-thickness"
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="0.45"
                        value={assumptions.subBaseThicknessM}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateEngineeringAssumptions(project.id, {
                              subBaseThicknessM: Math.max(0.1, Math.min(0.45, val)),
                            });
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                    <div>
                      <label htmlFor="bom-excavation-depth" className="block text-[11px] text-[#9AA4B2] mb-1">
                        Excavation Depth (m)
                      </label>
                      <input
                        id="bom-excavation-depth"
                        type="number"
                        step="0.05"
                        min="0.15"
                        max="0.7"
                        value={assumptions.excavationDepthM}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            updateEngineeringAssumptions(project.id, {
                              excavationDepthM: Math.max(0.15, Math.min(0.7, val)),
                            });
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="bom-waste-factor" className="block text-[11px] text-[#9AA4B2] mb-1">
                    Material Waste Factor (%)
                  </label>
                  <input
                    id="bom-waste-factor"
                    type="number"
                    step="1"
                    min="0"
                    max="20"
                    value={assumptions.wasteFactorPct}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        updateEngineeringAssumptions(project.id, {
                          wasteFactorPct: Math.max(0, Math.min(20, val)),
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                  />
                </div>
              </div>
            </section>

            {/* BOM Table */}
            <div className="bg-[#1A2029] border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#202630] border-b border-white/10 text-[#9AA4B2]">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Material &amp; Specification</th>
                      <th className="py-3 px-4">Calculation Basis</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {bom.items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#202630]/50">
                        <td className="py-3 px-4 font-medium text-[#F07827] whitespace-nowrap">
                          {item.categoryLabel}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#F2F4F7]">{item.name}</div>
                          <div className="text-[11px] text-[#9AA4B2] mt-0.5">
                            {item.specification}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[11px] text-[#9AA4B2]">
                          {item.basis}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tech font-semibold text-[#F2F4F7] whitespace-nowrap">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[#9AA4B2] whitespace-nowrap">
                          {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Professional Validation Disclaimer */}
            <div className="p-4 bg-[#1A2029] border border-[#1686C9]/40 rounded-lg flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-[#1686C9] shrink-0 mt-0.5" />
              <div className="text-[#9AA4B2] leading-relaxed">
                <span className="font-semibold text-[#F2F4F7]">Engineering Validation Required: </span>
                {ENGINEERING_VALIDATION_NOTICE}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FCFA COST ESTIMATE */}
        {activeTab === 'cost' && (
          <div className="space-y-5">
            {/* Explicit Benin Indicative Price Warning */}
            <div className="p-4 bg-[#201A15] border border-[#F07827]/60 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F07827] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-[#F2F4F7]">
                  Indicative Baseline Rates (FCFA) — Supplier Confirmation Required
                </div>
                <p className="text-[#D4DCE6] leading-relaxed">{BENIN_PRICE_DISCLAIMER}</p>
              </div>
            </div>

            {/* Cost Summary Cards & Contingency Control */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {costSections.map((sec) => (
                <div key={sec.id} className="p-3.5 bg-[#1A2029] border border-white/10 rounded-lg">
                  <div className="text-[11px] text-[#9AA4B2] truncate">{sec.label}</div>
                  <div className="font-mono-tech text-sm font-semibold text-[#F2F4F7] mt-1">
                    {formatFcfa(sec.subtotal)}
                  </div>
                </div>
              ))}
              <div className="p-3.5 bg-[#202630] border border-[#F07827]/60 rounded-lg">
                <div className="text-[11px] text-[#F07827]">Total (incl. {cost.contingencyPct}%)</div>
                <div className="font-mono-tech text-sm font-bold text-[#F2F4F7] mt-1">
                  {formatFcfa(cost.grandTotalFcfa)}
                </div>
                <div className="font-mono-tech text-[10px] text-[#9AA4B2] mt-0.5">
                  {formatFcfa(cost.costPerSqmFcfa)} / m²
                </div>
              </div>
            </div>

            {/* Contingency & Reset Controls */}
            <div className="p-4 bg-[#1A2029] border border-white/10 rounded-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="contingency-pct" className="text-xs text-[#9AA4B2]">
                    Contingency Allowance (%)
                  </label>
                  <input
                    id="contingency-pct"
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={cost.contingencyPct}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        updateCostConfig(project.id, {
                          contingencyPct: Math.max(0, Math.min(30, val)),
                        });
                      }
                    }}
                    className="w-20 px-2.5 py-1.5 bg-[#111318] border border-white/15 rounded font-mono-tech text-xs text-[#F2F4F7]"
                  />
                </div>
                <div className="text-xs font-mono-tech text-[#9AA4B2]">
                  Contingency Amount:{' '}
                  <span className="text-[#F2F4F7]">{formatFcfa(cost.contingencyAmountFcfa)}</span>
                </div>
              </div>

              {hasPriceOverrides && (
                <button
                  type="button"
                  onClick={handleResetUnitPrices}
                  className="px-3 py-1.5 bg-[#202630] hover:bg-white/10 border border-white/10 rounded text-xs text-[#F2F4F7] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#F07827]" />
                  Reset Indicative Rates
                </button>
              )}
            </div>

            {/* Editable Cost Breakdown Tables by Section */}
            <div className="space-y-4">
              {costSections.map((sec) => {
                const secItems = cost.items.filter((i) => i.section === sec.id);
                return (
                  <div
                    key={sec.id}
                    className="bg-[#1A2029] border border-white/10 rounded-lg overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-[#202630] border-b border-white/10 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#F2F4F7]">{sec.label}</span>
                      <span className="font-mono-tech text-xs font-semibold text-[#1686C9]">
                        Subtotal: {formatFcfa(sec.subtotal)}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-[#9AA4B2]">
                            <th className="py-2.5 px-4">Item Description</th>
                            <th className="py-2.5 px-4 text-right">Qty</th>
                            <th className="py-2.5 px-4">Unit</th>
                            <th className="py-2.5 px-4 text-right">Unit Price (FCFA)</th>
                            <th className="py-2.5 px-4 text-right">Line Total (FCFA)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/8">
                          {secItems.map((item) => (
                            <tr key={item.id} className="hover:bg-[#202630]/40">
                              <td className="py-2.5 px-4">
                                <div className="text-[#F2F4F7] font-medium">{item.name}</div>
                                <div className="text-[11px] text-[#9AA4B2]">
                                  {item.specification}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono-tech whitespace-nowrap">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-4 font-mono-tech text-[#9AA4B2] whitespace-nowrap">
                                {item.unit}
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  aria-label={`Unit price in FCFA for ${item.name}`}
                                  value={item.unitPriceFcfa}
                                  onChange={(e) => handlePriceOverride(item.id, e.target.value)}
                                  className={`w-32 px-2 py-1 text-right bg-[#111318] border rounded font-mono-tech text-xs text-[#F2F4F7] focus:outline-none focus:border-[#F07827] ${
                                    item.isOverridden ? 'border-[#F07827]' : 'border-white/15'
                                  }`}
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono-tech font-semibold text-[#F2F4F7] whitespace-nowrap">
                                {formatFcfa(item.totalFcfa)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CONSTRUCTION WORKFLOW */}
        {activeTab === 'schedule' && (
          <div className="space-y-5">
            {/* Visual 10-Stage Timeline Gantt */}
            <section className="p-5 bg-[#1A2029] border border-white/10 rounded-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                    10-Stage Construction Execution Schedule
                  </h2>
                  <p className="text-xs text-[#9AA4B2] mt-0.5">
                    Durations scale dynamically from slab area, surfacing system, and placed equipment.
                  </p>
                </div>
                <span className="font-mono-tech text-xs font-semibold text-[#F07827]">
                  Total Critical Path: {schedule.totalDurationDays} Working Days
                </span>
              </div>

              <div className="space-y-2 pt-2">
                {schedule.stages.map((stage) => {
                  const leftPct = ((stage.startDay - 1) / schedule.totalDurationDays) * 100;
                  const widthPct = Math.max(
                    3,
                    (stage.durationDays / schedule.totalDurationDays) * 100
                  );
                  return (
                    <div
                      key={stage.id}
                      className="grid grid-cols-1 md:grid-cols-12 items-center gap-2 text-xs"
                    >
                      <div className="md:col-span-4 truncate text-[#F2F4F7]">
                        <span className="font-mono-tech text-[#F07827] mr-2">
                          {String(stage.order).padStart(2, '0')}.
                        </span>
                        {stage.title}
                      </div>
                      <div className="md:col-span-6 h-5 bg-[#111318] border border-white/10 rounded relative overflow-hidden">
                        <div
                          className="h-full bg-[#1686C9] rounded-sm"
                          style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                      </div>
                      <div className="md:col-span-2 text-right font-mono-tech text-[#9AA4B2]">
                        D{stage.startDay}–D{stage.endDay} ({stage.durationDays}d)
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Detailed Stage Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedule.stages.map((stage) => (
                <article
                  key={stage.id}
                  className="p-5 bg-[#1A2029] border border-white/10 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-mono-tech text-[#F07827]">
                        Stage {stage.order} · Days {stage.startDay}–{stage.endDay}
                      </div>
                      <h3 className="font-display text-base font-semibold text-[#F2F4F7] mt-0.5">
                        {stage.title}
                      </h3>
                    </div>
                    <span className="font-mono-tech text-xs text-[#1686C9] shrink-0">
                      {stage.durationDays} day{stage.durationDays > 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="text-xs text-[#9AA4B2] leading-relaxed">{stage.description}</p>

                  <div className="pt-2 border-t border-white/8 space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-[#F2F4F7]">Dependencies: </span>
                      <span className="text-[#9AA4B2]">{stage.dependencies.join(', ')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#F2F4F7]">Required Materials: </span>
                      <span className="text-[#9AA4B2]">{stage.requiredMaterials.join('; ')}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-[#F2F4F7] mb-1">Quality Control Points:</div>
                      <ul className="space-y-1 text-[#9AA4B2]">
                        {stage.qualityControlPoints.map((qc, qIdx) => (
                          <li key={qIdx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4CC38A] shrink-0 mt-0.5" />
                            <span>{qc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="p-4 bg-[#1A2029] border border-[#1686C9]/40 rounded-lg flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-[#1686C9] shrink-0 mt-0.5" />
              <div className="text-[#9AA4B2] leading-relaxed">{schedule.validationNotice}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
