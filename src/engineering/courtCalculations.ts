import {
  COURT_STANDARDS,
  defaultCostConfig,
  defaultEngineeringAssumptions,
  SURFACE_PRESETS,
} from '../constants/courtStandards';
import { CourtProject, EngineeringAssumptions } from '../types/court';

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
  playingAreaM2: number;
  apronAreaM2: number;
  totalSlabAreaM2: number;
  clearingAreaM2: number;
  slabPerimeterM: number;
  markingLinearM: number;
  paintedZoneAreaM2: number;
  hoopCount: number;
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
  'All quantities, slab thicknesses, foundation depths, drainage slopes, and schedules are preliminary planning estimates derived from the 3D configuration. Structural reinforcement, concrete mix grade, soil bearing capacity, wind loads on lighting/hoop foundations, and electrical grounding must be validated by a licensed civil/structural engineer prior to construction.';

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
  const spec = COURT_STANDARDS[project.standard];
  const { lengthM, widthM, isHalfCourt } = project.dimensions;
  const ends = isHalfCourt ? 1 : 2;

  const effKeyLen = Math.min(spec.keyLengthM, isHalfCourt ? lengthM * 0.78 : lengthM * 0.44);
  const effKeyWid = Math.min(spec.keyWidthM, widthM * 0.48);
  const ftRadius = Math.min(spec.freeThrowRadiusM, effKeyWid / 2);
  const ccRadius = Math.min(spec.centerCircleRadiusM, widthM * 0.25);

  const boundaryLen = 2 * (lengthM + widthM);
  const keyPerimeterLen = ends * (2 * effKeyLen + effKeyWid);
  const ftArcLen = ends * Math.PI * ftRadius;
  const centerLen = isHalfCourt ? 0 : widthM + 2 * Math.PI * ccRadius;

  // 3-point arc + parallel corner lines (exact match to 3D geometry)
  const basketOff = Math.min(spec.basketCenterFromBaselineM, lengthM * 0.2);
  const maxArcRForLength = isHalfCourt
    ? Math.max(2.5, lengthM - basketOff - 0.45)
    : Math.max(2.5, lengthM * 0.48);
  const effR3 = Math.min(spec.threePointRadiusM, maxArcRForLength);
  const dy = Math.max(1.0, Math.min(widthM / 2 - spec.threePointCornerInsetM, effR3 - 0.15));
  const clampedSin = Math.min(0.999, dy / Math.max(1, effR3));
  const halfAngle = Math.asin(clampedSin);
  const cornerXOffset = Math.sqrt(Math.max(0, effR3 ** 2 - dy ** 2));
  const straightCornerLen = Math.max(0.2, basketOff + cornerXOffset);
  const threePtLen = ends * (2 * straightCornerLen + 2 * halfAngle * effR3);

  const markingLinearM = round1(boundaryLen + keyPerimeterLen + ftArcLen + centerLen + threePtLen);
  const keyArea = ends * (effKeyLen * effKeyWid);
  const centerCircleArea = isHalfCourt ? 0 : Math.PI * ccRadius ** 2;
  const paintedZoneAreaM2 = round1(keyArea + centerCircleArea);

  return { markingLinearM, paintedZoneAreaM2 };
}

export function computeBom(project: CourtProject): BomSummary {
  const assumptions =
    project.engineeringAssumptions ?? defaultEngineeringAssumptions(project.environment);
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

  const { markingLinearM, paintedZoneAreaM2 } = computeCourtMarkingStats(project);

  const hoops = project.objects.filter((o) => o.type === 'hoop_assembly' && o.visible);
  const lightingMasts = project.objects.filter((o) => o.type === 'lighting_mast' && o.visible);
  const fences = project.objects.filter((o) => o.type === 'perimeter_fence' && o.visible);
  const benches = project.objects.filter((o) => o.type === 'player_bench' && o.visible);
  const scorers = project.objects.filter((o) => o.type === 'scorer_table' && o.visible);
  const scoreboards = project.objects.filter((o) => o.type === 'scoreboard' && o.visible);
  const bleachers = project.objects.filter((o) => o.type === 'bleachers' && o.visible);
  const ballRacks = project.objects.filter((o) => o.type === 'ball_rack' && o.visible);

  const hoopCount = hoops.length;
  const lightingMastCount = lightingMasts.length;
  const fenceTotalLengthM = round1(
    fences.reduce((sum, f) => sum + (f.metadata?.fenceLengthM ?? totalL * 0.72), 0)
  );

  const surfacePreset =
    SURFACE_PRESETS.find((s) => s.id === project.materials.surfaceType) ?? SURFACE_PRESETS[0];

  const isOutdoor = project.environment === 'outdoor';
  const isWood =
    project.materials.surfaceType === 'hardwood_maple' ||
    project.materials.surfaceType === 'hardwood_dark';

  const items: BomItem[] = [];

  // 1. Earthworks
  const topsoilStrippingM3 = round2(clearingAreaM2 * (isOutdoor ? 0.15 : 0.08));
  items.push({
    id: 'ew-clearing',
    categoryId: 'earthworks',
    categoryLabel: 'Earthworks',
    name: 'Site clearing, grubbing & laser grading',
    specification: `Gross slab + 0.60 m perimeter working strip`,
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
    specification: isOutdoor ? '0.15 m organic layer removal' : '0.08 m leveling trim',
    quantity: topsoilStrippingM3,
    unit: 'm³',
    basis: `${clearingAreaM2} m² × ${isOutdoor ? '0.15' : '0.08'} m`,
    costSection: 'materials',
    defaultUnitPriceFcfa: 3200,
  });

  // 2. Excavation
  const slabExcavationM3 = round2(totalSlabAreaM2 * assumptions.excavationDepthM);
  const footingExcavationM3 = round2(
    hoopCount * (0.9 * 0.9 * 1.1) +
      lightingMastCount * (0.75 * 0.75 * 1.2) +
      (fenceTotalLengthM > 0 ? Math.ceil(fenceTotalLengthM / 2.5 + 1) * (0.35 * 0.35 * 0.7) : 0) +
      (isOutdoor ? slabPerimeterM * 0.4 * 0.5 : 0)
  );
  items.push({
    id: 'ex-bulk',
    categoryId: 'excavation',
    categoryLabel: 'Excavation',
    name: 'Subgrade box excavation',
    specification: `Target cut depth ${assumptions.excavationDepthM.toFixed(2)} m`,
    quantity: slabExcavationM3,
    unit: 'm³',
    basis: `${totalSlabAreaM2} m² × ${assumptions.excavationDepthM.toFixed(2)} m`,
    costSection: 'materials',
    defaultUnitPriceFcfa: 4500,
  });
  items.push({
    id: 'ex-footings',
    categoryId: 'excavation',
    categoryLabel: 'Excavation',
    name: 'Footing & perimeter trench excavation',
    specification: `${hoopCount} hoop, ${lightingMastCount} mast, fence & drain trenches`,
    quantity: footingExcavationM3,
    unit: 'm³',
    basis: 'Foundation pads + drain trench geometry',
    costSection: 'materials',
    defaultUnitPriceFcfa: 5800,
  });

  // 3. Foundation Materials
  const geotextileM2 = round1(totalSlabAreaM2 * 1.08);
  const subBaseM3 = round2(totalSlabAreaM2 * assumptions.subBaseThicknessM * 1.2); // 1.20 compaction bulking
  const sandLevelingM3 = round2(totalSlabAreaM2 * 0.04 * wasteFactor);
  items.push({
    id: 'fd-geotextile',
    categoryId: 'foundation',
    categoryLabel: 'Foundation Materials',
    name: 'Non-woven separation geotextile & vapour barrier',
    specification: 'Polyethylene/geotextile membrane (8% overlap)',
    quantity: geotextileM2,
    unit: 'm²',
    basis: `${totalSlabAreaM2} m² × 1.08 overlap`,
    costSection: 'materials',
    defaultUnitPriceFcfa: 1450,
  });
  items.push({
    id: 'fd-crushed-stone',
    categoryId: 'foundation',
    categoryLabel: 'Foundation Materials',
    name: 'Compacted crushed aggregate / laterite sub-base',
    specification: `${assumptions.subBaseThicknessM.toFixed(2)} m compacted layer (incl. 20% compaction)`,
    quantity: subBaseM3,
    unit: 'm³',
    basis: `${totalSlabAreaM2} m² × ${assumptions.subBaseThicknessM.toFixed(2)} m × 1.20`,
    costSection: 'materials',
    defaultUnitPriceFcfa: 18500,
  });
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

  // 4. Concrete
  const blindingConcreteM3 = round2(totalSlabAreaM2 * 0.05 * wasteFactor);
  const structuralSlabM3 = round2(totalSlabAreaM2 * assumptions.slabThicknessM * wasteFactor);
  const footingConcreteM3 = round2(
    (hoopCount * 0.85 + lightingMastCount * 0.65 + (fenceTotalLengthM > 0 ? Math.ceil(fenceTotalLengthM / 2.5 + 1) * 0.09 : 0)) *
      wasteFactor
  );
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
  items.push({
    id: 'cc-footings',
    categoryId: 'concrete',
    categoryLabel: 'Concrete',
    name: 'Footing concrete for hoops, poles & fence posts (C25/30)',
    specification: `${hoopCount} hoop pads, ${lightingMastCount} mast pads`,
    quantity: footingConcreteM3,
    unit: 'm³',
    basis: 'Discrete pad footing volumes',
    costSection: 'materials',
    defaultUnitPriceFcfa: 82000,
  });

  // 5. Reinforcement
  const meshKg = round1(totalSlabAreaM2 * 4.4 * wasteFactor); // ~4.4 kg/m2 single welded mesh layer
  const footingRebarKg = round1((hoopCount * 42 + lightingMastCount * 36) * wasteFactor);
  const anchorSetCount = hoopCount + lightingMastCount;
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
  if (footingRebarKg > 0) {
    items.push({
      id: 'rf-footing-rebar',
      categoryId: 'reinforcement',
      categoryLabel: 'Reinforcement',
      name: 'High-yield deformed rebar cages for footings (HA10/HA12)',
      specification: 'Stanchion & mast pad reinforcement cages',
      quantity: footingRebarKg,
      unit: 'kg',
      basis: `${hoopCount} hoops + ${lightingMastCount} masts`,
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
      basis: '1 template assembly per hoop/mast',
      costSection: 'materials',
      defaultUnitPriceFcfa: 38000,
    });
  }

  // 6. Surface Finishing
  items.push({
    id: 'sf-playing',
    categoryId: 'surface_finishing',
    categoryLabel: 'Surface Finishing',
    name: `Primary court surface (${surfacePreset.label})`,
    specification: isWood
      ? 'Kiln-dried maple strip flooring + shock-absorbing batten subfloor & PU seal'
      : project.materials.surfaceType === 'modular_tile'
      ? 'Interlocking suspended polypropylene sports tiles + edge ramps'
      : 'Multi-coat elastomeric cushioned acrylic sports surfacing system',
    quantity: round1(playingAreaM2 * 1.05),
    unit: 'm²',
    basis: `${playingAreaM2} m² playing area + 5% cut waste`,
    costSection: 'materials',
    defaultUnitPriceFcfa: isWood
      ? 48000
      : project.materials.surfaceType === 'modular_tile'
      ? 22000
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

  // 7. Paint and Court Markings
  const zonePaintLitres = round1(paintedZoneAreaM2 * 0.35 * 1.1); // 2 coats ~0.35 L/m2 total
  const linePaintLitres = round1(Math.max(2, markingLinearM * 0.05 * 0.45 * 1.15));
  const maskingTapeRolls = Math.max(2, Math.ceil((markingLinearM * 2) / 50));
  items.push({
    id: 'pm-key-paint',
    categoryId: 'paint_markings',
    categoryLabel: 'Paint & Court Markings',
    name: 'Key & centre circle pigmented sports coating (2 coats)',
    specification: `Colour ${project.materials.paintColor} polyurethane/acrylic coat`,
    quantity: zonePaintLitres,
    unit: 'L',
    basis: `${paintedZoneAreaM2} m² painted zones`,
    costSection: 'materials',
    defaultUnitPriceFcfa: 7500,
  });
  items.push({
    id: 'pm-line-paint',
    categoryId: 'paint_markings',
    categoryLabel: 'Paint & Court Markings',
    name: 'High-contrast 5 cm court line marking paint',
    specification: `Colour ${project.materials.lineColor} · ${markingLinearM.toFixed(1)} linear m`,
    quantity: linePaintLitres,
    unit: 'L',
    basis: `${markingLinearM.toFixed(1)} m × 0.05 m markings`,
    costSection: 'materials',
    defaultUnitPriceFcfa: 8500,
  });
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

  // 8. Basketball Hoops, Backboards & Court Equipment
  if (hoopCount > 0) {
    const glassCount = hoops.filter(
      (h) => (h.metadata?.backboardType ?? 'tempered_glass') === 'tempered_glass'
    ).length;
    const otherHoopCount = hoopCount - glassCount;
    if (glassCount > 0) {
      items.push({
        id: 'hb-glass-hoop',
        categoryId: 'hoops_backboards',
        categoryLabel: 'Basketball Hoops & Backboards',
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
        categoryLabel: 'Basketball Hoops & Backboards',
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
  const ancillaryCount = benches.length + scorers.length + scoreboards.length + bleachers.length + ballRacks.length;
  if (benches.length > 0) {
    items.push({
      id: 'eq-benches',
      categoryId: 'hoops_backboards',
      categoryLabel: 'Basketball Hoops & Backboards',
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
      categoryLabel: 'Basketball Hoops & Backboards',
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
      categoryLabel: 'Basketball Hoops & Backboards',
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
      categoryLabel: 'Basketball Hoops & Backboards',
      name: 'Steel rolling ball rack & match basketballs',
      specification: 'Tubular rack + 6 regulation composite balls',
      quantity: ballRacks.length,
      unit: 'set',
      basis: 'Counted from 3D scene',
      costSection: 'materials',
      defaultUnitPriceFcfa: 145000,
    });
  }

  // 9. Lighting
  if (lightingMastCount > 0) {
    const cableLenM = round1(lightingMastCount * 22 + slabPerimeterM * 0.5);
    items.push({
      id: 'lt-masts',
      categoryId: 'lighting',
      categoryLabel: 'Lighting',
      name: 'Galvanized 6.5 m floodlight masts + dual 300 W LED heads',
      specification: 'IP66 stadium optics + weatherproof junction box',
      quantity: lightingMastCount,
      unit: 'mast',
      basis: 'Counted from 3D lighting poles',
      costSection: 'materials',
      defaultUnitPriceFcfa: 680000,
    });
    items.push({
      id: 'lt-cable',
      categoryId: 'lighting',
      categoryLabel: 'Lighting',
      name: 'Armoured underground power cable & HDPE conduit + breaker',
      specification: '3×4 mm² U1000 R2V + earthing rod kit',
      quantity: cableLenM,
      unit: 'm',
      basis: 'Perimeter routing + mast drops',
      costSection: 'materials',
      defaultUnitPriceFcfa: 3800,
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
    items.push({
      id: 'fn-mesh',
      categoryId: 'fencing',
      categoryLabel: 'Fencing',
      name: 'PVC-coated galvanized chain-link ball-stop mesh (3.2 m high)',
      specification: '50×50 mm mesh + top/mid/bottom tension rails',
      quantity: fenceTotalLengthM,
      unit: 'm',
      basis: 'Summed from 3D fence spans',
      costSection: 'materials',
      defaultUnitPriceFcfa: 28000,
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
      defaultUnitPriceFcfa: 24500,
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

  // 11. Drainage
  if (isOutdoor) {
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
  } else {
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

  // Add informative engineering notes
  const engineeringNotes = [
    `Slab footprint: ${totalL.toFixed(2)} × ${totalW.toFixed(2)} m (${totalSlabAreaM2.toFixed(1)} m²) comprising ${playingAreaM2.toFixed(1)} m² playing court and ${apronAreaM2.toFixed(1)} m² safety apron.`,
    `Structural concrete assumption: ${assumptions.slabThicknessM.toFixed(2)} m reinforced C25/30 slab over ${assumptions.subBaseThicknessM.toFixed(2)} m compacted aggregate base (excavation depth ${assumptions.excavationDepthM.toFixed(2)} m, waste factor ${assumptions.wasteFactorPct}%).`,
    `Active 3D equipment counted: ${hoopCount} hoop(s), ${lightingMastCount} lighting mast(s), ${fenceTotalLengthM.toFixed(1)} m perimeter fencing, ${ancillaryCount} ancillary court fixture(s).`,
    isHalfCourt
      ? 'Half-court layout applied: markings and single-end key/3-point geometry reflect half-court configuration.'
      : 'Full-court layout applied: dual-end markings, centre circle, and full-length run-off geometry included.',
  ];

  return {
    assumptions,
    playingAreaM2,
    apronAreaM2,
    totalSlabAreaM2,
    clearingAreaM2,
    slabPerimeterM,
    markingLinearM,
    paintedZoneAreaM2,
    hoopCount,
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
  const areaScale = Math.max(0.45, bom.totalSlabAreaM2 / 608); // normalized to FIBA 32x19 m

  const labourAndOverheadItems: Array<Omit<BomItem, 'categoryId' | 'categoryLabel'>> = [
    {
      id: 'lb-civil-crew',
      name: 'Earthworks, masonry & concrete crew',
      specification: 'Formwork, sub-base compaction, steel fixing & slab pour',
      quantity: Math.max(8, Math.round(22 * areaScale)),
      unit: 'crew-day',
      basis: 'Scaled by slab area',
      costSection: 'labour',
      defaultUnitPriceFcfa: 65000,
    },
    {
      id: 'lb-surfacing-team',
      name: 'Specialist court surfacing & line-marking technicians',
      specification: 'Coating/hardwood installation & FIBA/NBA tolerance striping',
      quantity: Math.max(3, Math.round(7 * areaScale)),
      unit: 'crew-day',
      basis: 'Scaled by court area',
      costSection: 'labour',
      defaultUnitPriceFcfa: 75000,
    },
    {
      id: 'lb-mep-install',
      name: 'Hoop rigging, electrical lighting & fencing installers',
      specification: 'Plumb alignment, anchor torquing & electrical hookup',
      quantity: Math.max(2, Math.round(2 + bom.hoopCount + bom.lightingMastCount * 0.5 + (bom.fenceTotalLengthM > 0 ? 2 : 0))),
      unit: 'crew-day',
      basis: 'Driven by 3D equipment count',
      costSection: 'labour',
      defaultUnitPriceFcfa: 68000,
    },
    {
      id: 'eq-heavy-plant',
      name: 'Mini-excavator, tipper & vibratory plate compactor hire',
      specification: 'Earthmoving & base compaction machinery',
      quantity: Math.max(2, Math.round((isOutdoor ? 6 : 3) * areaScale)),
      unit: 'day',
      basis: 'Earthwork & foundation phase',
      costSection: 'equipment',
      defaultUnitPriceFcfa: 135000,
    },
    {
      id: 'eq-concrete-tools',
      name: 'Concrete mixer/pump, poker vibrator & power trowel hire',
      specification: 'Slab placement & laser leveling tools',
      quantity: Math.max(2, Math.round(3 * areaScale)),
      unit: 'day',
      basis: 'Concrete pour & finishing',
      costSection: 'equipment',
      defaultUnitPriceFcfa: 95000,
    },
    {
      id: 'tr-materials',
      name: 'Aggregate, cement, steel & sports equipment haulage',
      specification: 'Truck deliveries to project site',
      quantity: Math.max(3, Math.round(6 * areaScale + (bom.hoopCount > 0 ? 1 : 0))),
      unit: 'trip',
      basis: 'Bulk material & fixture trips',
      costSection: 'transport',
      defaultUnitPriceFcfa: 75000,
    },
    {
      id: 'ad-survey-eng',
      name: 'Topographic setting-out, soil check & engineering sign-off',
      specification: 'Pre-construction verification & concrete cube testing',
      quantity: 1,
      unit: 'lump sum',
      basis: 'Per project site',
      costSection: 'additional',
      defaultUnitPriceFcfa: 350000,
    },
    {
      id: 'ad-site-logistics',
      name: 'Site safety hoarding, water supply & curing protection',
      specification: 'Temporary works & 14-day slab curing sheets',
      quantity: 1,
      unit: 'lump sum',
      basis: 'Construction period allowance',
      costSection: 'additional',
      defaultUnitPriceFcfa: 180000,
    },
  ];

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
  const areaScale = Math.max(0.6, bom.totalSlabAreaM2 / 608);
  const isOutdoor = project.environment === 'outdoor';
  const isWood =
    project.materials.surfaceType === 'hardwood_maple' ||
    project.materials.surfaceType === 'hardwood_dark';
  const spec = COURT_STANDARDS[project.standard];

  const d1 = 2;
  const d2 = Math.max(2, Math.round(2 * areaScale));
  const d3 = Math.max(2, Math.round((isOutdoor ? 4 : 2) * areaScale));
  const d4 = Math.max(2, Math.round((isOutdoor ? 4 : 3) * areaScale));
  const d5 = Math.max(4, Math.round(5 * areaScale)) + 7; // includes initial 7-day curing before surface finish
  const d6 = isWood ? Math.max(4, Math.round(6 * areaScale)) : Math.max(3, Math.round(4 * areaScale));
  const d7 = 2;
  const d8 = Math.max(1, Math.ceil(bom.hoopCount * 0.8 + (bom.bleacherCount > 0 ? 1 : 0)));
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
      description: `Verify parcel boundaries, orientation (${project.dimensions.orientationDeg}°), utility clearances, soil conditions, and stake out ${(project.dimensions.lengthM + project.dimensions.apronM * 2).toFixed(2)} × ${(project.dimensions.widthM + project.dimensions.apronM * 2).toFixed(2)} m gross slab envelope.`,
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
      title: 'Site preparation and clearing',
      description: `Clear vegetation, debris, and strip organic topsoil across ${bom.clearingAreaM2} m² gross working zone and establish temporary site access.`,
      requiredMaterials: ['Site hoarding & warning tape', 'Spoil disposal haulage'],
      durationDays: d2,
      dependencies: ['Stage 1: Site inspection and measurements'],
      qualityControlPoints: [
        'Zero organic roots or soft pockets remaining inside slab footprint',
        'Benchmark elevation pins preserved outside excavation perimeter',
      ],
    },
    {
      order: 3,
      id: 'stage-3',
      title: 'Excavation and earthworks',
      description: `Execute bulk subgrade cut (${bom.items.find((i) => i.id === 'ex-bulk')?.quantity ?? 0} m³ to ${bom.assumptions.excavationDepthM.toFixed(2)} m depth) plus discrete pad excavations for ${bom.hoopCount} hoop(s) and ${bom.lightingMastCount} mast(s).`,
      requiredMaterials: ['Mini-excavator & compactor', 'Trench shoring boards where required'],
      durationDays: d3,
      dependencies: ['Stage 2: Site preparation and clearing'],
      qualityControlPoints: [
        'Subgrade level tolerance ±15 mm prior to geotextile placement',
        'Proof-roll subgrade to confirm uniform bearing without rutting',
      ],
    },
    {
      order: 4,
      id: 'stage-4',
      title: 'Drainage and foundation',
      description: isOutdoor
        ? `Install perimeter French drainage pipes, catch basins, separation geotextile (${bom.totalSlabAreaM2} m²), and compact ${bom.assumptions.subBaseThicknessM.toFixed(2)} m crushed aggregate base.`
        : `Install indoor moisture barrier membrane, perimeter floor traps, and compact ${bom.assumptions.subBaseThicknessM.toFixed(2)} m crushed stone base.`,
      requiredMaterials: [
        'Separation geotextile & vapour barrier',
        'Crushed stone / laterite sub-base',
        isOutdoor ? 'Ø160 mm perforated PVC drain & gravel' : 'Indoor floor scupper traps',
      ],
      durationDays: d4,
      dependencies: ['Stage 3: Excavation and earthworks'],
      qualityControlPoints: [
        'Sub-base compacted in layers to ≥95% Proctor density (verified by test)',
        'Drainage slope verified (0.5%–1.0%) with water flow test before backfill',
      ],
    },
    {
      order: 5,
      id: 'stage-5',
      title: 'Concrete slab',
      description: `Place lean blinding concrete, fix steel reinforcement mesh & footing anchor templates, pour C25/30 structural slab (${bom.assumptions.slabThicknessM.toFixed(2)} m), power-trowel, saw control joints, and cure.`,
      requiredMaterials: [
        'Lean blinding & C25/30 structural concrete',
        'Welded wire mesh & footing rebar cages',
        'Galvanized anchor bolt templates & curing sheets',
      ],
      durationDays: d5,
      dependencies: ['Stage 4: Drainage and foundation'],
      qualityControlPoints: [
        'Concrete slump test & 7/28-day cylinder/cube compressive samples',
        'Surface flatness ≤3 mm under 3 m straightedge; control joints sawn within 24 h',
        'Wait for verified slab moisture & minimum cure before sports surfacing',
      ],
    },
    {
      order: 6,
      id: 'stage-6',
      title: 'Surface finishing',
      description: `Install ${project.materials.surfaceType.replace(/_/g, ' ')} playing surface (${bom.playingAreaM2} m²) and contrasting safety apron (${bom.apronAreaM2} m²) once slab moisture & cure thresholds pass.`,
      requiredMaterials: [
        'Primary playing court surface system',
        'Safety apron finish & edge trim',
      ],
      durationDays: d6,
      dependencies: ['Stage 5: Concrete slab (moisture & cure verified)'],
      qualityControlPoints: [
        'Slab moisture content verified (calcium chloride / RH test)',
        'Uniform ball rebound & slip resistance across playing surface',
      ],
    },
    {
      order: 7,
      id: 'stage-7',
      title: 'Court markings',
      description: `Mask and apply ${bom.markingLinearM} linear m of 50 mm regulation lines (${spec.shortLabel}) plus ${bom.paintedZoneAreaM2} m² of key and centre circle colour coats.`,
      requiredMaterials: [
        '5 cm court line marking paint',
        'Key & centre circle colour coating',
        'Precision UV masking tape',
      ],
      durationDays: d7,
      dependencies: ['Stage 6: Surface finishing'],
      qualityControlPoints: [
        'Line width verified at 50 mm (±2 mm); 3-point arc radius verified from hoop centre',
        'Key dimensions & free-throw line distance verified against specification',
      ],
    },
    {
      order: 8,
      id: 'stage-8',
      title: 'Installation of hoops and equipment',
      description: `Erect ${bom.hoopCount} hoop assembly/assemblies at 3.05 m rim height, fit post padding, and anchor ${bom.benchCount} bench(es), ${bom.bleacherCount} bleacher(s), and court-side fixtures.`,
      requiredMaterials: [
        'Hoops, backboards, breakaway rims & padding',
        'Benches, scorer table, bleachers & ball rack (as configured)',
      ],
      durationDays: d8,
      dependencies: ['Stage 5: Concrete slab', 'Stage 7: Court markings'],
      qualityControlPoints: [
        'Rim height calibrated to 3.05 m (±3 mm) above finished playing floor',
        'Backboard plumb & overhang offset verified against baseline marking',
        'Anchor bolts torqued to structural manufacturer specification',
      ],
    },
    {
      order: 9,
      id: 'stage-9',
      title: 'Lighting and fencing',
      description:
        bom.lightingMastCount > 0 || bom.fenceTotalLengthM > 0
          ? `Erect ${bom.lightingMastCount} floodlight mast(s), pull armoured cable, commission LED optics, and install ${bom.fenceTotalLengthM} m perimeter ball-stop fencing.`
          : `Install indoor arena lighting circuits and perimeter safety wall padding/barriers.`,
      requiredMaterials: [
        bom.lightingMastCount > 0 ? 'Floodlight masts, LED heads & armoured cable' : 'Indoor LED high-bay fixtures',
        bom.fenceTotalLengthM > 0 ? 'Chain-link fencing, posts & access gate' : 'Perimeter trim hardware',
      ],
      durationDays: d9,
      dependencies: ['Stage 5: Concrete slab'],
      qualityControlPoints: [
        'Earth resistance & RCD breaker safety test certified by electrician',
        'Evening lux uniformity & glare check; fence tension and gate latch tested',
      ],
    },
    {
      order: 10,
      id: 'stage-10',
      title: 'Final inspection and handover',
      description: `Complete full geometric, structural, electrical, and playability punch-list walk-through; deliver as-built documentation and maintenance manual to ${project.client || 'client'}.`,
      requiredMaterials: ['As-built drawings', 'Maintenance & warranty dossier'],
      durationDays: d10,
      dependencies: [
        'Stage 7: Court markings',
        'Stage 8: Installation of hoops and equipment',
        'Stage 9: Lighting and fencing',
      ],
      qualityControlPoints: [
        'Zero ponding test after wash-down (outdoor courts)',
        'Final dimensional sign-off & client handover certificate executed',
      ],
    },
  ];

  // Compute sequential/overlapping day schedule (stages 8 & 9 can overlap slightly after markings/slab)
  let cursor = 1;
  const stages: ConstructionStage[] = [];
  for (const s of rawStages) {
    let startDay = cursor;
    if (s.order === 9) {
      // Lighting & fencing can run in parallel with stage 8 once slab & markings clear
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
