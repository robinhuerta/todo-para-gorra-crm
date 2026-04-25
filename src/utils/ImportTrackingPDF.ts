import { jsPDF } from 'jspdf';
import type { ImportRecord } from '../types';

const PHASE_NAMES = [
  'Solicitud del Cliente',
  'Orden de Compra',
  'En Producción',
  'Inspección de Calidad',
  'Exportación desde China',
  'En Tránsito',
  'Puerto del Callao',
  'Despacho SUNAT',
  'En Almacén',
  'Listo para Entrega',
  'Entregado',
];

const PRIMARY  = [0,  114, 204] as const; // #0072CC
const DARK     = [15,  23,  42] as const; // #0F172A
const SUCCESS  = [5,  150, 105] as const; // #059669
const WARNING  = [217, 119,  6] as const; // #D97706
const GRAY     = [100, 116, 139] as const;
const LGRAY    = [226, 232, 240] as const;
const WHITE    = [255, 255, 255] as const;

const fmt2 = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const generateImportTrackingPDF = (imp: ImportRecord) => {
  const doc = new jsPDF();
  const W = 210;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 42, 'F');

  // Company info
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TODO PARA GORRA', 15, 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('IMPORTACIONES DE MAQUINARIA Y ACCESORIOS INDUSTRIALES', 15, 23);
  doc.text('Lima, Perú  ·  gorra@empresa.com', 15, 29);

  // Report type label (top right)
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(130, 8, 65, 26, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('REPORTE DE SEGUIMIENTO', 162.5, 17, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('IMPORTACIÓN CHINA → PERÚ', 162.5, 23, { align: 'center' });
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 162.5, 29, { align: 'center' });

  // ── IMPORT ID + STATUS BAND ──────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 42, W, 18, 'F');
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(imp.displayId, 15, 53);

  const statusLabel = imp.status === 'completado' ? 'COMPLETADO' : imp.status === 'con_problema' ? 'CON PROBLEMA' : imp.status === 'cancelado' ? 'CANCELADO' : 'ACTIVO';
  const statusColor = imp.status === 'completado' ? SUCCESS : imp.status === 'con_problema' ? [220, 38, 38] as const : imp.status === 'cancelado' ? GRAY : PRIMARY;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusColor);
  doc.text(`Estado: ${statusLabel}`, 15, 58);

  const pct = Math.round((imp.currentPhaseIndex / 10) * 100);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fase actual: ${PHASE_NAMES[imp.currentPhaseIndex]}  ·  ${pct}% completado`, 80, 53);
  doc.text(`Proveedor: ${imp.supplierName}, ${imp.supplierCity}, China`, 80, 58);

  // ── CLIENT + SUPPLIER INFO ───────────────────────────────────────────────────
  let y = 70;

  // Two-column info block
  // Client
  doc.setFillColor(239, 246, 255);
  doc.rect(15, y, 85, 30, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLIENTE', 20, y + 7);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(imp.clientName, 20, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  if (imp.clientCompany) doc.text(imp.clientCompany, 20, y + 20);
  if (imp.clientPhone)   doc.text(`Tel: ${imp.clientPhone}`, 20, y + 26);

  // Supplier
  doc.setFillColor(255, 237, 213);
  doc.rect(110, y, 85, 30, 'F');
  doc.setTextColor([234, 88, 12] as unknown as number);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PROVEEDOR CHINO', 115, y + 7);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(imp.supplierName, 115, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(imp.supplierCity + ', China', 115, y + 20);
  if (imp.supplierContact) doc.text(imp.supplierContact, 115, y + 26);

  y += 38;

  // ── PHASE PROGRESS ──────────────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PROGRESO DE LA IMPORTACIÓN', 15, y);
  y += 6;

  // Progress bar
  doc.setFillColor(...LGRAY);
  doc.rect(15, y, 180, 5, 'F');
  const barColor = imp.status === 'con_problema' ? [239, 68, 68] as const : imp.status === 'completado' ? SUCCESS : PRIMARY;
  doc.setFillColor(...barColor);
  doc.rect(15, y, 180 * pct / 100, 5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`${pct}%`, 198, y + 4, { align: 'right' });
  y += 12;

  // Phase grid (2 columns)
  const colW = 87;
  PHASE_NAMES.forEach((name, i) => {
    const ph = imp.phases?.[i];
    const st = ph?.status ?? 'pendiente';
    const col = i % 2 === 0 ? 15 : 108;
    const row = Math.floor(i / 2);
    const ry = y + row * 12;

    const dotColor = st === 'completado' ? SUCCESS : st === 'en_progreso' ? PRIMARY : st === 'con_problema' ? [220, 38, 38] as const : LGRAY;
    doc.setFillColor(...dotColor);
    doc.circle(col + 3, ry - 1, 2.5, 'F');

    doc.setFont('helvetica', st === 'en_progreso' ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(st === 'pendiente' ? ...GRAY : ...DARK);
    doc.text(`${i + 1}. ${name}`, col + 8, ry + 1);

    if (st !== 'pendiente') {
      const stLabel = st === 'completado' ? '✓' : st === 'en_progreso' ? '→' : '!';
      doc.setTextColor(...dotColor);
      doc.text(stLabel, col + colW - 5, ry + 1);
    }
    if (ph?.completedDate) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(ph.completedDate, col + colW - 20, ry + 1);
    }
  });

  y += Math.ceil(PHASE_NAMES.length / 2) * 12 + 8;

  // ── PRODUCTS TABLE ───────────────────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('PRODUCTOS IMPORTADOS', 15, y);
  y += 6;

  // Header row
  doc.setFillColor(...DARK);
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Producto', 18, y + 5);
  doc.text('Tipo', 105, y + 5);
  doc.text('Cant.', 130, y + 5);
  doc.text('P.Unit USD', 148, y + 5);
  doc.text('Total USD', 175, y + 5);
  y += 8;

  imp.items.forEach((it, i) => {
    if (y > 265) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y, 180, 9, 'F'); }
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const nameLines = doc.splitTextToSize(it.name, 80);
    doc.text(nameLines[0], 18, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(it.type === 'maquinaria' ? 'Maquinaria' : 'Repuesto', 105, y + 5);
    doc.setTextColor(...DARK);
    doc.text(`${it.quantity} ${it.unit}`, 130, y + 5);
    doc.text(fmt2(it.unitPrice), 148, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt2(it.quantity * it.unitPrice), 175, y + 5);
    y += 9;
  });

  // Total row
  doc.setFillColor(...PRIMARY);
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL FOB', 18, y + 5);
  doc.text(`$ ${fmt2(imp.fobValue)}`, 175, y + 5);
  y += 14;

  // ── FINANCIAL + DATES TWO COLUMN ────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }

  // Financial summary (left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('RESUMEN FINANCIERO (USD)', 15, y);
  y += 6;

  const finRows = [
    { label: 'Valor FOB',           value: fmt2(imp.fobValue),        bold: false },
    { label: 'Flete Internacional', value: fmt2(imp.freightCost),     bold: false },
    { label: 'Seguro',              value: fmt2(imp.insuranceCost),   bold: false },
    { label: 'Valor CIF (Callao)',  value: fmt2(imp.cifValue),        bold: true  },
    { label: `Ad Valorem (${imp.adValoremPct}%)`, value: fmt2(imp.adValorem), bold: false },
    { label: 'IGV (18%)',           value: fmt2(imp.igv),             bold: false },
    { label: 'IPM (2%)',            value: fmt2(imp.ipm),             bold: false },
    { label: 'Total Tributos SUNAT',value: fmt2(imp.totalTributes),   bold: true  },
    { label: 'Agente de Aduanas',   value: fmt2(imp.customsAgentFee), bold: false },
    { label: 'Almacenaje',          value: fmt2(imp.warehouseCost),   bold: false },
    { label: 'Transporte Local',    value: fmt2(imp.localTransportCost), bold: false },
  ];

  finRows.forEach((row, i) => {
    if (y > 272) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y, 85, 7, 'F'); }
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(row.bold ? ...DARK : ...GRAY);
    doc.text(row.label, 18, y + 4.5);
    doc.setTextColor(...DARK);
    doc.text(`$ ${row.value}`, 98, y + 4.5, { align: 'right' });
    y += 7;
  });

  // Grand total
  doc.setFillColor(...SUCCESS);
  doc.rect(15, y, 85, 9, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COSTO TOTAL', 18, y + 6);
  doc.text(`$ ${fmt2(imp.totalImportCost)}`, 98, y + 6, { align: 'right' });

  // Dates (right column) — back to same y start
  const datesY = y - finRows.length * 7 - 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('FECHAS CLAVE', 110, datesY);

  const dateRows = [
    { label: 'Zarpe desde China',    value: imp.estimatedDeparture ?? '—' },
    { label: 'ETA Puerto Callao',    value: imp.estimatedArrival ?? '—' },
    { label: 'Arribo real',          value: imp.actualArrival ?? '—' },
    { label: 'Entrega al cliente',   value: imp.expectedDelivery ?? 'Por confirmar' },
    { label: 'Incoterm',             value: imp.incoterm },
    { label: 'Freight Forwarder',    value: imp.freightForwarder ?? '—' },
    { label: 'Agente de Aduanas',    value: imp.customsAgent ?? '—' },
    { label: 'B/L No.',              value: imp.blNumber ?? '—' },
    { label: 'DUA No.',              value: imp.duaNumber ?? '—' },
    { label: 'Canal SUNAT',          value: imp.sunatChannel ? imp.sunatChannel.charAt(0).toUpperCase() + imp.sunatChannel.slice(1) : '—' },
  ];

  let dy = datesY + 7;
  dateRows.forEach((row, i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(108, dy, 87, 7, 'F'); }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(row.label, 112, dy + 4.5);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', row.label === 'Entrega al cliente' ? 'bold' : 'normal');
    const val = doc.splitTextToSize(row.value, 42);
    doc.text(val[0], 193, dy + 4.5, { align: 'right' });
    dy += 7;
  });

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  const footerY = 285;
  doc.setFillColor(...LGRAY);
  doc.rect(0, footerY - 2, W, 0.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text('TODO PARA GORRA  ·  Importaciones de Maquinaria e Insumos  ·  Lima, Perú', W / 2, footerY + 3, { align: 'center' });
  doc.text(`Documento generado el ${new Date().toLocaleString('es-PE')}  ·  Ref: ${imp.displayId}`, W / 2, footerY + 7, { align: 'center' });

  doc.save(`Seguimiento_${imp.displayId}.pdf`);
};
