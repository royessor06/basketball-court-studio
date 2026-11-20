import {
  COURT_STANDARDS,
  defaultCostConfig,
  defaultEngineeringAssumptions,
  GROUND_SYSTEM_PRESETS,
  SURFACE_PRESETS,
} from '../constants/courtStandards';
import {
  computePrimitivesPaintStats,
  resolveEffectiveSportLayers,
} from '../sports/markingPrimitives';
import {
  CourtProject,
  EngineeringAssumptions,
  GroundSystemType,
  SceneObject,
} from '../types/court';

export type BomCategoryId =
  | 'earthworks'
  | 'excavation'
  | 'foundation'
  | 'concrete'
  | 'reinforcement'
  | 'surface_finishing'
  | 'paint_markings'
  | 'hoops_backboards'
  | 'lighting'
  | 'fencing'
  | 'drainage';

export type CostSectionId =
  | 'materials'
  | 'labour'
  | 'equipment'
  | 'transport'
  | 'additional';

export interface BomItem {
  id: string;
  categoryId: BomCategoryId;
  categoryLabel: string;
  name: string;
  specification: string;
  quantity: number;
  unit: string;
  basis: string;
  costSection: CostSectionId;
  defaultUnitPriceFcfa: number;
}

export interface BomSummary {
  assumptions: EngineeringAssumptions;
  groundSystem: GroundSystemType;
  groundSystemLabel: string;
  activeSportsSummary: string;
  playingAreaM2: number;
  apronAreaM2: number;
  totalSlabAreaM2: number;
  clearingAreaM2: number;
  slabPerimeterM: number;
  markingLinearM: number;
  paintedZoneAreaM2: number;
  hoopCount: number;
  goalCount: number;
  netCount: number;
  lightingMastCount: number;
  fenceTotalLengthM: number;
  benchCount: number;
  bleacherCount: number;
  scoreboardCount: number;
  items: BomItem[];
  engineeringNotes: string[];
}

export interface CostLineItem {
  id: string;
  section: CostSectionId;
  sectionLabel: string;
  name: string;
  specification: string;
  quantity: number;
  unit: string;
  defaultUnitPriceFcfa: number;
  unitPriceFcfa: number;
  totalFcfa: number;
  isOverridden: boolean;
}

export interface CostEstimateSummary {
  currency: 'FCFA';
  isIndicativeEstimate: true;
  disclaimer: string;
  items: CostLineItem[];
  materialsSubtotalFcfa: number;
  labourSubtotalFcfa: number;
  equipmentSubtotalFcfa: number;
  transportSubtotalFcfa: number;
  additionalSubtotalFcfa: number;
  directWorksSubtotalFcfa: number;
  contingencyPct: number;
  contingencyAmountFcfa: number;
  grandTotalFcfa: number;
  costPerSqmFcfa: number;
}

export interface ConstructionStage {
  order: number;
  id: string;
  title: string;
  description: string;
  requiredMaterials: string[];
  durationDays: number;
  startDay: number;
  endDay: number;
  dependencies: string[];
  qualityControlPoints: string[];
}

export interface ConstructionWorkflowSummary {
  totalDurationDays: number;
  stages: ConstructionStage[];
  validationNotice: string;
}

export const BENIN_PRICE_DISCLAIMER =
  'Indicative baseline estimates only (FCFA / XOF). Default unit rates are illustrative engineering placeholders—never verified current market prices in Benin. Confirm current material, equipment, haulage, and labour quotations with local suppliers and qualified engineers before budgeting or procurement.';

export const ENGINEERING_VALIDATION_NOTICE =
  'All quantities, slab thicknesses, foundation depths, drainage slopes, and schedules are preliminary planning estimates derived from the 3D configuration. Structural reinforcement, concrete mix grade, soil bearing capacity, wind loads on lighting/goal/hoop foundations, and electrical grounding must be validated by a licensed civil/structural engineer prior to construction.';

const STRUCTURAL_FLOOR_TYPES = new Set([
  'court_slab',
  'playing_surface',
  'boundary_lines',
  'centre_markings',
  'free_throw_areas',
  'three_point_lines',
  'court_markings',
]);

export function isSportEquipmentObject(obj: SceneObject): boolean {
  return !STRUCTURAL_FLOOR_TYPES.has(obj.type);
}

export function getActiveSportEquipment(project: CourtProject): SceneObject[] {
  return project.objects.filter((o) => o.visible && isSportEquipmentObject(o));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatFcfa(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

export function computeCourtMarkingStats(project: CourtProject): {
  markingLinearM: number;
  paintedZoneAreaM2: number;
} {
  const effectiveLayers = resolveEffectiveSportLayers(project);
  const stats = computePrimitivesPaintStats(effectiveLayers);
  return {
    markingLinearM: round1(stats.markingLinearM),
    paintedZoneAreaM2: round1(stats.paintedZoneAreaM2),
  };
}

export function computeBom(project: CourtProject): BomSummary {
  const spec = COURT_STANDARDS[project.standard] ?? COURT_STANDARDS.FIBA;
  const groundSystem: GroundSystemType = project.groundSystem ?? spec.defaultGroundSystem;
  const groundPreset =
    GROUND_SYSTEM_PRESETS.find((g) => g.id === groundSystem) ?? GROUND_SYSTEM_PRESETS[0];

  const assumptions =
    project.engineeringAssumptions ?? defaultEngineeringAssumptions(project.environment, groundSystem);
  const { lengthM, widthM, apronM, isHalfCourt } = project.dimensions;
  const totalL = lengthM + apronM * 2;
  const totalW = widthM + apronM * 2;

  const playingAreaM2 = round1(lengthM * widthM);
  const totalSlabAreaM2 = round1(totalL * totalW);
  const apronAreaM2 = round1(Math.max(0, totalSlabAreaM2 - playingAreaM2));
  const workingMargin = 0.6;
  const clearingAreaM2 = round1((totalL + workingMargin * 2) * (totalW + workingMargin * 2));
  const slabPerimeterM = round1(2 * (totalL + totalW));
  const wasteFactor = 1 + assumptions.wasteFactorPct / 100;

  const effectiveLayers = resolveEffectiveSportLayers(project).filter((l) => l.visible);
  const activeSportsSummary =
    effectiveLayers.length > 0
      ? Array.from(new Set(effectiveLayers.map((l) => l.sport.toUpperCase()))).join(' + ')
      : spec.shortLabel;

  const { markingLinearM, paintedZoneAreaM2 } = computeCourtMarkingStats(project);

  const visibleObjs = project.objects.filter((o) => o.visible);
  const hoops = visibleObjs.filter((o) => o.type === 'hoop_assembly');
  const footballGoals = visibleObjs.filter((o) => o.type === 'football_goal');
  const handballGoals = visibleObjs.filter((o) => o.type === 'handball_goal');
  const volleyNets = visibleObjs.filter((o) => o.type === 'volleyball_net');
  const tennisNets = visibleObjs.filter((o) => o.type === 'tennis_net');
  const comboGoals = visibleObjs.filter((o) => o.type === 'multisport_combo_goal');
  const dugouts = visibleObjs.filter((o) => o.type === 'dugout_shelter');
  const cornerFlags = visibleObjs.filter((o) => o.type === 'corner_flag');
  const lightingMasts = visibleObjs.filter((o) => o.type === 'lighting_mast');
  const fences = visibleObjs.filter((o) => o.type === 'perimeter_fence');
  const benches = visibleObjs.filter((o) => o.type === 'player_bench');
  const scorers = visibleObjs.filter((o) => o.type === 'scorer_table');
  const scoreboards = visibleObjs.filter((o) => o.type === 'scoreboard');
  const bleachers = visibleObjs.filter((o) => o.type === 'bleachers');
  const ballRacks = visibleObjs.filter((o) => o.type === 'ball_rack');

  const hoopCount = hoops.length;
  const goalCount = footballGoals.length + handballGoals.length + comboGoals.length;
  const netCount = volleyNets.length + tennisNets.length;
  const lightingMastCount = lightingMasts.length;
  const fenceTotalLengthM = round1(
    fences.reduce((sum, f) => sum + (f.metadata?.fenceLengthM ?? totalL * 0.72), 0)
  );
  const avgFenceHeightM =
    fences.length > 0
      ? fences.reduce((s, f) => s + (f.metadata?.fenceHeightM ?? 3.2), 0) / fences.length
      : 3.2;

  const surfacePreset =
    SURFACE_PRESETS.find((s) => s.id === project.materials.surfaceType) ?? SURFACE_PRESETS[0];

  const isOutdoor = project.environment === 'outdoor';
  const isWood =
    groundSystem === 'sprung_wood' ||
    project.materials.surfaceType === 'hardwood_maple' ||
    project.materials.surfaceType === 'hardwood_dark';
  const isExistingSlab = groundSystem === 'existing_slab';
  const isTurf = groundSystem === 'synthetic_turf';
  const isGrass = groundSystem === 'natural_grass';
  const isClay = groundSystem === 'clay_court';
  const isSand = groundSystem === 'sand_court';
  const isAsphalt = groundSystem === 'asphalt_base';
  const hasConcreteSlab = groundSystem === 'concrete_slab' || groundSystem === 'sprung_wood';

  const items: BomItem[] = [];

  // 1 & 2. Earthworks & Excavation (skipped on existing slab)
  if (isExistingSlab) {
    items.push({
      id: 'ew-prep-grind',
      categoryId: 'earthworks',
      categoryLabel: 'Slab Preparation',
      name: 'Existing slab diamond grinding, pressure wash & scarification',
      specification: 'Remove old coatings & achieve CSP-2/3 bonding profile (no excavation)',
      quantity: totalSlabAreaM2,
      unit: 'm²',
      basis: `${totalL.toFixed(2)} × ${totalW.toFixed(2)} m existing deck`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 1850,
    });
    items.push({
      id: 'fd-epoxy-patch',
      categoryId: 'foundation',
      categoryLabel: 'Slab Repair & Primer',
      name: 'Epoxy joint repair, self-leveling resurfacer & damp primer',
      specification: 'Localized crack chasing + full moisture-barrier epoxy primer',
      quantity: round1(totalSlabAreaM2 * 0.35),
      unit: 'm²',
      basis: 'Estimated 35% patching + full primer allowance',
      costSection: 'materials',
      defaultUnitPriceFcfa: 6800,
    });
  } else {
    const topsoilDepth = isOutdoor ? (isGrass || isTurf ? 0.18 : 0.15) : 0.08;
    const topsoilStrippingM3 = round2(clearingAreaM2 * topsoilDepth);
    items.push({
      id: 'ew-clearing',
      categoryId: 'earthworks',
      categoryLabel: 'Earthworks',
      name: 'Site clearing, grubbing & laser grading',
      specification: 'Gross footprint + 0.60 m perimeter working strip',
      quantity: clearingAreaM2,
      unit: 'm²',
      basis: `(${totalL.toFixed(2)}+1.2) × (${totalW.toFixed(2)}+1.2)`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 650,
    });
    items.push({
      id: 'ew-topsoil',
      categoryId: 'earthworks',
      categoryLabel: 'Earthworks',
      name: 'Topsoil stripping & spoil haulage',
      specification: `${topsoilDepth.toFixed(2)} m organic layer removal & disposal`,
      quantity: topsoilStrippingM3,
      unit: 'm³',
      basis: `${clearingAreaM2} m² × ${topsoilDepth.toFixed(2)} m`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 3200,
    });

    const slabExcavationM3 = round2(totalSlabAreaM2 * assumptions.excavationDepthM);
    const footingExcavationM3 = round2(
      hoopCount * (0.9 * 0.9 * 1.1) +
        goalCount * (0.6 * 0.6 * 0.9) +
        netCount * (0.5 * 0.5 * 0.95) +
        lightingMastCount * (0.85 * 0.85 * 1.3) +
        (fenceTotalLengthM > 0 ? Math.ceil(fenceTotalLengthM / 2.5 + 1) * (0.35 * 0.35 * 0.7) : 0) +
        (isOutdoor ? slabPerimeterM * 0.4 * 0.5 : 0)
    );
    items.push({
      id: 'ex-bulk',
      categoryId: 'excavation',
      categoryLabel: 'Excavation',
      name: 'Subgrade box excavation & proof-rolling',
      specification: `Target cut depth ${assumptions.excavationDepthM.toFixed(2)} m`,
      quantity: slabExcavationM3,
      unit: 'm³',
      basis: `${totalSlabAreaM2} m² × ${assumptions.excavationDepthM.toFixed(2)} m`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 4500,
    });
    if (footingExcavationM3 > 0) {
      items.push({
        id: 'ex-footings',
        categoryId: 'excavation',
        categoryLabel: 'Excavation',
        name: 'Footing sockets & perimeter drainage trench excavation',
        specification: `${hoopCount} hoop, ${goalCount} goal, ${netCount} net, ${lightingMastCount} mast pads`,
        quantity: footingExcavationM3,
        unit: 'm³',
        basis: 'Post sleeves, footing pads & drain trenches',
        costSection: 'materials',
        defaultUnitPriceFcfa: 5800,
      });
    }

    // 3. Foundation Materials (system-specific)
    const geotextileM2 = round1(totalSlabAreaM2 * 1.08);
    items.push({
      id: 'fd-geotextile',
      categoryId: 'foundation',
      categoryLabel: 'Foundation Materials',
      name: hasConcreteSlab
        ? 'Separation geotextile & polyane vapour barrier'
        : 'Permeable non-woven separation geotextile (200 g/m²)',
      specification: 'Anti-contamination membrane (8% roll overlap)',
      quantity: geotextileM2,
      unit: 'm²',
      basis: `${totalSlabAreaM2} m² × 1.08 overlap`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 1450,
    });

    if (isSand) {
      const washedSandM3 = round2(playingAreaM2 * 0.35 * wasteFactor);
      const curbM = round1(2 * (lengthM + widthM));
      items.push({
        id: 'fd-sand-bed',
        categoryId: 'foundation',
        categoryLabel: 'Foundation Materials',
        name: 'Calibrated washed silica beach sand (0/2 mm rounded)',
        specification: '0.35 m deep cushioned sand bed (non-compacting rounded grain)',
        quantity: washedSandM3,
        unit: 'm³',
        basis: `${playingAreaM2} m² × 0.35 m × ${wasteFactor.toFixed(2)}`,
        costSection: 'materials',
        defaultUnitPriceFcfa: 16500,
      });
      items.push({
        id: 'fd-sand-kerbs',
        categoryId: 'foundation',
        categoryLabel: 'Foundation Materials',
        name: 'Padded precast perimeter sand-retaining kerbs',
        specification: 'Safety chamfered edge kerbing enclosing sand basin',
        quantity: curbM,
        unit: 'm',
        basis: 'Playing court perimeter',
        costSection: 'materials',
        defaultUnitPriceFcfa: 14500,
      });
    } else if (isGrass) {
      const rootzoneM3 = round2(totalSlabAreaM2 * 0.15 * wasteFactor);
      const gravelLayerM3 = round2(totalSlabAreaM2 * 0.12 * 1.15);
      items.push({
        id: 'fd-grass-gravel',
        categoryId: 'foundation',
        categoryLabel: 'Foundation Materials',
        name: 'Washed drainage gravel blanket (10/20 mm)',
        specification: '0.12 m sub-rootzone draining carpet',
        quantity: gravelLayerM3,
        unit: 'm³',
        basis: `${totalSlabAreaM2} m² × 0.12 m × 1.15`,
        costSection: 'materials',
        defaultUnitPriceFcfa: 20500,
      });
      items.push({
        id: 'fd-grass-rootzone',
        categoryId: 'foundation',
        categoryLabel: 'Foundation Materials',
        name: 'USGA-grade sand/organic sports rootzone mix',
        specification: '0.15 m laser-graded permeable growing medium',
        quantity: rootzoneM3,
        unit: 'm³',
        basis: `${totalSlabAreaM2} m² × 0.15 m × ${wasteFactor.toFixed(2)}`,
        costSection: 'materials',
        defaultUnitPriceFcfa: 15500,
      });
    } else {
      const subBaseM3 = round2(totalSlabAreaM2 * assumptions.subBaseThicknessM * 1.2);
      items.push({
        id: 'fd-crushed-stone',
        categoryId: 'foundation',
        categoryLabel: 'Foundation Materials',
        name:
          isTurf || isAsphalt || isClay
            ? 'Free-draining crushed granite / porphyry sub-base (0/31.5 & 4/10)'
            : 'Compacted crushed aggregate / laterite sub-base',
        specification: `${assumptions.subBaseThicknessM.toFixed(2)} m compacted layer (incl. 20% compaction)`,
        quantity: subBaseM3,
        unit: 'm³',
        basis: `${totalSlabAreaM2} m² × ${assumptions.subBaseThicknessM.toFixed(2)} m × 1.20`,
        costSection: 'materials',
        defaultUnitPriceFcfa: isTurf || isClay ? 21000 : 18500,
      });

      if (hasConcreteSlab) {
        const sandLevelingM3 = round2(totalSlabAreaM2 * 0.04 * wasteFactor);
        items.push({
          id: 'fd-sand',
          categoryId: 'foundation',
          categoryLabel: 'Foundation Materials',
          name: 'Clean river sand leveling & blinding bed',
          specification: '0.04 m screeded sand cushion',
          quantity: sandLevelingM3,
          unit: 'm³',
          basis: `${totalSlabAreaM2} m² × 0.04 m × ${wasteFactor.toFixed(2)}`,
          costSection: 'materials',
          defaultUnitPriceFcfa: 12000,
        });
      }
    }
  }

  // 4. Structural Concrete / Asphalt Base & Footings
  const footingConcreteM3 = round2(
    (hoopCount * 0.85 +
      goalCount * 0.35 +
      netCount * 0.3 +
      lightingMastCount * 0.75 +
      (fenceTotalLengthM > 0 ? Math.ceil(fenceTotalLengthM / 2.5 + 1) * 0.09 : 0)) *
      wasteFactor
  );

  if (hasConcreteSlab) {
    const blindingConcreteM3 = round2(totalSlabAreaM2 * 0.05 * wasteFactor);
    const structuralSlabM3 = round2(totalSlabAreaM2 * assumptions.slabThicknessM * wasteFactor);
    items.push({
      id: 'cc-blinding',
      categoryId: 'concrete',
      categoryLabel: 'Concrete',
      name: 'Lean blinding concrete (C12/15)',
      specification: '0.05 m levelling screed under structural slab',
      quantity: blindingConcreteM3,
      unit: 'm³',
      basis: `${totalSlabAreaM2} m² × 0.05 m × ${wasteFactor.toFixed(2)}`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 58000,
    });
    items.push({
      id: 'cc-slab',
      categoryId: 'concrete',
      categoryLabel: 'Concrete',
      name: 'Reinforced structural concrete slab (C25/30)',
      specification: `${assumptions.slabThicknessM.toFixed(2)} m slab with power-troweled finish`,
      quantity: structuralSlabM3,
      unit: 'm³',
      basis: `${totalSlabAreaM2} m² × ${assumptions.slabThicknessM.toFixed(2)} m × ${wasteFactor.toFixed(2)}`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 82000,
    });
  } else if (isAsphalt) {
    const asphaltTonnes = round2(totalSlabAreaM2 * 0.08 * 2.35 * wasteFactor); // 8 cm dual coat @ 2.35 t/m3
    items.push({
      id: 'cc-asphalt',
      categoryId: 'concrete',
      categoryLabel: 'Asphalt Wearing Deck',
      name: 'Hot-mix dense sports asphalt binder + wearing course (80 mm)',
      specification: '50 mm BBG binder + 30 mm fine BBSG finish laid by paver',
      quantity: asphaltTonnes,
      unit: 'tonne',
      basis: `${totalSlabAreaM2} m² × 0.08 m × 2.35 t/m³`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 68000,
    });
  }

  if (footingConcreteM3 > 0) {
    items.push({
      id: 'cc-footings',
      categoryId: 'concrete',
      categoryLabel: 'Concrete',
      name: 'Footing & post-socket concrete (C25/30)',
      specification: `${hoopCount} hoop, ${goalCount} goal, ${netCount} net & ${lightingMastCount} mast pads`,
      quantity: footingConcreteM3,
      unit: 'm³',
      basis: 'Discrete pad footing & ground-sleeve volumes',
      costSection: 'materials',
      defaultUnitPriceFcfa: 82000,
    });
  }

  // 5. Reinforcement
  if (hasConcreteSlab) {
    const meshKg = round1(totalSlabAreaM2 * 4.4 * wasteFactor);
    items.push({
      id: 'rf-mesh',
      categoryId: 'reinforcement',
      categoryLabel: 'Reinforcement',
      name: 'Welded steel wire mesh / B500B slab reinforcement',
      specification: '200×200 mm Ø8 grid incl. lap allowance (~4.4 kg/m²)',
      quantity: meshKg,
      unit: 'kg',
      basis: `${totalSlabAreaM2} m² × 4.4 kg/m² × ${wasteFactor.toFixed(2)}`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 780,
    });
  }
  const footingRebarKg = round1((hoopCount * 42 + lightingMastCount * 40 + goalCount * 14) * wasteFactor);
  const anchorSetCount = hoopCount + lightingMastCount + comboGoals.length;
  if (footingRebarKg > 0) {
    items.push({
      id: 'rf-footing-rebar',
      categoryId: 'reinforcement',
      categoryLabel: 'Reinforcement',
      name: 'High-yield deformed rebar cages for footings (HA10/HA12)',
      specification: 'Stanchion, goal socket & lighting mast cages',
      quantity: footingRebarKg,
      unit: 'kg',
      basis: `${hoopCount} hoops + ${goalCount} goals + ${lightingMastCount} masts`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 850,
    });
  }
  if (anchorSetCount > 0) {
    items.push({
      id: 'rf-anchors',
      categoryId: 'reinforcement',
      categoryLabel: 'Reinforcement',
      name: 'Galvanized J-bolt anchor templates & baseplates',
      specification: 'Heavy-duty M20 anchor bolt assemblies',
      quantity: anchorSetCount,
      unit: 'set',
      basis: '1 template assembly per stanchion/mast/combo goal',
      costSection: 'materials',
      defaultUnitPriceFcfa: 38000,
    });
  }

  // 6. Surface Finishing (System & Surface-Aware)
  if (isTurf) {
    const turfM2 = round1(totalSlabAreaM2 * 1.06);
    const shockPadM2 = round1(totalSlabAreaM2 * 1.03);
    const infillTonnes = round2(totalSlabAreaM2 * 0.022); // ~22 kg/m2 silica sand + EPDM/TPE infill
    items.push({
      id: 'sf-shockpad',
      categoryId: 'surface_finishing',
      categoryLabel: 'Surface Finishing',
      name: 'Prefabricated draining elastic shock-pad (14 mm)',
      specification: 'FIFA Quality compliant closed-cell shock absorption layer',
      quantity: shockPadM2,
      unit: 'm²',
      basis: `${totalSlabAreaM2} m² × 1.03 seam allowance`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 6500,
    });
    items.push({
      id: 'sf-turf-carpet',
      categoryId: 'surface_finishing',
      categoryLabel: 'Surface Finishing',
      name: 'FIFA-grade 50 mm monofilament synthetic turf carpet',
      specification: 'UV-stabilized PE turf rolls + PU seaming tape & adhesive',
      quantity: turfM2,
      unit: 'm²',
      basis: `${totalSlabAreaM2} m² + 6% cut waste`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 16500,
    });
    items.push({
      id: 'sf-turf-infill',
      categoryId: 'surface_finishing',
      categoryLabel: 'Surface Finishing',
      name: 'Washed silica sand & EPDM rubber performance infill',
      specification: 'Brushed in 2 passes (~14 kg sand + 8 kg EPDM per m²)',
      quantity: infillTonnes,
      unit: 'tonne',
      basis: `${totalSlabAreaM2} m² × 22 kg/m²`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 195000,
    });
  } else if (isGrass) {
    items.push({
      id: 'sf-grass-sod',
      categoryId: 'surface_finishing',
      categoryLabel: 'Surface Finishing',
      name: 'High-wear Bermudagrass / Hybrid turf sodding & fertilization',
      specification: 'Laser-leveled big-roll sports turf + starter NPK dressing',
      quantity: round1(totalSlabAreaM2 * 1.05),
      unit: 'm²',
      basis: `${totalSlabAreaM2} m² + 5% roll trim`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 5200,
    });
  } else if (isClay) {
    items.push({
      id: 'sf-clay-surface',
      categoryId: 'surface_finishing',
      categoryLabel: 'Surface Finishing',
      name: 'Crushed limestone binder + rolled red brick clay top-dressing',
      specification: '60 mm dynamic base + 25 mm championship crushed red brick clay',
      quantity: round1(totalSlabAreaM2 * 1.05),
      unit: 'm²',
      basis: `${totalSlabAreaM2} m² full court & run-off`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 11800,
    });
  } else if (isSand) {
    items.push({
      id: 'sf-sand-lines',
      categoryId: 'surface_finishing',
      categoryLabel: 'Surface Finishing',
      name: 'Tensioned UV-resistant beach boundary tape & corner anchors',
      specification: '50 mm high-visibility webbing + elastic bungee ground plates',
      quantity: 1,
      unit: 'set',
      basis: `${lengthM.toFixed(1)} × ${widthM.toFixed(1)} m sand court kit`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 95000,
    });
  } else {
    items.push({
      id: 'sf-playing',
      categoryId: 'surface_finishing',
      categoryLabel: 'Surface Finishing',
      name: `Primary playing surface (${surfacePreset.label})`,
      specification: isWood
        ? 'Kiln-dried maple strip flooring + shock-absorbing batten subfloor & PU seal'
        : project.materials.surfaceType === 'modular_tile'
        ? 'Interlocking suspended polypropylene sports tiles + edge ramps'
        : project.materials.surfaceType === 'pu_multisport'
        ? 'Seamless self-leveling polyurethane (PU) 7+2 mm multisport cushion resin'
        : 'Multi-coat elastomeric cushioned acrylic sports surfacing system',
      quantity: round1(playingAreaM2 * 1.05),
      unit: 'm²',
      basis: `${playingAreaM2} m² playing area + 5% cut waste`,
      costSection: 'materials',
      defaultUnitPriceFcfa: isWood
        ? 48000
        : project.materials.surfaceType === 'modular_tile'
        ? 22000
        : project.materials.surfaceType === 'pu_multisport'
        ? 19500
        : 14500,
    });
    if (apronAreaM2 > 0) {
      items.push({
        id: 'sf-apron',
        categoryId: 'surface_finishing',
        categoryLabel: 'Surface Finishing',
        name: 'Safety clearance apron surfacing',
        specification: isWood
          ? 'Perimeter resilient border deck / contrasting maple stain'
          : 'Contrasting acrylic / anti-slip safety run-off coating',
        quantity: round1(apronAreaM2 * 1.05),
        unit: 'm²',
        basis: `${apronAreaM2} m² safety apron + 5% waste`,
        costSection: 'materials',
        defaultUnitPriceFcfa: isWood ? 26000 : 11500,
      });
    }
  }

  // 7. Paint and Court Markings (from Single-Source-of-Truth Marking Primitives)
  if (!isSand) {
    if (paintedZoneAreaM2 > 0) {
      const zonePaintLitres = round1(paintedZoneAreaM2 * 0.35 * 1.1);
      items.push({
        id: 'pm-key-paint',
        categoryId: 'paint_markings',
        categoryLabel: 'Paint & Court Markings',
        name: 'Key, goal circle & zone pigmented coating (2 coats)',
        specification: `${activeSportsSummary} zone fill · colour ${project.materials.paintColor}`,
        quantity: zonePaintLitres,
        unit: 'L',
        basis: `${paintedZoneAreaM2} m² painted zones`,
        costSection: 'materials',
        defaultUnitPriceFcfa: 7500,
      });
    }

    const linePaintLitres = round1(Math.max(2, markingLinearM * 0.05 * 0.45 * 1.15));
    if (isTurf) {
      items.push({
        id: 'pm-turf-inlay',
        categoryId: 'paint_markings',
        categoryLabel: 'Paint & Court Markings',
        name: 'Tufted white/coloured synthetic turf inlaid marking lines',
        specification: `${activeSportsSummary} · ${markingLinearM.toFixed(1)} linear m factory/in-situ inlaid lines`,
        quantity: markingLinearM,
        unit: 'm',
        basis: `${markingLinearM.toFixed(1)} m total layer linework`,
        costSection: 'materials',
        defaultUnitPriceFcfa: 1800,
      });
    } else if (isClay) {
      items.push({
        id: 'pm-clay-tapes',
        categoryId: 'paint_markings',
        categoryLabel: 'Paint & Court Markings',
        name: 'Lead / PVC nailed clay court marking lines & anchors',
        specification: `${markingLinearM.toFixed(1)} linear m textured non-slip 50 mm line tapes`,
        quantity: markingLinearM,
        unit: 'm',
        basis: `${markingLinearM.toFixed(1)} m regulation court lines`,
        costSection: 'materials',
        defaultUnitPriceFcfa: 2200,
      });
    } else {
      const maskingTapeRolls = Math.max(2, Math.ceil((markingLinearM * 2) / 50));
      items.push({
        id: 'pm-line-paint',
        categoryId: 'paint_markings',
        categoryLabel: 'Paint & Court Markings',
        name: isGrass
          ? 'Washable turf line-marking pigment (high-opacity grass paint)'
          : 'High-contrast sports line marking paint (PU / Acrylic)',
        specification: `${activeSportsSummary} · ${markingLinearM.toFixed(1)} linear m across ${effectiveLayers.length} layer(s)`,
        quantity: linePaintLitres,
        unit: 'L',
        basis: `${markingLinearM.toFixed(1)} m × 0.05 m markings`,
        costSection: 'materials',
        defaultUnitPriceFcfa: isGrass ? 4800 : 8500,
      });
      if (!isGrass) {
        items.push({
          id: 'pm-tape',
          categoryId: 'paint_markings',
          categoryLabel: 'Paint & Court Markings',
          name: 'Precision UV-resistant masking tape (50 m rolls)',
          specification: 'Double-sided 50 mm line layout masking',
          quantity: maskingTapeRolls,
          unit: 'roll',
          basis: '2× linear marking perimeter / 50 m',
          costSection: 'materials',
          defaultUnitPriceFcfa: 2800,
        });
      }
    }
  }

  // 8. Sports Equipment (Basketball, Football, Handball, Volleyball, Tennis, Combo & Dugouts)
  if (hoopCount > 0) {
    const glassCount = hoops.filter(
      (h) => (h.metadata?.backboardType ?? 'tempered_glass') === 'tempered_glass'
    ).length;
    const otherHoopCount = hoopCount - glassCount;
    if (glassCount > 0) {
      items.push({
        id: 'hb-glass-hoop',
        categoryId: 'hoops_backboards',
        categoryLabel: 'Sports Equipment',
        name: 'Tempered glass backboard, breakaway rim & stanchion rig',
        specification: '1.80×1.05 m glass board, pro rim, net & post padding',
        quantity: glassCount,
        unit: 'unit',
        basis: 'Counted from 3D hoop assemblies',
        costSection: 'materials',
        defaultUnitPriceFcfa: 1450000,
      });
    }
    if (otherHoopCount > 0) {
      items.push({
        id: 'hb-acrylic-steel-hoop',
        categoryId: 'hoops_backboards',
        categoryLabel: 'Sports Equipment',
        name: 'Acrylic/Steel outdoor hoop, heavy rim & gooseneck post',
        specification: 'Weatherproof backboard, chain/nylon net & stanchion',
        quantity: otherHoopCount,
        unit: 'unit',
        basis: 'Counted from 3D hoop assemblies',
        costSection: 'materials',
        defaultUnitPriceFcfa: 780000,
      });
    }
  }

  if (footballGoals.length > 0) {
    const fullSizeCount = footballGoals.filter((g) => (g.metadata?.goalWidthM ?? 7.32) >= 7.0).length;
    const youthMiniCount = footballGoals.length - fullSizeCount;
    if (fullSizeCount > 0) {
      items.push({
        id: 'eq-football-goal-11',
        categoryId: 'hoops_backboards',
        categoryLabel: 'Sports Equipment',
        name: 'FIFA 11v11 anodized aluminum goal frame (7.32×2.44 m) + net',
        specification: 'Ø120 mm elliptical crossbar/uprights, sockets & 4 mm braided net',
        quantity: fullSizeCount,
        unit: 'unit',
        basis: 'Counted from 3D football goals',
        costSection: 'materials',
        defaultUnitPriceFcfa: 1350000,
      });
    }
    if (youthMiniCount > 0) {
      items.push({
        id: 'eq-football-goal-mini',
        categoryId: 'hoops_backboards',
        categoryLabel: 'Sports Equipment',
        name: 'Youth / 5-a-side football goal (3.0–6.0 m) + net & anchors',
        specification: 'Powder-coated aluminum/steel frame with ground sleeves',
        quantity: youthMiniCount,
        unit: 'unit',
        basis: 'Counted from 3D football goals',
        costSection: 'materials',
        defaultUnitPriceFcfa: 540000,
      });
    }
  }

  if (handballGoals.length > 0) {
    items.push({
      id: 'eq-handball-goal',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'IHF regulation handball / futsal goal (3.00×2.00 m)',
      specification: '80×80 mm red/white striped frame + anti-whip back net',
      quantity: handballGoals.length,
      unit: 'unit',
      basis: 'Counted from 3D handball goals',
      costSection: 'materials',
      defaultUnitPriceFcfa: 490000,
    });
  }

  if (comboGoals.length > 0) {
    items.push({
      id: 'eq-combo-goal',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'Multi-sport galvanized combo goal (3×2 m goal + basketball board)',
      specification: 'Heavy anti-vandal tubular cage, steel backboard & 3.05 m rim',
      quantity: comboGoals.length,
      unit: 'unit',
      basis: 'Counted from 3D multi-sport combo goals',
      costSection: 'materials',
      defaultUnitPriceFcfa: 1650000,
    });
  }

  if (volleyNets.length > 0) {
    items.push({
      id: 'eq-volleyball-net',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'FIVB tensioned volleyball posts, ground sleeves & net + antennae',
      specification: 'Height-adjustable Ø90 mm aluminum posts + safety pads',
      quantity: volleyNets.length,
      unit: 'set',
      basis: 'Counted from 3D volleyball nets',
      costSection: 'materials',
      defaultUnitPriceFcfa: 460000,
    });
  }

  if (tennisNets.length > 0) {
    items.push({
      id: 'eq-tennis-net',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'ITF tennis net posts, brass ratchet, ground sockets & 3.5 mm net',
      specification: '80×80 mm polyester-coated posts + center anchor strap',
      quantity: tennisNets.length,
      unit: 'set',
      basis: 'Counted from 3D tennis nets',
      costSection: 'materials',
      defaultUnitPriceFcfa: 420000,
    });
  }

  if (dugouts.length > 0) {
    items.push({
      id: 'eq-dugouts',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'Covered polycarbonate 8-seat team dugout shelter',
      specification: 'Galvanized steel rib arch, UV polycarbonate canopy & bucket seats',
      quantity: dugouts.length,
      unit: 'unit',
      basis: 'Counted from 3D team dugouts',
      costSection: 'materials',
      defaultUnitPriceFcfa: 1150000,
    });
  }

  if (cornerFlags.length > 0) {
    items.push({
      id: 'eq-corner-flags',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'Flexible spring-loaded corner flags & ground sockets',
      specification: '1.5 m Ø50 mm PVC upright poles with high-vis flags',
      quantity: cornerFlags.length,
      unit: 'unit',
      basis: 'Counted from 3D corner flags',
      costSection: 'materials',
      defaultUnitPriceFcfa: 18500,
    });
  }

  const ancillaryCount =
    benches.length + scorers.length + scoreboards.length + bleachers.length + ballRacks.length + dugouts.length;

  if (benches.length > 0) {
    items.push({
      id: 'eq-benches',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'Team player benches (5-seat powder-coated aluminum)',
      specification: 'Placed court-side in 3D equipment layout',
      quantity: benches.length,
      unit: 'unit',
      basis: 'Counted from 3D scene',
      costSection: 'materials',
      defaultUnitPriceFcfa: 240000,
    });
  }
  if (scorers.length > 0 || scoreboards.length > 0) {
    items.push({
      id: 'eq-scoring',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: "Scorer's table & LED scoreboard package",
      specification: `${scorers.length} table(s), ${scoreboards.length} scoreboard(s)`,
      quantity: scorers.length + scoreboards.length,
      unit: 'unit',
      basis: 'Counted from 3D scene',
      costSection: 'materials',
      defaultUnitPriceFcfa: 620000,
    });
  }
  if (bleachers.length > 0) {
    items.push({
      id: 'eq-bleachers',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: '3-tier aluminum spectator bleachers',
      specification: '6.4 m modular grandstand units',
      quantity: bleachers.length,
      unit: 'unit',
      basis: 'Counted from 3D scene',
      costSection: 'materials',
      defaultUnitPriceFcfa: 950000,
    });
  }
  if (ballRacks.length > 0) {
    items.push({
      id: 'eq-ballrack',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Sports Equipment',
      name: 'Steel rolling ball rack & match balls',
      specification: 'Tubular rack + 6 regulation match balls',
      quantity: ballRacks.length,
      unit: 'set',
      basis: 'Counted from 3D scene',
      costSection: 'materials',
      defaultUnitPriceFcfa: 145000,
    });
  }

  // 9. Lighting
  if (lightingMastCount > 0) {
    const avgMastHeightM =
      lightingMasts.reduce((s, m) => s + (m.metadata?.poleHeightM ?? (totalSlabAreaM2 > 1500 ? 12 : 6.5)), 0) /
      lightingMastCount;
    const isStadiumMast = avgMastHeightM >= 10;
    const cableLenM = round1(lightingMastCount * (isStadiumMast ? 35 : 22) + slabPerimeterM * 0.5);
    items.push({
      id: 'lt-masts',
      categoryId: 'lighting',
      categoryLabel: 'Lighting',
      name: isStadiumMast
        ? `Galvanized ${avgMastHeightM.toFixed(1)} m stadium floodlight masts + quad LED projectors`
        : `Galvanized ${avgMastHeightM.toFixed(1)} m floodlight masts + dual 300 W LED heads`,
      specification: isStadiumMast
        ? '1200 W LED asymmetric flood array + IP66 surge cabinet'
        : 'IP66 stadium optics + weatherproof junction box',
      quantity: lightingMastCount,
      unit: 'mast',
      basis: 'Counted from 3D lighting poles',
      costSection: 'materials',
      defaultUnitPriceFcfa: isStadiumMast ? 1450000 : 680000,
    });
    items.push({
      id: 'lt-cable',
      categoryId: 'lighting',
      categoryLabel: 'Lighting',
      name: 'Armoured underground power cable & HDPE conduit + breaker',
      specification: isStadiumMast ? '3×10 mm² U1000 R2V + earthing grid' : '3×4 mm² U1000 R2V + earthing rod kit',
      quantity: cableLenM,
      unit: 'm',
      basis: 'Perimeter routing + mast drops',
      costSection: 'materials',
      defaultUnitPriceFcfa: isStadiumMast ? 6200 : 3800,
    });
  } else if (!isOutdoor) {
    const indoorHighBays = Math.max(4, Math.ceil(totalSlabAreaM2 / 65));
    items.push({
      id: 'lt-indoor-highbay',
      categoryId: 'lighting',
      categoryLabel: 'Lighting',
      name: 'Indoor anti-glare LED arena high-bay luminaires (200 W)',
      specification: '5000K UGR<19 court lighting fixtures + cabling allowance',
      quantity: indoorHighBays,
      unit: 'unit',
      basis: '1 fixture per ~65 m² ceiling coverage',
      costSection: 'materials',
      defaultUnitPriceFcfa: 165000,
    });
  } else {
    items.push({
      id: 'lt-none',
      categoryId: 'lighting',
      categoryLabel: 'Lighting',
      name: 'Outdoor floodlight poles & cabling',
      specification: 'No lighting masts placed in 3D scene',
      quantity: 0,
      unit: 'mast',
      basis: '0 poles placed in 3D scene',
      costSection: 'materials',
      defaultUnitPriceFcfa: 0,
    });
  }

  // 10. Fencing
  if (fenceTotalLengthM > 0) {
    const postCount = Math.ceil(fenceTotalLengthM / 2.5) + fences.length;
    const heightScale = Math.max(0.5, avgFenceHeightM / 3.2);
    items.push({
      id: 'fn-mesh',
      categoryId: 'fencing',
      categoryLabel: 'Fencing',
      name: `PVC-coated galvanized ball-stop mesh (${avgFenceHeightM.toFixed(1)} m high)`,
      specification: '50×50 mm mesh + top/mid/bottom tension rails',
      quantity: fenceTotalLengthM,
      unit: 'm',
      basis: 'Summed from 3D fence spans',
      costSection: 'materials',
      defaultUnitPriceFcfa: Math.round(28000 * heightScale),
    });
    items.push({
      id: 'fn-posts',
      categoryId: 'fencing',
      categoryLabel: 'Fencing',
      name: 'Galvanized Ø60 mm fence posts, brace struts & access gate',
      specification: 'Spaced at 2.50 m centres incl. lockable 1.2 m gate',
      quantity: postCount,
      unit: 'post',
      basis: `${fenceTotalLengthM} m / 2.5 m centres`,
      costSection: 'materials',
      defaultUnitPriceFcfa: Math.round(24500 * heightScale),
    });
  } else {
    items.push({
      id: 'fn-none',
      categoryId: 'fencing',
      categoryLabel: 'Fencing',
      name: 'Perimeter ball-stop fencing',
      specification: 'No fence segments placed in 3D scene',
      quantity: 0,
      unit: 'm',
      basis: '0 m fence placed in 3D scene',
      costSection: 'materials',
      defaultUnitPriceFcfa: 0,
    });
  }

  // 11. Drainage / Irrigation
  if (isTurf || isGrass) {
    const pitchDrainRunM = round1(slabPerimeterM * 0.8 + (lengthM / 8) * widthM);
    const drainGravelM3 = round2(pitchDrainRunM * 0.25 * 0.35);
    const catchBasins = Math.max(4, Math.ceil(slabPerimeterM / 35));
    items.push({
      id: 'dr-herringbone',
      categoryId: 'drainage',
      categoryLabel: 'Drainage',
      name: 'Herringbone Ø100/160 mm perforated HDPE pitch drainage network',
      specification: 'Sub-base collector laterals + perimeter Ø200 mm main trunk',
      quantity: pitchDrainRunM,
      unit: 'm',
      basis: '8 m pitch lateral spacing + perimeter trunk',
      costSection: 'materials',
      defaultUnitPriceFcfa: 5900,
    });
    items.push({
      id: 'dr-gravel',
      categoryId: 'drainage',
      categoryLabel: 'Drainage',
      name: 'Washed 10/20 mm draining gravel trench backfill',
      specification: 'Wrapped in non-woven filter geotextile',
      quantity: drainGravelM3,
      unit: 'm³',
      basis: `${pitchDrainRunM} m × 0.25 m × 0.35 m trench`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 21000,
    });
    items.push({
      id: 'dr-pits',
      categoryId: 'drainage',
      categoryLabel: 'Drainage',
      name: 'Precast inspection catch basins / silt chambers',
      specification: '500×500 mm concrete sump boxes with heavy grate',
      quantity: catchBasins,
      unit: 'unit',
      basis: '1 chamber per ~35 m perimeter collector',
      costSection: 'materials',
      defaultUnitPriceFcfa: 55000,
    });
    if (isGrass) {
      const sprinklers = Math.max(6, Math.ceil(totalSlabAreaM2 / 480));
      items.push({
        id: 'dr-irrigation',
        categoryId: 'drainage',
        categoryLabel: 'Irrigation',
        name: 'Automated pop-up pitch sprinkler & booster pump system',
        specification: 'Long-throw turf rotors, PE manifold & programmable controller',
        quantity: sprinklers,
        unit: 'head',
        basis: 'Full-pitch watering coverage allowance',
        costSection: 'materials',
        defaultUnitPriceFcfa: 185000,
      });
    }
  } else if (isOutdoor && !isExistingSlab) {
    const drainPipeM = round1(slabPerimeterM * 0.75);
    const drainGravelM3 = round2(drainPipeM * 0.35 * 0.45);
    const catchBasins = Math.max(2, Math.ceil(drainPipeM / 24));
    items.push({
      id: 'dr-pipe',
      categoryId: 'drainage',
      categoryLabel: 'Drainage',
      name: 'Perforated Ø160 mm PVC French drain & slotted edge channel',
      specification: 'Graded 0.5%–1.0% slope perimeter runoff collection',
      quantity: drainPipeM,
      unit: 'm',
      basis: '75% of slab perimeter run-off edge',
      costSection: 'materials',
      defaultUnitPriceFcfa: 6800,
    });
    items.push({
      id: 'dr-gravel',
      categoryId: 'drainage',
      categoryLabel: 'Drainage',
      name: 'Washed 15/25 mm drainage gravel backfill',
      specification: 'Wrapped in filter geotextile along trench',
      quantity: drainGravelM3,
      unit: 'm³',
      basis: `${drainPipeM} m × 0.35 m × 0.45 m trench`,
      costSection: 'materials',
      defaultUnitPriceFcfa: 21000,
    });
    items.push({
      id: 'dr-pits',
      categoryId: 'drainage',
      categoryLabel: 'Drainage',
      name: 'Precast inspection catch basins / soakaway silt traps',
      specification: '500×500 mm concrete sump boxes with galvanized grate',
      quantity: catchBasins,
      unit: 'unit',
      basis: '1 trap per ~24 m drainage run',
      costSection: 'materials',
      defaultUnitPriceFcfa: 55000,
    });
  } else if (!isExistingSlab) {
    items.push({
      id: 'dr-indoor',
      categoryId: 'drainage',
      categoryLabel: 'Drainage',
      name: 'Perimeter floor scupper drains & perimeter damp-proof seal',
      specification: 'Indoor facility maintenance & moisture protection',
      quantity: 2,
      unit: 'unit',
      basis: 'Standard indoor perimeter traps',
      costSection: 'materials',
      defaultUnitPriceFcfa: 48000,
    });
  }

  const equipmentSummaryParts: string[] = [];
  if (hoopCount > 0) equipmentSummaryParts.push(`${hoopCount} hoop(s)`);
  if (goalCount > 0) equipmentSummaryParts.push(`${goalCount} goal(s)`);
  if (netCount > 0) equipmentSummaryParts.push(`${netCount} net(s)`);
  equipmentSummaryParts.push(`${lightingMastCount} mast(s)`);
  equipmentSummaryParts.push(`${fenceTotalLengthM.toFixed(1)} m fence`);
  if (ancillaryCount > 0) equipmentSummaryParts.push(`${ancillaryCount} ancillary fixture(s)`);

  const engineeringNotes = [
    `Facility footprint: ${totalL.toFixed(2)} × ${totalW.toFixed(2)} m (${totalSlabAreaM2.toFixed(1)} m²) comprising ${playingAreaM2.toFixed(1)} m² playing area and ${apronAreaM2.toFixed(1)} m² run-off apron.`,
    `Ground construction system: ${groundPreset.label} (${surfacePreset.label}) — active sport layers: ${activeSportsSummary}.`,
    isExistingSlab
      ? 'Renovation mode (Existing Slab): bulk earthworks, subgrade excavation, and new structural concrete slab omitted.'
      : hasConcreteSlab
      ? `Structural slab assumption: ${assumptions.slabThicknessM.toFixed(2)} m C25/30 slab over ${assumptions.subBaseThicknessM.toFixed(2)} m compacted sub-base (cut depth ${assumptions.excavationDepthM.toFixed(2)} m, waste ${assumptions.wasteFactorPct}%).`
      : `Subgrade build-up assumption: ${assumptions.subBaseThicknessM.toFixed(2)} m draining base within ${assumptions.excavationDepthM.toFixed(2)} m cut depth (waste ${assumptions.wasteFactorPct}%).`,
    `Active 3D equipment counted: ${equipmentSummaryParts.join(', ')}.${isHalfCourt ? ' Half-court layout applied.' : ''}`,
  ];

  return {
    assumptions,
    groundSystem,
    groundSystemLabel: groundPreset.label,
    activeSportsSummary,
    playingAreaM2,
    apronAreaM2,
    totalSlabAreaM2,
    clearingAreaM2,
    slabPerimeterM,
    markingLinearM,
    paintedZoneAreaM2,
    hoopCount,
    goalCount,
    netCount,
    lightingMastCount,
    fenceTotalLengthM,
    benchCount: benches.length,
    bleacherCount: bleachers.length,
    scoreboardCount: scoreboards.length,
    items,
    engineeringNotes,
  };
}

export function computeCostEstimate(project: CourtProject, bom: BomSummary): CostEstimateSummary {
  const costCfg = project.costConfig ?? defaultCostConfig();
  const overrides = costCfg.unitPriceOverrides ?? {};
  const contingencyPct = costCfg.contingencyPct ?? 10;

  const isOutdoor = project.environment === 'outdoor';
  const isExistingSlab = bom.groundSystem === 'existing_slab';
  const hasConcreteSlab =
    bom.groundSystem === 'concrete_slab' || bom.groundSystem === 'sprung_wood';
  const areaScale = Math.max(0.45, bom.totalSlabAreaM2 / 608);
  const equipmentUnits = bom.hoopCount + bom.goalCount + bom.netCount;

  const labourAndOverheadItems: Array<Omit<BomItem, 'categoryId' | 'categoryLabel'>> = [];

  if (!isExistingSlab) {
    labourAndOverheadItems.push({
      id: 'lb-civil-crew',
      name: hasConcreteSlab
        ? 'Earthworks, masonry & concrete crew'
        : 'Earthworks, drainage & base preparation crew',
      specification: hasConcreteSlab
        ? 'Formwork, sub-base compaction, steel fixing & slab pour'
        : 'Grading, perforated drainage, geotextile & sub-base compaction',
      quantity: Math.max(6, Math.round((hasConcreteSlab ? 22 : 16) * areaScale)),
      unit: 'crew-day',
      basis: 'Scaled by project footprint & build-up',
      costSection: 'labour',
      defaultUnitPriceFcfa: 65000,
    });
  }

  labourAndOverheadItems.push({
    id: 'lb-surfacing-team',
    name: 'Specialist surfacing & multi-sport line-marking technicians',
    specification: `${bom.groundSystemLabel} surfacing & tolerance striping (${bom.activeSportsSummary})`,
    quantity: Math.max(3, Math.round(7 * areaScale)),
    unit: 'crew-day',
    basis: 'Scaled by playing area & marking complexity',
    costSection: 'labour',
    defaultUnitPriceFcfa: 75000,
  });

  labourAndOverheadItems.push({
    id: 'lb-mep-install',
    name: 'Goals/hoops rigging, electrical lighting & fencing installers',
    specification: 'Plumb alignment, anchor torquing & electrical hookup',
    quantity: Math.max(
      2,
      Math.round(
        2 + equipmentUnits * 0.7 + bom.lightingMastCount * 0.5 + (bom.fenceTotalLengthM > 0 ? 2 : 0)
      )
    ),
    unit: 'crew-day',
    basis: 'Driven by 3D equipment count',
    costSection: 'labour',
    defaultUnitPriceFcfa: 68000,
  });

  if (!isExistingSlab) {
    labourAndOverheadItems.push({
      id: 'eq-heavy-plant',
      name: 'Mini-excavator, tipper & vibratory roller/plate compactor hire',
      specification: 'Earthmoving & base compaction machinery',
      quantity: Math.max(2, Math.round((isOutdoor ? 6 : 3) * areaScale)),
      unit: 'day',
      basis: 'Earthwork & foundation phase',
      costSection: 'equipment',
      defaultUnitPriceFcfa: 135000,
    });
  } else {
    labourAndOverheadItems.push({
      id: 'eq-floor-grinder',
      name: 'Planetary diamond floor grinder & industrial vacuum hire',
      specification: 'Surface preparation on existing slab',
      quantity: Math.max(2, Math.round(3 * areaScale)),
      unit: 'day',
      basis: 'Renovation prep phase',
      costSection: 'equipment',
      defaultUnitPriceFcfa: 110000,
    });
  }

  if (hasConcreteSlab) {
    labourAndOverheadItems.push({
      id: 'eq-concrete-tools',
      name: 'Concrete mixer/pump, poker vibrator & power trowel hire',
      specification: 'Slab placement & laser leveling tools',
      quantity: Math.max(2, Math.round(3 * areaScale)),
      unit: 'day',
      basis: 'Concrete pour & finishing',
      costSection: 'equipment',
      defaultUnitPriceFcfa: 95000,
    });
  } else if (bom.groundSystem === 'asphalt_base') {
    labourAndOverheadItems.push({
      id: 'eq-asphalt-paver',
      name: 'Asphalt paver & tandem steel drum roller hire',
      specification: 'Hot-mix base & wearing course placement',
      quantity: Math.max(2, Math.round(2.5 * areaScale)),
      unit: 'day',
      basis: 'Asphalt paving window',
      costSection: 'equipment',
      defaultUnitPriceFcfa: 185000,
    });
  } else if (bom.groundSystem === 'synthetic_turf') {
    labourAndOverheadItems.push({
      id: 'eq-turf-brushing',
      name: 'Turf seam stretcher, infill spreader & rotary brush machine hire',
      specification: 'Artificial turf installation tooling',
      quantity: Math.max(2, Math.round(3 * areaScale)),
      unit: 'day',
      basis: 'Turf & infill installation',
      costSection: 'equipment',
      defaultUnitPriceFcfa: 85000,
    });
  }

  labourAndOverheadItems.push(
    {
      id: 'tr-materials',
      name: 'Bulk civil materials & sports equipment haulage',
      specification: 'Truck deliveries to project site',
      quantity: Math.max(2, Math.round((isExistingSlab ? 2 : 6) * areaScale + (equipmentUnits > 0 ? 1 : 0))),
      unit: 'trip',
      basis: 'Bulk material & fixture trips',
      costSection: 'transport',
      defaultUnitPriceFcfa: 75000,
    },
    {
      id: 'ad-survey-eng',
      name: 'Topographic setting-out, soil/moisture check & engineering sign-off',
      specification: 'Pre-construction verification & QA testing',
      quantity: 1,
      unit: 'lump sum',
      basis: 'Per project site',
      costSection: 'additional',
      defaultUnitPriceFcfa: 350000,
    },
    {
      id: 'ad-site-logistics',
      name: 'Site safety hoarding, water supply & temporary works',
      specification: 'Construction period safety & protection allowance',
      quantity: 1,
      unit: 'lump sum',
      basis: 'Construction period allowance',
      costSection: 'additional',
      defaultUnitPriceFcfa: 180000,
    }
  );

  const sectionLabels: Record<CostSectionId, string> = {
    materials: 'Materials (from BOM)',
    labour: 'Labour Costs',
    equipment: 'Equipment & Plant Hire',
    transport: 'Transport & Haulage',
    additional: 'Additional Engineering & Site Expenses',
  };

  const allRaw = [
    ...bom.items.map((item) => ({
      id: item.id,
      section: item.costSection,
      name: item.name,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      defaultUnitPriceFcfa: item.defaultUnitPriceFcfa,
    })),
    ...labourAndOverheadItems.map((item) => ({
      id: item.id,
      section: item.costSection,
      name: item.name,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      defaultUnitPriceFcfa: item.defaultUnitPriceFcfa,
    })),
  ];

  const items: CostLineItem[] = allRaw.map((raw) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(overrides, raw.id);
    const unitPriceFcfa = hasOverride ? Math.max(0, overrides[raw.id]) : raw.defaultUnitPriceFcfa;
    return {
      id: raw.id,
      section: raw.section,
      sectionLabel: sectionLabels[raw.section],
      name: raw.name,
      specification: raw.specification,
      quantity: raw.quantity,
      unit: raw.unit,
      defaultUnitPriceFcfa: raw.defaultUnitPriceFcfa,
      unitPriceFcfa,
      totalFcfa: Math.round(raw.quantity * unitPriceFcfa),
      isOverridden: hasOverride,
    };
  });

  const sumSection = (sec: CostSectionId) =>
    items.filter((i) => i.section === sec).reduce((acc, i) => acc + i.totalFcfa, 0);

  const materialsSubtotalFcfa = sumSection('materials');
  const labourSubtotalFcfa = sumSection('labour');
  const equipmentSubtotalFcfa = sumSection('equipment');
  const transportSubtotalFcfa = sumSection('transport');
  const additionalSubtotalFcfa = sumSection('additional');

  const directWorksSubtotalFcfa =
    materialsSubtotalFcfa +
    labourSubtotalFcfa +
    equipmentSubtotalFcfa +
    transportSubtotalFcfa +
    additionalSubtotalFcfa;

  const contingencyAmountFcfa = Math.round(directWorksSubtotalFcfa * (contingencyPct / 100));
  const grandTotalFcfa = directWorksSubtotalFcfa + contingencyAmountFcfa;
  const costPerSqmFcfa =
    bom.totalSlabAreaM2 > 0 ? Math.round(grandTotalFcfa / bom.totalSlabAreaM2) : 0;

  return {
    currency: 'FCFA',
    isIndicativeEstimate: true,
    disclaimer: BENIN_PRICE_DISCLAIMER,
    items,
    materialsSubtotalFcfa,
    labourSubtotalFcfa,
    equipmentSubtotalFcfa,
    transportSubtotalFcfa,
    additionalSubtotalFcfa,
    directWorksSubtotalFcfa,
    contingencyPct,
    contingencyAmountFcfa,
    grandTotalFcfa,
    costPerSqmFcfa,
  };
}

export function computeConstructionSchedule(
  project: CourtProject,
  bom: BomSummary
): ConstructionWorkflowSummary {
  const areaScale = Math.max(0.6, Math.min(6.5, bom.totalSlabAreaM2 / 608));
  const isOutdoor = project.environment === 'outdoor';
  const isExistingSlab = bom.groundSystem === 'existing_slab';
  const hasConcreteSlab =
    bom.groundSystem === 'concrete_slab' || bom.groundSystem === 'sprung_wood';
  const isWood =
    bom.groundSystem === 'sprung_wood' ||
    project.materials.surfaceType === 'hardwood_maple' ||
    project.materials.surfaceType === 'hardwood_dark';
  const spec = COURT_STANDARDS[project.standard] ?? COURT_STANDARDS.FIBA;

  const d1 = 2;
  const d2 = isExistingSlab ? 1 : Math.max(2, Math.round(2 * areaScale));
  const d3 = isExistingSlab ? 2 : Math.max(2, Math.round((isOutdoor ? 4 : 2) * areaScale));
  const d4 = isExistingSlab ? 1 : Math.max(2, Math.round((isOutdoor ? 4 : 3) * areaScale));
  const d5 = hasConcreteSlab
    ? Math.max(4, Math.round(5 * areaScale)) + 7
    : isExistingSlab
    ? 2
    : Math.max(3, Math.round(4 * areaScale));
  const d6 = isWood ? Math.max(4, Math.round(6 * areaScale)) : Math.max(3, Math.round(4 * areaScale));
  const d7 = bom.groundSystem === 'sand_court' ? 1 : 2;
  const equipTotal = bom.hoopCount + bom.goalCount + bom.netCount;
  const d8 = Math.max(1, Math.ceil(equipTotal * 0.7 + (bom.bleacherCount > 0 ? 1 : 0)));
  const d9 = Math.max(
    1,
    Math.ceil(bom.lightingMastCount * 0.5 + (bom.fenceTotalLengthM > 0 ? bom.fenceTotalLengthM / 25 : 0))
  );
  const d10 = 2;

  const rawStages: Array<Omit<ConstructionStage, 'startDay' | 'endDay'>> = [
    {
      order: 1,
      id: 'stage-1',
      title: 'Site inspection and measurements',
      description: `Verify parcel boundaries, orientation (${project.dimensions.orientationDeg}°), utility clearances, soil/slab condition, and stake out ${(project.dimensions.lengthM + project.dimensions.apronM * 2).toFixed(2)} × ${(project.dimensions.widthM + project.dimensions.apronM * 2).toFixed(2)} m gross envelope.`,
      requiredMaterials: ['Survey stakes & batter boards', 'Topographic total-station benchmarks'],
      durationDays: d1,
      dependencies: ['Client parcel approval & geotechnical briefing'],
      qualityControlPoints: [
        'Diagonal check within ±5 mm across full footprint',
        'Confirm minimum safety run-off clearance around playing boundaries',
        'Verify existing underground services clear of footing zones',
      ],
    },
    {
      order: 2,
      id: 'stage-2',
      title: isExistingSlab ? 'Existing slab inspection & cleaning' : 'Site preparation and clearing',
      description: isExistingSlab
        ? `Wash, inspect joints/spalls, and verify surface drainage slope across ${bom.totalSlabAreaM2} m² existing concrete deck.`
        : `Clear vegetation, debris, and strip organic topsoil across ${bom.clearingAreaM2} m² gross working zone.`,
      requiredMaterials: isExistingSlab
        ? ['Pressure washer & crack gauges']
        : ['Site hoarding & warning tape', 'Spoil disposal haulage'],
      durationDays: d2,
      dependencies: ['Stage 1: Site inspection and measurements'],
      qualityControlPoints: isExistingSlab
        ? ['Map delamination/crack zones & verify core dryness before grinding']
        : [
            'Zero organic roots or soft pockets remaining inside footprint',
            'Benchmark elevation pins preserved outside excavation perimeter',
          ],
    },
    {
      order: 3,
      id: 'stage-3',
      title: isExistingSlab ? 'Diamond grinding & crack repair' : 'Excavation and earthworks',
      description: isExistingSlab
        ? `Mechanically grind ${bom.totalSlabAreaM2} m² existing deck and inject epoxy repair mortar into control joints.`
        : `Execute bulk subgrade cut (${bom.items.find((i) => i.id === 'ex-bulk')?.quantity ?? 0} m³ to ${bom.assumptions.excavationDepthM.toFixed(2)} m depth) plus footing sockets.`,
      requiredMaterials: isExistingSlab
        ? ['Diamond floor grinder', 'Epoxy crack filler & self-leveling screed']
        : ['Mini-excavator & compactor', 'Trench shoring boards where required'],
      durationDays: d3,
      dependencies: ['Stage 2'],
      qualityControlPoints: isExistingSlab
        ? ['Verify CSP-2/3 concrete surface profile & zero loose laitance']
        : [
            'Subgrade level tolerance ±15 mm prior to geotextile placement',
            'Proof-roll subgrade to confirm uniform bearing without rutting',
          ],
    },
    {
      order: 4,
      id: 'stage-4',
      title: isExistingSlab ? 'Moisture barrier & epoxy primer' : 'Drainage and sub-base foundation',
      description: isExistingSlab
        ? `Apply full moisture-barrier epoxy primer across ${bom.totalSlabAreaM2} m² and install anchor sockets where required.`
        : isOutdoor
        ? `Install sub-grade perforated drainage pipes, silt chambers, geotextile (${bom.totalSlabAreaM2} m²), and compact aggregate foundation.`
        : `Install indoor vapour barrier membrane, perimeter floor traps, and compact ${bom.assumptions.subBaseThicknessM.toFixed(2)} m crushed stone base.`,
      requiredMaterials: isExistingSlab
        ? ['Epoxy moisture primer', 'Chemical anchor kits']
        : [
            'Separation geotextile membrane',
            'Crushed draining aggregate sub-base',
            isOutdoor ? 'Perforated HDPE/PVC drains & gravel' : 'Indoor floor scupper traps',
          ],
      durationDays: d4,
      dependencies: ['Stage 3'],
      qualityControlPoints: isExistingSlab
        ? ['RH/moisture reading within manufacturer limits prior to surfacing']
        : [
            'Sub-base compacted in layers to ≥95% Proctor density',
            'Drainage slope verified with flow test before backfill',
          ],
    },
    {
      order: 5,
      id: 'stage-5',
      title: hasConcreteSlab
        ? 'Reinforced concrete slab & curing'
        : isExistingSlab
        ? 'Equipment anchor pads & edge kerbs'
        : bom.groundSystem === 'asphalt_base'
        ? 'Hot-mix asphalt binder & wearing deck'
        : 'Base bedding & perimeter retaining kerbs',
      description: hasConcreteSlab
        ? `Place lean blinding concrete, fix steel reinforcement mesh & anchor templates, pour C25/30 slab (${bom.assumptions.slabThicknessM.toFixed(2)} m), power-trowel, and cure.`
        : bom.groundSystem === 'asphalt_base'
        ? `Pave 50 mm binder + 30 mm fine sports asphalt wearing deck with laser screed and tandem roller compaction.`
        : bom.groundSystem === 'sand_court'
        ? `Set perimeter chamfered retaining kerbs and install ground sleeves for nets/posts.`
        : `Fine-grade ${bom.groundSystemLabel.toLowerCase()} bedding/shock-pad layers and cast discrete goal/hoop/mast footings.`,
      requiredMaterials: hasConcreteSlab
        ? ['C12/15 blinding & C25/30 concrete', 'Welded mesh & anchor templates', 'Curing sheets']
        : [bom.groundSystemLabel + ' structural bedding materials', 'Goal/mast footing concrete'],
      durationDays: d5,
      dependencies: ['Stage 4'],
      qualityControlPoints: hasConcreteSlab
        ? [
            'Concrete slump test & compressive cube samples',
            'Flatness ≤3 mm under 3 m straightedge; slab moisture verified before surfacing',
          ]
        : ['Planarity checked under 3 m straightedge; footing sleeves plumb within ±2 mm'],
    },
    {
      order: 6,
      id: 'stage-6',
      title: `Surface finishing (${bom.groundSystemLabel})`,
      description: `Install ${project.materials.surfaceType.replace(/_/g, ' ')} playing surface (${bom.playingAreaM2} m²) and perimeter run-off (${bom.apronAreaM2} m²).`,
      requiredMaterials: [
        `Primary playing surface system (${project.materials.surfaceType.replace(/_/g, ' ')})`,
        'Safety apron finish / edge trim',
      ],
      durationDays: d6,
      dependencies: ['Stage 5'],
      qualityControlPoints: [
        'Base dryness/compaction sign-off prior to top-surface installation',
        'Uniform ball rebound, shock absorption & slip resistance tested',
      ],
    },
    {
      order: 7,
      id: 'stage-7',
      title: `Sport line markings (${bom.activeSportsSummary})`,
      description:
        bom.groundSystem === 'sand_court'
          ? `Anchor tensioned 50 mm UV boundary webbing lines for ${project.dimensions.lengthM.toFixed(1)} × ${project.dimensions.widthM.toFixed(1)} m sand court.`
          : `Set out and apply ${bom.markingLinearM} linear m of regulation lines (${spec.shortLabel}) plus ${bom.paintedZoneAreaM2} m² of painted zone coats.`,
      requiredMaterials: [
        `${bom.activeSportsSummary} line marking system`,
        'Zone colour coat / precision layout templates',
      ],
      durationDays: d7,
      dependencies: ['Stage 6'],
      qualityControlPoints: [
        'Line width verified (±2 mm); diagonal & arc radii checked against federation spec',
        'Color differentiation verified across multi-sport layers',
      ],
    },
    {
      order: 8,
      id: 'stage-8',
      title: 'Installation of goals, hoops, nets & fixtures',
      description: `Erect ${bom.hoopCount} hoop(s), ${bom.goalCount} goal(s), ${bom.netCount} net system(s), and court-side benches/dugouts/bleachers.`,
      requiredMaterials: [
        'Hoops, goals, net posts & safety padding (as configured)',
        'Benches, dugouts, scorer table, bleachers & ball racks',
      ],
      durationDays: d8,
      dependencies: ['Stage 5', 'Stage 7'],
      qualityControlPoints: [
        'Rim/crossbar/net top heights calibrated to regulation (±3 mm)',
        'Anchor bolts torqued and safety padding fitted before handover',
      ],
    },
    {
      order: 9,
      id: 'stage-9',
      title: 'Lighting and perimeter fencing',
      description:
        bom.lightingMastCount > 0 || bom.fenceTotalLengthM > 0
          ? `Erect ${bom.lightingMastCount} floodlight mast(s), pull armoured cable, commission LED optics, and install ${bom.fenceTotalLengthM} m ball-stop fencing.`
          : 'Install indoor arena lighting circuits and perimeter safety wall padding/barriers.',
      requiredMaterials: [
        bom.lightingMastCount > 0 ? 'Floodlight masts, LED heads & armoured cable' : 'Indoor LED high-bay fixtures',
        bom.fenceTotalLengthM > 0 ? 'Ball-stop fencing, posts & access gate' : 'Perimeter trim hardware',
      ],
      durationDays: d9,
      dependencies: ['Stage 5'],
      qualityControlPoints: [
        'Earth resistance & RCD breaker safety test certified by electrician',
        'Evening lux uniformity & glare check; fence tension and gate latch tested',
      ],
    },
    {
      order: 10,
      id: 'stage-10',
      title: 'Final inspection and handover',
      description: `Complete full geometric, structural, electrical, and playability punch-list walk-through; deliver as-built drawings and maintenance manual to ${project.client || 'client'}.`,
      requiredMaterials: ['As-built drawings', 'Maintenance & warranty dossier'],
      durationDays: d10,
      dependencies: ['Stage 7', 'Stage 8', 'Stage 9'],
      qualityControlPoints: [
        'Zero ponding test after wash-down (outdoor facilities)',
        'Final dimensional sign-off & client handover certificate executed',
      ],
    },
  ];

  let cursor = 1;
  const stages: ConstructionStage[] = [];
  for (const s of rawStages) {
    let startDay = cursor;
    if (s.order === 9) {
      const stage8 = stages.find((x) => x.order === 8);
      startDay = stage8 ? stage8.startDay : cursor;
    }
    const endDay = startDay + s.durationDays - 1;
    stages.push({ ...s, startDay, endDay });
    cursor = Math.max(cursor, endDay + 1);
  }

  const totalDurationDays = stages.reduce((max, s) => Math.max(max, s.endDay), 0);

  return {
    totalDurationDays,
    stages,
    validationNotice: ENGINEERING_VALIDATION_NOTICE,
  };
}
