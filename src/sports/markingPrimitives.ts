import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CourtProject, CourtStandard, LayerSportType, SportMarkingLayer } from '../types/court';

export type MarkingPrimitive =
  | {
      kind: 'line';
      role: 'line';
      x1: number;
      z1: number;
      x2: number;
      z2: number;
      widthM: number;
      dashed?: [number, number];
    }
  | {
      kind: 'rect';
      role: 'line' | 'paint';
      x: number;
      z: number;
      w: number;
      h: number;
      lineWidthM: number;
      filled?: boolean;
    }
  | {
      kind: 'arc';
      role: 'line' | 'paint';
      cx: number;
      cz: number;
      r: number;
      startAngle: number;
      endAngle: number;
      widthM: number;
      dashed?: [number, number];
      filled?: boolean;
    }
  | {
      kind: 'circle';
      role: 'line' | 'paint';
      cx: number;
      cz: number;
      r: number;
      widthM: number;
      filled?: boolean;
    };

export interface BasketballSpecParams {
  keyLengthM: number;
  keyWidthM: number;
  freeThrowRadiusM: number;
  restrictedRadiusM: number;
  centerCircleRadiusM: number;
  threePointRadiusM: number;
  threePointCornerInsetM: number;
  basketCenterFromBaselineM: number;
  backboardFromBaselineM: number;
  tickOffsets?: number[];
}

export function getBasketballSpecForPreset(preset: CourtStandard): BasketballSpecParams {
  switch (preset) {
    case 'NBA':
      return {
        keyLengthM: 5.79,
        keyWidthM: 4.88,
        freeThrowRadiusM: 1.83,
        restrictedRadiusM: 1.22,
        centerCircleRadiusM: 1.83,
        threePointRadiusM: 7.24,
        threePointCornerInsetM: 0.91,
        basketCenterFromBaselineM: 1.6,
        backboardFromBaselineM: 1.22,
        tickOffsets: [2.13, 3.05, 3.96, 4.88],
      };
    case 'NCAA':
      return {
        keyLengthM: 5.79,
        keyWidthM: 3.66,
        freeThrowRadiusM: 1.83,
        restrictedRadiusM: 1.22,
        centerCircleRadiusM: 1.83,
        threePointRadiusM: 6.75,
        threePointCornerInsetM: 1.0,
        basketCenterFromBaselineM: 1.6,
        backboardFromBaselineM: 1.22,
        tickOffsets: [2.13, 3.05, 3.96, 4.88],
      };
    case 'FIBA_3X3':
      return {
        keyLengthM: 5.8,
        keyWidthM: 4.9,
        freeThrowRadiusM: 1.8,
        restrictedRadiusM: 1.25,
        centerCircleRadiusM: 1.8,
        threePointRadiusM: 6.75,
        threePointCornerInsetM: 0.9,
        basketCenterFromBaselineM: 1.575,
        backboardFromBaselineM: 1.2,
        tickOffsets: [1.75, 2.6, 3.0, 3.85, 4.7],
      };
    default:
      return {
        keyLengthM: 5.8,
        keyWidthM: 4.9,
        freeThrowRadiusM: 1.8,
        restrictedRadiusM: 1.25,
        centerCircleRadiusM: 1.8,
        threePointRadiusM: 6.75,
        threePointCornerInsetM: 0.9,
        basketCenterFromBaselineM: 1.575,
        backboardFromBaselineM: 1.2,
        tickOffsets: [1.75, 2.6, 3.0, 3.85, 4.7],
      };
  }
}

function buildBasketballPrimitives(layer: SportMarkingLayer): MarkingPrimitive[] {
  const { lengthM, widthM, lineWidthM, isHalfCourt = false, presetId } = layer;
  const spec = getBasketballSpecForPreset(presetId);
  const hl = lengthM / 2;
  const hw = widthM / 2;
  const halfLine = lineWidthM / 2;
  const primitives: MarkingPrimitive[] = [];

  // Outer boundary
  primitives.push({
    kind: 'rect',
    role: 'line',
    x: 0,
    z: 0,
    w: lengthM,
    h: widthM,
    lineWidthM,
  });

  // Center line & circle
  if (!isHalfCourt) {
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: 0,
      z1: -(hw + 0.15),
      x2: 0,
      z2: hw + 0.15,
      widthM: lineWidthM,
    });
    const ccR = Math.min(spec.centerCircleRadiusM, widthM * 0.25);
    primitives.push({
      kind: 'circle',
      role: 'paint',
      cx: 0,
      cz: 0,
      r: ccR - lineWidthM,
      widthM: lineWidthM,
      filled: true,
    });
    primitives.push({
      kind: 'circle',
      role: 'line',
      cx: 0,
      cz: 0,
      r: ccR,
      widthM: lineWidthM,
    });
  }

  const effKeyLen = Math.min(spec.keyLengthM, isHalfCourt ? lengthM * 0.78 : lengthM * 0.44);
  const effKeyWid = Math.min(spec.keyWidthM, widthM * 0.48);
  const halfKeyW = effKeyWid / 2;
  const ftR = Math.min(spec.freeThrowRadiusM, halfKeyW);
  const basketOff = Math.min(spec.basketCenterFromBaselineM, lengthM * 0.2);
  const backboardOff = Math.min(spec.backboardFromBaselineM, lengthM * 0.16);

  const maxArcR = isHalfCourt
    ? Math.max(2.5, lengthM - basketOff - 0.45)
    : Math.max(2.5, lengthM * 0.48);
  const effR3 = Math.min(spec.threePointRadiusM, maxArcR);
  const cornerZ = Math.max(1.0, Math.min(hw - spec.threePointCornerInsetM, effR3 - 0.15));
  const midArcR = effR3 - halfLine;
  const dx = Math.sqrt(Math.max(0.01, midArcR * midArcR - (cornerZ - halfLine) ** 2));
  const arcHalfAngle = Math.asin(Math.min(0.999, (cornerZ - halfLine) / midArcR));

  const addEnd = (dir: 1 | -1) => {
    const baselineX = -dir * hl;
    const keyCenterX = baselineX + dir * (effKeyLen / 2);
    const ftLineX = baselineX + dir * (effKeyLen - halfLine);
    const basketX = baselineX + dir * basketOff;
    const backboardX = baselineX + dir * backboardOff;

    // Key paint
    primitives.push({
      kind: 'rect',
      role: 'paint',
      x: keyCenterX,
      z: 0,
      w: effKeyLen - lineWidthM,
      h: effKeyWid - lineWidthM * 2,
      lineWidthM,
      filled: true,
    });

    // Key lines
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: baselineX,
      z1: -(halfKeyW - halfLine),
      x2: baselineX + dir * effKeyLen,
      z2: -(halfKeyW - halfLine),
      widthM: lineWidthM,
    });
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: baselineX,
      z1: halfKeyW - halfLine,
      x2: baselineX + dir * effKeyLen,
      z2: halfKeyW - halfLine,
      widthM: lineWidthM,
    });
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: ftLineX,
      z1: -halfKeyW,
      x2: ftLineX,
      z2: halfKeyW,
      widthM: lineWidthM,
    });

    // Rebound lane hash marks
    (spec.tickOffsets ?? [1.75, 2.6, 3.0, 3.85, 4.7]).forEach((dist, idx) => {
      if (dist < effKeyLen - 0.25) {
        const tx = baselineX + dir * dist;
        const tickWidth = idx === 1 && presetId !== 'NBA' && presetId !== 'NCAA' ? 0.4 : 0.05;
        primitives.push({
          kind: 'line',
          role: 'line',
          x1: tx,
          z1: -halfKeyW,
          x2: tx,
          z2: -(halfKeyW + 0.1),
          widthM: tickWidth,
        });
        primitives.push({
          kind: 'line',
          role: 'line',
          x1: tx,
          z1: halfKeyW,
          x2: tx,
          z2: halfKeyW + 0.1,
          widthM: tickWidth,
        });
      }
    });

    // Free throw solid semicircle
    const outerStart = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
    primitives.push({
      kind: 'arc',
      role: 'line',
      cx: ftLineX,
      cz: 0,
      r: ftR,
      startAngle: outerStart,
      endAngle: outerStart + Math.PI,
      widthM: lineWidthM,
    });

    // Inner dashed semicircle
    const innerStart = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    primitives.push({
      kind: 'arc',
      role: 'line',
      cx: ftLineX,
      cz: 0,
      r: ftR,
      startAngle: innerStart,
      endAngle: innerStart + Math.PI,
      widthM: lineWidthM,
      dashed: [0.35, 0.25],
    });

    // No-charge restricted arc
    const rRestr = Math.min(spec.restrictedRadiusM, halfKeyW - 0.2);
    primitives.push({
      kind: 'arc',
      role: 'line',
      cx: basketX,
      cz: 0,
      r: rRestr,
      startAngle: outerStart,
      endAngle: outerStart + Math.PI,
      widthM: lineWidthM,
    });
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: backboardX,
      z1: -(rRestr - halfLine),
      x2: basketX,
      z2: -(rRestr - halfLine),
      widthM: lineWidthM,
    });
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: backboardX,
      z1: rRestr - halfLine,
      x2: basketX,
      z2: rRestr - halfLine,
      widthM: lineWidthM,
    });

    // Three-point straight corners + arc
    const straightLen = Math.max(0.2, basketOff + dx);
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: baselineX,
      z1: -(cornerZ - halfLine),
      x2: baselineX + dir * straightLen,
      z2: -(cornerZ - halfLine),
      widthM: lineWidthM,
    });
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: baselineX,
      z1: cornerZ - halfLine,
      x2: baselineX + dir * straightLen,
      z2: cornerZ - halfLine,
      widthM: lineWidthM,
    });
    const start3 = dir === 1 ? -arcHalfAngle : Math.PI - arcHalfAngle;
    primitives.push({
      kind: 'arc',
      role: 'line',
      cx: basketX,
      cz: 0,
      r: effR3,
      startAngle: start3,
      endAngle: start3 + arcHalfAngle * 2,
      widthM: lineWidthM,
    });
  };

  addEnd(1);
  if (!isHalfCourt) addEnd(-1);
  return primitives;
}

function buildFootballPrimitives(layer: SportMarkingLayer): MarkingPrimitive[] {
  const { lengthM, widthM, lineWidthM } = layer;
  const hl = lengthM / 2;
  const hw = widthM / 2;
  const lw = Math.max(0.08, lineWidthM);
  const isSmallSided = lengthM < 75;
  const isFutsal = lengthM <= 45;

  const primitives: MarkingPrimitive[] = [];

  // Touchlines & goal lines
  primitives.push({ kind: 'rect', role: 'line', x: 0, z: 0, w: lengthM, h: widthM, lineWidthM: lw });
  // Halfway line & spot
  primitives.push({ kind: 'line', role: 'line', x1: 0, z1: -hw, x2: 0, z2: hw, widthM: lw });
  const centerR = isFutsal ? 3.0 : isSmallSided ? Math.min(6.0, widthM * 0.16) : 9.15;
  primitives.push({ kind: 'circle', role: 'line', cx: 0, cz: 0, r: centerR, widthM: lw });
  primitives.push({ kind: 'circle', role: 'line', cx: 0, cz: 0, r: Math.max(0.22, lw * 2.2), widthM: lw, filled: true });

  // Penalty area & goal area dimensions scaled accurately by pitch format
  const penDepth = isFutsal ? Math.min(6.0, lengthM * 0.16) : isSmallSided ? Math.min(11.0, lengthM * 0.18) : 16.5;
  const penWidth = isFutsal
    ? Math.min(12.0, widthM * 0.65)
    : isSmallSided
    ? Math.min(24.0, widthM * 0.62)
    : Math.min(40.32, widthM * 0.72);
  const goalBoxDepth = isFutsal ? 0 : isSmallSided ? 3.8 : 5.5;
  const goalBoxWidth = isFutsal ? 0 : isSmallSided ? 12.0 : Math.min(18.32, widthM * 0.42);
  const penSpotDist = isFutsal ? 6.0 : isSmallSided ? 8.0 : 11.0;
  const penArcR = isFutsal ? 0 : isSmallSided ? 6.0 : 9.15;

  const addEnd = (dir: 1 | -1) => {
    const goalLineX = -dir * hl;
    if (isFutsal) {
      // Futsal 6m D-shaped penalty arc (two quarter arcs + 3.16m segment)
      const rFut = Math.min(6.0, widthM * 0.34);
      const halfGoal = 1.58;
      primitives.push({
        kind: 'line',
        role: 'line',
        x1: goalLineX + dir * rFut,
        z1: -halfGoal,
        x2: goalLineX + dir * rFut,
        z2: halfGoal,
        widthM: lw,
      });
      if (dir === 1) {
        primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: -halfGoal, r: rFut, startAngle: -Math.PI / 2, endAngle: 0, widthM: lw });
        primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: halfGoal, r: rFut, startAngle: 0, endAngle: Math.PI / 2, widthM: lw });
      } else {
        primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: -halfGoal, r: rFut, startAngle: Math.PI, endAngle: Math.PI * 1.5, widthM: lw });
        primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: halfGoal, r: rFut, startAngle: Math.PI / 2, endAngle: Math.PI, widthM: lw });
      }
      // 6m & 10m futsal penalty spots
      primitives.push({ kind: 'circle', role: 'line', cx: goalLineX + dir * 6.0, cz: 0, r: 0.12, widthM: lw, filled: true });
      primitives.push({ kind: 'circle', role: 'line', cx: goalLineX + dir * 10.0, cz: 0, r: 0.12, widthM: lw, filled: true });
    } else {
      // Penalty box
      primitives.push({
        kind: 'rect',
        role: 'line',
        x: goalLineX + dir * (penDepth / 2),
        z: 0,
        w: penDepth,
        h: penWidth,
        lineWidthM: lw,
      });
      // Goal box
      primitives.push({
        kind: 'rect',
        role: 'line',
        x: goalLineX + dir * (goalBoxDepth / 2),
        z: 0,
        w: goalBoxDepth,
        h: goalBoxWidth,
        lineWidthM: lw,
      });
      // Penalty spot
      const spotX = goalLineX + dir * penSpotDist;
      primitives.push({ kind: 'circle', role: 'line', cx: spotX, cz: 0, r: 0.18, widthM: lw, filled: true });
      // Penalty arc outside box
      if (penArcR > penDepth - penSpotDist) {
        const dxBox = penDepth - penSpotDist;
        const halfA = Math.acos(Math.min(0.99, Math.max(0.05, dxBox / penArcR)));
        const baseA = dir === 1 ? 0 : Math.PI;
        primitives.push({
          kind: 'arc',
          role: 'line',
          cx: spotX,
          cz: 0,
          r: penArcR,
          startAngle: baseA - halfA,
          endAngle: baseA + halfA,
          widthM: lw,
        });
      }
    }

    // Corner quadrant arcs (1 m radius)
    const cR = isFutsal ? 0.25 : 1.0;
    if (dir === 1) {
      primitives.push({ kind: 'arc', role: 'line', cx: -hl, cz: -hw, r: cR, startAngle: 0, endAngle: Math.PI / 2, widthM: lw });
      primitives.push({ kind: 'arc', role: 'line', cx: -hl, cz: hw, r: cR, startAngle: -Math.PI / 2, endAngle: 0, widthM: lw });
    } else {
      primitives.push({ kind: 'arc', role: 'line', cx: hl, cz: -hw, r: cR, startAngle: Math.PI / 2, endAngle: Math.PI, widthM: lw });
      primitives.push({ kind: 'arc', role: 'line', cx: hl, cz: hw, r: cR, startAngle: Math.PI, endAngle: Math.PI * 1.5, widthM: lw });
    }
  };

  addEnd(1);
  addEnd(-1);
  return primitives;
}

function buildVolleyballPrimitives(layer: SportMarkingLayer): MarkingPrimitive[] {
  const { lengthM, widthM, lineWidthM } = layer;
  const hl = lengthM / 2;
  const hw = widthM / 2;
  const isBeach = lengthM <= 16.5;
  const primitives: MarkingPrimitive[] = [
    { kind: 'rect', role: 'paint', x: 0, z: 0, w: lengthM - lineWidthM * 2, h: widthM - lineWidthM * 2, lineWidthM, filled: true },
    { kind: 'rect', role: 'line', x: 0, z: 0, w: lengthM, h: widthM, lineWidthM },
  ];
  if (!isBeach) {
    // Center line under net + 3m attack lines + dashed side extensions
    primitives.push({ kind: 'line', role: 'line', x1: 0, z1: -hw, x2: 0, z2: hw, widthM: lineWidthM });
    const attackX = Math.min(3.0, lengthM * 0.22);
    [-attackX, attackX].forEach((ax) => {
      primitives.push({ kind: 'line', role: 'line', x1: ax, z1: -hw, x2: ax, z2: hw, widthM: lineWidthM });
      primitives.push({ kind: 'line', role: 'line', x1: ax, z1: -(hw + 0.15), x2: ax, z2: -(hw + 1.75), widthM: lineWidthM, dashed: [0.15, 0.2] });
      primitives.push({ kind: 'line', role: 'line', x1: ax, z1: hw + 0.15, x2: ax, z2: hw + 1.75, widthM: lineWidthM, dashed: [0.15, 0.2] });
    });
  }
  // Subtle service zone hash marks at baselines
  primitives.push({ kind: 'line', role: 'line', x1: -(hl + 0.2), z1: -hw, x2: -(hl + 0.35), z2: -hw, widthM: lineWidthM });
  primitives.push({ kind: 'line', role: 'line', x1: -(hl + 0.2), z1: hw, x2: -(hl + 0.35), z2: hw, widthM: lineWidthM });
  primitives.push({ kind: 'line', role: 'line', x1: hl + 0.2, z1: -hw, x2: hl + 0.35, z2: -hw, widthM: lineWidthM });
  primitives.push({ kind: 'line', role: 'line', x1: hl + 0.2, z1: hw, x2: hl + 0.35, z2: hw, widthM: lineWidthM });
  return primitives;
}

function buildTennisPrimitives(layer: SportMarkingLayer): MarkingPrimitive[] {
  const { lengthM, widthM, lineWidthM } = layer;
  const hl = lengthM / 2;
  const hw = widthM / 2;
  // Standard ITF doubles width 10.97m, singles width 8.23m, service line 6.40m from net
  const singlesHalfW = Math.min(4.115, hw * 0.75);
  const serviceDistX = Math.min(6.4, hl * 0.56);

  return [
    { kind: 'rect', role: 'paint', x: 0, z: 0, w: lengthM - lineWidthM * 2, h: widthM - lineWidthM * 2, lineWidthM, filled: true },
    // Outer doubles boundary
    { kind: 'rect', role: 'line', x: 0, z: 0, w: lengthM, h: widthM, lineWidthM },
    // Inner singles sidelines
    { kind: 'line', role: 'line', x1: -hl, z1: -singlesHalfW, x2: hl, z2: -singlesHalfW, widthM: lineWidthM },
    { kind: 'line', role: 'line', x1: -hl, z1: singlesHalfW, x2: hl, z2: singlesHalfW, widthM: lineWidthM },
    // Service lines
    { kind: 'line', role: 'line', x1: -serviceDistX, z1: -singlesHalfW, x2: -serviceDistX, z2: singlesHalfW, widthM: lineWidthM },
    { kind: 'line', role: 'line', x1: serviceDistX, z1: -singlesHalfW, x2: serviceDistX, z2: singlesHalfW, widthM: lineWidthM },
    // Center service line
    { kind: 'line', role: 'line', x1: -serviceDistX, z1: 0, x2: serviceDistX, z2: 0, widthM: lineWidthM },
    // Net line (subtle ground line)
    { kind: 'line', role: 'line', x1: 0, z1: -hw, x2: 0, z2: hw, widthM: lineWidthM },
    // Center baseline marks (10 cm)
    { kind: 'line', role: 'line', x1: -hl, z1: 0, x2: -(hl - 0.15), z2: 0, widthM: lineWidthM },
    { kind: 'line', role: 'line', x1: hl, z1: 0, x2: hl - 0.15, z2: 0, widthM: lineWidthM },
  ];
}

function buildHandballPrimitives(layer: SportMarkingLayer): MarkingPrimitive[] {
  const { lengthM, widthM, lineWidthM } = layer;
  const hl = lengthM / 2;
  const hw = widthM / 2;
  const goalWidth = 3.0;
  const halfGoal = goalWidth / 2;
  const r6 = Math.min(6.0, widthM * 0.36, lengthM * 0.25);
  const r9 = Math.min(9.0, widthM * 0.48, lengthM * 0.32);

  const primitives: MarkingPrimitive[] = [
    { kind: 'rect', role: 'line', x: 0, z: 0, w: lengthM, h: widthM, lineWidthM },
    { kind: 'line', role: 'line', x1: 0, z1: -hw, x2: 0, z2: hw, widthM: lineWidthM },
    // Substitution zone hash marks at 4.5m either side of center line
    { kind: 'line', role: 'line', x1: -4.5, z1: hw - 0.15, x2: -4.5, z2: hw + 0.15, widthM: lineWidthM },
    { kind: 'line', role: 'line', x1: 4.5, z1: hw - 0.15, x2: 4.5, z2: hw + 0.15, widthM: lineWidthM },
  ];

  const addEnd = (dir: 1 | -1) => {
    const goalLineX = -dir * hl;
    // 6m goal-area fill (strictly inside court) & solid boundary
    primitives.push({
      kind: 'rect',
      role: 'paint',
      x: goalLineX + dir * (r6 / 2),
      z: 0,
      w: r6 - lineWidthM,
      h: goalWidth,
      lineWidthM,
      filled: true,
    });
    if (dir === 1) {
      primitives.push({ kind: 'arc', role: 'paint', cx: goalLineX, cz: -halfGoal, r: r6 - lineWidthM, startAngle: -Math.PI / 2, endAngle: 0, widthM: lineWidthM, filled: true });
      primitives.push({ kind: 'arc', role: 'paint', cx: goalLineX, cz: halfGoal, r: r6 - lineWidthM, startAngle: 0, endAngle: Math.PI / 2, widthM: lineWidthM, filled: true });
    } else {
      primitives.push({ kind: 'arc', role: 'paint', cx: goalLineX, cz: -halfGoal, r: r6 - lineWidthM, startAngle: Math.PI, endAngle: Math.PI * 1.5, widthM: lineWidthM, filled: true });
      primitives.push({ kind: 'arc', role: 'paint', cx: goalLineX, cz: halfGoal, r: r6 - lineWidthM, startAngle: Math.PI / 2, endAngle: Math.PI, widthM: lineWidthM, filled: true });
    }

    primitives.push({
      kind: 'line',
      role: 'line',
      x1: goalLineX + dir * r6,
      z1: -halfGoal,
      x2: goalLineX + dir * r6,
      z2: halfGoal,
      widthM: lineWidthM,
    });
    if (dir === 1) {
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: -halfGoal, r: r6, startAngle: -Math.PI / 2, endAngle: 0, widthM: lineWidthM });
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: halfGoal, r: r6, startAngle: 0, endAngle: Math.PI / 2, widthM: lineWidthM });
    } else {
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: -halfGoal, r: r6, startAngle: Math.PI, endAngle: Math.PI * 1.5, widthM: lineWidthM });
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: halfGoal, r: r6, startAngle: Math.PI / 2, endAngle: Math.PI, widthM: lineWidthM });
    }

    // 9m free-throw dashed arc
    primitives.push({
      kind: 'line',
      role: 'line',
      x1: goalLineX + dir * r9,
      z1: -halfGoal,
      x2: goalLineX + dir * r9,
      z2: halfGoal,
      widthM: lineWidthM,
      dashed: [0.15, 0.15],
    });
    if (dir === 1) {
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: -halfGoal, r: r9, startAngle: -Math.PI / 2, endAngle: 0, widthM: lineWidthM, dashed: [0.15, 0.15] });
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: halfGoal, r: r9, startAngle: 0, endAngle: Math.PI / 2, widthM: lineWidthM, dashed: [0.15, 0.15] });
    } else {
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: -halfGoal, r: r9, startAngle: Math.PI, endAngle: Math.PI * 1.5, widthM: lineWidthM, dashed: [0.15, 0.15] });
      primitives.push({ kind: 'arc', role: 'line', cx: goalLineX, cz: halfGoal, r: r9, startAngle: Math.PI / 2, endAngle: Math.PI, widthM: lineWidthM, dashed: [0.15, 0.15] });
    }

    // 4m goalkeeper mark & 7m penalty mark
    primitives.push({ kind: 'line', role: 'line', x1: goalLineX + dir * 4.0, z1: -0.075, x2: goalLineX + dir * 4.0, z2: 0.075, widthM: lineWidthM });
    primitives.push({ kind: 'line', role: 'line', x1: goalLineX + dir * 7.0, z1: -0.5, x2: goalLineX + dir * 7.0, z2: 0.5, widthM: lineWidthM });
  };

  addEnd(1);
  addEnd(-1);
  return primitives;
}

export function buildPrimitivesForLayer(layer: SportMarkingLayer): MarkingPrimitive[] {
  switch (layer.sport) {
    case 'football':
      return buildFootballPrimitives(layer);
    case 'volleyball':
      return buildVolleyballPrimitives(layer);
    case 'tennis':
      return buildTennisPrimitives(layer);
    case 'handball':
      return buildHandballPrimitives(layer);
    case 'basketball':
    default:
      return buildBasketballPrimitives(layer);
  }
}

export interface CompiledLayerPaintStats {
  markingLinearM: number;
  paintedZoneAreaM2: number;
}

export function computePrimitivesPaintStats(layers: SportMarkingLayer[]): CompiledLayerPaintStats {
  let linear = 0;
  let area = 0;

  for (const layer of layers) {
    if (!layer.visible) continue;
    const prims = buildPrimitivesForLayer(layer);
    for (const p of prims) {
      if (p.role === 'paint') {
        if (p.kind === 'rect') area += Math.max(0, p.w * p.h);
        if (p.kind === 'circle') area += Math.PI * p.r * p.r;
        if (p.kind === 'arc') area += 0.5 * p.r * p.r * Math.abs(p.endAngle - p.startAngle);
      } else {
        if (p.kind === 'line') {
          const len = Math.hypot(p.x2 - p.x1, p.z2 - p.z1);
          linear += p.dashed ? len * (p.dashed[0] / (p.dashed[0] + p.dashed[1])) : len;
        } else if (p.kind === 'rect') {
          linear += 2 * (p.w + p.h);
        } else if (p.kind === 'circle') {
          linear += 2 * Math.PI * p.r;
        } else if (p.kind === 'arc') {
          const span = Math.abs(p.endAngle - p.startAngle);
          const len = p.r * span;
          linear += p.dashed ? len * (p.dashed[0] / (p.dashed[0] + p.dashed[1])) : len;
        }
      }
    }
  }

  return {
    markingLinearM: Math.round(linear * 10) / 10,
    paintedZoneAreaM2: Math.round(area * 10) / 10,
  };
}

/**
 * Resolves effective SportMarkingLayers for any project, synthesizing backward-compatible
 * basketball layer if a legacy project has no explicit sportLayers array.
 */
export function resolveEffectiveSportLayers(project: CourtProject): SportMarkingLayer[] {
  if (project.sportLayers && project.sportLayers.length > 0) {
    return project.sportLayers;
  }
  const inferSport = (): LayerSportType => {
    if (project.standard.startsWith('FOOTBALL')) return 'football';
    if (project.standard === 'VOLLEYBALL_STD' || project.standard === 'BEACH_VOLLEY') return 'volleyball';
    if (project.standard === 'TENNIS_DOUBLES') return 'tennis';
    if (project.standard === 'HANDBALL_IHF') return 'handball';
    return 'basketball';
  };
  return [
    {
      id: 'layer-primary',
      sport: inferSport(),
      presetId: project.standard,
      name: 'Primary Court Markings',
      visible: true,
      lengthM: project.dimensions.lengthM,
      widthM: project.dimensions.widthM,
      lineColor: project.materials.lineColor,
      paintColor: project.materials.paintColor,
      lineWidthM: 0.05,
      offsetX: 0,
      offsetZ: 0,
      rotationDeg: 0,
      isHalfCourt: project.dimensions.isHalfCourt,
    },
  ];
}

// --- Three.js BufferGeometry Compiler ---

function flatSeg(x1: number, z1: number, x2: number, z2: number, widthM: number): THREE.BufferGeometry {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.max(0.001, Math.hypot(dx, dz));
  const geo = new THREE.PlaneGeometry(len, widthM);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(-Math.atan2(dz, dx));
  geo.translate((x1 + x2) / 2, 0, (z1 + z2) / 2);
  return geo;
}

function flatPlane(w: number, d: number, cx: number, cz: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(Math.max(0.001, w), Math.max(0.001, d));
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, 0, cz);
  return geo;
}

function flatArcRibbon(
  innerR: number,
  outerR: number,
  segments: number,
  startAngle: number,
  endAngle: number,
  cx: number,
  cz: number
): THREE.BufferGeometry {
  const rIn = Math.max(0.001, innerR);
  const rOut = Math.max(rIn + 0.002, outerR);
  const a0 = Math.min(startAngle, endAngle);
  const a1 = Math.max(startAngle, endAngle);
  const segs = Math.max(4, segments);
  const positions = new Float32Array(segs * 6 * 3);
  const normals = new Float32Array(segs * 6 * 3);
  const uvs = new Float32Array(segs * 6 * 2);

  let vi = 0;
  let ui = 0;
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + (i / segs) * (a1 - a0);
    const t1 = a0 + ((i + 1) / segs) * (a1 - a0);
    const c0 = Math.cos(t0);
    const s0 = Math.sin(t0);
    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);

    const ix0 = cx + c0 * rIn;
    const iz0 = cz + s0 * rIn;
    const ox0 = cx + c0 * rOut;
    const oz0 = cz + s0 * rOut;
    const ix1 = cx + c1 * rIn;
    const iz1 = cz + s1 * rIn;
    const ox1 = cx + c1 * rOut;
    const oz1 = cz + s1 * rOut;

    // Two CCW triangles facing +Y in XZ (winding: right-hand rule Y-up)
    const tris = [
      ix0, 0, iz0,
      ox1, 0, oz1,
      ox0, 0, oz0,
      ix0, 0, iz0,
      ix1, 0, iz1,
      ox1, 0, oz1,
    ];
    for (let k = 0; k < 18; k += 3) {
      positions[vi] = tris[k];
      positions[vi + 1] = tris[k + 1];
      positions[vi + 2] = tris[k + 2];
      normals[vi] = 0;
      normals[vi + 1] = 1;
      normals[vi + 2] = 0;
      vi += 3;
      uvs[ui++] = i / segs;
      uvs[ui++] = k % 6 === 0 ? 0 : 1;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

function flatSector(
  r: number,
  segments: number,
  startAngle: number,
  endAngle: number,
  cx: number,
  cz: number
): THREE.BufferGeometry {
  const rad = Math.max(0.01, r);
  const a0 = Math.min(startAngle, endAngle);
  const a1 = Math.max(startAngle, endAngle);
  const segs = Math.max(6, segments);
  const positions = new Float32Array(segs * 3 * 3);
  const normals = new Float32Array(segs * 3 * 3);
  const uvs = new Float32Array(segs * 3 * 2);

  let vi = 0;
  let ui = 0;
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + (i / segs) * (a1 - a0);
    const t1 = a0 + ((i + 1) / segs) * (a1 - a0);
    const x0 = cx + Math.cos(t0) * rad;
    const z0 = cz + Math.sin(t0) * rad;
    const x1 = cx + Math.cos(t1) * rad;
    const z1 = cz + Math.sin(t1) * rad;

    const verts = [cx, 0, cz, x1, 0, z1, x0, 0, z0];
    for (let k = 0; k < 9; k += 3) {
      positions[vi] = verts[k];
      positions[vi + 1] = verts[k + 1];
      positions[vi + 2] = verts[k + 2];
      normals[vi] = 0;
      normals[vi + 1] = 1;
      normals[vi + 2] = 0;
      vi += 3;
      uvs[ui++] = 0.5;
      uvs[ui++] = 0.5;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

function flatDisc(r: number, segments: number, cx: number, cz: number): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(Math.max(0.005, r), segments);
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, 0, cz);
  return geo;
}

function safeMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 0) return new THREE.BufferGeometry();
  const nonIndexed = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(nonIndexed, false);
  parts.forEach((g) => g.dispose());
  nonIndexed.forEach((g) => g.dispose());
  return merged ?? new THREE.BufferGeometry();
}

export interface CompiledLayerThreeGeo {
  layerId: string;
  lineColor: string;
  paintColor?: string;
  offsetX: number;
  offsetZ: number;
  rotationRad: number;
  paintGeometry: THREE.BufferGeometry;
  linesGeometry: THREE.BufferGeometry;
}

export function compileLayerToThreeGeometry(layer: SportMarkingLayer): CompiledLayerThreeGeo {
  const prims = buildPrimitivesForLayer(layer);
  const paintParts: THREE.BufferGeometry[] = [];
  const lineParts: THREE.BufferGeometry[] = [];

  for (const p of prims) {
    if (p.role === 'paint') {
      if (p.kind === 'rect') {
        paintParts.push(flatPlane(p.w, p.h, p.x, p.z));
      } else if (p.kind === 'circle') {
        paintParts.push(flatDisc(p.r, 48, p.cx, p.cz));
      } else if (p.kind === 'arc') {
        paintParts.push(flatSector(p.r, 24, p.startAngle, p.endAngle, p.cx, p.cz));
      }
      continue;
    }

    if (p.kind === 'line') {
      if (!p.dashed) {
        lineParts.push(flatSeg(p.x1, p.z1, p.x2, p.z2, p.widthM));
      } else {
        const [dash, gap] = p.dashed;
        const total = Math.hypot(p.x2 - p.x1, p.z2 - p.z1);
        const step = dash + gap;
        if (total > 0.01 && step > 0.01) {
          for (let d = 0; d < total; d += step) {
            const t0 = d / total;
            const t1 = Math.min(1, (d + dash) / total);
            lineParts.push(
              flatSeg(
                p.x1 + (p.x2 - p.x1) * t0,
                p.z1 + (p.z2 - p.z1) * t0,
                p.x1 + (p.x2 - p.x1) * t1,
                p.z1 + (p.z2 - p.z1) * t1,
                p.widthM
              )
            );
          }
        }
      }
    } else if (p.kind === 'rect') {
      const hw = p.w / 2;
      const hh = p.h / 2;
      const hl = p.lineWidthM / 2;
      lineParts.push(flatPlane(p.w, p.lineWidthM, p.x, p.z - (hh - hl)));
      lineParts.push(flatPlane(p.w, p.lineWidthM, p.x, p.z + (hh - hl)));
      lineParts.push(flatPlane(p.lineWidthM, p.h, p.x - (hw - hl), p.z));
      lineParts.push(flatPlane(p.lineWidthM, p.h, p.x + (hw - hl), p.z));
    } else if (p.kind === 'circle') {
      if (p.filled) {
        lineParts.push(flatDisc(p.r, 24, p.cx, p.cz));
      } else {
        lineParts.push(flatArcRibbon(p.r - p.widthM, p.r, 64, 0, Math.PI * 2, p.cx, p.cz));
      }
    } else if (p.kind === 'arc') {
      const span = p.endAngle - p.startAngle;
      if (!p.dashed) {
        lineParts.push(flatArcRibbon(p.r - p.widthM, p.r, 64, p.startAngle, p.endAngle, p.cx, p.cz));
      } else {
        const [dash, gap] = p.dashed;
        const arcLen = Math.max(0.1, Math.abs(span) * p.r);
        const count = Math.max(4, Math.floor(arcLen / (dash + gap)));
        const segSpan = span / count;
        const dashRatio = dash / (dash + gap);
        for (let i = 0; i < count; i++) {
          const sa = p.startAngle + i * segSpan + segSpan * ((1 - dashRatio) / 2);
          lineParts.push(
            flatArcRibbon(p.r - p.widthM, p.r, 6, sa, sa + segSpan * dashRatio, p.cx, p.cz)
          );
        }
      }
    }
  }

  return {
    layerId: layer.id,
    lineColor: layer.lineColor,
    paintColor: layer.paintColor,
    offsetX: layer.offsetX,
    offsetZ: layer.offsetZ,
    rotationRad: (layer.rotationDeg * Math.PI) / 180,
    paintGeometry: safeMerge(paintParts),
    linesGeometry: safeMerge(lineParts),
  };
}

/**
 * Helper used by TechnicalPlanSvg & pdfExport to sample any arc/circle into 2D (x, z) points
 * with exact layer translation & rotation already applied.
 */
export function transformPoint2D(
  x: number,
  z: number,
  layer: Pick<SportMarkingLayer, 'offsetX' | 'offsetZ' | 'rotationDeg'>
): [number, number] {
  const rad = (layer.rotationDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  // Three.js Y-rotation by +rad maps (x, z) -> (x*cos + z*sin, -x*sin + z*cos)
  return [x * c + z * s + layer.offsetX, -x * s + z * c + layer.offsetZ];
}

export function sampleArcPoints2D(
  cx: number,
  cz: number,
  r: number,
  startAngle: number,
  endAngle: number,
  steps = 36
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (i / steps) * (endAngle - startAngle);
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return pts;
}
