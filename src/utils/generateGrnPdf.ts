import { jsPDF } from 'jspdf';
import type { ReceivingRecord } from '../types';
import { getDepotConfig } from '../services/settingsService';
import { formatLitres } from './formatters';

export function generateGrnPdf(record: ReceivingRecord): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const config = getDepotConfig();
  const primaryColor = [15, 30, 53]; // Deep Navy
  const emeraldColor = [16, 185, 129];
  const grayColor = [100, 116, 139];
  const lightBg = [248, 250, 252];

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Green Inbound Accent Line
  doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(config.depot_name || 'TARITA PETROLEUM', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Petroleum & Logistics Management System', margin, 24);
  doc.text(`${config.physical_address}`, margin, 29);
  doc.text(`Tel: ${config.contact_phone} | Email: ${config.contact_email}`, margin, 34);

  // Right Header: GOODS RECEIVED NOTE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('GOODS RECEIVED NOTE (GRN)', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`KRA PIN: ${config.kra_pin}`, pageWidth - margin, 26, { align: 'right' });
  doc.text(`EPRA Lic: ${config.epra_license}`, pageWidth - margin, 31, { align: 'right' });

  // 2. Manifest & Inbound Metadata Section
  let y = 54;

  // Left Column: Supplier, Vessel & Market
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, 95, 46, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, 95, 46, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DISCHARGING VESSEL & SUPPLIER', margin + 5, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const vesselText = record.vessel_name ? `Vessel: ${record.vessel_name}` : 'Marine Vessel Intake';
  doc.text(vesselText.length > 30 ? vesselText.substring(0, 30) + '…' : vesselText, margin + 5, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Supplier: ${record.supplier?.name || 'Fuel Consignor'}`, margin + 5, y + 21);
  const isTransit = record.market_type === 'TRANSIT' || record.currency === 'USD';
  const currencySymbol = isTransit ? '$' : 'KES ';
  doc.text(`Market Regime: ${isTransit ? 'TRANSIT (USD $)' : 'LOCAL (KES)'}`, margin + 5, y + 26);
  if (record.supplier?.phone) doc.text(`Tel: ${record.supplier.phone}`, margin + 5, y + 31);
  if (record.supplier?.email) doc.text(`Email: ${record.supplier.email}`, margin + 5, y + 36);
  if (record.supplier?.address) doc.text(`Port / Terminal: ${record.supplier.address}`, margin + 5, y + 41);

  // Right Column: Delivery Receipt Details
  const rightColX = margin + 102;
  const rightColWidth = contentWidth - 102;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(rightColX, y, rightColWidth, 46, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, y, rightColWidth, 46, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RECEIVING RECORD MANIFEST', rightColX + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('GRN / Ref No:', rightColX + 5, y + 16);
  doc.setFont('courier', 'bold');
  doc.text(record.reference_number, rightColX + 35, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Receipt Date:', rightColX + 5, y + 22);
  doc.text(record.receiving_date, rightColX + 35, y + 22);

  doc.text('Arrival Time:', rightColX + 5, y + 28);
  doc.text(record.arrival_time || 'Terminal Schedule', rightColX + 35, y + 28);

  doc.text('Status:', rightColX + 5, y + 34);
  doc.setFont('helvetica', 'bold');
  if (record.status === 'RECEIVED') {
    doc.setTextColor(16, 185, 129);
    doc.text('RECEIVED & UPLOADED', rightColX + 35, y + 34);
  } else if (record.status === 'PENDING') {
    doc.setTextColor(245, 158, 11);
    doc.text('PENDING VERIFICATION', rightColX + 35, y + 34);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(record.status, rightColX + 35, y + 34);
  }

  // 3. Fuel Consignment Breakdown Table Header
  y = 110;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('#', margin + 3, y + 5.5);
  doc.text('PRODUCT DESCRIPTION', margin + 12, y + 5.5);
  doc.text('STORAGE VESSEL', margin + 85, y + 5.5);
  doc.text('PRICE / L', margin + 125, y + 5.5);
  doc.text('QUANTITY & AMOUNT', pageWidth - margin - 3, y + 5.5, { align: 'right' });

  // Line Item Row
  y += 8;
  const qty = Number(record.quantity_received || record.quantity_ordered || 0);
  const price = Number(record.purchase_price || 0);
  const total = Number(record.total_cost || record.purchase_total || (price > 0 ? price * qty : 0));
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 14, pageWidth - margin, y + 14);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1', margin + 3, y + 6);
  doc.text(record.product?.name || 'Petroleum Fuel', margin + 12, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fuel Type: ${record.product?.code || 'PMS/AGO'} · Vessel Discharge`, margin + 12, y + 10.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(`${record.tank?.name || 'Storage Vessel'}`, margin + 85, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Vessel Code: ${record.tank?.code || 'VESSEL'}`, margin + 85, y + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(price > 0 ? `${currencySymbol}${price.toFixed(2)}` : '—', margin + 125, y + 8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`+${formatLitres(qty)}`, pageWidth - margin - 3, y + 6, { align: 'right' });
  if (total > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(109, 40, 217);
    doc.text(`${currencySymbol}${total.toLocaleString()}`, pageWidth - margin - 3, y + 11, { align: 'right' });
  }

  // 4. Inbound Quality & Technical Metrics Card (Full Width)
  y += 22;
  const metricsCardHeight = 44;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, metricsCardHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, metricsCardHeight, 2, 2, 'S');

  // Mini Banner
  doc.setFillColor(15, 30, 53);
  doc.roundedRect(margin, y, contentWidth, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MARINE VESSEL DISCHARGE & TERMINAL QUALITY VERIFICATION', margin + 5, y + 5);

  const col1 = margin + 6;
  const col2 = margin + 65;
  const col3 = margin + 125;

  // Col 1: Storage Tank Details
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('STORAGE VESSEL INTAKE', col1, y + 13);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Storage Vessel:', col1, y + 20);
  doc.setFont('courier', 'bold');
  doc.text(record.tank?.name || 'Storage Vessel', col1 + 22, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Vessel Code:', col1, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.text(record.tank?.code || 'VESSEL', col1 + 22, y + 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Intake Mode:', col1, y + 34);
  doc.setFont('helvetica', 'normal');
  doc.text('Marine Vessel Direct', col1 + 22, y + 34);

  // Col 2: Metering & Calibration
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('METERING & CALIBRATION', col2, y + 13);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Meter Reading:', col2, y + 20);
  doc.setFont('courier', 'bold');
  doc.text(record.meter_reading ? `${record.meter_reading.toLocaleString()} L` : 'Pre-fill Calibrated', col2 + 24, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.text('Dip Tolerance:', col2, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.text(`${config.dip_tolerance_pct}% EPRA Compliant`, col2 + 24, y + 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Water Dip Test:', col2, y + 34);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text('Nil (Trace-Free)', col2 + 24, y + 34);

  // Col 3: Quality Compliance
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('STATUTORY STANDARDS', col3, y + 13);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Quality Status:', col3, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(record.quality_status || 'PASSED', col3 + 23, y + 20);

  doc.setTextColor(15, 23, 42);
  doc.text('KEBS Standard:', col3, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.text('KS 1309:2020', col3 + 23, y + 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Safety Clearance:', col3, y + 34);
  doc.setFont('helvetica', 'normal');
  doc.text('Cleared by Terminal HSE', col3 + 23, y + 34);

  // 5. Notes & Sign-off Section
  y += 52;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OPERATIONAL REMARKS & DISCHARGE CERTIFICATION', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  // Strip any internal metadata comments like <!--COST_META:...-->
  const cleanNotes = (record.notes || '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const costLines: string[] = [];
  if (record.total_delivery_cost && Number(record.total_delivery_cost) > 0) {
    costLines.push(`Discharge Expenses: ${currencySymbol}${Number(record.total_delivery_cost).toLocaleString()}`);
  }
  if (record.total_cost && Number(record.total_cost) > 0) {
    costLines.push(`Total Landed Cost: ${currencySymbol}${Number(record.total_cost).toLocaleString()}`);
  }
  const costSummary = costLines.length > 0 ? ` [${costLines.join(' | ')}]` : '';
  const defaultNote = `Inbound marine vessel fuel consignment discharged into storage vessel. Inspection, pumping, and quality standards verified.`;
  const notesText = (cleanNotes || defaultNote) + costSummary;
  doc.text(notesText, margin + 5, y + 13, { maxWidth: contentWidth - 10 });

  // Signoff columns
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Receiving Operator / HSE Officer:', margin + 5, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.text('_______________________________', margin + 5, y + 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Tanker Driver Acknowledgment:', margin + 65, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.text('_______________________________', margin + 65, y + 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Operations Manager:', margin + 125, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.text('_______________________________', margin + 125, y + 33);

  // 6. Footer
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TARITA PETROLEUM Operations · Official Inbound Goods Received Note (GRN) · Regulated by Energy and Petroleum Regulatory Authority (EPRA)', margin, footerY + 5);
  doc.text(`Generated on ${new Date().toLocaleString('en-KE')} · Reference: ${record.reference_number} · Page 1 of 1`, margin, footerY + 9);

  // Save the PDF
  const filename = `GRN_${record.reference_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
