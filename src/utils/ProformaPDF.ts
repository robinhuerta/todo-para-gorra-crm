
import { jsPDF } from 'jspdf';

interface ProformaItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  unit?: string;
}

interface ProformaData {
  id: string;
  clientName: string;
  clientCompany: string;
  clientRucOrDni?: string;
  items: ProformaItem[];
  date: string;
  expiryDate: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export const generateProformaPDF = (data: ProformaData) => {
  const doc = new jsPDF();
  const W = 210;
  const NAVY: [number, number, number] = [15,  23,  42];
  const BLUE: [number, number, number] = [0,   114, 204];
  const GRAY: [number, number, number] = [107, 124, 147];
  const TEXT: [number, number, number] = [30,  41,  59];
  const BORD: [number, number, number] = [220, 228, 240];
  const SURF: [number, number, number] = [248, 250, 252];

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 44, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 40, W, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('GORRA', 18, 22);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 179, 215);
  doc.text('Maquinaria · Repuestos · Insumos · Gorras', 18, 32);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 179, 215);
  doc.text('PROFORMA N°', W - 15, 14, { align: 'right' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(data.id, W - 15, 23, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 179, 215);
  doc.text(`Emitida: ${data.date}   ·   Válida hasta: ${data.expiryDate}`, W - 15, 34, { align: 'right' });

  // ── Client card ──────────────────────────────────────────────
  let y = 56;
  doc.setFillColor(...SURF);
  doc.setDrawColor(...BORD);
  doc.roundedRect(14, y, W - 28, 32, 3, 3, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('DIRIGIDO A', 20, y + 9);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text(data.clientName, 20, y + 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const companyLine = [data.clientCompany, data.clientRucOrDni ? `RUC/DNI: ${data.clientRucOrDni}` : ''].filter(Boolean).join('   ·   ');
  if (companyLine) doc.text(companyLine, 20, y + 26);

  y += 42;

  // ── Table header ────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.roundedRect(14, y, W - 28, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPCIÓN', 20, y + 7.5);
  doc.text('CANT.', 132, y + 7.5, { align: 'right' });
  doc.text('P. UNIT.', 164, y + 7.5, { align: 'right' });
  doc.text('TOTAL', W - 18, y + 7.5, { align: 'right' });
  y += 13;

  // ── Table rows ───────────────────────────────────────────────
  let rowIdx = 0;
  for (const item of data.items) {
    const nameLines = doc.splitTextToSize(item.name, 104) as string[];
    const descLines = item.description ? doc.splitTextToSize(item.description, 104) as string[] : [];
    const rowH = Math.max(12, (nameLines.length + descLines.length) * 5 + 4);

    if (rowIdx % 2 === 0) {
      doc.setFillColor(...SURF);
      doc.rect(14, y - 1, W - 28, rowH, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(nameLines, 20, y + 5);

    if (descLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(descLines, 20, y + 5 + nameLines.length * 5);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(String(item.quantity), 132, y + 5, { align: 'right' });
    doc.setTextColor(...TEXT);
    doc.text(`S/ ${item.price.toFixed(2)}`, 164, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`S/ ${(item.price * item.quantity).toFixed(2)}`, W - 18, y + 5, { align: 'right' });

    y += rowH;
    rowIdx++;
  }

  doc.setDrawColor(...BORD);
  doc.line(14, y, W - 14, y);
  y += 10;

  // ── Totals ───────────────────────────────────────────────────
  const totRows: [string, string][] = [
    ['Subtotal (sin IGV)', `S/ ${data.subtotal.toFixed(2)}`],
    ['IGV (18%)',          `S/ ${data.tax.toFixed(2)}`],
  ];
  doc.setFontSize(9);
  for (const [label, val] of totRows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(label, 122, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(val, W - 15, y, { align: 'right' });
    y += 7;
  }

  y += 3;
  doc.setFillColor(...NAVY);
  doc.roundedRect(112, y - 5, W - 126, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', 122, y + 4);
  doc.text(`S/ ${data.total.toFixed(2)}`, W - 15, y + 4, { align: 'right' });

  y += 18;

  // ── Notes ────────────────────────────────────────────────────
  if (data.notes) {
    doc.setDrawColor(...BORD);
    doc.line(14, y, W - 14, y);
    y += 8;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text('NOTAS', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const noteLines = doc.splitTextToSize(data.notes, W - 28) as string[];
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 4;
  }

  // ── Terms ─────────────────────────────────────────────────────
  const termsY = Math.max(y + 8, 238);
  doc.setDrawColor(...BORD);
  doc.line(14, termsY, W - 14, termsY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GRAY);
  doc.text('Términos y condiciones:', 14, termsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Precios en soles incluyen IGV (18%).', 14, termsY + 12);
  doc.text('2. Esta proforma es informativa y no constituye reserva de stock.', 14, termsY + 18);
  doc.text('3. Garantía de 1 año en maquinaria contra defectos de fábrica.', 14, termsY + 24);

  // ── Footer ───────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 277, W, 20, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 277, W, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Todo Para Gorra — GORRA CRM', W / 2, 286, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 179, 215);
  doc.text('Lima, Perú', W / 2, 292, { align: 'center' });

  doc.save(`Proforma_${data.id}.pdf`);
};
