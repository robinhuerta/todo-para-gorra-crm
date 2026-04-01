
import { jsPDF } from 'jspdf';

interface ProformaData {
  id: string;
  clientName: string;
  clientCompany: string;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    price: number;
  }>;
  date: string;
  expiryDate: string;
  subtotal: number;
  tax: number;
  total: number;
}

export const generateProformaPDF = (data: ProformaData) => {
  const doc = new jsPDF();
  const primaryColor = '#8b5cf6'; // Violet
  const darkColor = '#0f172a';

  // --- Header ---
  // Background rectangle for header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 40, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('TODO PARA GORRA', 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('IMPORTACIONES DE MAQUINARIA Y ACCESORIOS', 15, 28);

  // Proforma Info
  doc.setFontSize(12);
  doc.text(`PROFORMA: ${data.id}`, 150, 15);
  doc.setFontSize(9);
  doc.text(`Fecha: ${data.date}`, 150, 22);
  doc.text(`Válido hasta: ${data.expiryDate}`, 150, 28);

  // --- Client Info ---
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PARA:', 15, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName, 15, 56);
  doc.text(data.clientCompany, 15, 62);
  doc.text('Lima, Perú', 15, 68);

  // --- Items Table Header ---
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 80, 180, 10, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPCIÓN', 20, 86);
  doc.text('CANT.', 120, 86);
  doc.text('PRECIO UNIT.', 145, 86);
  doc.text('TOTAL', 175, 86);

  // --- Items ---
  let y = 96;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkColor);

  data.items.forEach((item) => {
    doc.text(item.name, 20, y);
    doc.text(item.quantity.toString(), 122, y);
    doc.text(`$${item.price.toLocaleString()}`, 147, y);
    doc.text(`$${(item.quantity * item.price).toLocaleString()}`, 177, y);
    y += 10;
  });

  // --- Summary ---
  const summaryY = y + 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(120, summaryY, 195, summaryY);
  
  doc.setFontSize(10);
  doc.text('SUBTOTAL:', 130, summaryY + 10);
  doc.text(`$${data.subtotal.toLocaleString()}`, 170, summaryY + 10);
  
  doc.text('IGV (18%):', 130, summaryY + 18);
  doc.text(`$${data.tax.toLocaleString()}`, 170, summaryY + 18);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('TOTAL GENERAL:', 130, summaryY + 28);
  doc.text(`$${data.total.toLocaleString()}`, 170, summaryY + 28);

  // --- Terms & Footer ---
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('TERMINOS Y CONDICIONES:', 15, 250);
  doc.text('1. Precios sujetos a cambios según tipo de cambio bancario.', 15, 255);
  doc.text('2. Garantía de 1 año en maquinaria contra defectos de fábrica.', 15, 260);
  doc.text('3. Esta proforma tiene carácter informativo y no constituye una reserva de stock.', 15, 265);

  // Download the PDF
  doc.save(`Proforma_${data.id}.pdf`);
};
