import { jsPDF } from 'jspdf';
import {
  COURT_STANDARDS,
  defaultEngineeringAssumptions,
  formatArea,
  formatLength,
} from '../constants/courtStandards';
import {
  BomSummary,
  ConstructionWorkflowSummary,
  CostEstimateSummary,
  ENGINEERING_VALIDATION_NOTICE,
  formatFcfa,
} from './courtCalculations';
import {
  computeDrawingScaleRatio,
  PlanVisualStyle,
  TECHNICAL_SHEETS,
  TechnicalSheetId,
} from '../components/engineering/TechnicalPlanSvg';
import { CourtProject } from '../types/court';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'basketball-court'
  );
}

function pdfSafe(text: string): string {
  return text
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/→/g, '->')
    .replace(/—|–/g, '-')
    .replace(/·/g, '|')
    .replace(/±/g, '+/-');
}

function drawDocumentHeader(
  doc: jsPDF,
  project: CourtProject,
  docTitle: string,
  subtitle: string
): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(17, 19, 24);
  doc.rect(0, 0, pageW, 24, 'F');

  doc.setFillColor(240, 120, 39);
  doc.rect(0, 24, pageW, 1.2, 'F');

  doc.setTextColor(242, 244, 247);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('BASKETBALL COURT STUDIO', 14, 10.5);

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
      `${COURT_STANDARDS[project.standard].shortLabel} | ${project.environment.toUpperCase()} | ${formatLength(
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
  const pageW = doc.internal.pageSize.getWidth(); // 297 mm landscape
  const pageH = doc.internal.pageSize.getHeight(); // 210 mm landscape
  const spec = COURT_STANDARDS[project.standard];
  const assumptions =
    project.engineeringAssumptions ?? defaultEngineeringAssumptions(project.environment);
  const { lengthM, widthM, apronM, isHalfCourt, orientationDeg } = project.dimensions;
  const totalL = lengthM + apronM * 2;
  const totalW = widthM + apronM * 2;
  const scaleRatio = computeDrawingScaleRatio(project);
  const sheetMeta = TECHNICAL_SHEETS.find((s) => s.id === sheetId) ?? TECHNICAL_SHEETS[0];

  const isTech = style === 'technical';
  if (isTech) {
    doc.setFillColor(10, 18, 32);
    doc.rect(0, 0, pageW, pageH, 'F');
  } else {
    doc.setFillColor(250, 251, 253);
    doc.rect(0, 0, pageW, pageH, 'F');
  }

  // Outer CAD frame
  doc.setDrawColor(isTech ? 56 : 70, isTech ? 120 : 85, isTech ? 185 : 105);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  // Subtle drawing grid
  doc.setDrawColor(isTech ? 22 : 230, isTech ? 42 : 234, isTech ? 72 : 240);
  doc.setLineWidth(0.15);
  for (let gx = 18; gx < pageW - 12; gx += 12) {
    doc.line(gx, 10, gx, pageH - 36);
  }
  for (let gy = 16; gy < pageH - 36; gy += 12) {
    doc.line(10, gy, pageW - 10, gy);
  }

  // Draw area bounds: x 18..279, y 14..166
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
    const sc = Math.min((areaW - 24) / span, (areaH - 30) / 7.5);
    const groundY = areaY + areaH - 22;
    const ex = (m: number) => cx + m * sc;
    const ey = (h: number) => groundY - h * sc;

    setStroke(isTech ? 140 : 90, isTech ? 170 : 105, isTech ? 205 : 120, 0.3);
    doc.line(areaX + 8, groundY, areaX + areaW - 8, groundY);

    const slabPx = Math.max(2.5, assumptions.slabThicknessM * sc);
    const basePx = Math.max(2.5, assumptions.subBaseThicknessM * sc);
    doc.setFillColor(isTech ? 24 : 210, isTech ? 48 : 216, isTech ? 84 : 225);
    doc.rect(ex(-(span - 4) / 2), groundY, (span - 4) * sc, slabPx, 'FD');
    doc.setFillColor(isTech ? 18 : 190, isTech ? 34 : 196, isTech ? 58 : 206);
    doc.rect(ex(-(span - 4) / 2), groundY + slabPx, (span - 4) * sc, basePx, 'FD');

    setStroke(240, 120, 39, 0.9);
    doc.line(ex(-playSpan / 2), groundY, ex(playSpan / 2), groundY);

    const hoops = project.objects.filter((o) => o.visible && o.type === 'hoop_assembly');
    hoops.forEach((h) => {
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

    doc.setTextColor(isTech ? 230 : 15, isTech ? 242 : 23, isTech ? 255 : 42);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      pdfSafe(
        `${sheetId === 'front_elevation' ? 'Total Width' : 'Total Length'}: ${formatLength(
          span - 4,
          project.unit
        )} | Playing: ${formatLength(playSpan, project.unit)} | Rim Height: ${formatLength(
          3.05,
          project.unit
        )}`
      ),
      cx,
      groundY + slabPx + basePx + 10,
      { align: 'center' }
    );
  } else {
    // Plan sheets
    const mmPerM = Math.min((areaW - 26) / (totalL + 2.5), (areaH - 22) / (totalW + 2.5));
    const tx = (mx: number) => cx + mx * mmPerM;
    const tz = (mz: number) => cy + mz * mmPerM;

    // Slab
    doc.setFillColor(isTech ? 16 : 228, isTech ? 31 : 232, isTech ? 56 : 238);
    setStroke(isTech ? 56 : 70, isTech ? 189 : 85, isTech ? 248 : 105, 0.45);
    doc.rect(tx(-totalL / 2), tz(-totalW / 2), totalL * mmPerM, totalW * mmPerM, 'FD');

    // Playing court
    doc.setFillColor(isTech ? 20 : 242, isTech ? 44 : 234, isTech ? 80 : 218);
    setStroke(isTech ? 235 : 20, isTech ? 244 : 25, isTech ? 255 : 35, 0.6);
    doc.rect(tx(-lengthM / 2), tz(-widthM / 2), lengthM * mmPerM, widthM * mmPerM, 'FD');

    // Key, centre circle & 3-point arc
    const keyW = Math.min(spec.keyWidthM, widthM * 0.48);
    const keyL = Math.min(spec.keyLengthM, isHalfCourt ? lengthM * 0.78 : lengthM * 0.44);
    const ftR = Math.min(spec.freeThrowRadiusM, keyW / 2);
    const ccR = Math.min(spec.centerCircleRadiusM, widthM * 0.25);
    const basketOff = Math.min(spec.basketCenterFromBaselineM, lengthM * 0.2);

    doc.rect(tx(-lengthM / 2), tz(-keyW / 2), keyL * mmPerM, keyW * mmPerM);
    doc.circle(tx(-lengthM / 2 + keyL), tz(0), ftR * mmPerM);

    const maxArcR = isHalfCourt
      ? Math.max(2.5, lengthM - basketOff - 0.45)
      : Math.max(2.5, lengthM * 0.48);
    const r3 = Math.min(spec.threePointRadiusM, maxArcR);
    const dy3 = Math.max(1.0, Math.min(widthM / 2 - spec.threePointCornerInsetM, r3 - 0.15));
    const cornerX = Math.sqrt(Math.max(0, r3 * r3 - dy3 * dy3));
    const arcHalfAngle = Math.asin(Math.min(0.999, dy3 / Math.max(1, r3)));

    const drawThreePtEnd = (dir: 1 | -1) => {
      const baseX = -dir * (lengthM / 2);
      const bskX = baseX + dir * basketOff;
      const startX = bskX + dir * cornerX;
      doc.line(tx(baseX), tz(-dy3), tx(startX), tz(-dy3));
      doc.line(tx(baseX), tz(dy3), tx(startX), tz(dy3));
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        const a0 = -arcHalfAngle + (i / steps) * (arcHalfAngle * 2);
        const a1 = -arcHalfAngle + ((i + 1) / steps) * (arcHalfAngle * 2);
        const x0 = bskX + dir * Math.cos(a0) * r3;
        const z0 = Math.sin(a0) * r3;
        const x1 = bskX + dir * Math.cos(a1) * r3;
        const z1 = Math.sin(a1) * r3;
        doc.line(tx(x0), tz(z0), tx(x1), tz(z1));
      }
    };
    drawThreePtEnd(1);

    if (!isHalfCourt) {
      doc.line(tx(0), tz(-widthM / 2), tx(0), tz(widthM / 2));
      doc.circle(tx(0), tz(0), ccR * mmPerM);
      doc.rect(tx(lengthM / 2 - keyL), tz(-keyW / 2), keyL * mmPerM, keyW * mmPerM);
      doc.circle(tx(lengthM / 2 - keyL), tz(0), ftR * mmPerM);
      drawThreePtEnd(-1);
    }

    // Equipment overlay
    const equip = project.objects.filter(
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
    equip.forEach((obj, idx) => {
      if (
        sheetId === 'lighting_fencing_plan' &&
        !['lighting_mast', 'perimeter_fence', 'hoop_assembly'].includes(obj.type)
      ) {
        return;
      }
      const px = tx(obj.position[0]);
      const pz = tz(obj.position[2]);
      if (obj.type === 'perimeter_fence') {
        const span = obj.metadata?.fenceLengthM ?? totalL * 0.72;
        const dx = Math.cos(obj.rotationY) * (span / 2) * mmPerM;
        const dz = -Math.sin(obj.rotationY) * (span / 2) * mmPerM;
        setStroke(240, 120, 39, 0.85);
        doc.line(px - dx, pz - dz, px + dx, pz + dz);
      } else {
        doc.setFillColor(240, 120, 39);
        doc.circle(px, pz, 1.4, 'F');
      }
      if (sheetId === 'equipment_plan' || sheetId === 'lighting_fencing_plan') {
        doc.setTextColor(isTech ? 235 : 20, isTech ? 245 : 25, isTech ? 255 : 35);
        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.text(`E${idx + 1}`, px + 2, pz - 1.5);
      }
    });

    // Dimensions text
    doc.setTextColor(isTech ? 56 : 15, isTech ? 189 : 94, isTech ? 248 : 156);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      pdfSafe(
        `Playing: ${formatLength(lengthM, project.unit)} x ${formatLength(
          widthM,
          project.unit
        )} | Safety Apron: +${formatLength(apronM, project.unit)} | Total Slab: ${formatLength(
          totalL,
          project.unit
        )} x ${formatLength(totalW, project.unit)}`
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
    )} playing court + ${formatLength(project.dimensions.apronM, project.unit)} safety apron`
  );

  // Structural assumptions strip
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, 22, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Structural & Takeoff Assumptions:', 17, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  bom.engineeringNotes.slice(0, 3).forEach((note, idx) => {
    doc.text(pdfSafe(`- ${note}`), 17, y + 11 + idx * 4, { maxWidth: 176 });
  });
  y += 28;

  // Table header
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

  // Prominent Benin indicative price disclaimer box
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

  // Summary KPIs
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
    ['Court Standard & Env', `${COURT_STANDARDS[project.standard].label} (${project.environment})`],
    [
      'Playing Court Area',
      `${formatLength(project.dimensions.lengthM, project.unit)} x ${formatLength(
        project.dimensions.widthM,
        project.unit
      )} (${formatArea(bom.playingAreaM2, project.unit)})`,
    ],
    [
      'Total Slab Footprint',
      `${formatLength(project.dimensions.lengthM + project.dimensions.apronM * 2, project.unit)} x ${formatLength(
        project.dimensions.widthM + project.dimensions.apronM * 2,
        project.unit
      )} (${formatArea(bom.totalSlabAreaM2, project.unit)})`,
    ],
    ['Placed Hoops / Masts / Fence', `${bom.hoopCount} hoop(s) | ${bom.lightingMastCount} mast(s) | ${bom.fenceTotalLengthM} m fence`],
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

  // Landscape Technical Drawing Sheets
  TECHNICAL_SHEETS.forEach((sheet) => {
    doc.addPage('a4', 'landscape');
    pageNum++;
    drawCadSheetPage(doc, project, sheet.id, style);
  });

  // Portrait BOM, Cost, and Schedule sections
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
