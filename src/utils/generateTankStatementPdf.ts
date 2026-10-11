import { jsPDF } from 'jspdf';
import type { TankPerformanceData } from '../services/tankPerformanceService';
import { getDepotConfig } from '../services/settingsService';
import { formatCurrency, formatLitres, formatDate } from './formatters';

export function generateTankStatementPdf(data: TankPerformanceData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const config = getDepotConfig();

  const navy = [15, 30, 53] as const;
  const amber = [245, 158, 11] as const;
  const emerald = [5, 150, 105] as const;
  const red = [220, 38, 38] as const;
  const gray = [100, 116, 139] as const;
  const lightBg = [248, 250, 252] as const;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const productColor: [number, number, number] = data.product_code === 'AGO' ? [245, 158, 11] : [59, 130, 246];

  // ─── Header Banner ───────────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFillColor(productColor[0], productColor[1], productColor[2]);
  doc.rect(0, 40, pageWidth, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(config.depot_name || 'TARITA PETROLEUM LIMITED', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Stock & Profitability Statement — Fuel Revenue Analytics', margin, 23);
  doc.text((config.physical_address || '') + '  |  Tel: ' + (config.contact_phone || ''), margin, 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...amber);
  doc.text('STORAGE VESSEL STATEMENT', pageWidth - margin, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Generated: ' + new Date().toLocaleDateString('en-KE'), pageWidth - margin, 23, { align: 'right' });
  doc.text('EPRA Lic: ' + (config.kra_pin || 'EPRA/DL/2024/0882'), pageWidth - margin, 29, { align: 'right' });

  // ─── Tank Identity Block ─────────────────────────────────────────────────
  let y = 52;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...navy);
  doc.text(data.tank_code, margin + 5, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text(data.tank_name + ' — ' + data.product_name + ' (' + data.product_code + ')', margin + 5, y + 19);

  // Product badge
  const badgeX = margin + 40;
  doc.setFillColor(productColor[0], productColor[1], productColor[2]);
  doc.roundedRect(badgeX, y + 4, 22, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(data.product_code, badgeX + 11, y + 9, { align: 'center' });

  // Margin badge
  const marginPct = data.gross_margin_pct;
  const marginColor: [number, number, number] = marginPct >= 15 ? [5, 150, 105] : marginPct >= 5 ? [245, 158, 11] : [220, 38, 38];
  doc.setFillColor(marginColor[0], marginColor[1], marginColor[2]);
  doc.roundedRect(pageWidth - margin - 30, y + 3, 30, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(marginPct.toFixed(1) + '% MARGIN', pageWidth - margin - 15, y + 10.5, { align: 'center' });

  // ─── KPI Summary Row ─────────────────────────────────────────────────────
  y += 34;
  const kpis = [
    { label: 'Total Revenue', value: formatCurrency(data.total_revenue), color: emerald },
    { label: 'Total COGS', value: formatCurrency(data.total_cogs), color: gray },
    { label: 'Gross Profit', value: formatCurrency(data.gross_profit), color: data.gross_profit >= 0 ? emerald : red },
    { label: 'Avg Cost / L', value: 'KES ' + data.avg_cost_per_litre.toFixed(2), color: navy },
    { label: 'Litres Sold', value: formatLitres(data.total_litres_dispatched), color: [59, 130, 246] as const },
    { label: 'Litres in Stock', value: formatLitres(data.current_stock_litres), color: amber },
  ];

  const kpiW = contentWidth / kpis.length;
  kpis.forEach((kpi, i) => {
    const kx = margin + i * kpiW;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, y, kpiW - 1.5, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(kpi.label.toUpperCase(), kx + kpiW / 2 - 0.75, y + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...(kpi.color as [number, number, number]));
    doc.text(kpi.value, kx + kpiW / 2 - 0.75, y + 14, { align: 'center' });
  });

  // ─── Client Dispatch History Table ───────────────────────────────────────
  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text('CLIENT DISPATCH HISTORY', margin, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);
  doc.text(`${data.clientDispatches.length} transaction(s) from this tank`, margin, y + 10);

  y += 14;
  // Table header
  const cols = [28, 38, 22, 18, 18, 25, 25, 22];
  const headers = ['DATE', 'CUSTOMER', 'LITRES', 'COST/L', 'SELL/L', 'REVENUE', 'PROFIT', 'MARGIN'];
  let cx = margin;

  doc.setFillColor(...navy);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  headers.forEach((h, i) => {
    const align = i >= 2 ? 'right' : 'left';
    const x = i >= 2 ? cx + cols[i] - 2 : cx + 2;
    doc.text(h, x, y + 4.8, { align });
    cx += cols[i];
  });

  y += 7;
  let rowTotalRevenue = 0, rowTotalProfit = 0, rowTotalLitres = 0;

  if (data.clientDispatches.length === 0) {
    doc.setFillColor(...lightBg);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text('No dispatches recorded from this tank yet.', pageWidth / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    data.clientDispatches.forEach((d, idx) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, contentWidth, 7.5, 'F');

      cx = margin;
      const rowData = [
        { text: formatDate(d.date), align: 'left' },
        { text: d.customer_name, align: 'left' },
        { text: formatLitres(d.litres), align: 'right' },
        { text: 'KES ' + d.cost_price_per_litre.toFixed(0), align: 'right' },
        { text: 'KES ' + d.sell_price_per_litre.toFixed(0), align: 'right' },
        { text: formatCurrency(d.revenue), align: 'right' },
        { text: formatCurrency(d.gross_profit), align: 'right' },
        { text: d.margin_pct.toFixed(1) + '%', align: 'right' },
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      rowData.forEach((cell, i) => {
        const profitColor = i === 6 ? (d.gross_profit >= 0 ? emerald : red) : navy;
        doc.setTextColor(...(profitColor as [number, number, number]));
        const x = (cell.align === 'right') ? cx + cols[i] - 2 : cx + 2;
        doc.text(cell.text, x, y + 5, { align: cell.align as any });
        cx += cols[i];
      });

      // Subtle divider
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);

      // Sub-note: invoice / tanker
      if (d.invoice_number || d.tanker_reg) {
        y += 7.5;
        doc.setFontSize(6);
        doc.setTextColor(...gray);
        const note = [d.invoice_number ? 'Inv: ' + d.invoice_number : '', d.tanker_reg ? 'Via: ' + d.tanker_reg : ''].filter(Boolean).join('  ·  ');
        doc.text(note, margin + 2, y + 4);
        y += 4;
      }

      rowTotalRevenue += d.revenue;
      rowTotalProfit += d.gross_profit;
      rowTotalLitres += d.litres;
      y += 7.5;
    });

    // Totals row
    doc.setFillColor(...navy);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTALS', margin + 2, y + 5.5);
    doc.text(formatLitres(rowTotalLitres), margin + cols[0] + cols[1] + cols[2] - 2, y + 5.5, { align: 'right' });
    doc.text(formatCurrency(rowTotalRevenue), margin + cols[0] + cols[1] + cols[2] + cols[3] + cols[4] + cols[5] - 2, y + 5.5, { align: 'right' });
    doc.setTextColor(...amber);
    doc.text(formatCurrency(rowTotalProfit), margin + cols[0] + cols[1] + cols[2] + cols[3] + cols[4] + cols[5] + cols[6] - 2, y + 5.5, { align: 'right' });
    y += 8;
  }

  // ─── Receiving History Table ──────────────────────────────────────────────
  y += 6;
  if (y > pageHeight - 50) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text('VESSEL INTAKE & RECEIVING COST HISTORY', margin, y + 5);
  y += 12;

  const rCols = [26, 40, 30, 22, 22, 32];
  const rHeaders = ['DATE', 'SUPPLIER', 'REFERENCE', 'QTY (L)', 'COST/L', 'TOTAL COST'];

  doc.setFillColor(...(productColor as [number, number, number]));
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  cx = margin;
  rHeaders.forEach((h, i) => {
    const x = i >= 3 ? cx + rCols[i] - 2 : cx + 2;
    doc.text(h, x, y + 4.8, { align: i >= 3 ? 'right' : 'left' });
    cx += rCols[i];
  });

  y += 7;
  if (data.receivingHistory.length === 0) {
    doc.setFillColor(...lightBg);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text('No receiving records on file.', pageWidth / 2, y + 6, { align: 'center' });
    y += 9;
  } else {
    data.receivingHistory.forEach((r, idx) => {
      if (y > pageHeight - 25) { doc.addPage(); y = 20; }
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, contentWidth, 7.5, 'F');
      cx = margin;
      const cells = [
        { text: formatDate(r.date), align: 'left' },
        { text: r.supplier_name, align: 'left' },
        { text: r.reference_number, align: 'left' },
        { text: formatLitres(r.quantity_litres), align: 'right' },
        { text: (r.currency === 'USD' ? '$' : 'KES ') + r.purchase_price.toFixed(r.currency === 'USD' ? 3 : 2), align: 'right' },
        { text: r.currency === 'USD'
            ? '$' + (r.total_cost || r.quantity_litres * r.purchase_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : formatCurrency(r.total_cost || r.quantity_litres * r.purchase_price), align: 'right' },
      ];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...navy);
      cells.forEach((cell, i) => {
        const x = (cell.align === 'right') ? cx + rCols[i] - 2 : cx + 2;
        doc.text(cell.text, x, y + 5, { align: cell.align as any });
        cx += rCols[i];
      });
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);
      y += 7.5;
    });
  }

  // ─── Footer ──────────────────────────────────────────────────────────────
  const footerY = pageHeight - 10;
  doc.setFillColor(...navy);
  doc.rect(0, footerY - 4, pageWidth, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    'TARITA PETROLEUM LIMITED — Tank ' + data.tank_code + ' Profitability Statement — CONFIDENTIAL COMMERCIAL DOCUMENT',
    margin,
    footerY + 2
  );
  doc.text(
    'Generated: ' + new Date().toLocaleString('en-KE') + '  |  Page 1',
    pageWidth - margin,
    footerY + 2,
    { align: 'right' }
  );

  doc.save('Tank_' + data.tank_code + '_Statement_' + new Date().toISOString().split('T')[0] + '.pdf');
}
