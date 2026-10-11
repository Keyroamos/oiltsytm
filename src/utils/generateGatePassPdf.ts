import jsPDF from 'jspdf';
import type { Dispatch } from '../types';
import { getDepotConfig } from '../services/settingsService';
import { formatLitres } from './formatters';

export function generateGatePassPdf(dispatch: Dispatch): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const config = getDepotConfig();

  const navy = [15, 30, 53] as [number, number, number];
  const amber = [217, 119, 6] as [number, number, number];
  const emerald = [5, 150, 105] as [number, number, number];
  const lightGray = [248, 250, 252] as [number, number, number];
  const borderGray = [226, 232, 240] as [number, number, number];
  const textGray = [100, 116, 139] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];
  const stampBgCompleted = [220, 252, 231] as [number, number, number];
  const stampBgPending = [254, 243, 199] as [number, number, number];

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  const gatePassNumber = `GP-${dispatch.dispatch_number.replace('DSP-', '')}`;
  const issueDate = new Date().toLocaleDateString('en-KE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const issueTime = new Date().toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const validUntil = new Date(Date.now() + 8 * 60 * 60 * 1000).toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  let y = 0;

  // ─── TOP SECURITY STRIPE ──────────────────────────────────────────────────
  doc.setFillColor(...amber);
  doc.rect(0, 0, pageW, 6, 'F');

  // ─── HEADER BACKGROUND ────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 6, pageW, 42, 'F');

  // Depot name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...white);
  doc.text(config.depot_name.toUpperCase(), margin, 20);

  // Depot meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 230);
  doc.text(`EPRA License: ${config.epra_license}  ·  KRA PIN: ${config.kra_pin}`, margin, 26);
  doc.text(`${config.physical_address}`, margin, 31);
  doc.text(`Tel: ${config.contact_phone}  ·  ${config.contact_email}`, margin, 36);

  // GATE PASS badge (right side)
  doc.setFillColor(...amber);
  doc.roundedRect(pageW - margin - 52, 10, 52, 30, 3, 3, 'F');
  doc.setTextColor(...navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OFFICIAL', pageW - margin - 26, 18, { align: 'center' });
  doc.setFontSize(13);
  doc.text('GATE PASS', pageW - margin - 26, 25, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text('FUEL LOADING EXIT PERMIT', pageW - margin - 26, 31, { align: 'center' });
  doc.text(gatePassNumber, pageW - margin - 26, 36.5, { align: 'center' });

  y = 56;

  // ─── GATE PASS NUMBER BANNER ───────────────────────────────────────────────
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, contentW, 12, 'F');
  doc.setDrawColor(...borderGray);
  doc.rect(margin, y, contentW, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text(`GATE PASS: ${gatePassNumber}`, margin + 4, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textGray);
  doc.text(`Issued: ${issueDate} at ${issueTime}  ·  Valid until: ${validUntil} (8 hrs)`, pageW - margin - 4, y + 7.5, { align: 'right' });
  y += 18;

  // ─── SECTION: VEHICLE & DRIVER ────────────────────────────────────────────
  const drawSectionHeader = (label: string, yPos: number, color: [number, number, number] = navy) => {
    doc.setFillColor(...color);
    doc.rect(margin, yPos, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...color);
    doc.text(label.toUpperCase(), margin + 6, yPos + 5);
    doc.setDrawColor(...borderGray);
    doc.line(margin + 6 + doc.getTextWidth(label.toUpperCase()) + 3, yPos + 5, pageW - margin, yPos + 5);
    return yPos + 10;
  };

  const drawInfoCell = (
    x: number, yPos: number, w: number, h: number,
    label: string, value: string, valueColor?: [number, number, number]
  ) => {
    doc.setFillColor(...lightGray);
    doc.rect(x, yPos, w, h, 'F');
    doc.setDrawColor(...borderGray);
    doc.rect(x, yPos, w, h);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textGray);
    doc.text(label.toUpperCase(), x + 2.5, yPos + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...(valueColor || navy));
    doc.text(value || '—', x + 2.5, yPos + 10.5);
  };

  // Vehicle & driver section
  y = drawSectionHeader('Vehicle & Driver Information', y);

  const cellH = 16;
  const col4 = contentW / 4;
  drawInfoCell(margin, y, col4, cellH, 'Registration Plate', dispatch.tanker?.registration_number || '—');
  drawInfoCell(margin + col4, y, col4, cellH, 'Driver Name', dispatch.tanker?.driver_name || dispatch.driver_name || '—');
  drawInfoCell(margin + col4 * 2, y, col4, cellH, 'Driver Phone', dispatch.tanker?.driver_phone || '—', textGray);
  drawInfoCell(margin + col4 * 3, y, col4, cellH, 'Transporter', dispatch.tanker?.transporter || 'Independent', textGray);
  y += cellH + 2;

  const col2 = contentW / 2;
  drawInfoCell(margin, y, col2, cellH, 'Tank Capacity', formatLitres(dispatch.tanker?.capacity_litres || 0));
  drawInfoCell(margin + col2, y, col2, cellH, 'No. of Compartments', `${dispatch.tanker?.number_of_compartments || 1} Compartment(s)`);
  y += cellH + 6;

  // ─── SECTION: CARGO & LOADING ────────────────────────────────────────────
  y = drawSectionHeader('Cargo & Loading Details', y, [5, 122, 85]);

  drawInfoCell(margin, y, col4, cellH, 'Product Loaded', dispatch.product?.name || '—', emerald);
  drawInfoCell(margin + col4, y, col4, cellH, 'Quantity Loaded', formatLitres(dispatch.quantity_loaded || dispatch.quantity_ordered), emerald);
  drawInfoCell(margin + col4 * 2, y, col4, cellH, 'Source Tank', dispatch.tank?.code || '—');
  drawInfoCell(margin + col4 * 3, y, col4, cellH, 'Dispatch Number', dispatch.dispatch_number);
  y += cellH + 2;

  drawInfoCell(margin, y, col2, cellH, 'Seal Number', dispatch.seal_number || 'NOT RECORDED');
  drawInfoCell(margin + col2, y, col2, cellH, 'Loading Bay', dispatch.loading_bay || 'Bay 1');
  y += cellH + 6;

  // ─── SECTION: CUSTOMER DESTINATION ──────────────────────────────────────
  y = drawSectionHeader('Destination & Customer', y, [79, 70, 229]);

  drawInfoCell(margin, y, col2, cellH, 'Customer / Consignee', dispatch.customer?.name || '—', [79, 70, 229]);
  drawInfoCell(margin + col2, y, col2, cellH, 'Customer Code', dispatch.customer?.code || '—', textGray);
  y += cellH + 6;

  // ─── IMPORTANT NOTICES BOX ───────────────────────────────────────────────
  doc.setFillColor(254, 249, 231); // amber-50
  doc.setDrawColor(217, 119, 6);   // amber-600
  doc.roundedRect(margin, y, contentW, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text('⚠  SECURITY & SAFETY NOTICES', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 53, 15); // amber-900
  const notices = [
    '1. This gate pass is valid for ONE exit only and must be surrendered at the main gate.',
    '2. The vehicle must exit through the weigh-bridge for gross weight recording.',
    '3. Any discrepancy in seal number must be reported to the Operations Manager immediately.',
    '4. This pass expires 8 hours from time of issue. No re-entry permitted on expired pass.',
  ];
  notices.forEach((n, i) => {
    doc.text(n, margin + 4, y + 13 + i * 3.5);
  });
  y += 30;

  // ─── AUTHORIZATION & SIGNOFFS ────────────────────────────────────────────
  y = drawSectionHeader('Authorization & Sign-off', y, [15, 30, 53]);

  const sigBoxH = 30;
  const sigColW = contentW / 3;

  const sigBoxes = [
    { label: 'Loading Officer / Dispatcher', sub: 'Loaded & Sealed Verified' },
    { label: 'Security Officer', sub: 'Gate Check Completed' },
    { label: 'Weigh-Bridge Operator', sub: 'Gross Weight Recorded' },
  ];

  sigBoxes.forEach((box, i) => {
    const bx = margin + i * sigColW;
    doc.setFillColor(...lightGray);
    doc.rect(bx, y, sigColW, sigBoxH, 'F');
    doc.setDrawColor(...borderGray);
    doc.rect(bx, y, sigColW, sigBoxH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...navy);
    doc.text(box.label, bx + sigColW / 2, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textGray);
    doc.text(box.sub, bx + sigColW / 2, y + 9.5, { align: 'center' });

    // Signature line
    doc.setDrawColor(...borderGray);
    doc.line(bx + 5, y + 22, bx + sigColW - 5, y + 22);
    doc.setFontSize(6);
    doc.setTextColor(...textGray);
    doc.text('Signature & Stamp', bx + sigColW / 2, y + 26.5, { align: 'center' });
  });
  y += sigBoxH + 6;

  // ─── STATUS STAMP ─────────────────────────────────────────────────────────
  const isCompleted = dispatch.status === 'COMPLETED' || dispatch.status === 'DELIVERED';
  const stampColor = isCompleted ? emerald : amber;
  const stampText = isCompleted ? 'DELIVERED' : 'CLEARED FOR EXIT';

  doc.setFillColor(...(isCompleted ? stampBgCompleted : stampBgPending));
  doc.setDrawColor(...stampColor);
  doc.setLineWidth(1.5);
  doc.roundedRect(pageW / 2 - 35, y, 70, 14, 2, 2, 'FD');
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...stampColor);
  doc.text(stampText, pageW / 2, y + 9.5, { align: 'center' });
  y += 20;

  // ─── BOTTOM STRIPE ────────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 180, 210);
  doc.text(
    `${config.depot_name}  ·  ${config.physical_address}  ·  ${config.contact_phone}`,
    pageW / 2,
    pageH - 7.5,
    { align: 'center' }
  );

  doc.setFillColor(...amber);
  doc.rect(0, pageH - 3, pageW, 3, 'F');

  // ─── SAVE ────────────────────────────────────────────────────────────────
  const plate = dispatch.tanker?.registration_number?.replace(/\s+/g, '_') || 'TANKER';
  doc.save(`GatePass_${gatePassNumber}_${plate}.pdf`);
}
