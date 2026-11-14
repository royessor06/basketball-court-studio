import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function flatPlane(w: number, h: number, x: number, z: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, 0, z);
  return geo;
}

function flatRing(
  innerR: number,
  outerR: number,
  segments: number,
  thetaStart: number,
  thetaLength: number,
  x: number,
  z: number
): THREE.BufferGeometry {
  const geo = new THREE.RingGeometry(innerR, outerR, segments, 1, thetaStart, thetaLength);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, 0, z);
  return geo;
}

function safeMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(normalized, false);
  parts.forEach((p) => p.dispose());
  normalized.forEach((n) => n.dispose());
  return merged || new THREE.BufferGeometry();
}

/**
 * Exact 5 cm boundary lines surrounding the L × W playing court.
 * Playing area inside the boundary lines is exact L × W (28 × 15 m = 420 m² for FIBA).
 */
export function createBoundaryLinesGeometry(
  lengthM: number,
  widthM: number,
  lineWidthM = 0.05
): THREE.BufferGeometry {
  const halfL = lengthM / 2;
  const halfW = widthM / 2;
  const halfLine = lineWidthM / 2;

  const north = flatPlane(lengthM + lineWidthM * 2, lineWidthM, 0, -(halfW + halfLine));
  const south = flatPlane(lengthM + lineWidthM * 2, lineWidthM, 0, halfW + halfLine);
  const west = flatPlane(lineWidthM, widthM + lineWidthM * 2, -(halfL + halfLine), 0);
  const east = flatPlane(lineWidthM, widthM + lineWidthM * 2, halfL + halfLine, 0);

  return safeMerge([north, south, west, east]);
}

/**
 * Centre division line (with 15 cm FIBA sideline overhang) + exact 1.80 m radius centre circle.
 */
export function createCentreLinesGeometry(
  widthM: number,
  centerRadiusM = 1.8,
  lineWidthM = 0.05
): THREE.BufferGeometry {
  const centreLine = flatPlane(lineWidthM, widthM + 0.3, 0, 0);
  const centreRing = flatRing(
    centerRadiusM - lineWidthM,
    centerRadiusM,
    96,
    0,
    Math.PI * 2,
    0,
    0
  );
  return safeMerge([centreLine, centreRing]);
}

/**
 * Centre circle interior fill disc (separate geometry so it can receive team/paint color).
 */
export function createCentreFillGeometry(
  centerRadiusM = 1.8,
  lineWidthM = 0.05
): THREE.BufferGeometry {
  const disc = new THREE.CircleGeometry(Math.max(0.1, centerRadiusM - lineWidthM), 96);
  disc.rotateX(-Math.PI / 2);
  return disc;
}

/**
 * Free-throw area solid paint fills (keys) + precision 5 cm lines, 1.80 m semicircles,
 * dashed inner arcs, rebound lane hash marks, and 1.25 m no-charge semi-circle.
 */
export function createFreeThrowGeometries(params: {
  lengthM: number;
  widthM: number;
  keyLengthM: number;
  keyWidthM: number;
  freeThrowRadiusM: number;
  restrictedRadiusM: number;
  basketOffsetM: number;
  backboardOffsetM: number;
  lineWidthM?: number;
  isHalfCourt: boolean;
}): { paintGeometry: THREE.BufferGeometry; linesGeometry: THREE.BufferGeometry } {
  const {
    lengthM,
    widthM,
    keyLengthM,
    keyWidthM,
    freeThrowRadiusM,
    restrictedRadiusM,
    basketOffsetM,
    backboardOffsetM,
    lineWidthM = 0.05,
    isHalfCourt,
  } = params;

  const halfL = lengthM / 2;
  const effKeyLen = Math.min(keyLengthM, isHalfCourt ? lengthM * 0.78 : lengthM * 0.44);
  const effKeyWid = Math.min(keyWidthM, widthM * 0.48);
  const halfKeyW = effKeyWid / 2;
  const halfLine = lineWidthM / 2;

  const paintParts: THREE.BufferGeometry[] = [];
  const lineParts: THREE.BufferGeometry[] = [];

  const addEnd = (dir: 1 | -1) => {
    const baselineX = -dir * halfL;
    const keyCenterX = baselineX + dir * (effKeyLen / 2);
    const ftLineX = baselineX + dir * (effKeyLen - halfLine);
    const basketX = baselineX + dir * basketOffsetM;
    const backboardX = baselineX + dir * backboardOffsetM;

    // 1. Key solid fill
    paintParts.push(flatPlane(effKeyLen, effKeyWid - lineWidthM * 2, keyCenterX, 0));

    // 2. Key perimeter lines (top/bottom lane lines + free-throw line)
    lineParts.push(flatPlane(effKeyLen, lineWidthM, keyCenterX, -(halfKeyW - halfLine)));
    lineParts.push(flatPlane(effKeyLen, lineWidthM, keyCenterX, halfKeyW - halfLine));
    lineParts.push(flatPlane(lineWidthM, effKeyWid, ftLineX, 0));

    // 3. Rebound lane space hash marks (FIBA distances from inner edge of baseline)
    const tickOffsets = [1.75, 2.6, 3.0, 3.85, 4.7];
    tickOffsets.forEach((dist, idx) => {
      if (dist < effKeyLen - 0.25) {
        const tx = baselineX + dir * dist;
        const tickWidth = idx === 1 ? 0.4 : 0.05; // 40 cm neutral zone block at 2.60 m
        const tickDepth = 0.1;
        lineParts.push(flatPlane(tickWidth, tickDepth, tx, -(halfKeyW + tickDepth / 2)));
        lineParts.push(flatPlane(tickWidth, tickDepth, tx, halfKeyW + tickDepth / 2));
      }
    });

    // 4. Solid outer free-throw semicircle (1.80 m radius)
    const outerStart = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
    lineParts.push(
      flatRing(
        freeThrowRadiusM - lineWidthM,
        freeThrowRadiusM,
        64,
        outerStart,
        Math.PI,
        ftLineX,
        0
      )
    );

    // 5. Dashed inner free-throw semicircle (8 dashes)
    const dashCount = 7;
    const span = Math.PI / dashCount;
    const innerStartBase = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    for (let d = 0; d < dashCount; d++) {
      lineParts.push(
        flatRing(
          freeThrowRadiusM - lineWidthM,
          freeThrowRadiusM,
          8,
          innerStartBase + d * span + span * 0.18,
          span * 0.64,
          ftLineX,
          0
        )
      );
    }

    // 6. No-charge restricted-area semi-circle (1.25 m radius centered under rim)
    lineParts.push(
      flatRing(
        restrictedRadiusM - lineWidthM,
        restrictedRadiusM,
        48,
        outerStart,
        Math.PI,
        basketX,
        0
      )
    );

    // Straight connecting legs from restricted arc to backboard line
    const legLen = Math.max(0.05, Math.abs(basketX - backboardX));
    const legCenterX = (basketX + backboardX) / 2;
    lineParts.push(
      flatPlane(legLen, lineWidthM, legCenterX, -(restrictedRadiusM - halfLine))
    );
    lineParts.push(
      flatPlane(legLen, lineWidthM, legCenterX, restrictedRadiusM - halfLine)
    );
  };

  addEnd(1);
  if (!isHalfCourt) {
    addEnd(-1);
  }

  return {
    paintGeometry: safeMerge(paintParts),
    linesGeometry: safeMerge(lineParts),
  };
}

/**
 * Exact 3-point arc (6.75 m FIBA / 7.24 m NBA) with parallel straight sideline sections.
 */
export function createThreePointLinesGeometry(params: {
  lengthM: number;
  widthM: number;
  threePointRadiusM: number;
  cornerInsetM: number;
  basketOffsetM: number;
  lineWidthM?: number;
  isHalfCourt: boolean;
}): THREE.BufferGeometry {
  const {
    lengthM,
    widthM,
    threePointRadiusM,
    cornerInsetM,
    basketOffsetM,
    lineWidthM = 0.05,
    isHalfCourt,
  } = params;

  const halfL = lengthM / 2;
  const halfW = widthM / 2;
  const halfLine = lineWidthM / 2;

  const maxArcRForLength = isHalfCourt
    ? Math.max(2.5, lengthM - basketOffsetM - 0.45)
    : Math.max(2.5, lengthM * 0.48);
  const effectiveR = Math.min(threePointRadiusM, maxArcRForLength);
  const cornerZ = Math.max(1.0, Math.min(halfW - cornerInsetM, effectiveR - 0.15));
  const innerArcR = effectiveR - lineWidthM;
  const midArcR = effectiveR - halfLine;

  const dx = Math.sqrt(Math.max(0.01, midArcR * midArcR - (cornerZ - halfLine) ** 2));
  const arcHalfAngle = Math.asin(Math.min(0.999, (cornerZ - halfLine) / midArcR));

  const parts: THREE.BufferGeometry[] = [];

  const addEnd = (dir: 1 | -1) => {
    const baselineX = -dir * halfL;
    const basketX = baselineX + dir * basketOffsetM;
    const straightLen = Math.max(0.2, basketOffsetM + dx);
    const straightCenterX = baselineX + dir * (straightLen / 2);

    // Parallel corner sections
    parts.push(flatPlane(straightLen, lineWidthM, straightCenterX, -(cornerZ - halfLine)));
    parts.push(flatPlane(straightLen, lineWidthM, straightCenterX, cornerZ - halfLine));

    // Arc connecting both parallel sections
    const startAngle = dir === 1 ? -arcHalfAngle : Math.PI - arcHalfAngle;
    parts.push(
      flatRing(innerArcR, effectiveR, 96, startAngle, arcHalfAngle * 2, basketX, 0)
    );
  };

  addEnd(1);
  if (!isHalfCourt) {
    addEnd(-1);
  }

  return safeMerge(parts);
}
