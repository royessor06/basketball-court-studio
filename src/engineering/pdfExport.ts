import { jsPDF } from 'jspdf';
import {
  COURT_STANDARDS,
  defaultEngineeringAssumptions,
  formatArea,
  formatLength,
  GROUND_SYSTEM_PRESETS,
} from '../constants/courtStandards';
import {
  BomSummary,
  ConstructionWorkflowSummary,
  CostEstimateSummary,
  ENGINEERING_VALIDATION_NOTICE,
  formatFcfa,
  getActiveSportEquipment,
} from './courtCalculations';
import {
  computeDrawingScaleRatio,
  PlanVisualStyle,
  TECHNICAL_SHEETS,
  TechnicalSheetId,
} from '../components/engineering/TechnicalPlanSvg';
import {
  buildPrimitivesForLayer,
  resolveEffectiveSportLayers,
  sampleArcPoints2D,
  transformPoint2D,
} from '../sports/markingPrimitives';
import { CourtProject } from '../types/court';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'sports-facility'
  );
}

function pdfSafe(text: string): string {
  return text
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/→/g, '->')
    .replace(/—|–/g, '-')
    .replace(/·/g, '|')
    .replace(/±/g, '+/-')
    .replace(/×/g, 'x');
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [230, 240, 250];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return [230, 240, 250];
  return [r, g, b];
}

function drawDocumentHeader(
  doc: jsPDF,
  project: CourtProject,
  docTitle: string,
  subtitle: string
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const spec = COURT_STANDARDS[project.standard] ?? COURT_STANDARDS.FIBA;
  doc.setFillColor(17, 19, 24);
  doc.rect(0, 0, pageW, 24, 'F');

  doc.setFillColor(240, 120, 39);
  doc.rect(0, 24, pageW, 1.2, 'F');

  doc.setTextColor(242, 244, 247);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MY3D STUDIO | SPORTS GROUND ENGINEERING', 14, 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(154, 164, 178);
  doc.text(pdfSafe(docTitle), 14, 16.5);
  doc.text(pdfSafe(subtitle), 14, 21);

  doc.setTextColor(242, 244, 247);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(pdfSafe(project.name), pageW - 14, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(154, 164, 178);
  doc.text(
    pdfSafe(
      `${spec.shortLabel} | ${project.environment.toUpperCase()} | ${formatLength(
        project.dimensions.lengthM,
        project.unit
      )} x ${formatLength(project.dimensions.widthM, project.unit)}`
    ),
    pageW - 14,
    17,
    { align: 'right' }
  );
  return 32;
}

function drawPageFooter(doc: jsPDF, pageNum: number, note: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(215, 220, 228);
  doc.line(14, pageH - 13, pageW - 14, pageH - 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 110, 125);
  doc.text(pdfSafe(note), 14, pageH - 8.5, { maxWidth: pageW - 48 });
  doc.text(`Page ${pageNum}`, pageW - 14, pageH - 8.5, { align: 'right' });
}

function drawCadSheetPage(
  doc: jsPDF,
  project: CourtProject,
  sheetId: TechnicalSheetId,
  style: PlanVisualStyle
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
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
  const sheetMeta = TECHNICAL_SHEETS.find((s) => s.id === sheetId) ?? TECHNICAL_SHEETS[0];
  const effectiveLayers = resolveEffectiveSportLayers(project).filter((l) => l.visible);
  const equipmentList = getActiveSportEquipment(project);
  const taggedEquipment = equipmentList.map((obj, idx) => ({
    obj,
    tag: `E${idx + 1}`,
  }));

  const isTech = style === 'technical';
  if (isTech) {
    doc.setFillColor(10, 18, 32);
    doc.rect(0, 0, pageW, pageH, 'F');
  } else {
    doc.setFillColor(250, 251, 253);
    doc.rect(0, 0, pageW, pageH, 'F');
  }

  doc.setDrawColor(isTech ? 56 : 70, isTech ? 120 : 85, isTech ? 185 : 105);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  doc.setDrawColor(isTech ? 22 : 230, isTech ? 42 : 234, isTech ? 72 : 240);
  doc.setLineWidth(0.15);
  for (let gx = 18; gx < pageW - 12; gx += 12) {
    doc.line(gx, 10, gx, pageH - 36);
  }
  for (let gy = 16; gy < pageH - 36; gy += 12) {
    doc.line(10, gy, pageW - 10, gy);
  }

  const areaX = 20;
  const areaY = 16;
  const areaW = 257;
  const areaH = 148;
  const cx = areaX + areaW / 2;
  const cy = areaY + areaH / 2;

  const setStroke = (r: number, g: number, b: number, w = 0.4) => {
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(w);
  };

  if (sheetId === 'front_elevation' || sheetId === 'side_elevation') {
    const span = sheetId === 'front_elevation' ? totalW + 4 : totalL + 4;
    const playSpan = sheetId === 'front_elevation' ? widthM : lengthM;
    const maxPole = equipmentList
      .filter((o) => o.type === 'lighting_mast')
      .reduce((m, o) => Math.max(m, o.metadata?.poleHeightM ?? (totalL > 55 ? 12 : 6.5)), 6.5);
    const maxH = Math.max(7.8, maxPole + 1.5);
    const sc = Math.min((areaW - 24) / span, (areaH - 30) / maxH);
    const groundY = areaY + areaH - 22;
    const ex = (m: number) => cx + m * sc;
    const ey = (h: number) => groundY - h * sc;

    setStroke(isTech ? 140 : 90, isTech ? 170 : 105, isTech ? 205 : 120, 0.3);
    doc.line(areaX + 8, groundY, areaX + areaW - 8, groundY);

    const slabPx = Math.max(2.5, assumptions.slabThicknessM * sc);
    const basePx = Math.max(2.5, assumptions.subBaseThicknessM * sc);
    doc.setFillColor(isTech ? 24 : 210, isTech ? 48 : 216, isTech ? 84 : 225);
    doc.rect(ex(-(span - 4) / 2), groundY, (span - 4) * sc, slabPx, 'FD');
    if (groundSystem !== 'existing_slab') {
      doc.setFillColor(isTech ? 18 : 190, isTech ? 34 : 196, isTech ? 58 : 206);
      doc.rect(ex(-(span - 4) / 2), groundY + slabPx, (span - 4) * sc, basePx, 'FD');
    }

    setStroke(240, 120, 39, 0.9);
    doc.line(ex(-playSpan / 2), groundY, ex(playSpan / 2), groundY);

    // Masts
    equipmentList
      .filter((o) => o.type === 'lighting_mast')
      .forEach((m) => {
        const ph = m.metadata?.poleHeightM ?? (totalL > 55 ? 12 : 6.5);
        const mx = ex(sheetId === 'front_elevation' ? m.position[2] : m.position[0]);
        setStroke(56, 189, 248, 0.65);
        doc.line(mx, groundY, mx, ey(ph));
      });

    // Hoops
    equipmentList
      .filter((o) => o.type === 'hoop_assembly')
      .forEach((h) => {
        const rimH = h.metadata?.rimHeightM ?? 3.05;
        const reach = h.metadata?.extensionArmM ?? 2.05;
        if (sheetId === 'front_elevation') {
          const px = ex(h.position[2]);
          setStroke(240, 120, 39, 0.8);
          doc.line(px, groundY, px, ey(rimH + 0.6));
          setStroke(isTech ? 230 : 20, isTech ? 242 : 24, isTech ? 255 : 32, 0.55);
          doc.rect(px - 0.9 * sc, ey(rimH + 0.9), 1.8 * sc, 1.05 * sc);
        } else {
          const dir = Math.cos(h.rotationY) >= 0 ? 1 : -1;
          const postX = ex(h.position[0]);
          const boardX = ex(h.position[0] + dir * reach);
          setStroke(240, 120, 39, 0.8);
          doc.line(postX, groundY, postX, ey(rimH + 0.25));
          doc.line(postX, ey(rimH + 0.15), boardX, ey(rimH + 0.15));
          setStroke(isTech ? 230 : 20, isTech ? 242 : 24, isTech ? 255 : 32, 0.65);
          doc.line(boardX, ey(rimH - 0.15), boardX, ey(rimH + 0.9));
          setStroke(240, 120, 39, 0.8);
          doc.line(boardX, ey(rimH), ex(h.position[0] + dir * (reach + 0.55)), ey(rimH));
        }
      });

    // Goals
    equipmentList
      .filter(
        (o) =>
          o.type === 'football_goal' ||
          o.type === 'handball_goal' ||
          o.type === 'multisport_combo_goal'
      )
      .forEach((g) => {
        const gw = g.metadata?.goalWidthM ?? 3.0;
        const gh = g.metadata?.goalHeightM ?? 2.0;
        const gd = g.metadata?.goalDepthM ?? 1.4;
        setStroke(isTech ? 230 : 20, isTech ? 242 : 24, isTech ? 255 : 32, 0.7);
        if (sheetId === 'front_elevation') {
          doc.rect(ex(g.position[2] - gw / 2), ey(gh), gw * sc, gh * sc);
        } else {
          const dir = Math.cos(g.rotationY) >= 0 ? 1 : -1;
          doc.rect(ex(g.position[0] - (dir > 0 ? gd : 0)), ey(gh), gd * sc, gh * sc);
        }
      });

    // Nets
    equipmentList
      .filter((o) => o.type === 'volleyball_net' || o.type === 'tennis_net')
      .forEach((n) => {
        const nw = n.metadata?.netWidthM ?? widthM + 1.0;
        const nh = n.metadata?.netHeightM ?? (n.type === 'tennis_net' ? 1.07 : 2.43);
        setStroke(240, 120, 39, 0.8);
        if (sheetId === 'front_elevation') {
          doc.line(ex(-nw / 2), groundY, ex(-nw / 2), ey(nh));
          doc.line(ex(nw / 2), groundY, ex(nw / 2), ey(nh));
          doc.rect(ex(-nw / 2), ey(nh), nw * sc, Math.min(nh, 1.0) * sc);
        } else {
          doc.line(ex(n.position[0]), groundY, ex(n.position[0]), ey(nh));
        }
      });

    doc.setTextColor(isTech ? 230 : 15, isTech ? 242 : 23, isTech ? 255 : 42);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      pdfSafe(
        `${sheetId === 'front_elevation' ? 'Total Width' : 'Total Length'}: ${formatLength(
          span - 4,
          project.unit
        )} | Playing: ${formatLength(playSpan, project.unit)} | Build-up: ${groundPreset.shortLabel}`
      ),
      cx,
      groundY + slabPx + basePx + 10,
      { align: 'center' }
    );
  } else {
    // Plan sheets via single-source marking primitives
    const mmPerM = Math.min((areaW - 26) / (totalL + 2.5), (areaH - 22) / (totalW + 2.5));
    const tx = (mx: number) => cx + mx * mmPerM;
    const tz = (mz: number) => cy + mz * mmPerM;

    // Slab / Footprint
    doc.setFillColor(isTech ? 16 : 228, isTech ? 31 : 232, isTech ? 56 : 238);
    setStroke(isTech ? 56 : 70, isTech ? 189 : 85, isTech ? 248 : 105, 0.45);
    doc.rect(tx(-totalL / 2), tz(-totalW / 2), totalL * mmPerM, totalW * mmPerM, 'FD');

    // Playing surface
    const surfRgb = isTech ? [20, 44, 80] : hexToRgb(project.materials.surfaceColor);
    doc.setFillColor(surfRgb[0], surfRgb[1], surfRgb[2]);
    setStroke(isTech ? 235 : 20, isTech ? 244 : 25, isTech ? 255 : 35, 0.55);
    doc.rect(tx(-lengthM / 2), tz(-widthM / 2), lengthM * mmPerM, widthM * mmPerM, 'FD');

    effectiveLayers.forEach((layer, layerIdx) => {
      const prims = buildPrimitivesForLayer(layer);
      const [lr, lg, lb] = isTech
        ? layerIdx === 0
          ? [235, 244, 255]
          : hexToRgb(layer.lineColor)
        : effectiveLayers.length > 1
        ? hexToRgb(layer.lineColor)
        : [20, 25, 35];

      const [pr, pg, pb] = layer.paintColor
        ? hexToRgb(layer.paintColor)
        : isTech
        ? [30, 58, 102]
        : hexToRgb(project.materials.paintColor);

      const toMm = (lx: number, lz: number): [number, number] => {
        const [wx, wz] = transformPoint2D(lx, lz, layer);
        return [tx(wx), tz(wz)];
      };

      // Paint pass
      doc.setFillColor(pr, pg, pb);
      prims
        .filter((p) => p.role === 'paint')
        .forEach((p) => {
          if (p.kind === 'rect') {
            const pts = [
              toMm(p.x - p.w / 2, p.z - p.h / 2),
              toMm(p.x + p.w / 2, p.z - p.h / 2),
              toMm(p.x + p.w / 2, p.z + p.h / 2),
              toMm(p.x - p.w / 2, p.z + p.h / 2),
            ];
            doc.triangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1], 'F');
            doc.triangle(pts[0][0], pts[0][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1], 'F');
          } else if (p.kind === 'circle') {
            const [cxMm, czMm] = toMm(p.cx, p.cz);
            doc.circle(cxMm, czMm, p.r * mmPerM, 'F');
          }
        });

      // Line pass
      setStroke(lr, lg, lb, Math.max(0.25, Math.min(0.65, layer.lineWidthM * mmPerM * 1.1)));
      prims
        .filter((p) => p.role === 'line')
        .forEach((p) => {
          if (p.kind === 'line') {
            const [x1, y1] = toMm(p.x1, p.z1);
            const [x2, y2] = toMm(p.x2, p.z2);
            if (!p.dashed) {
              doc.line(x1, y1, x2, y2);
            } else {
              const total = Math.hypot(x2 - x1, y2 - y1);
              const dashMm = Math.max(0.8, p.dashed[0] * mmPerM);
              const gapMm = Math.max(0.8, p.dashed[1] * mmPerM);
              const step = dashMm + gapMm;
              if (total > 0.2) {
                for (let d = 0; d < total; d += step) {
                  const t0 = d / total;
                  const t1 = Math.min(1, (d + dashMm) / total);
                  doc.line(
                    x1 + (x2 - x1) * t0,
                    y1 + (y2 - y1) * t0,
                    x1 + (x2 - x1) * t1,
                    y1 + (y2 - y1) * t1
                  );
                }
              }
            }
          } else if (p.kind === 'rect') {
            const pts = [
              toMm(p.x - p.w / 2, p.z - p.h / 2),
              toMm(p.x + p.w / 2, p.z - p.h / 2),
              toMm(p.x + p.w / 2, p.z + p.h / 2),
              toMm(p.x - p.w / 2, p.z + p.h / 2),
            ];
            for (let i = 0; i < 4; i++) {
              const a = pts[i];
              const b = pts[(i + 1) % 4];
              doc.line(a[0], a[1], b[0], b[1]);
            }
          } else if (p.kind === 'circle') {
            const [cxMm, czMm] = toMm(p.cx, p.cz);
            doc.circle(cxMm, czMm, Math.max(0.4, p.r * mmPerM), p.filled ? 'F' : 'S');
          } else if (p.kind === 'arc') {
            const pts = sampleArcPoints2D(p.cx, p.cz, p.r, p.startAngle, p.endAngle, 28);
            for (let i = 0; i < pts.length - 1; i++) {
              if (p.dashed && i % 2 === 1) continue;
              const [x1, y1] = toMm(pts[i][0], pts[i][1]);
              const [x2, y2] = toMm(pts[i + 1][0], pts[i + 1][1]);
              doc.line(x1, y1, x2, y2);
            }
          }
        });
    });

    // Equipment overlay with consistent E1..En tags
    const filteredEquip =
      sheetId === 'lighting_fencing_plan'
        ? taggedEquipment.filter(({ obj }) =>
            [
              'lighting_mast',
              'perimeter_fence',
              'hoop_assembly',
              'football_goal',
              'handball_goal',
              'multisport_combo_goal',
            ].includes(obj.type)
          )
        : taggedEquipment;

    filteredEquip.forEach(({ obj, tag }) => {
      const px = tx(obj.position[0]);
      const pz = tz(obj.position[2]);
      if (obj.type === 'perimeter_fence') {
        const span = obj.metadata?.fenceLengthM ?? totalL * 0.72;
        const dx = Math.cos(obj.rotationY) * (span / 2) * mmPerM;
        const dz = -Math.sin(obj.rotationY) * (span / 2) * mmPerM;
        setStroke(240, 120, 39, 0.85);
        doc.line(px - dx, pz - dz, px + dx, pz + dz);
      } else if (obj.type === 'volleyball_net' || obj.type === 'tennis_net') {
        const nw = (obj.metadata?.netWidthM ?? widthM + 1.0) * mmPerM;
        const dx = Math.sin(obj.rotationY) * (nw / 2);
        const dz = Math.cos(obj.rotationY) * (nw / 2);
        setStroke(240, 120, 39, 0.85);
        doc.line(px - dx, pz - dz, px + dx, pz + dz);
      } else {
        doc.setFillColor(240, 120, 39);
        doc.circle(px, pz, 1.3, 'F');
      }
      if (sheetId === 'equipment_plan' || sheetId === 'lighting_fencing_plan') {
        doc.setTextColor(isTech ? 235 : 20, isTech ? 245 : 25, isTech ? 255 : 35);
        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.text(tag, px + 2, pz - 1.5);
      }
    });

    doc.setTextColor(isTech ? 56 : 15, isTech ? 189 : 94, isTech ? 248 : 156);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      pdfSafe(
        `Playing: ${formatLength(lengthM, project.unit)} x ${formatLength(
          widthM,
          project.unit
        )} | Safety Apron: +${formatLength(apronM, project.unit)} | Ground: ${groundPreset.shortLabel}`
      ),
      cx,
      tz(totalW / 2) + 8,
      { align: 'center' }
    );
  }

  // Title block bottom bar
  const tbY = pageH - 34;
  doc.setFillColor(isTech ? 13 : 241, isTech ? 23 : 244, isTech ? 39 : 248);
  setStroke(isTech ? 56 : 100, isTech ? 120 : 116, isTech ? 185 : 139, 0.45);
  doc.rect(10, tbY, pageW - 20, 24, 'FD');
  doc.line(120, tbY, 120, tbY + 24);
  doc.line(215, tbY, 215, tbY + 24);
  doc.line(255, tbY, 255, tbY + 24);

  doc.setTextColor(isTech ? 242 : 15, isTech ? 244 : 23, isTech ? 247 : 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(pdfSafe(project.name), 14, tbY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(isTech ? 148 : 71, isTech ? 163 : 85, isTech ? 184 : 105);
  doc.text(pdfSafe(`${project.client || 'Private Client'} | ${project.location || 'Site TBD'}`), 14, tbY + 15.5);
  doc.text(pdfSafe('Verify all structural dimensions on site before construction.'), 14, tbY + 21);

  doc.setTextColor(isTech ? 56 : 15, isTech ? 189 : 94, isTech ? 248 : 156);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(`SHEET ${sheetMeta.sheetNo}`, 124, tbY + 7);
  doc.setTextColor(isTech ? 242 : 15, isTech ? 244 : 23, isTech ? 247 : 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(pdfSafe(sheetMeta.title), 124, tbY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(isTech ? 148 : 71, isTech ? 163 : 85, isTech ? 184 : 105);
  doc.text(pdfSafe(sheetMeta.subtitle), 124, tbY + 19.5, { maxWidth: 88 });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(pdfSafe(`${spec.shortLabel} | ${project.environment.toUpperCase()}`), 219, tbY + 8.5);
  doc.text(pdfSafe(`AREA: ${formatArea(totalL * totalW, project.unit)}`), 219, tbY + 15);
  doc.text(pdfSafe(`NORTH: ${orientationDeg} deg`), 219, tbY + 21);

  doc.setTextColor(240, 120, 39);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(`1:${scaleRatio}`, 260, tbY + 11.5);
  doc.setFontSize(7.5);
  doc.setTextColor(isTech ? 148 : 71, isTech ? 163 : 85, isTech ? 184 : 105);
  doc.text(`UNIT: ${project.unit.toUpperCase()}`, 260, tbY + 19);
}

function appendBomPages(doc: jsPDF, project: CourtProject, bom: BomSummary, startPageNum: number): number {
  let pageNum = startPageNum;
  let y = drawDocumentHeader(
    doc,
    project,
    'BILL OF MATERIALS & ENGINEERING TAKEOFF',
    `Derived from ${formatLength(project.dimensions.lengthM, project.unit)} x ${formatLength(
      project.dimensions.widthM,
      project.unit
    )} playing zone + ${formatLength(project.dimensions.apronM, project.unit)} apron (${bom.groundSystemLabel})`
  );

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, 24, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Structural & Takeoff Assumptions:', 17, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  bom.engineeringNotes.slice(0, 3).forEach((note, idx) => {
    doc.text(pdfSafe(`- ${note}`), 17, y + 11 + idx * 4, { maxWidth: 176 });
  });
  y += 29;

  const drawTableHeader = () => {
    doc.setFillColor(26, 32, 41);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setTextColor(242, 244, 247);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Category', 16, y + 5);
    doc.text('Material / Scope Item', 52, y + 5);
    doc.text('Basis / Spec', 120, y + 5);
    doc.text('Qty', 173, y + 5, { align: 'right' });
    doc.text('Unit', 180, y + 5);
    y += 8.5;
  };

  drawTableHeader();

  bom.items.forEach((item, idx) => {
    if (y > 272) {
      drawPageFooter(doc, pageNum, ENGINEERING_VALIDATION_NOTICE);
      doc.addPage('a4', 'portrait');
      pageNum++;
      y = drawDocumentHeader(doc, project, 'BILL OF MATERIALS (CONT.)', '');
      drawTableHeader();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7, 'F');
    }
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.text(pdfSafe(item.categoryLabel), 16, y, { maxWidth: 34 });

    doc.setFont('helvetica', 'normal');
    doc.text(pdfSafe(item.name), 52, y, { maxWidth: 66 });
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(item.basis), 120, y, { maxWidth: 44 });

    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.quantity), 173, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(pdfSafe(item.unit), 180, y);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 2.5, 196, y + 2.5);
    y += 7;
  });

  drawPageFooter(doc, pageNum, ENGINEERING_VALIDATION_NOTICE);
  return pageNum;
}

function appendCostPages(
  doc: jsPDF,
  project: CourtProject,
  cost: CostEstimateSummary,
  startPageNum: number
): number {
  let pageNum = startPageNum;
  let y = drawDocumentHeader(
    doc,
    project,
    'INDICATIVE PROJECT COST ESTIMATE (FCFA)',
    'Materials, Labour, Equipment, Transport, Overheads & Contingency'
  );

  doc.setFillColor(255, 244, 235);
  doc.setDrawColor(240, 120, 39);
  doc.setLineWidth(0.5);
  doc.rect(14, y, 182, 16, 'FD');
  doc.setTextColor(180, 72, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('INDICATIVE ESTIMATE NOTICE (SUPPLIER CONFIRMATION REQUIRED)', 17, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(92, 42, 14);
  doc.text(pdfSafe(cost.disclaimer), 17, y + 10, { maxWidth: 176 });
  y += 21;

  const summaryRows: Array<[string, string]> = [
    ['Materials Subtotal', formatFcfa(cost.materialsSubtotalFcfa)],
    ['Labour Costs', formatFcfa(cost.labourSubtotalFcfa)],
    ['Equipment & Plant Hire', formatFcfa(cost.equipmentSubtotalFcfa)],
    ['Transport & Haulage', formatFcfa(cost.transportSubtotalFcfa)],
    ['Additional Expenses', formatFcfa(cost.additionalSubtotalFcfa)],
    [`Contingency (${cost.contingencyPct}%)`, formatFcfa(cost.contingencyAmountFcfa)],
    ['TOTAL ESTIMATED PROJECT COST', formatFcfa(cost.grandTotalFcfa)],
  ];

  summaryRows.forEach(([label, val], i) => {
    const isTotal = i === summaryRows.length - 1;
    if (isTotal) {
      doc.setFillColor(26, 32, 41);
      doc.rect(14, y - 4, 182, 7.5, 'F');
      doc.setTextColor(240, 120, 39);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(8);
    doc.text(pdfSafe(label), 17, y);
    doc.setFont('courier', 'bold');
    doc.text(pdfSafe(val), 193, y, { align: 'right' });
    y += 6.2;
  });
  y += 5;

  const drawCostHeader = () => {
    doc.setFillColor(26, 32, 41);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(242, 244, 247);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.text('Section', 16, y + 4.8);
    doc.text('Line Item', 42, y + 4.8);
    doc.text('Qty', 118, y + 4.8, { align: 'right' });
    doc.text('Unit Price', 156, y + 4.8, { align: 'right' });
    doc.text('Total (FCFA)', 194, y + 4.8, { align: 'right' });
    y += 8;
  };
  drawCostHeader();

  cost.items.forEach((item, idx) => {
    if (y > 272) {
      drawPageFooter(doc, pageNum, cost.disclaimer);
      doc.addPage('a4', 'portrait');
      pageNum++;
      y = drawDocumentHeader(doc, project, 'COST ESTIMATE LINE ITEMS (CONT.)', '');
      drawCostHeader();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3.8, 182, 6.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(item.section.toUpperCase()), 16, y);
    doc.setTextColor(30, 41, 59);
    doc.text(pdfSafe(item.name), 42, y, { maxWidth: 66 });

    doc.setFont('courier', 'normal');
    doc.text(`${item.quantity} ${item.unit}`, 118, y, { align: 'right' });
    doc.text(pdfSafe(formatFcfa(item.unitPriceFcfa)), 156, y, { align: 'right' });
    doc.setFont('courier', 'bold');
    doc.text(pdfSafe(formatFcfa(item.totalFcfa)), 194, y, { align: 'right' });
    y += 6.5;
  });

  drawPageFooter(doc, pageNum, cost.disclaimer);
  return pageNum;
}

function appendSchedulePages(
  doc: jsPDF,
  project: CourtProject,
  schedule: ConstructionWorkflowSummary,
  startPageNum: number
): number {
  let pageNum = startPageNum;
  let y = drawDocumentHeader(
    doc,
    project,
    'CONSTRUCTION WORKFLOW & QUALITY SCHEDULE',
    `Ordered 10-Stage Execution Plan | Estimated Duration: ${schedule.totalDurationDays} Working Days`
  );

  schedule.stages.forEach((stage) => {
    if (y > 246) {
      drawPageFooter(doc, pageNum, ENGINEERING_VALIDATION_NOTICE);
      doc.addPage('a4', 'portrait');
      pageNum++;
      y = drawDocumentHeader(doc, project, 'CONSTRUCTION WORKFLOW (CONT.)', '');
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, 182, 29, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(240, 120, 39);
    doc.text(`STAGE ${stage.order}`, 17, y + 5.5);

    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(stage.title), 36, y + 5.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 134, 201);
    doc.text(
      `Days ${stage.startDay}-${stage.endDay} (${stage.durationDays} d)`,
      193,
      y + 5.5,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    doc.text(pdfSafe(stage.description), 17, y + 10.5, { maxWidth: 176 });
    doc.text(pdfSafe(`Materials: ${stage.requiredMaterials.join('; ')}`), 17, y + 19, {
      maxWidth: 176,
    });
    doc.setTextColor(15, 94, 156);
    doc.text(pdfSafe(`QC Checks: ${stage.qualityControlPoints.join(' | ')}`), 17, y + 24.5, {
      maxWidth: 176,
    });

    y += 32.5;
  });

  drawPageFooter(doc, pageNum, ENGINEERING_VALIDATION_NOTICE);
  return pageNum;
}

export function buildTechnicalPlansPdf(
  project: CourtProject,
  style: PlanVisualStyle = 'technical'
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  TECHNICAL_SHEETS.forEach((sheet, idx) => {
    if (idx > 0) doc.addPage('a4', 'landscape');
    drawCadSheetPage(doc, project, sheet.id, style);
  });
  return doc;
}

export function buildBomPdf(project: CourtProject, bom: BomSummary): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  appendBomPages(doc, project, bom, 1);
  return doc;
}

export function buildCostEstimatePdf(
  project: CourtProject,
  cost: CostEstimateSummary
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  appendCostPages(doc, project, cost, 1);
  return doc;
}

export function buildConstructionSchedulePdf(
  project: CourtProject,
  schedule: ConstructionWorkflowSummary
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  appendSchedulePages(doc, project, schedule, 1);
  return doc;
}

export function buildCompleteProjectReportPdf(
  project: CourtProject,
  bom: BomSummary,
  cost: CostEstimateSummary,
  schedule: ConstructionWorkflowSummary,
  style: PlanVisualStyle = 'architectural'
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const spec = COURT_STANDARDS[project.standard] ?? COURT_STANDARDS.FIBA;
  let pageNum = 1;
  let y = drawDocumentHeader(
    doc,
    project,
    'COMPLETE ENGINEERING, COST & CONSTRUCTION REPORT',
    `Generated ${new Date().toISOString().slice(0, 10)}`
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Executive Engineering Summary', 14, y);
  y += 7;

  const overviewPairs: Array<[string, string]> = [
    ['Project Name', project.name],
    ['Client / Site', `${project.client || 'Private Client'} | ${project.location || 'TBD'}`],
    ['Facility Standard & Env', `${spec.label} (${project.environment})`],
    ['Ground System & Sports', `${bom.groundSystemLabel} | ${bom.activeSportsSummary}`],
    [
      'Playing Court Area',
      `${formatLength(project.dimensions.lengthM, project.unit)} x ${formatLength(
        project.dimensions.widthM,
        project.unit
      )} (${formatArea(bom.playingAreaM2, project.unit)})`,
    ],
    [
      'Total Envelope Footprint',
      `${formatLength(project.dimensions.lengthM + project.dimensions.apronM * 2, project.unit)} x ${formatLength(
        project.dimensions.widthM + project.dimensions.apronM * 2,
        project.unit
      )} (${formatArea(bom.totalSlabAreaM2, project.unit)})`,
    ],
    [
      'Placed Equipment',
      `${bom.hoopCount} hoop(s) | ${bom.goalCount} goal(s) | ${bom.netCount} net(s) | ${bom.lightingMastCount} mast(s) | ${bom.fenceTotalLengthM} m fence`,
    ],
    ['Indicative Grand Total', `${formatFcfa(cost.grandTotalFcfa)} (incl. ${cost.contingencyPct}% contingency)`],
    ['Estimated Construction Duration', `${schedule.totalDurationDays} working days (10 ordered stages)`],
  ];

  overviewPairs.forEach(([k, v], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7.5, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(pdfSafe(k), 17, y);
    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(v), 193, y, { align: 'right' });
    y += 8;
  });

  y += 6;
  doc.setFillColor(255, 244, 235);
  doc.setDrawColor(240, 120, 39);
  doc.rect(14, y, 182, 32, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 72, 12);
  doc.text('ENGINEERING & COST VALIDATION NOTICE', 17, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 40, 20);
  doc.text(pdfSafe(ENGINEERING_VALIDATION_NOTICE), 17, y + 12, { maxWidth: 176 });
  doc.text(pdfSafe(cost.disclaimer), 17, y + 23, { maxWidth: 176 });

  drawPageFooter(doc, pageNum, ENGINEERING_VALIDATION_NOTICE);

  TECHNICAL_SHEETS.forEach((sheet) => {
    doc.addPage('a4', 'landscape');
    pageNum++;
    drawCadSheetPage(doc, project, sheet.id, style);
  });

  doc.addPage('a4', 'portrait');
  pageNum = appendBomPages(doc, project, bom, pageNum + 1);

  doc.addPage('a4', 'portrait');
  pageNum = appendCostPages(doc, project, cost, pageNum + 1);

  doc.addPage('a4', 'portrait');
  appendSchedulePages(doc, project, schedule, pageNum + 1);

  return doc;
}

export function exportTechnicalPlansPdf(project: CourtProject, style: PlanVisualStyle = 'technical') {
  const doc = buildTechnicalPlansPdf(project, style);
  doc.save(`${slugify(project.name)}-technical-plans.pdf`);
}

export function exportBomPdf(project: CourtProject, bom: BomSummary) {
  const doc = buildBomPdf(project, bom);
  doc.save(`${slugify(project.name)}-bill-of-materials.pdf`);
}

export function exportCostEstimatePdf(project: CourtProject, cost: CostEstimateSummary) {
  const doc = buildCostEstimatePdf(project, cost);
  doc.save(`${slugify(project.name)}-cost-estimate-fcfa.pdf`);
}

export function exportConstructionSchedulePdf(
  project: CourtProject,
  schedule: ConstructionWorkflowSummary
) {
  const doc = buildConstructionSchedulePdf(project, schedule);
  doc.save(`${slugify(project.name)}-construction-schedule.pdf`);
}

export function exportCompleteProjectReportPdf(
  project: CourtProject,
  bom: BomSummary,
  cost: CostEstimateSummary,
  schedule: ConstructionWorkflowSummary,
  style: PlanVisualStyle = 'architectural'
) {
  const doc = buildCompleteProjectReportPdf(project, bom, cost, schedule, style);
  doc.save(`${slugify(project.name)}-complete-project-report.pdf`);
}
