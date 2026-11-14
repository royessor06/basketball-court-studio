import React, { useMemo, useState } from 'react';
import { ArrowRight, Box, Compass, Layers, Ruler } from 'lucide-react';
import {
  buildDefaultObjects,
  COURT_STANDARDS,
  defaultCameraSettings,
  defaultEnvironmentSettings,
  SURFACE_PRESETS,
} from '../constants/courtStandards';
import { useProjectStore } from '../store/useProjectStore';
import { CourtViewport } from '../three/CourtScene';
import { CourtEnvironment, CourtProject, CourtStandard } from '../types/court';
import { TopNav } from '../components/layout/TopNav';

export const LandingPage: React.FC = () => {
  const { setCurrentView, openProjectInWorkspace, activeProject } = useProjectStore();
  const [previewStandard, setPreviewStandard] = useState<CourtStandard>('FIBA');
  const [previewEnv, setPreviewEnv] = useState<CourtEnvironment>('indoor');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const previewProject: CourtProject = useMemo(() => {
    const spec = COURT_STANDARDS[previewStandard];
    const preset = previewEnv === 'indoor' ? SURFACE_PRESETS[0] : SURFACE_PRESETS[2];
    const dimensions = {
      lengthM: spec.lengthM,
      widthM: spec.widthM,
      apronM: spec.defaultApronM,
      isHalfCourt: spec.isHalfCourt,
      orientationDeg: 0,
      showSafetyZone: true,
    };
    const materials = {
      surfaceType: preset.id,
      surfaceColor: preset.defaultSurfaceColor,
      apronColor: preset.defaultApronColor,
      paintColor: preset.defaultPaintColor,
      lineColor: '#F2F4F7',
    };
    return {
      id: 'landing-preview',
      name: `${spec.label} Interactive Preview`,
      client: 'Reference Geometry',
      location: '3D Sandbox',
      notes: '',
      standard: previewStandard,
      environment: previewEnv,
      template: 'standard',
      status: 'Specification Ready',
      unit: 'm',
      dimensions,
      materials,
      environmentSettings: defaultEnvironmentSettings(previewEnv),
      cameraSettings: defaultCameraSettings(dimensions.lengthM, dimensions.widthM),
      objects: buildDefaultObjects(dimensions, previewEnv, 'standard', materials),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    };
  }, [previewStandard, previewEnv]);

  const capabilities = [
    {
      num: '01',
      title: 'Regulation-Accurate Court Geometry',
      body: 'Generate FIBA, NBA, NCAA, 3x3, or custom court envelopes with calibrated three-point arcs, key dimensions, and safety apron clearances.',
      icon: Ruler,
    },
    {
      num: '02',
      title: 'Interactive 3D Architectural Viewport',
      body: 'Inspect hoop stanchion overhangs, tempered glass backboards, lighting masts, and surface reflections from orbit, plan, baseline, or sideline views.',
      icon: Box,
    },
    {
      num: '03',
      title: 'Indoor & Outdoor Construction Systems',
      body: 'Switch seamlessly between sprung maple arena floors and post-tensioned outdoor acrylic or modular polymer tile installations.',
      icon: Layers,
    },
    {
      num: '04',
      title: 'Parametric Component & Spec Inspector',
      body: 'Select any structural assembly in the 3D scene or outliner to adjust coordinates, orientation, finishes, and export engineering specifications.',
      icon: Compass,
    },
  ];

  const standardRows = [
    COURT_STANDARDS.FIBA,
    COURT_STANDARDS.NBA,
    COURT_STANDARDS.NCAA,
    COURT_STANDARDS.FIBA_3X3,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
      <TopNav />

      <main className="flex-1">
        {/* Hero Split */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-10 pb-14 lg:pt-14 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#F07827] mb-4">
                  Architectural 3D Court CAD
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-[#F2F4F7] leading-[1.08] mb-5"
                  style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
                >
                  Design and engineer basketball courts in precision 3D.
                </h1>
                <p className="text-base text-[#9AA4B2] leading-relaxed max-w-xl mb-8">
                  Basketball Court Studio gives architects, municipal planners, and facility builders
                  an interactive 3D CAD workspace to configure regulation court geometry, surfacing
                  systems, hoop stanchions, and site clearances before construction begins.
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-10">
                  <button
                    type="button"
                    onClick={() => setCurrentView('create')}
                    className="px-6 py-3 bg-[#F07827] text-[#111318] text-sm font-semibold rounded-md hover:bg-[#ff8a3d] transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    Create New Court
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      activeProject
                        ? openProjectInWorkspace(activeProject.id)
                        : setCurrentView('dashboard')
                    }
                    className="px-5 py-3 bg-[#1A2029] text-[#F2F4F7] border border-white/15 text-sm font-medium rounded-md hover:bg-[#202630] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Open Project Dashboard
                  </button>
                </div>
              </div>

              {/* Grounded dimensional summary */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                <div>
                  <div className="font-mono-tech text-lg font-semibold text-[#F2F4F7]">4 Standards</div>
                  <div className="text-xs text-[#9AA4B2] mt-0.5">FIBA · NBA · NCAA · 3x3</div>
                </div>
                <div>
                  <div className="font-mono-tech text-lg font-semibold text-[#F2F4F7]">m / ft</div>
                  <div className="text-xs text-[#9AA4B2] mt-0.5">Dual-unit CAD precision</div>
                </div>
                <div>
                  <div className="font-mono-tech text-lg font-semibold text-[#F2F4F7]">Real-Time 3D</div>
                  <div className="text-xs text-[#9AA4B2] mt-0.5">Orbit, inspect &amp; place</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Live 3D Viewport */}
            <div className="lg:col-span-7 flex flex-col bg-[#1A2029] border border-white/10 rounded-lg overflow-hidden min-h-[380px] lg:min-h-[500px]">
              <div className="px-4 py-3 bg-[#202630] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {(['FIBA', 'NBA', 'FIBA_3X3'] as CourtStandard[]).map((std) => (
                    <button
                      key={std}
                      type="button"
                      onClick={() => setPreviewStandard(std)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        previewStandard === std
                          ? 'bg-[#F07827] text-[#111318] font-semibold'
                          : 'text-[#9AA4B2] hover:text-[#F2F4F7] hover:bg-white/5'
                      }`}
                    >
                      {COURT_STANDARDS[std].shortLabel}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#111318] p-0.5 rounded border border-white/10">
                    {(['indoor', 'outdoor'] as CourtEnvironment[]).map((env) => (
                      <button
                        key={env}
                        type="button"
                        onClick={() => setPreviewEnv(env)}
                        className={`px-2.5 py-1 text-xs capitalize rounded transition-colors cursor-pointer ${
                          previewEnv === env
                            ? 'bg-[#1686C9] text-white font-medium'
                            : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                        }`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                  <span className="hidden sm:inline font-mono-tech text-xs text-[#9AA4B2]">
                    {COURT_STANDARDS[previewStandard].lengthM.toFixed(2)} ×{' '}
                    {COURT_STANDARDS[previewStandard].widthM.toFixed(2)} m
                  </span>
                </div>
              </div>

              <div className="relative flex-1 min-h-[340px]">
                <CourtViewport
                  project={previewProject}
                  selectedObjectId={selectedId}
                  onSelectObject={setSelectedId}
                  showGrid={true}
                  showDimensions={true}
                  cameraPreset="perspective"
                />
                <div className="pointer-events-none absolute bottom-3 left-3 px-3 py-1.5 bg-[#111318]/90 border border-white/10 rounded text-[11px] text-[#9AA4B2]">
                  Drag to orbit · Scroll to zoom · Click assemblies to inspect
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className="border-t border-white/10 bg-[#151820]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#1686C9] mb-2">
                  Engineering Architecture
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
                  Built for pre-construction clarity
                </h2>
              </div>
              <p className="text-sm text-[#9AA4B2] max-w-md">
                Every dimension, clearance apron, and equipment mount maps directly to real-world
                spatial tolerances.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {capabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.num}
                    className="p-6 bg-[#1A2029] border border-white/10 rounded-lg flex items-start gap-5"
                  >
                    <div className="w-10 h-10 rounded-md bg-[#202630] border border-white/10 flex items-center justify-center shrink-0 text-[#F07827]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono-tech text-[#9AA4B2] mb-1">
                        {cap.num}. Module
                      </div>
                      <h3 className="font-display text-lg font-semibold text-[#F2F4F7] mb-2">
                        {cap.title}
                      </h3>
                      <p className="text-sm text-[#9AA4B2] leading-relaxed">{cap.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Regulation Standards Matrix */}
        <section className="border-t border-white/10">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#F07827] mb-2">
                  Dimension Reference
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
                  Supported Regulation Court Templates
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="text-sm font-medium text-[#1686C9] hover:text-[#3ba3e3] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                Explore Saved Projects
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto bg-[#1A2029] border border-white/10 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#202630] text-xs font-medium text-[#9AA4B2]">
                    <th className="py-3.5 px-5">Court Standard</th>
                    <th className="py-3.5 px-5">Playing Envelope</th>
                    <th className="py-3.5 px-5">3-Point Arc</th>
                    <th className="py-3.5 px-5">Key Width</th>
                    <th className="py-3.5 px-5">Default Apron</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 text-sm">
                  {standardRows.map((std) => (
                    <tr key={std.id} className="hover:bg-[#202630]/60 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-semibold text-[#F2F4F7]">{std.label}</div>
                        <div className="text-xs text-[#9AA4B2] mt-0.5">{std.description}</div>
                      </td>
                      <td className="py-4 px-5 font-mono-tech text-[#F2F4F7] whitespace-nowrap">
                        {std.lengthM.toFixed(2)} × {std.widthM.toFixed(2)} m
                      </td>
                      <td className="py-4 px-5 font-mono-tech text-[#9AA4B2] whitespace-nowrap">
                        {std.threePointRadiusM.toFixed(2)} m
                      </td>
                      <td className="py-4 px-5 font-mono-tech text-[#9AA4B2] whitespace-nowrap">
                        {std.keyWidthM.toFixed(2)} m
                      </td>
                      <td className="py-4 px-5 font-mono-tech text-[#9AA4B2] whitespace-nowrap">
                        +{std.defaultApronM.toFixed(2)} m perimeter
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-white/10 bg-[#111318]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#9AA4B2]">
          <div className="font-display font-semibold text-[#F2F4F7]">Basketball Court Studio</div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="hover:text-[#F2F4F7] transition-colors cursor-pointer"
            >
              Projects Dashboard
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('create')}
              className="hover:text-[#F2F4F7] transition-colors cursor-pointer"
            >
              Project Configurator
            </button>
            <button
              type="button"
              onClick={() =>
                activeProject
                  ? openProjectInWorkspace(activeProject.id)
                  : setCurrentView('create')
              }
              className="hover:text-[#F2F4F7] transition-colors cursor-pointer"
            >
              3D Design Workspace
            </button>
          </div>
          <div>Architectural Court Planning Platform</div>
        </div>
      </footer>
    </div>
  );
};
