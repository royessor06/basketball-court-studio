import React, { useId } from 'react';
import {
  COURT_STANDARDS,
  defaultEngineeringAssumptions,
  formatArea,
  formatLength,
  GROUND_SYSTEM_PRESETS,
} from '../../constants/courtStandards';
import { getActiveSportEquipment } from '../../engineering/courtCalculations';
import {
  buildPrimitivesForLayer,
  resolveEffectiveSportLayers,
  sampleArcPoints2D,
  transformPoint2D,
} from '../../sports/markingPrimitives';
import { CourtProject, SceneObject } from '../../types/court';

export type TechnicalSheetId =
  | 'top_plan'
  | 'dimensioned_plan'
  | 'front_elevation'
  | 'side_elevation'
  | 'equipment_plan'
  | 'safety_plan'
  | 'lighting_fencing_plan';

export type PlanVisualStyle = 'technical' | 'architectural';

export interface TechnicalSheetMeta {
  id: TechnicalSheetId;
  sheetNo: string;
  title: string;
  subtitle: string;
}

export const TECHNICAL_SHEETS: TechnicalSheetMeta[] = [
  {
    id: 'top_plan',
    sheetNo: 'A-101',
    title: 'Top-View Technical Plan',
    subtitle: 'Overall facility footprint, playing boundary & active sport layers',
  },
  {
    id: 'dimensioned_plan',
    sheetNo: 'A-102',
    title: 'Dimensioned Court / Pitch Plan',
    subtitle: 'Envelope dimensions, multi-sport linework & marking tolerances',
  },
  {
    id: 'front_elevation',
    sheetNo: 'A-201',
    title: 'Front / Endline Elevation',
    subtitle: 'Goal/hoop/net datum height, masts, fencing & ground build-up',
  },
  {
    id: 'side_elevation',
    sheetNo: 'A-202',
    title: 'Side / Sideline Elevation',
    subtitle: 'Longitudinal profile, equipment overhangs & court-side fixtures',
  },
  {
    id: 'equipment_plan',
    sheetNo: 'A-301',
    title: 'Equipment Placement Plan',
    subtitle: 'Indexed coordinates (X, Z) and orientations from 3D scene',
  },
  {
    id: 'safety_plan',
    sheetNo: 'A-401',
    title: 'Safety Clearance Plan',
    subtitle: 'Playing zone vs perimeter run-off buffer & clearance check',
  },
  {
    id: 'lighting_fencing_plan',
    sheetNo: 'A-501',
    title: 'Lighting & Fencing Plan',
    subtitle: 'Floodlight mast coverage & ball-stop fence spans',
  },
];

export function computeDrawingScaleRatio(project: CourtProject): number {
  const totalL = project.dimensions.lengthM + project.dimensions.apronM * 2;
  if (totalL <= 20) return 100;
  if (totalL <= 28) return 125;
  if (totalL <= 36) return 150;
  if (totalL <= 50) return 200;
  if (totalL <= 75) return 350;
  return 500;
}

interface TechnicalPlanSvgProps {
  project: CourtProject;
  sheet: TechnicalSheetId;
  visualStyle: PlanVisualStyle;
}

export const TechnicalPlanSvg: React.FC<TechnicalPlanSvgProps> = ({
  project,
  sheet,
  visualStyle,
}) => {
  const rawUid = useId();
  const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const gridPatternId = `cadGrid-${safeUid}`;
  const hatchPatternId = `safetyHatch-${safeUid}`;

  const spec = COURT_STANDARDS[project.standard] ?? COURT_STANDARDS.FIBA;
  const groundSystem = project.groundSystem ?? spec.defaultGroundSystem;
  const groundPreset =
    GROUND_SYSTEM_PRESETS.find((g) => g.id === groundSystem) ?? GROUND_SYSTEM_PRESETS[0];
  const assumptions =
    project.engineeringAssumptions ?? defaultEngineeringAssumptions(project.environment, groundSystem);
  const { lengthM, widthM, apronM, orientationDeg } = project.dimensions;
  const totalL = lengthM + apronM * 2;
  const totalW = widthM + apronM * 2;
  const scaleRatio = computeDrawingScaleRatio(project);

  const effectiveLayers = resolveEffectiveSportLayers(project).filter((l) => l.visible);
  const equipmentObjects = getActiveSportEquipment(project);
  const taggedEquipment = equipmentObjects.map((obj, idx) => ({
    obj,
    tag: `E${idx + 1}`,
  }));

  const maxPoleHeight = equipmentObjects
    .filter((o) => o.type === 'lighting_mast')
    .reduce((m, o) => Math.max(m, o.metadata?.poleHeightM ?? (totalL > 55 ? 12 : 6.5)), 6.5);
  const elevationMaxH = Math.max(7.8, maxPoleHeight + 1.5);

  const isTech = visualStyle === 'technical';
  const palette = isTech
    ? {
        bg: '#09111E',
        grid: '#142642',
        slabFill: '#0F1C32',
        slabStroke: '#38BDF8',
        courtFill: '#122544',
        paintFill: '#1E3A66',
        line: '#E6F2FF',
        dim: '#38BDF8',
        accent: '#F07827',
        safetyHatch: '#F07827',
        text: '#E6F2FF',
        muted: '#8DA9C8',
        frame: '#26446E',
      }
    : {
        bg: '#F4F5F7',
        grid: '#E2E6ED',
        slabFill: '#E5E8EE',
        slabStroke: '#475569',
        courtFill: project.materials.surfaceColor,
        paintFill: project.materials.paintColor,
        line: '#111827',
        dim: '#0F5E9C',
        accent: '#D95D16',
        safetyHatch: '#0F5E9C',
        text: '#0F172A',
        muted: '#475569',
        frame: '#94A3B8',
      };

  const VW = 1000;
  const VH = 620;
  const drawArea = { x: 75, y: 46, w: 850, h: 465 };

  const padL = totalL + Math.max(4.5, totalL * 0.09);
  const padW = totalW + Math.max(4.5, totalW * 0.12);
  const pxPerMPlan = Math.min(drawArea.w / padL, drawArea.h / padW);
  const cx = drawArea.x + drawArea.w / 2;
  const cy = drawArea.y + drawArea.h / 2;

  const toX = (mx: number) => cx + mx * pxPerMPlan;
  const toZ = (mz: number) => cy + mz * pxPerMPlan;

  const isElevation = sheet === 'front_elevation' || sheet === 'side_elevation';
  const elevSpan = sheet === 'front_elevation' ? totalW + Math.max(4, totalW * 0.1) : totalL + Math.max(4, totalL * 0.1);
  const elevPxPerM = Math.min(drawArea.w / elevSpan, (drawArea.h - 40) / elevationMaxH);
  const activePxPerM = isElevation ? elevPxPerM : pxPerMPlan;

  const scaleBarUnits = project.unit === 'ft' ? (totalL > 60 ? 50 : 15) : totalL > 60 ? 20 : 5;
  const scaleBarMeters = project.unit === 'ft' ? scaleBarUnits / 3.28084 : scaleBarUnits;
  const scaleBarPx = Math.max(36, Math.min(180, scaleBarMeters * activePxPerM));

  const sheetMeta = TECHNICAL_SHEETS.find((s) => s.id === sheet) ?? TECHNICAL_SHEETS[0];

  const renderPlanCourtLines = () => {
    const hl = lengthM / 2;
    const hw = widthM / 2;

    return (
      <g>
        {/* Gross Slab / Pitch Footprint */}
        <rect
          x={toX(-totalL / 2)}
          y={toZ(-totalW / 2)}
          width={totalL * pxPerMPlan}
          height={totalW * pxPerMPlan}
          fill={palette.slabFill}
          stroke={palette.slabStroke}
          strokeWidth={1.6}
        />

        {/* Safety zone hatching if safety_plan */}
        {sheet === 'safety_plan' && (
          <rect
            x={toX(-totalL / 2)}
            y={toZ(-totalW / 2)}
            width={totalL * pxPerMPlan}
            height={totalW * pxPerMPlan}
            fill={`url(#${hatchPatternId})`}
            opacity={0.45}
          />
        )}

        {/* Playing surface */}
        <rect
          x={toX(-hl)}
          y={toZ(-hw)}
          width={lengthM * pxPerMPlan}
          height={widthM * pxPerMPlan}
          fill={palette.courtFill}
          fillOpacity={isTech ? 1 : 0.86}
          stroke={palette.line}
          strokeWidth={1.6}
        />

        {/* Dynamic Sport Marking Layers */}
        {effectiveLayers.map((layer, layerIdx) => {
          const primitives = buildPrimitivesForLayer(layer);
          const layerStroke =
            isTech
              ? layerIdx === 0
                ? palette.line
                : layer.lineColor
              : effectiveLayers.length > 1
              ? layer.lineColor
              : palette.line;
          const layerPaint =
            layer.paintColor ?? (isTech ? palette.paintFill : project.materials.paintColor);

          const toSvgPt = (lx: number, lz: number): [number, number] => {
            const [wx, wz] = transformPoint2D(lx, lz, layer);
            return [toX(wx), toZ(wz)];
          };

          const strokeW = Math.max(1.1, Math.min(2.6, layer.lineWidthM * pxPerMPlan * 1.4));

          return (
            <g key={layer.id}>
              {/* Paint pass first */}
              {primitives
                .filter((p) => p.role === 'paint')
                .map((p, idx) => {
                  if (p.kind === 'rect') {
                    const corners = [
                      toSvgPt(p.x - p.w / 2, p.z - p.h / 2),
                      toSvgPt(p.x + p.w / 2, p.z - p.h / 2),
                      toSvgPt(p.x + p.w / 2, p.z + p.h / 2),
                      toSvgPt(p.x - p.w / 2, p.z + p.h / 2),
                    ];
                    return (
                      <polygon
                        key={`p-rect-${idx}`}
                        points={corners.map((c) => c.join(',')).join(' ')}
                        fill={layerPaint}
                        fillOpacity={isTech ? 0.55 : 0.48}
                      />
                    );
                  }
                  if (p.kind === 'circle') {
                    const [sx, sz] = toSvgPt(p.cx, p.cz);
                    return (
                      <circle
                        key={`p-circ-${idx}`}
                        cx={sx}
                        cy={sz}
                        r={p.r * pxPerMPlan}
                        fill={layerPaint}
                        fillOpacity={isTech ? 0.5 : 0.38}
                      />
                    );
                  }
                  if (p.kind === 'arc') {
                    const pts = sampleArcPoints2D(p.cx, p.cz, p.r, p.startAngle, p.endAngle, 28);
                    const [ocx, ocz] = toSvgPt(p.cx, p.cz);
                    const mapped = pts.map(([ax, az]) => toSvgPt(ax, az));
                    const d = `M ${ocx} ${ocz} ` + mapped.map(([x, z]) => `L ${x} ${z}`).join(' ') + ' Z';
                    return (
                      <path
                        key={`p-arc-${idx}`}
                        d={d}
                        fill={layerPaint}
                        fillOpacity={isTech ? 0.45 : 0.38}
                      />
                    );
                  }
                  return null;
                })}

              {/* Line pass */}
              {primitives
                .filter((p) => p.role === 'line')
                .map((p, idx) => {
                  if (p.kind === 'line') {
                    const [x1, y1] = toSvgPt(p.x1, p.z1);
                    const [x2, y2] = toSvgPt(p.x2, p.z2);
                    const dashAttr = p.dashed
                      ? `${Math.max(3, p.dashed[0] * pxPerMPlan)} ${Math.max(3, p.dashed[1] * pxPerMPlan)}`
                      : undefined;
                    return (
                      <line
                        key={`l-seg-${idx}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={layerStroke}
                        strokeWidth={strokeW}
                        strokeDasharray={dashAttr}
                      />
                    );
                  }
                  if (p.kind === 'rect') {
                    const corners = [
                      toSvgPt(p.x - p.w / 2, p.z - p.h / 2),
                      toSvgPt(p.x + p.w / 2, p.z - p.h / 2),
                      toSvgPt(p.x + p.w / 2, p.z + p.h / 2),
                      toSvgPt(p.x - p.w / 2, p.z + p.h / 2),
                    ];
                    return (
                      <polygon
                        key={`l-rect-${idx}`}
                        points={corners.map((c) => c.join(',')).join(' ')}
                        fill="none"
                        stroke={layerStroke}
                        strokeWidth={strokeW}
                      />
                    );
                  }
                  if (p.kind === 'circle') {
                    const [sx, sz] = toSvgPt(p.cx, p.cz);
                    return (
                      <circle
                        key={`l-circ-${idx}`}
                        cx={sx}
                        cy={sz}
                        r={Math.max(1.2, p.r * pxPerMPlan)}
                        fill={p.filled ? layerStroke : 'none'}
                        stroke={layerStroke}
                        strokeWidth={strokeW}
                      />
                    );
                  }
                  if (p.kind === 'arc') {
                    const pts = sampleArcPoints2D(p.cx, p.cz, p.r, p.startAngle, p.endAngle, 32);
                    const mapped = pts.map(([ax, az]) => toSvgPt(ax, az));
                    const d = mapped
                      .map(([x, z], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${z.toFixed(2)}`)
                      .join(' ');
                    const dashAttr = p.dashed
                      ? `${Math.max(3, p.dashed[0] * pxPerMPlan)} ${Math.max(3, p.dashed[1] * pxPerMPlan)}`
                      : undefined;
                    return (
                      <path
                        key={`l-arc-${idx}`}
                        d={d}
                        fill="none"
                        stroke={layerStroke}
                        strokeWidth={strokeW}
                        strokeDasharray={dashAttr}
                      />
                    );
                  }
                  return null;
                })}
            </g>
          );
        })}
      </g>
    );
  };

  const renderDimLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    color = palette.dim,
    textOffset = -6
  ) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const vertical = Math.abs(x2 - x1) < 2;
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.2} />
        <circle cx={x1} cy={y1} r={2.3} fill={color} />
        <circle cx={x2} cy={y2} r={2.3} fill={color} />
        {vertical ? (
          <text
            x={mx + textOffset}
            y={my}
            fill={color}
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
            transform={`rotate(-90 ${mx + textOffset} ${my})`}
          >
            {label}
          </text>
        ) : (
          <text
            x={mx}
            y={my + textOffset}
            fill={color}
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
          >
            {label}
          </text>
        )}
      </g>
    );
  };

  const renderEquipmentSymbols = (indexed = false, filterTypes?: SceneObject['type'][]) => {
    const list = filterTypes
      ? taggedEquipment.filter((item) => filterTypes.includes(item.obj.type))
      : taggedEquipment;

    return list.map(({ obj, tag }) => {
      const px = toX(obj.position[0]);
      const pz = toZ(obj.position[2]);
      const deg = (obj.rotationY * 180) / Math.PI;

      if (obj.type === 'perimeter_fence') {
        const span = obj.metadata?.fenceLengthM ?? totalL * 0.72;
        const halfPx = (span / 2) * pxPerMPlan;
        return (
          <g key={obj.id} transform={`translate(${px}, ${pz}) rotate(${-deg})`}>
            <line
              x1={-halfPx}
              y1={0}
              x2={halfPx}
              y2={0}
              stroke={palette.accent}
              strokeWidth={3}
              strokeDasharray="6 3"
            />
            <circle cx={-halfPx} cy={0} r={3} fill={palette.accent} />
            <circle cx={halfPx} cy={0} r={3} fill={palette.accent} />
            {indexed && (
              <text
                x={0}
                y={-8}
                fill={palette.accent}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {`${tag} (${formatLength(span, project.unit, 1)})`}
              </text>
            )}
          </g>
        );
      }

      if (obj.type === 'lighting_mast') {
        const mastR = (totalL > 55 ? 18 : 8.5) * pxPerMPlan;
        return (
          <g key={obj.id}>
            {sheet === 'lighting_fencing_plan' && (
              <circle
                cx={px}
                cy={pz}
                r={mastR}
                fill={palette.dim}
                fillOpacity={0.09}
                stroke={palette.dim}
                strokeWidth={0.9}
                strokeDasharray="4 4"
              />
            )}
            <circle
              cx={px}
              cy={pz}
              r={5}
              fill={palette.accent}
              stroke={palette.line}
              strokeWidth={1.2}
            />
            {indexed && (
              <text
                x={px + 8}
                y={pz + 3}
                fill={palette.text}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {tag}
              </text>
            )}
          </g>
        );
      }

      if (obj.type === 'hoop_assembly') {
        const reach = (obj.metadata?.extensionArmM ?? 2.05) * pxPerMPlan;
        return (
          <g key={obj.id} transform={`translate(${px}, ${pz}) rotate(${-deg})`}>
            <rect x={-4} y={-4} width={8} height={8} fill={palette.accent} />
            <line x1={0} y1={0} x2={reach} y2={0} stroke={palette.accent} strokeWidth={2.2} />
            <line
              x1={reach - 3}
              y1={-0.9 * pxPerMPlan}
              x2={reach - 3}
              y2={0.9 * pxPerMPlan}
              stroke={palette.line}
              strokeWidth={2.2}
            />
            <circle
              cx={reach + 3}
              cy={0}
              r={Math.max(2, 0.23 * pxPerMPlan)}
              fill="none"
              stroke={palette.accent}
              strokeWidth={1.5}
            />
            {indexed && (
              <text
                x={-8}
                y={-9}
                fill={palette.accent}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {tag}
              </text>
            )}
          </g>
        );
      }

      if (
        obj.type === 'football_goal' ||
        obj.type === 'handball_goal' ||
        obj.type === 'multisport_combo_goal'
      ) {
        const gw = (obj.metadata?.goalWidthM ?? (obj.type === 'football_goal' ? 7.32 : 3.0)) * pxPerMPlan;
        const gd = Math.max(6, (obj.metadata?.goalDepthM ?? 1.4) * pxPerMPlan);
        return (
          <g key={obj.id} transform={`translate(${px}, ${pz}) rotate(${-deg})`}>
            <path
              d={`M 0 ${-gw / 2} L ${-gd} ${-gw / 2} L ${-gd} ${gw / 2} L 0 ${gw / 2}`}
              fill={palette.accent}
              fillOpacity={0.22}
              stroke={palette.accent}
              strokeWidth={2}
            />
            <circle cx={0} cy={-gw / 2} r={2.4} fill={palette.line} />
            <circle cx={0} cy={gw / 2} r={2.4} fill={palette.line} />
            {indexed && (
              <text
                x={-gd - 6}
                y={-gw / 2 - 4}
                fill={palette.accent}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {tag}
              </text>
            )}
          </g>
        );
      }

      if (obj.type === 'volleyball_net' || obj.type === 'tennis_net') {
        const nw = (obj.metadata?.netWidthM ?? widthM + 1.0) * pxPerMPlan;
        return (
          <g key={obj.id} transform={`translate(${px}, ${pz}) rotate(${-deg})`}>
            <line
              x1={0}
              y1={-nw / 2}
              x2={0}
              y2={nw / 2}
              stroke={palette.accent}
              strokeWidth={2.5}
              strokeDasharray="4 2"
            />
            <circle cx={0} cy={-nw / 2} r={3.5} fill={palette.dim} stroke={palette.line} strokeWidth={1} />
            <circle cx={0} cy={nw / 2} r={3.5} fill={palette.dim} stroke={palette.line} strokeWidth={1} />
            {indexed && (
              <text
                x={6}
                y={-nw / 2 - 4}
                fill={palette.accent}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {tag}
              </text>
            )}
          </g>
        );
      }

      if (obj.type === 'corner_flag') {
        return (
          <g key={obj.id}>
            <polygon
              points={`${px},${pz - 5} ${px + 5},${pz} ${px},${pz + 5} ${px - 5},${pz}`}
              fill={palette.accent}
              stroke={palette.line}
              strokeWidth={1}
            />
            {indexed && (
              <text
                x={px + 7}
                y={pz - 4}
                fill={palette.text}
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
              >
                {tag}
              </text>
            )}
          </g>
        );
      }

      const boxW =
        obj.type === 'bleachers'
          ? Math.max(12, 6.4 * pxPerMPlan)
          : obj.type === 'dugout_shelter'
          ? Math.max(10, 4.4 * pxPerMPlan)
          : obj.type === 'player_bench'
          ? Math.max(10, 3.2 * pxPerMPlan)
          : obj.type === 'scorer_table'
          ? Math.max(9, 2.8 * pxPerMPlan)
          : 10;
      const boxH =
        obj.type === 'bleachers'
          ? Math.max(8, 1.8 * pxPerMPlan)
          : obj.type === 'dugout_shelter'
          ? Math.max(7, 1.25 * pxPerMPlan)
          : 6;

      return (
        <g key={obj.id} transform={`translate(${px}, ${pz}) rotate(${-deg})`}>
          <rect
            x={-boxW / 2}
            y={-boxH / 2}
            width={boxW}
            height={boxH}
            fill={palette.dim}
            fillOpacity={0.35}
            stroke={palette.dim}
            strokeWidth={1.2}
          />
          {indexed && (
            <text
              x={0}
              y={-boxH / 2 - 4}
              fill={palette.text}
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              {tag}
            </text>
          )}
        </g>
      );
    });
  };

  // Pick a meaningful datum height for elevation dimensioning
  const getPrimaryDatum = (): { heightM: number; label: string } => {
    const hoop = equipmentObjects.find((o) => o.type === 'hoop_assembly');
    if (hoop) return { heightM: hoop.metadata?.rimHeightM ?? 3.05, label: 'Rim' };
    const fGoal = equipmentObjects.find((o) => o.type === 'football_goal');
    if (fGoal) return { heightM: fGoal.metadata?.goalHeightM ?? 2.44, label: 'Crossbar' };
    const hGoal = equipmentObjects.find((o) => o.type === 'handball_goal' || o.type === 'multisport_combo_goal');
    if (hGoal) return { heightM: hGoal.metadata?.goalHeightM ?? 2.0, label: 'Crossbar' };
    const vNet = equipmentObjects.find((o) => o.type === 'volleyball_net');
    if (vNet) return { heightM: vNet.metadata?.netHeightM ?? 2.43, label: 'Net Top' };
    const tNet = equipmentObjects.find((o) => o.type === 'tennis_net');
    if (tNet) return { heightM: tNet.metadata?.netHeightM ?? 1.07, label: 'Post' };
    return { heightM: spec.rimHeightM || 3.05, label: 'Datum' };
  };

  const primaryDatum = getPrimaryDatum();

  const renderElevationSectionLabel = () => {
    if (groundSystem === 'existing_slab') return 'SECTION: RENOVATION SURFACING OVER EXISTING CONCRETE SLAB';
    if (groundSystem === 'synthetic_turf')
      return `SECTION: 50mm TURF + SHOCK PAD + ${(assumptions.subBaseThicknessM * 100).toFixed(0)} cm DRAINING SUB-BASE`;
    if (groundSystem === 'natural_grass')
      return 'SECTION: SPORTS TURF SOD + 15 cm ROOTZONE + DRAINAGE GRAVEL BLANKET';
    if (groundSystem === 'clay_court')
      return 'SECTION: 25mm RED BRICK CLAY + LIMESTONE BINDER + DRAINING CLINKER BASE';
    if (groundSystem === 'sand_court')
      return 'SECTION: 35 cm WASHED SILICA BEACH SAND + GEOTEXTILE + RETAINING KERBS';
    if (groundSystem === 'asphalt_base')
      return `SECTION: 80mm HOT-MIX ASPHALT + ${(assumptions.subBaseThicknessM * 100).toFixed(0)} cm CRUSHED SUB-BASE`;
    return `SECTION: ${(assumptions.slabThicknessM * 100).toFixed(0)} cm C25/30 SLAB + ${(assumptions.subBaseThicknessM * 100).toFixed(0)} cm COMPACTED BASE`;
  };

  const renderFrontElevation = () => {
    const spanX = totalW + Math.max(4, totalW * 0.1);
    const sc = Math.min(drawArea.w / spanX, (drawArea.h - 40) / elevationMaxH);
    const groundY = drawArea.y + drawArea.h - 62;
    const midX = drawArea.x + drawArea.w / 2;

    const eX = (mz: number) => midX + mz * sc;
    const eY = (my: number) => groundY - my * sc;

    const slabDepthPx = Math.max(8, assumptions.slabThicknessM * sc);
    const baseDepthPx = Math.max(8, assumptions.subBaseThicknessM * sc);
    const hoops = equipmentObjects.filter((o) => o.type === 'hoop_assembly');
    const goals = equipmentObjects.filter(
      (o) =>
        o.type === 'football_goal' ||
        o.type === 'handball_goal' ||
        o.type === 'multisport_combo_goal'
    );
    const nets = equipmentObjects.filter(
      (o) => o.type === 'volleyball_net' || o.type === 'tennis_net'
    );
    const masts = equipmentObjects.filter((o) => o.type === 'lighting_mast');
    const fences = equipmentObjects.filter((o) => o.type === 'perimeter_fence');

    return (
      <g>
        <line
          x1={drawArea.x + 20}
          y1={groundY}
          x2={drawArea.x + drawArea.w - 20}
          y2={groundY}
          stroke={palette.muted}
          strokeWidth={1.2}
          strokeDasharray="6 4"
        />
        <rect
          x={eX(-totalW / 2)}
          y={groundY}
          width={totalW * sc}
          height={slabDepthPx}
          fill={palette.slabFill}
          stroke={palette.slabStroke}
          strokeWidth={1.5}
        />
        {groundSystem !== 'existing_slab' && (
          <rect
            x={eX(-totalW / 2)}
            y={groundY + slabDepthPx}
            width={totalW * sc}
            height={baseDepthPx}
            fill={palette.grid}
            stroke={palette.muted}
            strokeWidth={1}
          />
        )}
        <line
          x1={eX(-widthM / 2)}
          y1={groundY}
          x2={eX(widthM / 2)}
          y2={groundY}
          stroke={palette.accent}
          strokeWidth={3}
        />

        {fences.length > 0 && (
          <rect
            x={eX(-totalW / 2)}
            y={eY(fences[0].metadata?.fenceHeightM ?? 3.2)}
            width={totalW * sc}
            height={(fences[0].metadata?.fenceHeightM ?? 3.2) * sc}
            fill="none"
            stroke={palette.muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {masts.map((m) => {
          const ph = m.metadata?.poleHeightM ?? (totalL > 55 ? 12 : 6.5);
          return (
            <g key={m.id}>
              <line
                x1={eX(m.position[2])}
                y1={groundY}
                x2={eX(m.position[2])}
                y2={eY(ph)}
                stroke={palette.dim}
                strokeWidth={2.5}
              />
              <rect x={eX(m.position[2]) - 7} y={eY(ph) - 4} width={14} height={5} fill={palette.dim} />
            </g>
          );
        })}

        {goals.map((g) => {
          const gw = g.metadata?.goalWidthM ?? 3.0;
          const gh = g.metadata?.goalHeightM ?? 2.0;
          return (
            <g key={g.id}>
              <rect
                x={eX(g.position[2] - gw / 2)}
                y={eY(gh)}
                width={gw * sc}
                height={gh * sc}
                fill={palette.accent}
                fillOpacity={0.14}
                stroke={palette.line}
                strokeWidth={2.2}
              />
              {g.type === 'multisport_combo_goal' && (
                <rect
                  x={eX(g.position[2] - 0.6)}
                  y={eY(3.55)}
                  width={1.2 * sc}
                  height={0.9 * sc}
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth={1.8}
                />
              )}
            </g>
          );
        })}

        {nets.map((n) => {
          const nw = n.metadata?.netWidthM ?? widthM + 1.0;
          const nh = n.metadata?.netHeightM ?? (n.type === 'tennis_net' ? 1.07 : 2.43);
          const netBottom = n.type === 'tennis_net' ? 0 : Math.max(0.2, nh - 1.0);
          return (
            <g key={n.id}>
              <line x1={eX(-nw / 2)} y1={groundY} x2={eX(-nw / 2)} y2={eY(nh)} stroke={palette.dim} strokeWidth={2.5} />
              <line x1={eX(nw / 2)} y1={groundY} x2={eX(nw / 2)} y2={eY(nh)} stroke={palette.dim} strokeWidth={2.5} />
              <rect
                x={eX(-nw / 2)}
                y={eY(nh)}
                width={nw * sc}
                height={(nh - netBottom) * sc}
                fill={palette.line}
                fillOpacity={0.15}
                stroke={palette.line}
                strokeWidth={1.4}
              />
            </g>
          );
        })}

        {hoops.map((h) => {
          const rimH = h.metadata?.rimHeightM ?? 3.05;
          const zx = eX(h.position[2]);
          const boardW = 1.8 * sc;
          const boardH = 1.05 * sc;
          const boardBottom = eY(rimH - 0.15);
          return (
            <g key={h.id}>
              <line x1={zx} y1={groundY} x2={zx} y2={eY(rimH + 0.6)} stroke={palette.accent} strokeWidth={3.5} />
              <rect
                x={zx - boardW / 2}
                y={boardBottom - boardH}
                width={boardW}
                height={boardH}
                fill={palette.paintFill}
                fillOpacity={0.3}
                stroke={palette.line}
                strokeWidth={1.8}
              />
              <line
                x1={zx - 0.23 * sc}
                y1={eY(rimH)}
                x2={zx + 0.23 * sc}
                y2={eY(rimH)}
                stroke={palette.accent}
                strokeWidth={2.6}
              />
            </g>
          );
        })}

        {renderDimLine(
          eX(-totalW / 2) - 24,
          groundY,
          eX(-totalW / 2) - 24,
          eY(primaryDatum.heightM),
          `${primaryDatum.label} ${formatLength(primaryDatum.heightM, project.unit)}`,
          palette.accent,
          -10
        )}
        {renderDimLine(
          eX(-totalW / 2),
          groundY + slabDepthPx + baseDepthPx + 22,
          eX(totalW / 2),
          groundY + slabDepthPx + baseDepthPx + 22,
          `Total Width: ${formatLength(totalW, project.unit)}`
        )}
        {renderDimLine(
          eX(-widthM / 2),
          groundY + slabDepthPx + baseDepthPx + 42,
          eX(widthM / 2),
          groundY + slabDepthPx + baseDepthPx + 42,
          `Playing Width: ${formatLength(widthM, project.unit)}`,
          palette.accent
        )}
        <text
          x={drawArea.x + 20}
          y={drawArea.y + 18}
          fill={palette.muted}
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
        >
          {renderElevationSectionLabel()}
        </text>
      </g>
    );
  };

  const renderSideElevation = () => {
    const spanX = totalL + Math.max(4, totalL * 0.1);
    const sc = Math.min(drawArea.w / spanX, (drawArea.h - 40) / elevationMaxH);
    const groundY = drawArea.y + drawArea.h - 62;
    const midX = drawArea.x + drawArea.w / 2;

    const eX = (mx: number) => midX + mx * sc;
    const eY = (my: number) => groundY - my * sc;

    const slabDepthPx = Math.max(8, assumptions.slabThicknessM * sc);
    const baseDepthPx = Math.max(8, assumptions.subBaseThicknessM * sc);
    const hoops = equipmentObjects.filter((o) => o.type === 'hoop_assembly');
    const goals = equipmentObjects.filter(
      (o) =>
        o.type === 'football_goal' ||
        o.type === 'handball_goal' ||
        o.type === 'multisport_combo_goal'
    );
    const nets = equipmentObjects.filter(
      (o) => o.type === 'volleyball_net' || o.type === 'tennis_net'
    );
    const masts = equipmentObjects.filter((o) => o.type === 'lighting_mast');
    const benches = equipmentObjects.filter((o) => o.type === 'player_bench');
    const dugouts = equipmentObjects.filter((o) => o.type === 'dugout_shelter');
    const bleachers = equipmentObjects.filter((o) => o.type === 'bleachers');

    return (
      <g>
        <line
          x1={drawArea.x + 20}
          y1={groundY}
          x2={drawArea.x + drawArea.w - 20}
          y2={groundY}
          stroke={palette.muted}
          strokeWidth={1.2}
          strokeDasharray="6 4"
        />
        <rect
          x={eX(-totalL / 2)}
          y={groundY}
          width={totalL * sc}
          height={slabDepthPx}
          fill={palette.slabFill}
          stroke={palette.slabStroke}
          strokeWidth={1.5}
        />
        {groundSystem !== 'existing_slab' && (
          <rect
            x={eX(-totalL / 2)}
            y={groundY + slabDepthPx}
            width={totalL * sc}
            height={baseDepthPx}
            fill={palette.grid}
            stroke={palette.muted}
            strokeWidth={1}
          />
        )}
        <line
          x1={eX(-lengthM / 2)}
          y1={groundY}
          x2={eX(lengthM / 2)}
          y2={groundY}
          stroke={palette.accent}
          strokeWidth={3}
        />

        {benches.map((b) => (
          <rect
            key={b.id}
            x={eX(b.position[0]) - 1.5 * sc}
            y={eY(0.55)}
            width={Math.max(4, 3 * sc)}
            height={Math.max(3, 0.55 * sc)}
            fill={palette.dim}
            fillOpacity={0.45}
            stroke={palette.dim}
          />
        ))}
        {dugouts.map((d) => (
          <rect
            key={d.id}
            x={eX(d.position[0]) - 2.2 * sc}
            y={eY(2.1)}
            width={Math.max(8, 4.4 * sc)}
            height={Math.max(6, 2.1 * sc)}
            fill={palette.dim}
            fillOpacity={0.35}
            stroke={palette.accent}
          />
        ))}
        {bleachers.map((bl) => (
          <rect
            key={bl.id}
            x={eX(bl.position[0]) - 3.2 * sc}
            y={eY(1.25)}
            width={Math.max(8, 6.4 * sc)}
            height={Math.max(5, 1.25 * sc)}
            fill={palette.muted}
            fillOpacity={0.35}
            stroke={palette.muted}
          />
        ))}

        {masts.map((m) => {
          const ph = m.metadata?.poleHeightM ?? (totalL > 55 ? 12 : 6.5);
          return (
            <g key={m.id}>
              <line
                x1={eX(m.position[0])}
                y1={groundY}
                x2={eX(m.position[0])}
                y2={eY(ph)}
                stroke={palette.dim}
                strokeWidth={2.2}
              />
              <rect x={eX(m.position[0]) - 6} y={eY(ph) - 4} width={12} height={5} fill={palette.dim} />
            </g>
          );
        })}

        {goals.map((g) => {
          const gh = g.metadata?.goalHeightM ?? 2.44;
          const gd = g.metadata?.goalDepthM ?? 1.6;
          const dir = Math.cos(g.rotationY) >= 0 ? 1 : -1;
          const postX = eX(g.position[0]);
          const backX = eX(g.position[0] - dir * gd);
          return (
            <g key={g.id}>
              <polygon
                points={`${postX},${groundY} ${postX},${eY(gh)} ${backX},${eY(gh * 0.88)} ${backX},${groundY}`}
                fill={palette.accent}
                fillOpacity={0.2}
                stroke={palette.line}
                strokeWidth={1.8}
              />
            </g>
          );
        })}

        {nets.map((n) => {
          const nh = n.metadata?.netHeightM ?? (n.type === 'tennis_net' ? 1.07 : 2.43);
          return (
            <line
              key={n.id}
              x1={eX(n.position[0])}
              y1={groundY}
              x2={eX(n.position[0])}
              y2={eY(nh)}
              stroke={palette.accent}
              strokeWidth={3}
            />
          );
        })}

        {hoops.map((h) => {
          const rimH = h.metadata?.rimHeightM ?? 3.05;
          const reach = h.metadata?.extensionArmM ?? 2.05;
          const dir = Math.cos(h.rotationY) >= 0 ? 1 : -1;
          const postX = eX(h.position[0]);
          const boardX = eX(h.position[0] + dir * reach);
          return (
            <g key={h.id}>
              <line x1={postX} y1={groundY} x2={postX} y2={eY(rimH + 0.3)} stroke={palette.accent} strokeWidth={3} />
              <line
                x1={postX}
                y1={eY(rimH + 0.15)}
                x2={boardX}
                y2={eY(rimH + 0.15)}
                stroke={palette.accent}
                strokeWidth={2.5}
              />
              <line
                x1={boardX}
                y1={eY(rimH - 0.15)}
                x2={boardX}
                y2={eY(rimH + 0.9)}
                stroke={palette.line}
                strokeWidth={2.5}
              />
              <line
                x1={boardX}
                y1={eY(rimH)}
                x2={eX(h.position[0] + dir * (reach + 0.55))}
                y2={eY(rimH)}
                stroke={palette.accent}
                strokeWidth={2.5}
              />
            </g>
          );
        })}

        {renderDimLine(
          eX(-totalL / 2) - 22,
          groundY,
          eX(-totalL / 2) - 22,
          eY(primaryDatum.heightM),
          `${primaryDatum.label} ${formatLength(primaryDatum.heightM, project.unit)}`,
          palette.accent,
          -10
        )}
        {renderDimLine(
          eX(-totalL / 2),
          groundY + slabDepthPx + baseDepthPx + 22,
          eX(totalL / 2),
          groundY + slabDepthPx + baseDepthPx + 22,
          `Gross Envelope Length: ${formatLength(totalL, project.unit)}`
        )}
        {renderDimLine(
          eX(-lengthM / 2),
          groundY + slabDepthPx + baseDepthPx + 42,
          eX(lengthM / 2),
          groundY + slabDepthPx + baseDepthPx + 42,
          `Playing Court Length: ${formatLength(lengthM, project.unit)}`,
          palette.accent
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full h-auto block select-none"
      role="img"
      aria-label={`${sheetMeta.title} for ${project.name}`}
    >
      <defs>
        <pattern id={gridPatternId} width="25" height="25" patternUnits="userSpaceOnUse">
          <path
            d="M 25 0 L 0 0 0 25"
            fill="none"
            stroke={palette.grid}
            strokeWidth="0.7"
          />
        </pattern>
        <pattern
          id={hatchPatternId}
          width="10"
          height="10"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="10" stroke={palette.safetyHatch} strokeWidth="1.2" />
        </pattern>
      </defs>

      <rect width={VW} height={VH} fill={palette.bg} />
      <rect
        x={14}
        y={14}
        width={VW - 28}
        height={VH - 28}
        fill={`url(#${gridPatternId})`}
        stroke={palette.frame}
        strokeWidth={1.5}
      />

      {sheet === 'front_elevation' && renderFrontElevation()}
      {sheet === 'side_elevation' && renderSideElevation()}

      {(sheet === 'top_plan' ||
        sheet === 'dimensioned_plan' ||
        sheet === 'equipment_plan' ||
        sheet === 'safety_plan' ||
        sheet === 'lighting_fencing_plan') && (
        <g>
          {renderPlanCourtLines()}

          {sheet === 'top_plan' && renderEquipmentSymbols(false)}
          {sheet === 'equipment_plan' && renderEquipmentSymbols(true)}
          {sheet === 'lighting_fencing_plan' &&
            renderEquipmentSymbols(true, [
              'lighting_mast',
              'perimeter_fence',
              'hoop_assembly',
              'football_goal',
              'handball_goal',
              'multisport_combo_goal',
            ])}

          {renderDimLine(
            toX(-totalL / 2),
            toZ(totalW / 2) + 24,
            toX(totalL / 2),
            toZ(totalW / 2) + 24,
            `Total Envelope: ${formatLength(totalL, project.unit)}`,
            palette.dim,
            13
          )}
          {renderDimLine(
            toX(-lengthM / 2),
            toZ(-totalW / 2) - 18,
            toX(lengthM / 2),
            toZ(-totalW / 2) - 18,
            `Playing Length: ${formatLength(lengthM, project.unit)}`,
            palette.accent,
            -6
          )}
          {renderDimLine(
            toX(totalL / 2) + 22,
            toZ(-widthM / 2),
            toX(totalL / 2) + 22,
            toZ(widthM / 2),
            `Width: ${formatLength(widthM, project.unit)}`,
            palette.accent,
            13
          )}

          {sheet === 'dimensioned_plan' && (
            <text
              x={toX(0)}
              y={toZ(totalW / 2) + 42}
              fill={palette.text}
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              {`LAYERS: ${effectiveLayers
                .map((l) => `${l.sport.toUpperCase()} (${formatLength(l.lengthM, project.unit)}×${formatLength(l.widthM, project.unit)})`)
                .join(' + ')} · GROUND: ${groundPreset.shortLabel.toUpperCase()}`}
            </text>
          )}

          {sheet === 'safety_plan' && (
            <g>
              {renderDimLine(
                toX(-totalL / 2),
                toZ(0),
                toX(-lengthM / 2),
                toZ(0),
                formatLength(apronM, project.unit),
                palette.accent,
                -7
              )}
              <text
                x={toX(0)}
                y={toZ(totalW / 2) + 42}
                fill={palette.text}
                fontSize="10"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {`PLAYING ZONE: ${formatArea(lengthM * widthM, project.unit)} · SAFETY CLEARANCE: +${formatLength(
                  apronM,
                  project.unit
                )}`}
              </text>
            </g>
          )}

          {/* North Compass Arrow */}
          <g transform={`translate(935, 62) rotate(${-orientationDeg})`}>
            <circle cx={0} cy={0} r={18} fill="none" stroke={palette.frame} strokeWidth={1.2} />
            <polygon points="0,-14 4,4 0,0 -4,4" fill={palette.accent} />
            <text
              x={0}
              y={14}
              fill={palette.text}
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              N
            </text>
          </g>
        </g>
      )}

      {/* Graphical Scale Bar */}
      <g transform="translate(30, 511)">
        <line x1={0} y1={8} x2={scaleBarPx} y2={8} stroke={palette.text} strokeWidth={1.5} />
        <line x1={0} y1={3} x2={0} y2={13} stroke={palette.text} strokeWidth={1.5} />
        <line x1={scaleBarPx / 2} y1={4} x2={scaleBarPx / 2} y2={12} stroke={palette.text} strokeWidth={1.2} />
        <line x1={scaleBarPx} y1={3} x2={scaleBarPx} y2={13} stroke={palette.text} strokeWidth={1.5} />
        <text x={0} y={2} fill={palette.muted} fontSize="8" fontFamily="JetBrains Mono, monospace">
          0
        </text>
        <text x={scaleBarPx} y={2} fill={palette.muted} fontSize="8" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
          {`${scaleBarUnits}${project.unit}`}
        </text>
        <text x={scaleBarPx + 14} y={11} fill={palette.muted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
          {`SCALE 1:${scaleRatio} · UNITS: ${project.unit.toUpperCase()} · ${groundPreset.shortLabel.toUpperCase()} · ${orientationDeg}°`}
        </text>
      </g>

      {/* CAD Architectural Title Block */}
      <g transform="translate(14, 535)">
        <rect x={0} y={0} width={VW - 28} height={71} fill={palette.bg} stroke={palette.frame} strokeWidth={1.5} />
        <line x1={370} y1={0} x2={370} y2={71} stroke={palette.frame} strokeWidth={1} />
        <line x1={680} y1={0} x2={680} y2={71} stroke={palette.frame} strokeWidth={1} />
        <line x1={865} y1={0} x2={865} y2={71} stroke={palette.frame} strokeWidth={1} />

        <text x={14} y={22} fill={palette.muted} fontSize="9" fontFamily="JetBrains Mono, monospace">
          SPORTS GROUND TECHNICAL DRAWING
        </text>
        <text x={14} y={42} fill={palette.text} fontSize="13.5" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
          {project.name}
        </text>
        <text x={14} y={59} fill={palette.muted} fontSize="10">
          {`${project.client || 'Private Client'} · ${project.location || 'Site TBD'}`}
        </text>

        <text x={384} y={22} fill={palette.dim} fontSize="9" fontFamily="JetBrains Mono, monospace">
          {`SHEET ${sheetMeta.sheetNo}`}
        </text>
        <text x={384} y={42} fill={palette.text} fontSize="13" fontWeight="600">
          {sheetMeta.title}
        </text>
        <text x={384} y={59} fill={palette.muted} fontSize="9.5">
          {sheetMeta.subtitle}
        </text>

        <text x={694} y={22} fill={palette.muted} fontSize="9" fontFamily="JetBrains Mono, monospace">
          SPECIFICATION
        </text>
        <text x={694} y={40} fill={palette.text} fontSize="10.5" fontFamily="JetBrains Mono, monospace">
          {`${spec.shortLabel} · ${project.environment.toUpperCase()}`}
        </text>
        <text x={694} y={58} fill={palette.muted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
          {`AREA ${formatArea(totalL * totalW, project.unit)}`}
        </text>

        <text x={878} y={22} fill={palette.muted} fontSize="9" fontFamily="JetBrains Mono, monospace">
          SCALE
        </text>
        <text x={878} y={44} fill={palette.accent} fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {`1:${scaleRatio}`}
        </text>
        <text x={878} y={60} fill={palette.muted} fontSize="8.5" fontFamily="JetBrains Mono, monospace">
          PRELIM CAD
        </text>
      </g>
    </svg>
  );
};
