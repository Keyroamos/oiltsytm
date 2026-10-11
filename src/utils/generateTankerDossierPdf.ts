import { jsPDF } from 'jspdf';
import type { TankerDetailData } from '../services/tankerService';
import { getDepotConfig } from '../services/settingsService';
import { getTankerCompliance } from '../services/tankerService';
import { formatLitres, formatCurrency, formatDate } from './formatters';

export function generateTankerDossierPdf(data: TankerDetailData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { tanker, dispatches, invoices, payments, receivingRecords, metrics } = data;
  const config = getDepotConfig();
  const compliance = getTankerCompliance(tanker);

  const primaryColor = [15, 30, 53]; // Deep Navy
  const amberColor = [245, 158, 11]; // Amber
  const grayColor = [100, 116, 139];
  const lightBg = [248, 250, 252];

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Amber Accent Line
  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(config.depot_name || 'TARITA PETROLEUM', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Fleet Logistics & Petroleum Fuel Transport Registry (PMS & AGO)', margin, 24);
  doc.text(`${config.physical_address}`, margin, 29);
  doc.text(`Tel: ${config.contact_phone} | Email: ${config.contact_email}`, margin, 34);

  // Right Header: FLEET AUDIT DOSSIER
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(245, 158, 11);
  doc.text('TANKER FLEET AUDIT DOSSIER', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`EPRA Lic: ${config.epra_license}`, pageWidth - margin, 26, { align: 'right' });
  doc.text(`Reg Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, 31, { align: 'right' });

  // 2. Vehicle Profile Box (Left) & Financial Overview (Right)
  let y = 54;
  const colWidth = (contentWidth - 6) / 2;

  // Vehicle Profile Box (Left)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, colWidth, 48, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, colWidth, 48, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('VEHICLE REGISTRATION & DRIVER', margin + 5, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.text(tanker.registration_number, margin + 5, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Transporter: ${tanker.transporter || 'Independent Transporter'}`, margin + 5, y + 22);
  doc.text(`Assigned Driver: ${tanker.driver_name || 'Driver unassigned'}`, margin + 5, y + 28);
  if (tanker.driver_phone) doc.text(`Driver Phone: ${tanker.driver_phone}`, margin + 5, y + 33);
  doc.text(`Tank Capacity: ${formatLitres(tanker.capacity_litres)} (${tanker.number_of_compartments || 1} Compartments)`, margin + 5, y + 39);

  // Status Badge inside Vehicle Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  if (tanker.status === 'AVAILABLE' || tanker.status === 'DELIVERED') {
    doc.setTextColor(16, 185, 129);
  } else if (tanker.status === 'MAINTENANCE') {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(30, 58, 138);
  }
  doc.text(`FLEET STATUS: ${tanker.status}`, margin + 5, y + 44);

  // Financial & Operational Metrics Box (Right)
  const rightColX = margin + colWidth + 6;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(rightColX, y, colWidth, 48, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, y, colWidth, 48, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CUMULATIVE PERFORMANCE METRICS', rightColX + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Volume Transported:', rightColX + 5, y + 14);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatLitres(metrics.totalVolumeLitres), rightColX + colWidth - 5, y + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Invoiced Value:', rightColX + 5, y + 21);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(metrics.totalInvoicedAmount), rightColX + colWidth - 5, y + 21, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Payments Collected:', rightColX + 5, y + 28);
  doc.setFont('courier', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(metrics.totalPaidAmount), rightColX + colWidth - 5, y + 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Outstanding Receivables:', rightColX + 5, y + 35);
  doc.setFont('courier', 'bold');
  doc.setTextColor(metrics.totalOutstandingBalance > 0 ? 220 : 16, metrics.totalOutstandingBalance > 0 ? 38 : 185, metrics.totalOutstandingBalance > 0 ? 38 : 129);
  doc.text(formatCurrency(metrics.totalOutstandingBalance), rightColX + colWidth - 5, y + 35, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Completed Trips:', rightColX + 5, y + 42);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 30, 53);
  doc.text(`${metrics.totalTrips} Runs (${dispatches.length} Outbound / ${receivingRecords.length} Inbound)`, rightColX + colWidth - 5, y + 42, { align: 'right' });

  // 3. Compliance & Certification Status Banner (y = 108)
  y = 108;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Statutory Compliance:', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Commercial Insurance: ${tanker.insurance_expiry ? formatDate(tanker.insurance_expiry) : 'Missing'} (${compliance.insuranceStatus})`, margin + 42, y + 7);
  doc.text(`EPRA Safety Inspection: ${tanker.inspection_expiry ? formatDate(tanker.inspection_expiry) : 'Missing'} (${compliance.inspectionStatus})`, margin + 42, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (compliance.isFullyCompliant) {
    doc.setTextColor(16, 185, 129);
    doc.text('LOADING ELIGIBLE: YES (VALID)', pageWidth - margin - 5, y + 10, { align: 'right' });
  } else if (compliance.canDispatch) {
    doc.setTextColor(217, 119, 6);
    doc.text('LOADING ELIGIBLE: YES (RENEW SOON)', pageWidth - margin - 5, y + 10, { align: 'right' });
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text('COMPLIANCE BLOCK: EXPIRED CERTS', pageWidth - margin - 5, y + 10, { align: 'right' });
  }

  // 4. Dispatches & Customer Orders Section
  y = 132;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DISPATCHES & ASSOCIATED CUSTOMER ORDERS', margin + 3, y + 5);
  doc.text(`${dispatches.length} OPERATIONS RECORDED`, pageWidth - margin - 3, y + 5, { align: 'right' });

  y += 7;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('DISPATCH #', margin + 3, y + 4);
  doc.text('CUSTOMER', margin + 35, y + 4);
  doc.text('PRODUCT', margin + 85, y + 4);
  doc.text('VOLUME (L)', margin + 125, y + 4);
  doc.text('STATUS', pageWidth - margin - 3, y + 4, { align: 'right' });

  y += 6;
  if (dispatches.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No dispatches recorded for this tanker.', margin + 3, y + 5);
    y += 8;
  } else {
    for (const d of dispatches.slice(0, 5)) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(d.dispatch_number, margin + 3, y + 4.5);

      const cName = d.customer?.name || 'Customer';
      doc.text(cName.length > 22 ? cName.substring(0, 22) + '…' : cName, margin + 35, y + 4.5);
      doc.text(d.product?.name || 'Fuel', margin + 85, y + 4.5);

      doc.setFont('courier', 'bold');
      doc.text(formatLitres(Number(d.quantity_loaded || d.quantity_ordered)), margin + 125, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(d.status === 'DELIVERED' || d.status === 'COMPLETED' ? 16 : 30, d.status === 'DELIVERED' || d.status === 'COMPLETED' ? 185 : 58, d.status === 'DELIVERED' || d.status === 'COMPLETED' ? 129 : 138);
      doc.text(d.status, pageWidth - margin - 3, y + 4.5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);
      y += 6;
    }
  }

  // 5. Commercial Invoices & Billing Section
  y += 4;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COMMERCIAL INVOICES BILLED FOR THIS TANKER', margin + 3, y + 5);
  doc.text(`${invoices.length} INVOICES RECORDED`, pageWidth - margin - 3, y + 5, { align: 'right' });

  y += 7;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('INVOICE #', margin + 3, y + 4);
  doc.text('BILLED CUSTOMER', margin + 35, y + 4);
  doc.text('TOTAL AMOUNT', margin + 90, y + 4);
  doc.text('AMOUNT PAID', margin + 128, y + 4);
  doc.text('BALANCE DUE', pageWidth - margin - 3, y + 4, { align: 'right' });

  y += 6;
  if (invoices.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No commercial invoices linked to this tanker cargo.', margin + 3, y + 5);
    y += 8;
  } else {
    for (const inv of invoices.slice(0, 4)) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(inv.invoice_number, margin + 3, y + 4.5);

      const cName = inv.customer?.name || 'Customer';
      doc.text(cName.length > 22 ? cName.substring(0, 22) + '…' : cName, margin + 35, y + 4.5);

      doc.setFont('courier', 'bold');
      doc.text(formatCurrency(inv.total_amount), margin + 90, y + 4.5);
      doc.setTextColor(16, 185, 129);
      doc.text(formatCurrency(inv.amount_paid), margin + 128, y + 4.5);

      doc.setTextColor(Number(inv.balance_due) > 0 ? 220 : 16, Number(inv.balance_due) > 0 ? 38 : 185, Number(inv.balance_due) > 0 ? 38 : 129);
      doc.text(formatCurrency(inv.balance_due), pageWidth - margin - 3, y + 4.5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);
      y += 6;
    }
  }

  // 6. Payments Received Section
  y += 4;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PAYMENTS SETTLED AGAINST TANKER DELIVERIES', margin + 3, y + 5);
  doc.text(`${payments.length} PAYMENTS`, pageWidth - margin - 3, y + 5, { align: 'right' });

  y += 7;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.text('PAYMENT DATE', margin + 3, y + 4);
  doc.text('PAYMENT METHOD', margin + 40, y + 4);
  doc.text('REFERENCE / CHEQUE NO.', margin + 85, y + 4);
  doc.text('AMOUNT RECEIVED', pageWidth - margin - 3, y + 4, { align: 'right' });

  y += 6;
  if (payments.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No payment transactions recorded for this tanker deliveries yet.', margin + 3, y + 5);
    y += 8;
  } else {
    for (const p of payments.slice(0, 4)) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(p.payment_date, margin + 3, y + 4.5);
      doc.text(p.payment_method, margin + 40, y + 4.5);
      doc.text(p.reference_number || 'Internal Transfer', margin + 85, y + 4.5);

      doc.setFont('courier', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`+${formatCurrency(p.amount)}`, pageWidth - margin - 3, y + 4.5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);
      y += 6;
    }
  }

  // 7. Signoff & Footer
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TARITA PETROLEUM LIMITED Terminal Operations · Official Tanker Loading & Dispatch Dossier · Energy and Petroleum Regulatory Authority (EPRA) Standard', margin, footerY + 5);
  doc.text(`System Generated on ${new Date().toLocaleString('en-KE')} · Vehicle: ${tanker.registration_number} · Page 1 of 1`, margin, footerY + 9);

  doc.text('Fleet Safety & Logistics Officer: _______________________', pageWidth - margin, footerY + 9, { align: 'right' });

  // Save the PDF
  const filename = `Tanker_Dossier_${tanker.registration_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
