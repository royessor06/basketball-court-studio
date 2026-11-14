import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Sun } from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import {
  COURT_STANDARDS,
  formatLength,
  metersToUnitValue,
  unitValueToMeters,
} from '../constants/courtStandards';
import { useProjectStore } from '../store/useProjectStore';
import {
  CourtEnvironment,
  CourtStandard,
  MeasurementUnit,
  ProjectTemplate,
} from '../types/court';

export const CreateProjectView: React.FC = () => {
  const { createProject, setCurrentView } = useProjectStore();

  const [name, setName] = useState('New Municipal Court Complex');
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [standard, setStandard] = useState<CourtStandard>('FIBA');
  const [environment, setEnvironment] = useState<CourtEnvironment>('indoor');
  const [template, setTemplate] = useState<ProjectTemplate>('standard');
  const [unit, setUnit] = useState<MeasurementUnit>('m');
  const [dimensionMode, setDimensionMode] = useState<'standard' | 'custom'>('standard');
  const [customLengthM, setCustomLengthM] = useState(28.0);
  const [customWidthM, setCustomWidthM] = useState(15.0);
  const [apronM, setApronM] = useState(2.0);
  const [nameError, setNameError] = useState('');

  const activeSpec = COURT_STANDARDS[standard];
  const effectiveLengthM = dimensionMode === 'custom' ? customLengthM : activeSpec.lengthM;
  const effectiveWidthM = dimensionMode === 'custom' ? customWidthM : activeSpec.widthM;
  const totalLengthM = effectiveLengthM + apronM * 2;
  const totalWidthM = effectiveWidthM + apronM * 2;

  const handleSelectStandard = (nextStd: CourtStandard) => {
    setStandard(nextStd);
    const spec = COURT_STANDARDS[nextStd];
    setApronM(spec.defaultApronM);
    if (nextStd === 'CUSTOM') {
      setDimensionMode('custom');
    } else {
      setDimensionMode('standard');
      setCustomLengthM(spec.lengthM);
      setCustomWidthM(spec.widthM);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Enter a project name before initializing the 3D scene.');
      return;
    }
    setNameError('');
    createProject({
      name: name.trim(),
      client: client.trim() || undefined,
      location: location.trim() || undefined,
      standard: dimensionMode === 'custom' ? 'CUSTOM' : standard,
      environment,
      template,
      unit,
      customLengthM: dimensionMode === 'custom' ? customLengthM : undefined,
      customWidthM: dimensionMode === 'custom' ? customWidthM : undefined,
      apronM,
    });
  };

  const areaSqM = useMemo(() => totalLengthM * totalWidthM, [totalLengthM, totalWidthM]);

  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F2F4F7]">
      <TopNav />

      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#9AA4B2] hover:text-[#F2F4F7] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-8">
          <p className="text-xs font-mono-tech uppercase tracking-[0.14em] text-[#F07827] mb-1.5">
            Project Initialization
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
            Configure New Basketball Court Project
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Configuration Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Identity */}
            <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-4">
              <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                01. Project Identity
              </h2>

              <div>
                <label
                  htmlFor="project-name"
                  className="block text-xs font-medium text-[#9AA4B2] mb-1.5"
                >
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder="e.g., Westside Sports Pavilion Court A"
                  className="w-full px-3.5 py-2.5 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] placeholder-[#9AA4B2]/60 focus:outline-none focus:border-[#F07827]"
                />
                {nameError && <p className="text-xs text-red-400 mt-1.5">{nameError}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="project-client"
                    className="block text-xs font-medium text-[#9AA4B2] mb-1.5"
                  >
                    Client / Organization
                  </label>
                  <input
                    id="project-client"
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3.5 py-2.5 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] placeholder-[#9AA4B2]/60 focus:outline-none focus:border-[#1686C9]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="project-location"
                    className="block text-xs font-medium text-[#9AA4B2] mb-1.5"
                  >
                    Site Location
                  </label>
                  <input
                    id="project-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State or Parcel"
                    className="w-full px-3.5 py-2.5 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] placeholder-[#9AA4B2]/60 focus:outline-none focus:border-[#1686C9]"
                  />
                </div>
              </div>
            </section>

            {/* 2. Environment & Template */}
            <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-5">
              <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                02. Environment &amp; Starting Base
              </h2>

              <div>
                <div className="text-xs font-medium text-[#9AA4B2] mb-2">Court Environment</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEnvironment('indoor')}
                    className={`p-4 rounded-md border text-left transition-colors cursor-pointer ${
                      environment === 'indoor'
                        ? 'bg-[#202630] border-[#F07827]'
                        : 'bg-[#111318] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-[#F2F4F7] mb-1">
                      <Building2 className="w-4 h-4 text-[#F07827]" />
                      Indoor Arena / Gym
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Sprung maple floor finish, team benches, and wall scoreboard.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('outdoor')}
                    className={`p-4 rounded-md border text-left transition-colors cursor-pointer ${
                      environment === 'outdoor'
                        ? 'bg-[#202630] border-[#1686C9]'
                        : 'bg-[#111318] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm text-[#F2F4F7] mb-1">
                      <Sun className="w-4 h-4 text-[#1686C9]" />
                      Outdoor Park / Plaza
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Cushioned acrylic slab, floodlight masts, and ball-stop fencing.
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-[#9AA4B2] mb-2">Starting Template</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplate('standard')}
                    className={`p-4 rounded-md border text-left transition-colors cursor-pointer ${
                      template === 'standard'
                        ? 'bg-[#202630] border-[#F07827]'
                        : 'bg-[#111318] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="font-semibold text-sm text-[#F2F4F7] mb-1">
                      Standard Basketball Court
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Pre-populated with regulation markings, hoop assemblies, and site fixtures.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplate('blank')}
                    className={`p-4 rounded-md border text-left transition-colors cursor-pointer ${
                      template === 'blank'
                        ? 'bg-[#202630] border-[#F07827]'
                        : 'bg-[#111318] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="font-semibold text-sm text-[#F2F4F7] mb-1">
                      Blank Project Slab
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Clean concrete slab and floor deck ready for custom component placement.
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* 3. Court Type & Dimensions */}
            <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                  03. Court Type &amp; Dimensions
                </h2>

                <div className="flex items-center bg-[#111318] border border-white/10 rounded p-0.5">
                  {(['m', 'ft'] as MeasurementUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-3 py-1 text-xs font-mono-tech rounded transition-colors cursor-pointer ${
                        unit === u
                          ? 'bg-[#202630] text-[#F2F4F7] font-semibold'
                          : 'text-[#9AA4B2] hover:text-[#F2F4F7]'
                      }`}
                    >
                      {u === 'm' ? 'Meters (m)' : 'Feet (ft)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(COURT_STANDARDS) as CourtStandard[]).map((stdKey) => {
                  const spec = COURT_STANDARDS[stdKey];
                  const active =
                    (dimensionMode === 'custom' && stdKey === 'CUSTOM') ||
                    (dimensionMode === 'standard' && standard === stdKey);
                  return (
                    <button
                      key={stdKey}
                      type="button"
                      onClick={() => handleSelectStandard(stdKey)}
                      className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#202630] border-[#F07827]'
                          : 'bg-[#111318] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#F2F4F7]">{spec.label}</span>
                        <span className="text-xs font-mono-tech text-[#9AA4B2]">
                          {stdKey === 'CUSTOM'
                            ? 'Variable'
                            : `${metersToUnitValue(spec.lengthM, unit)} × ${metersToUnitValue(
                                spec.widthM,
                                unit
                              )} ${unit}`}
                        </span>
                      </div>
                      <p className="text-xs text-[#9AA4B2] mt-1 line-clamp-1">{spec.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Standard vs Custom Dimension Override */}
              <div className="pt-2 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#9AA4B2]">Dimension Mode</span>
                  <div className="flex items-center bg-[#111318] border border-white/10 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDimensionMode('standard');
                        if (standard === 'CUSTOM') setStandard('FIBA');
                      }}
                      className={`px-3 py-1 text-xs rounded cursor-pointer ${
                        dimensionMode === 'standard'
                          ? 'bg-[#1686C9] text-white font-medium'
                          : 'text-[#9AA4B2]'
                      }`}
                    >
                      Standard Regulation
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionMode('custom')}
                      className={`px-3 py-1 text-xs rounded cursor-pointer ${
                        dimensionMode === 'custom'
                          ? 'bg-[#1686C9] text-white font-medium'
                          : 'text-[#9AA4B2]'
                      }`}
                    >
                      Custom Dimensions
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#9AA4B2] mb-1">
                      Court Length ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={dimensionMode === 'standard'}
                      value={metersToUnitValue(effectiveLengthM, unit)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setCustomLengthM(
                            Math.max(8, Math.min(42, unitValueToMeters(val, unit)))
                          );
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-sm text-[#F2F4F7] disabled:opacity-55 focus:outline-none focus:border-[#F07827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9AA4B2] mb-1">
                      Court Width ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={dimensionMode === 'standard'}
                      value={metersToUnitValue(effectiveWidthM, unit)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setCustomWidthM(
                            Math.max(6, Math.min(25, unitValueToMeters(val, unit)))
                          );
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-sm text-[#F2F4F7] disabled:opacity-55 focus:outline-none focus:border-[#F07827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9AA4B2] mb-1">
                      Safety Apron ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={metersToUnitValue(apronM, unit)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setApronM(Math.max(0.5, Math.min(6, unitValueToMeters(val, unit))));
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-sm text-[#F2F4F7] focus:outline-none focus:border-[#F07827]"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-5 py-2.5 bg-[#1A2029] border border-white/15 text-sm font-medium text-[#F2F4F7] rounded-md hover:bg-[#202630] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#F07827] text-[#111318] text-sm font-semibold rounded-md hover:bg-[#ff8a3d] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                Initialize 3D Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Live Architectural Schematic Summary */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#F2F4F7]">
                Blueprint Envelope Preview
              </h2>
              <span className="font-mono-tech text-xs text-[#1686C9]">
                {dimensionMode === 'custom' ? 'CUSTOM' : activeSpec.shortLabel}
              </span>
            </div>

            {/* Clean Architectural SVG Plan Preview */}
            <div className="aspect-[4/3] w-full bg-[#111318] border border-white/10 rounded-md p-4 flex items-center justify-center">
              <svg viewBox="0 0 360 240" className="w-full h-full">
                {/* Architectural grid */}
                <defs>
                  <pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="0.75"
                    />
                  </pattern>
                </defs>
                <rect width="360" height="240" fill="url(#bpGrid)" />

                {/* Slab apron */}
                <rect
                  x="30"
                  y="35"
                  width="300"
                  height="170"
                  fill={environment === 'indoor' ? '#1E2530' : '#252D38'}
                  stroke="#9AA4B2"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />

                {/* Playing surface */}
                <rect
                  x="55"
                  y="55"
                  width="250"
                  height="130"
                  fill={environment === 'indoor' ? '#8C6740' : '#1E4670'}
                  fillOpacity="0.65"
                  stroke="#F2F4F7"
                  strokeWidth="1.5"
                />

                {template === 'standard' && (
                  <>
                    {/* Left key */}
                    <rect
                      x="55"
                      y="98"
                      width="48"
                      height="44"
                      fill="#F07827"
                      fillOpacity="0.35"
                      stroke="#F2F4F7"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 55 66 L 78 66 A 54 54 0 0 1 78 174 L 55 174"
                      fill="none"
                      stroke="#F2F4F7"
                      strokeWidth="1.2"
                    />

                    {!(dimensionMode === 'standard' && activeSpec.isHalfCourt) && (
                      <>
                        {/* Half court line & center circle */}
                        <line
                          x1="180"
                          y1="55"
                          x2="180"
                          y2="185"
                          stroke="#F2F4F7"
                          strokeWidth="1.2"
                        />
                        <circle
                          cx="180"
                          cy="120"
                          r="18"
                          fill="#1686C9"
                          fillOpacity="0.35"
                          stroke="#F2F4F7"
                          strokeWidth="1.2"
                        />
                        {/* Right key */}
                        <rect
                          x="257"
                          y="98"
                          width="48"
                          height="44"
                          fill="#F07827"
                          fillOpacity="0.35"
                          stroke="#F2F4F7"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M 305 66 L 282 66 A 54 54 0 0 0 282 174 L 305 174"
                          fill="none"
                          stroke="#F2F4F7"
                          strokeWidth="1.2"
                        />
                      </>
                    )}
                  </>
                )}

                {/* Dimension callouts */}
                <line x1="30" y1="220" x2="330" y2="220" stroke="#1686C9" strokeWidth="1" />
                <text
                  x="180"
                  y="233"
                  textAnchor="middle"
                  fill="#F2F4F7"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {`TOTAL FOOTPRINT: ${formatLength(totalLengthM, unit)} × ${formatLength(
                    totalWidthM,
                    unit
                  )}`}
                </text>
              </svg>
            </div>

            <div className="space-y-2.5 text-xs pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <span className="text-[#9AA4B2]">Playing Boundary</span>
                <span className="font-mono-tech text-[#F2F4F7]">
                  {formatLength(effectiveLengthM, unit)} × {formatLength(effectiveWidthM, unit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA4B2]">Safety Run-Off Apron</span>
                <span className="font-mono-tech text-[#F2F4F7]">+{formatLength(apronM, unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA4B2]">Gross Slab Area</span>
                <span className="font-mono-tech text-[#F2F4F7]">
                  {unit === 'm'
                    ? `${areaSqM.toFixed(1)} m²`
                    : `${(areaSqM * 10.7639).toFixed(0)} sq ft`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA4B2]">Initial Assemblies</span>
                <span className="font-mono-tech text-[#F2F4F7]">
                  {template === 'blank' ? 'Slab + Deck Only' : 'Court + Hoops + Fixtures'}
                </span>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
};
