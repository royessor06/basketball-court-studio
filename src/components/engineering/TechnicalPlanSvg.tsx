import React from 'react';
import {
  COURT_STANDARDS,
  defaultEngineeringAssumptions,
  formatArea,
  formatLength,
} from '../../constants/courtStandards';
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
    subtitle: 'Overall slab footprint, playing boundary & court markings',
  },
  {
    id: 'dimensioned_plan',
    sheetNo: 'A-102',
    title: 'Dimensioned Court Plan',
    subtitle: 'Key envelope, 3-point arc, centre circle & 5 cm linework',
  },
  {
    id: 'front_elevation',
    sheetNo: 'A-201',
    title: 'Front / Baseline Elevation',
    subtitle: 'Rim height (3.05 m), backboard, mast & slab section profile',
  },
  {
    id: 'side_elevation',
    sheetNo: 'A-202',
    title: 'Side / Sideline Elevation',
    subtitle: 'Longitudinal profile, hoop overhangs & courtside fixtures',
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
  return 200;
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
  const spec = COURT_STANDARDS[project.standard];
  const assumptions =
    project.engineeringAssumptions ?? defaultEngineeringAssumptions(project.environment);
  const { lengthM, widthM, apronM, isHalfCourt, orientationDeg } = project.dimensions;
  const totalL = lengthM + apronM * 2;
  const totalW = widthM + apronM * 2;
  const scaleRatio = computeDrawingScaleRatio(project);

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

  // Drawing canvas coordinate system: 1000 x 620 SVG, title block at bottom (y: 535..605)
  const VW = 1000;
  const VH = 620;
  const drawArea = { x: 75, y: 46, w: 850, h: 465 };

  // Compute plan mapping from meters -> SVG pixels
  const padL = totalL + 4.5;
  const padW = totalW + 4.5;
  const pxPerMPlan = Math.min(drawArea.w / padL, drawArea.h / padW);
  const cx = drawArea.x + drawArea.w / 2;
  const cy = drawArea.y + drawArea.h / 2;

  const toX = (mx: number) => cx + mx * pxPerMPlan;
  const toZ = (mz: number) => cy + mz * pxPerMPlan;

  const isElevation = sheet === 'front_elevation' || sheet === 'side_elevation';
  const elevSpan = sheet === 'front_elevation' ? totalW + 4 : totalL + 4;
  const elevPxPerM = Math.min(drawArea.w / elevSpan, (drawArea.h - 40) / 7.8);
  const activePxPerM = isElevation ? elevPxPerM : pxPerMPlan;

  const scaleBarUnits = project.unit === 'ft' ? 15 : 5;
  const scaleBarMeters = project.unit === 'ft' ? 15 / 3.28084 : 5;
  const scaleBarPx = Math.max(36, Math.min(180, scaleBarMeters * activePxPerM));

  const sheetMeta = TECHNICAL_SHEETS.find((s) => s.id === sheet) ?? TECHNICAL_SHEETS[0];

  const effKeyW = Math.min(spec.keyWidthM, widthM * 0.48);
  const effKeyL = Math.min(spec.keyLengthM, isHalfCourt ? lengthM * 0.78 : lengthM * 0.44);
  const effFtR = Math.min(spec.freeThrowRadiusM, effKeyW / 2);
  const effCcR = Math.min(spec.centerCircleRadiusM, widthM * 0.25);
  const effBasketOff = Math.min(spec.basketCenterFromBaselineM, lengthM * 0.2);
  const maxArcRForLength = isHalfCourt
    ? Math.max(2.5, lengthM - effBasketOff - 0.45)
    : Math.max(2.5, lengthM * 0.48);
  const effR3 = Math.min(spec.threePointRadiusM, maxArcRForLength);

  const renderPlanCourtLines = (showDetailedMarks = true) => {
    const hl = lengthM / 2;
    const hw = widthM / 2;
    const keyW = effKeyW;
    const keyL = effKeyL;
    const ftR = effFtR;
    const ccR = effCcR;
    const basketOff = effBasketOff;

    // 3-point arc geometry in SVG space (matches 3D courtGeometry.ts & BOM)
    const r3 = effR3;
    const dy = Math.max(1.0, Math.min(hw - spec.threePointCornerInsetM, r3 - 0.15));
    const cornerX = Math.sqrt(Math.max(0, r3 * r3 - dy * dy));

    const leftBasketX = -hl + basketOff;
    const rightBasketX = hl - basketOff;

    const leftArcStartX = leftBasketX + cornerX;
    const rightArcStartX = rightBasketX - cornerX;

    return (
      <g>
        {/* Slab */}
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
            fill="url(#safetyHatch)"
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
          strokeWidth={2}
        />

        {/* West Key Paint & Lines */}
        <rect
          x={toX(-hl)}
          y={toZ(-keyW / 2)}
          width={keyL * pxPerMPlan}
          height={keyW * pxPerMPlan}
          fill={palette.paintFill}
          fillOpacity={isTech ? 0.65 : 0.55}
          stroke={palette.line}
          strokeWidth={1.5}
        />
        <circle
          cx={toX(-hl + keyL)}
          cy={toZ(0)}
          r={ftR * pxPerMPlan}
          fill="none"
          stroke={palette.line}
          strokeWidth={1.4}
        />

        {/* West 3-point line */}
        {showDetailedMarks && (
          <path
            d={`M ${toX(-hl)} ${toZ(-dy)} L ${toX(
              leftArcStartX
            )} ${toZ(-dy)} A ${r3 * pxPerMPlan} ${r3 * pxPerMPlan} 0 0 1 ${toX(
              leftArcStartX
            )} ${toZ(dy)} L ${toX(-hl)} ${toZ(dy)}`}
            fill="none"
            stroke={palette.line}
            strokeWidth={1.5}
          />
        )}

        {/* Full court centre & east end */}
        {!isHalfCourt && (
          <>
            <line
              x1={toX(0)}
              y1={toZ(-hw)}
              x2={toX(0)}
              y2={toZ(hw)}
              stroke={palette.line}
              strokeWidth={1.5}
            />
            <circle
              cx={toX(0)}
              cy={toZ(0)}
              r={ccR * pxPerMPlan}
              fill={palette.paintFill}
              fillOpacity={isTech ? 0.55 : 0.4}
              stroke={palette.line}
              strokeWidth={1.5}
            />
            <rect
              x={toX(hl - keyL)}
              y={toZ(-keyW / 2)}
              width={keyL * pxPerMPlan}
              height={keyW * pxPerMPlan}
              fill={palette.paintFill}
              fillOpacity={isTech ? 0.65 : 0.55}
              stroke={palette.line}
              strokeWidth={1.5}
            />
            <circle
              cx={toX(hl - keyL)}
              cy={toZ(0)}
              r={ftR * pxPerMPlan}
              fill="none"
              stroke={palette.line}
              strokeWidth={1.4}
            />
            {showDetailedMarks && (
              <path
                d={`M ${toX(hl)} ${toZ(-dy)} L ${toX(
                  rightArcStartX
                )} ${toZ(-dy)} A ${r3 * pxPerMPlan} ${r3 * pxPerMPlan} 0 0 0 ${toX(
                  rightArcStartX
                )} ${toZ(dy)} L ${toX(hl)} ${toZ(dy)}`}
                fill="none"
                stroke={palette.line}
                strokeWidth={1.5}
              />
            )}
          </>
        )}
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

  const equipmentObjects = project.objects.filter(
    (o) =>
      o.visible &&
      ![
        'court_slab',
        'playing_surface',
        'boundary_lines',
        'centre_markings',
        'free_throw_areas',
        'three_point_lines',
        'court_markings',
      ].includes(o.type)
  );

  const renderEquipmentSymbols = (indexed = false, filterTypes?: SceneObject['type'][]) => {
    const list = filterTypes
      ? equipmentObjects.filter((o) => filterTypes.includes(o.type))
      : equipmentObjects;

    return list.map((obj, idx) => {
      const px = toX(obj.position[0]);
      const pz = toZ(obj.position[2]);
      const deg = (obj.rotationY * 180) / Math.PI;
      const tag = `E${idx + 1}`;

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
        return (
          <g key={obj.id}>
            {sheet === 'lighting_fencing_plan' && (
              <circle
                cx={px}
                cy={pz}
                r={8.5 * pxPerMPlan}
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
                x={px + 9}
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
            <rect x={-5} y={-5} width={10} height={10} fill={palette.accent} />
            <line x1={0} y1={0} x2={reach} y2={0} stroke={palette.accent} strokeWidth={2.2} />
            <line
              x1={reach - 4}
              y1={-0.9 * pxPerMPlan}
              x2={reach - 4}
              y2={0.9 * pxPerMPlan}
              stroke={palette.line}
              strokeWidth={2.4}
            />
            <circle
              cx={reach + 3}
              cy={0}
              r={0.23 * pxPerMPlan}
              fill="none"
              stroke={palette.accent}
              strokeWidth={1.6}
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

      const boxW =
        obj.type === 'bleachers'
          ? 6.4 * pxPerMPlan
          : obj.type === 'player_bench'
          ? 3.2 * pxPerMPlan
          : obj.type === 'scorer_table'
          ? 2.8 * pxPerMPlan
          : 1.6 * pxPerMPlan;
      const boxH = obj.type === 'bleachers' ? 1.8 * pxPerMPlan : 0.7 * pxPerMPlan;

      return (
        <g key={obj.id} transform={`translate(${px}, ${pz}) rotate(${-deg})`}>
          <rect
            x={-boxW / 2}
            y={-boxH / 2}
            width={Math.max(8, boxW)}
            height={Math.max(6, boxH)}
            fill={palette.dim}
            fillOpacity={0.35}
            stroke={palette.dim}
            strokeWidth={1.2}
          />
          {indexed && (
            <text
              x={0}
              y={-Math.max(6, boxH) / 2 - 4}
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

  const renderFrontElevation = () => {
    const spanX = totalW + 4;
    const maxH = 7.8;
    const sc = Math.min(drawArea.w / spanX, (drawArea.h - 40) / maxH);
    const groundY = drawArea.y + drawArea.h - 62;
    const midX = drawArea.x + drawArea.w / 2;

    const eX = (mz: number) => midX + mz * sc;
    const eY = (my: number) => groundY - my * sc;

    const slabDepthPx = Math.max(8, assumptions.slabThicknessM * sc);
    const baseDepthPx = Math.max(8, assumptions.subBaseThicknessM * sc);
    const hoops = project.objects.filter((o) => o.visible && o.type === 'hoop_assembly');
    const masts = project.objects.filter((o) => o.visible && o.type === 'lighting_mast');
    const fences = project.objects.filter((o) => o.visible && o.type === 'perimeter_fence');

    return (
      <g>
        {/* Ground datum */}
        <line
          x1={drawArea.x + 20}
          y1={groundY}
          x2={drawArea.x + drawArea.w - 20}
          y2={groundY}
          stroke={palette.muted}
          strokeWidth={1.2}
          strokeDasharray="6 4"
        />
        {/* Sub-base & Slab cross-section */}
        <rect
          x={eX(-totalW / 2)}
          y={groundY}
          width={totalW * sc}
          height={slabDepthPx}
          fill={palette.slabFill}
          stroke={palette.slabStroke}
          strokeWidth={1.5}
        />
        <rect
          x={eX(-totalW / 2)}
          y={groundY + slabDepthPx}
          width={totalW * sc}
          height={baseDepthPx}
          fill={palette.grid}
          stroke={palette.muted}
          strokeWidth={1}
        />
        {/* Playing surface band */}
        <line
          x1={eX(-widthM / 2)}
          y1={groundY}
          x2={eX(widthM / 2)}
          y2={groundY}
          stroke={palette.accent}
          strokeWidth={3}
        />

        {/* Fencing silhouette */}
        {fences.length > 0 && (
          <rect
            x={eX(-totalW / 2)}
            y={eY(3.2)}
            width={totalW * sc}
            height={3.2 * sc}
            fill="none"
            stroke={palette.muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* Lighting masts */}
        {masts.map((m) => (
          <g key={m.id}>
            <line
              x1={eX(m.position[2])}
              y1={groundY}
              x2={eX(m.position[2])}
              y2={eY(6.5)}
              stroke={palette.dim}
              strokeWidth={2.5}
            />
            <rect x={eX(m.position[2]) - 8} y={eY(6.5) - 5} width={16} height={6} fill={palette.dim} />
          </g>
        ))}

        {/* Hoop assemblies seen from baseline */}
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

        {/* Elevation dimension callouts */}
        {renderDimLine(
          eX(-totalW / 2) - 24,
          groundY,
          eX(-totalW / 2) - 24,
          eY(3.05),
          `Rim ${formatLength(3.05, project.unit)}`,
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
          {`SECTION PROFILE: ${(assumptions.slabThicknessM * 100).toFixed(0)} cm C25/30 SLAB + ${(assumptions.subBaseThicknessM * 100).toFixed(0)} cm COMPACTED BASE`}
        </text>
      </g>
    );
  };

  const renderSideElevation = () => {
    const spanX = totalL + 4;
    const maxH = 7.8;
    const sc = Math.min(drawArea.w / spanX, (drawArea.h - 40) / maxH);
    const groundY = drawArea.y + drawArea.h - 62;
    const midX = drawArea.x + drawArea.w / 2;

    const eX = (mx: number) => midX + mx * sc;
    const eY = (my: number) => groundY - my * sc;

    const slabDepthPx = Math.max(8, assumptions.slabThicknessM * sc);
    const baseDepthPx = Math.max(8, assumptions.subBaseThicknessM * sc);
    const hoops = project.objects.filter((o) => o.visible && o.type === 'hoop_assembly');
    const masts = project.objects.filter((o) => o.visible && o.type === 'lighting_mast');
    const benches = project.objects.filter((o) => o.visible && o.type === 'player_bench');
    const bleachers = project.objects.filter((o) => o.visible && o.type === 'bleachers');

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
        <rect
          x={eX(-totalL / 2)}
          y={groundY + slabDepthPx}
          width={totalL * sc}
          height={baseDepthPx}
          fill={palette.grid}
          stroke={palette.muted}
          strokeWidth={1}
        />
        <line
          x1={eX(-lengthM / 2)}
          y1={groundY}
          x2={eX(lengthM / 2)}
          y2={groundY}
          stroke={palette.accent}
          strokeWidth={3}
        />

        {/* Benches & bleachers */}
        {benches.map((b) => (
          <rect
            key={b.id}
            x={eX(b.position[0]) - 1.5 * sc}
            y={eY(0.55)}
            width={3 * sc}
            height={0.55 * sc}
            fill={palette.dim}
            fillOpacity={0.45}
            stroke={palette.dim}
          />
        ))}
        {bleachers.map((bl) => (
          <rect
            key={bl.id}
            x={eX(bl.position[0]) - 3.2 * sc}
            y={eY(1.25)}
            width={6.4 * sc}
            height={1.25 * sc}
            fill={palette.muted}
            fillOpacity={0.35}
            stroke={palette.muted}
          />
        ))}

        {/* Masts */}
        {masts.map((m) => (
          <g key={m.id}>
            <line
              x1={eX(m.position[0])}
              y1={groundY}
              x2={eX(m.position[0])}
              y2={eY(6.5)}
              stroke={palette.dim}
              strokeWidth={2.2}
            />
            <rect x={eX(m.position[0]) - 6} y={eY(6.5) - 4} width={12} height={5} fill={palette.dim} />
          </g>
        ))}

        {/* Hoops seen from sideline */}
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
          eY(3.05),
          formatLength(3.05, project.unit),
          palette.accent,
          -10
        )}
        {renderDimLine(
          eX(-totalL / 2),
          groundY + slabDepthPx + baseDepthPx + 22,
          eX(totalL / 2),
          groundY + slabDepthPx + baseDepthPx + 22,
          `Gross Slab Length: ${formatLength(totalL, project.unit)}`
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
        <pattern id="cadGrid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path
            d="M 25 0 L 0 0 0 25"
            fill="none"
            stroke={palette.grid}
            strokeWidth="0.7"
          />
        </pattern>
        <pattern
          id="safetyHatch"
          width="10"
          height="10"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="10" stroke={palette.safetyHatch} strokeWidth="1.2" />
        </pattern>
      </defs>

      {/* Sheet Background & Outer CAD Border */}
      <rect width={VW} height={VH} fill={palette.bg} />
      <rect x={14} y={14} width={VW - 28} height={VH - 28} fill="url(#cadGrid)" stroke={palette.frame} strokeWidth={1.5} />

      {/* Drawing Content */}
      {sheet === 'front_elevation' && renderFrontElevation()}
      {sheet === 'side_elevation' && renderSideElevation()}

      {(sheet === 'top_plan' ||
        sheet === 'dimensioned_plan' ||
        sheet === 'equipment_plan' ||
        sheet === 'safety_plan' ||
        sheet === 'lighting_fencing_plan') && (
        <g>
          {renderPlanCourtLines(true)}

          {sheet === 'top_plan' && renderEquipmentSymbols(false)}
          {sheet === 'equipment_plan' && renderEquipmentSymbols(true)}
          {sheet === 'lighting_fencing_plan' &&
            renderEquipmentSymbols(true, ['lighting_mast', 'perimeter_fence', 'hoop_assembly'])}

          {/* Top-level Dimensions */}
          {renderDimLine(
            toX(-totalL / 2),
            toZ(totalW / 2) + 26,
            toX(totalL / 2),
            toZ(totalW / 2) + 26,
            `Total Slab: ${formatLength(totalL, project.unit)}`,
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

          {/* Extra Dimensioned Plan annotations */}
          {sheet === 'dimensioned_plan' && (
            <g>
              {renderDimLine(
                toX(-lengthM / 2),
                toZ(0) - 12,
                toX(-lengthM / 2 + effKeyL),
                toZ(0) - 12,
                `Key ${formatLength(effKeyL, project.unit)}`,
                palette.line,
                -5
              )}
              {renderDimLine(
                toX(-lengthM / 2) - 16,
                toZ(-effKeyW / 2),
                toX(-lengthM / 2) - 16,
                toZ(effKeyW / 2),
                formatLength(effKeyW, project.unit),
                palette.line,
                -6
              )}
              <text
                x={toX(0)}
                y={toZ(0) + (effCcR * pxPerMPlan + 14)}
                fill={palette.text}
                fontSize="9.5"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {`3PT R=${formatLength(effR3, project.unit)} · CTR R=${formatLength(
                  effCcR,
                  project.unit
                )} · LINE 50 mm`}
              </text>
            </g>
          )}

          {/* Safety Plan annotations */}
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
                y={toZ(0)}
                fill={palette.text}
                fontSize="11"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {`PLAYING ZONE: ${formatArea(lengthM * widthM, project.unit)} · SAFETY CLEARANCE: +${formatLength(
                  apronM,
                  project.unit
                )} (${apronM >= 2.0 ? 'FIBA 2.0 m MIN MET' : 'BELOW 2.0 m FIBA REC'})`}
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

      {/* True-Scale Graphical Scale Bar */}
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
          {`SCALE 1:${scaleRatio} · UNITS: ${project.unit.toUpperCase()} · ORIENTATION ${orientationDeg}°`}
        </text>
      </g>

      {/* CAD Architectural Title Block */}
      <g transform="translate(14, 535)">
        <rect x={0} y={0} width={VW - 28} height={71} fill={palette.bg} stroke={palette.frame} strokeWidth={1.5} />
        <line x1={370} y1={0} x2={370} y2={71} stroke={palette.frame} strokeWidth={1} />
        <line x1={680} y1={0} x2={680} y2={71} stroke={palette.frame} strokeWidth={1} />
        <line x1={865} y1={0} x2={865} y2={71} stroke={palette.frame} strokeWidth={1} />

        <text x={14} y={22} fill={palette.muted} fontSize="9" fontFamily="JetBrains Mono, monospace">
          BASKETBALL COURT STUDIO · TECHNICAL DRAWING
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
          {`SLAB ${formatArea(totalL * totalW, project.unit)}`}
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
