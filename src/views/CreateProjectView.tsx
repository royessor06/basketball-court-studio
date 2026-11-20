import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Layers, Sun } from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import {
  buildSportLayersForFacility,
  COURT_STANDARDS,
  formatLength,
  GROUND_SYSTEM_PRESETS,
  metersToUnitValue,
  SPORT_DISCIPLINES,
  SURFACE_PRESETS,
  unitValueToMeters,
} from '../constants/courtStandards';
import {
  buildPrimitivesForLayer,
  sampleArcPoints2D,
  transformPoint2D,
} from '../sports/markingPrimitives';
import { useProjectStore } from '../store/useProjectStore';
import {
  CourtEnvironment,
  CourtStandard,
  GroundSystemType,
  LayerSportType,
  MeasurementUnit,
  ProjectTemplate,
  SportDiscipline,
  SurfaceMaterialType,
} from '../types/court';

const LAYER_SPORT_LABELS: Array<{ id: LayerSportType; label: string }> = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'football', label: 'Football / 5-a-side' },
  { id: 'handball', label: 'Handball (IHF)' },
  { id: 'volleyball', label: 'Volleyball' },
  { id: 'tennis', label: 'Tennis (ITF)' },
];

export const CreateProjectView: React.FC = () => {
  const { createProject, setCurrentView } = useProjectStore();

  const [name, setName] = useState('New Municipal Sports Complex');
  const [client, setClient] = useState('');
  const [location, setLocation] = useState('');
  const [sport, setSport] = useState<SportDiscipline>('basketball');
  const [standard, setStandard] = useState<CourtStandard>('FIBA');
  const [groundSystem, setGroundSystem] = useState<GroundSystemType>('concrete_slab');
  const [surfaceType, setSurfaceType] = useState<SurfaceMaterialType>('hardwood_maple');
  const [overlaySports, setOverlaySports] = useState<LayerSportType[]>(['basketball']);
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

  const filteredStandards = useMemo(() => {
    const keys = Object.keys(COURT_STANDARDS) as CourtStandard[];
    if (sport === 'custom') return keys;
    return keys.filter((k) => COURT_STANDARDS[k].sport === sport || k === 'CUSTOM');
  }, [sport]);

  const handleSelectSport = (nextSport: SportDiscipline) => {
    setSport(nextSport);
    const disc = SPORT_DISCIPLINES.find((d) => d.id === nextSport) ?? SPORT_DISCIPLINES[0];
    const nextStd = disc.defaultPreset;
    const spec = COURT_STANDARDS[nextStd];
    setStandard(nextStd);
    setApronM(spec.defaultApronM);
    setGroundSystem(spec.defaultGroundSystem);
    setSurfaceType(spec.defaultSurfaceType);

    if (
      nextSport === 'football' ||
      nextSport === 'tennis' ||
      nextSport === 'multisport' ||
      nextStd === 'BEACH_VOLLEY'
    ) {
      setEnvironment('outdoor');
    }

    if (nextStd === 'MULTISPORT_40X20') {
      setOverlaySports(['handball', 'basketball', 'volleyball']);
    } else if (nextStd === 'MULTISPORT_30X18') {
      setOverlaySports(['football', 'basketball', 'volleyball']);
    } else {
      setOverlaySports([spec.layerSport]);
    }

    if (nextStd === 'CUSTOM') {
      setDimensionMode('custom');
    } else {
      setDimensionMode('standard');
      setCustomLengthM(spec.lengthM);
      setCustomWidthM(spec.widthM);
    }
  };

  const handleSelectStandard = (nextStd: CourtStandard) => {
    setStandard(nextStd);
    const spec = COURT_STANDARDS[nextStd];
    setApronM(spec.defaultApronM);
    setGroundSystem(spec.defaultGroundSystem);
    setSurfaceType(spec.defaultSurfaceType);

    if (nextStd === 'MULTISPORT_40X20') {
      setOverlaySports(['handball', 'basketball', 'volleyball']);
    } else if (nextStd === 'MULTISPORT_30X18') {
      setOverlaySports(['football', 'basketball', 'volleyball']);
    } else if (nextStd !== 'CUSTOM') {
      setOverlaySports([spec.layerSport]);
    }

    if (nextStd === 'CUSTOM') {
      setDimensionMode('custom');
    } else {
      setDimensionMode('standard');
      setCustomLengthM(spec.lengthM);
      setCustomWidthM(spec.widthM);
    }
  };

  const handleSelectGroundSystem = (gs: GroundSystemType) => {
    setGroundSystem(gs);
    const preset = GROUND_SYSTEM_PRESETS.find((g) => g.id === gs);
    if (preset && preset.recommendedSurfaces.length > 0 && !preset.recommendedSurfaces.includes(surfaceType)) {
      setSurfaceType(preset.recommendedSurfaces[0]);
    }
  };

  const toggleOverlaySport = (sp: LayerSportType) => {
    setOverlaySports((prev) => {
      if (prev.includes(sp)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== sp);
      }
      return [...prev, sp];
    });
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
      sport,
      standard: dimensionMode === 'custom' ? 'CUSTOM' : standard,
      groundSystem,
      surfaceType,
      overlaySports:
        sport === 'multisport' || sport === 'custom' ? overlaySports : [activeSpec.layerSport],
      environment,
      template,
      unit,
      customLengthM: dimensionMode === 'custom' ? customLengthM : undefined,
      customWidthM: dimensionMode === 'custom' ? customWidthM : undefined,
      apronM,
    });
  };

  const areaSqM = useMemo(() => totalLengthM * totalWidthM, [totalLengthM, totalWidthM]);

  const previewSurfacePreset =
    SURFACE_PRESETS.find((s) => s.id === surfaceType) ?? SURFACE_PRESETS[0];

  const previewLayers = useMemo(() => {
    if (template === 'blank') return [];
    const mats = {
      surfaceType,
      surfaceColor: previewSurfacePreset.defaultSurfaceColor,
      apronColor: previewSurfacePreset.defaultApronColor,
      paintColor: previewSurfacePreset.defaultPaintColor,
      lineColor: '#F2F4F7',
    };
    return buildSportLayersForFacility(
      dimensionMode === 'custom' ? 'CUSTOM' : standard,
      effectiveLengthM,
      effectiveWidthM,
      mats,
      sport === 'multisport' || sport === 'custom' ? overlaySports : [activeSpec.layerSport]
    );
  }, [
    template,
    surfaceType,
    previewSurfacePreset,
    dimensionMode,
    standard,
    effectiveLengthM,
    effectiveWidthM,
    sport,
    overlaySports,
    activeSpec.layerSport,
  ]);

  // Map live SVG blueprint preview coordinates into 360 x 240 viewport
  const svgMapping = useMemo(() => {
    const padL = totalLengthM + Math.max(2, totalLengthM * 0.08);
    const padW = totalWidthM + Math.max(2, totalWidthM * 0.14);
    const sc = Math.min(316 / padL, 178 / padW);
    const cx = 180;
    const cy = 108;
    return {
      sc,
      toX: (mx: number) => cx + mx * sc,
      toZ: (mz: number) => cy + mz * sc,
    };
  }, [totalLengthM, totalWidthM]);

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
            Facility Initialization
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F4F7]">
            Configure New Sports Ground Project
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
                  placeholder="e.g., Westside Sports Pavilion Complex"
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
                    placeholder="City, Country or Parcel"
                    className="w-full px-3.5 py-2.5 bg-[#111318] border border-white/15 rounded-md text-sm text-[#F2F4F7] placeholder-[#9AA4B2]/60 focus:outline-none focus:border-[#1686C9]"
                  />
                </div>
              </div>
            </section>

            {/* 2. Sport Discipline & Presets */}
            <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                  02. Sport Discipline &amp; Regulation Standard
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPORT_DISCIPLINES.map((disc) => {
                  const active = sport === disc.id;
                  return (
                    <button
                      key={disc.id}
                      type="button"
                      onClick={() => handleSelectSport(disc.id)}
                      className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#202630] border-[#F07827] text-[#F2F4F7]'
                          : 'bg-[#111318] border-white/10 text-[#9AA4B2] hover:border-white/25 hover:text-[#F2F4F7]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{disc.shortLabel}</div>
                      <div className="text-[11px] opacity-75 mt-0.5 line-clamp-2">{disc.summary}</div>
                    </button>
                  );
                })}
              </div>

              {/* Standards filtered by discipline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {filteredStandards.map((stdKey) => {
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
                          ? 'bg-[#202630] border-[#1686C9]'
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

              {/* Multi-sport overlay layer checkboxes */}
              {(sport === 'multisport' || sport === 'custom') && (
                <div className="p-4 bg-[#111318] border border-white/10 rounded-md space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F4F7]">
                    <Layers className="w-3.5 h-3.5 text-[#F07827]" />
                    Stacked Marking Layers (Multi-Sport Overlay)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LAYER_SPORT_LABELS.map((item) => {
                      const checked = overlaySports.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'bg-[#202630] border-[#1686C9] text-[#F2F4F7]'
                              : 'bg-[#1A2029] border-white/10 text-[#9AA4B2]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOverlaySport(item.id)}
                            className="accent-[#F07827]"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    <label htmlFor="create-length" className="block text-xs text-[#9AA4B2] mb-1">
                      Playing Length ({unit})
                    </label>
                    <input
                      id="create-length"
                      type="number"
                      step="0.5"
                      disabled={dimensionMode === 'standard'}
                      value={metersToUnitValue(effectiveLengthM, unit)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setCustomLengthM(
                            Math.max(8, Math.min(135, unitValueToMeters(val, unit)))
                          );
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-sm text-[#F2F4F7] disabled:opacity-55 focus:outline-none focus:border-[#F07827]"
                    />
                  </div>
                  <div>
                    <label htmlFor="create-width" className="block text-xs text-[#9AA4B2] mb-1">
                      Playing Width ({unit})
                    </label>
                    <input
                      id="create-width"
                      type="number"
                      step="0.5"
                      disabled={dimensionMode === 'standard'}
                      value={metersToUnitValue(effectiveWidthM, unit)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setCustomWidthM(
                            Math.max(6, Math.min(95, unitValueToMeters(val, unit)))
                          );
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-sm text-[#F2F4F7] disabled:opacity-55 focus:outline-none focus:border-[#F07827]"
                    />
                  </div>
                  <div>
                    <label htmlFor="create-apron" className="block text-xs text-[#9AA4B2] mb-1">
                      Safety Run-Off ({unit})
                    </label>
                    <input
                      id="create-apron"
                      type="number"
                      step="0.2"
                      value={metersToUnitValue(apronM, unit)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          setApronM(Math.max(0.5, Math.min(12, unitValueToMeters(val, unit))));
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#111318] border border-white/15 rounded font-mono-tech text-sm text-[#F2F4F7] focus:outline-none focus:border-[#F07827]"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Ground Construction System, Environment & Surface */}
            <section className="p-6 bg-[#1A2029] border border-white/10 rounded-lg space-y-5">
              <h2 className="font-display text-base font-semibold text-[#F2F4F7]">
                03. Ground System, Environment &amp; Template
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-ground-system" className="block text-xs text-[#9AA4B2] mb-1.5">
                    Ground Construction Build-Up
                  </label>
                  <select
                    id="create-ground-system"
                    value={groundSystem}
                    onChange={(e) => handleSelectGroundSystem(e.target.value as GroundSystemType)}
                    className="w-full px-3 py-2.5 bg-[#111318] border border-white/15 rounded-md text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
                  >
                    {GROUND_SYSTEM_PRESETS.map((gs) => (
                      <option key={gs.id} value={gs.id}>
                        {gs.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="create-surface-type" className="block text-xs text-[#9AA4B2] mb-1.5">
                    Playing Surface Finish
                  </label>
                  <select
                    id="create-surface-type"
                    value={surfaceType}
                    onChange={(e) => setSurfaceType(e.target.value as SurfaceMaterialType)}
                    className="w-full px-3 py-2.5 bg-[#111318] border border-white/15 rounded-md text-xs text-[#F2F4F7] focus:outline-none focus:border-[#1686C9]"
                  >
                    {SURFACE_PRESETS.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-[#9AA4B2] mb-2">Site Environment</div>
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
                      Indoor Arena / Sports Hall
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Enclosed hall lighting, seating benches, and indoor wall scoreboard.
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
                      Outdoor Pitch / Park Plaza
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Perimeter French drainage, floodlight masts, and ball-stop fencing.
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-[#9AA4B2] mb-2">Starting Assemblies</div>
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
                      Regulation Equipped Facility
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Pre-populated with sport markings, goals/hoops/nets, and site fixtures.
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
                      Blank Site Envelope
                    </div>
                    <div className="text-xs text-[#9AA4B2]">
                      Clean base deck ready for custom equipment placement and layer configuration.
                    </div>
                  </button>
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

            <div className="aspect-[4/3] w-full bg-[#111318] border border-white/10 rounded-md p-3 flex items-center justify-center">
              <svg viewBox="0 0 360 240" className="w-full h-full">
                <defs>
                  <pattern id="bpGridCreate" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="0.75"
                    />
                  </pattern>
                </defs>
                <rect width="360" height="240" fill="url(#bpGridCreate)" />

                {/* Slab / run-off apron */}
                <rect
                  x={svgMapping.toX(-totalLengthM / 2)}
                  y={svgMapping.toZ(-totalWidthM / 2)}
                  width={totalLengthM * svgMapping.sc}
                  height={totalWidthM * svgMapping.sc}
                  fill={previewSurfacePreset.defaultApronColor}
                  stroke="#9AA4B2"
                  strokeOpacity="0.45"
                  strokeWidth="1"
                />

                {/* Playing surface */}
                <rect
                  x={svgMapping.toX(-effectiveLengthM / 2)}
                  y={svgMapping.toZ(-effectiveWidthM / 2)}
                  width={effectiveLengthM * svgMapping.sc}
                  height={effectiveWidthM * svgMapping.sc}
                  fill={previewSurfacePreset.defaultSurfaceColor}
                  fillOpacity="0.75"
                  stroke="#F2F4F7"
                  strokeWidth="1.2"
                />

                {/* Live primitive markings across active layers */}
                {previewLayers.map((layer) => {
                  const prims = buildPrimitivesForLayer(layer);
                  const toP = (lx: number, lz: number): [number, number] => {
                    const [wx, wz] = transformPoint2D(lx, lz, layer);
                    return [svgMapping.toX(wx), svgMapping.toZ(wz)];
                  };
                  return (
                    <g key={layer.id}>
                      {prims
                        .filter((p) => p.role === 'line')
                        .map((p, idx) => {
                          if (p.kind === 'line') {
                            const [x1, y1] = toP(p.x1, p.z1);
                            const [x2, y2] = toP(p.x2, p.z2);
                            return (
                              <line
                                key={`l-${idx}`}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={layer.lineColor}
                                strokeWidth="1.1"
                                strokeDasharray={p.dashed ? '3 2' : undefined}
                              />
                            );
                          }
                          if (p.kind === 'rect') {
                            const pts = [
                              toP(p.x - p.w / 2, p.z - p.h / 2),
                              toP(p.x + p.w / 2, p.z - p.h / 2),
                              toP(p.x + p.w / 2, p.z + p.h / 2),
                              toP(p.x - p.w / 2, p.z + p.h / 2),
                            ];
                            return (
                              <polygon
                                key={`r-${idx}`}
                                points={pts.map((pt) => pt.join(',')).join(' ')}
                                fill="none"
                                stroke={layer.lineColor}
                                strokeWidth="1.1"
                              />
                            );
                          }
                          if (p.kind === 'circle') {
                            const [cx, cz] = toP(p.cx, p.cz);
                            return (
                              <circle
                                key={`c-${idx}`}
                                cx={cx}
                                cy={cz}
                                r={Math.max(1, p.r * svgMapping.sc)}
                                fill={p.filled ? layer.lineColor : 'none'}
                                stroke={layer.lineColor}
                                strokeWidth="1.1"
                              />
                            );
                          }
                          if (p.kind === 'arc') {
                            const pts = sampleArcPoints2D(
                              p.cx,
                              p.cz,
                              p.r,
                              p.startAngle,
                              p.endAngle,
                              24
                            ).map(([ax, az]) => toP(ax, az));
                            const d = pts
                              .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
                              .join(' ');
                            return (
                              <path
                                key={`a-${idx}`}
                                d={d}
                                fill="none"
                                stroke={layer.lineColor}
                                strokeWidth="1.1"
                                strokeDasharray={p.dashed ? '3 2' : undefined}
                              />
                            );
                          }
                          return null;
                        })}
                    </g>
                  );
                })}

                <line x1="24" y1="215" x2="336" y2="215" stroke="#1686C9" strokeWidth="1" />
                <text
                  x="180"
                  y="230"
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
                <span className="text-[#9AA4B2]">Gross Envelope Area</span>
                <span className="font-mono-tech text-[#F2F4F7]">
                  {unit === 'm'
                    ? `${areaSqM.toFixed(1)} m²`
                    : `${(areaSqM * 10.7639).toFixed(0)} sq ft`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA4B2]">Ground Build-Up</span>
                <span className="font-mono-tech text-[#F2F4F7]">
                  {GROUND_SYSTEM_PRESETS.find((g) => g.id === groundSystem)?.shortLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9AA4B2]">Active Marking Layers</span>
                <span className="font-mono-tech text-[#F2F4F7]">
                  {template === 'blank' ? 'Blank Deck' : `${previewLayers.length} layer(s)`}
                </span>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
};
