import { jsPDF } from 'jspdf';
import type { CompanyProfitSummary, TruckProfitSummary, OrderProfitRecord } from '../types';
import { getDepotConfig } from '../services/settingsService';
import { formatCurrency, formatLitres } from './formatters';

interface GenerateStatementOptions {
  periodLabel?: string;
  companySummary: CompanyProfitSummary;
  truckSummaries: TruckProfitSummary[];
  orderProfitLedger: OrderProfitRecord[];
  truckFilter?: string; // If filtering by specific truck
}

function formatNum(val?: number): string {
  if (val == null || isNaN(val)) return '0';
  const rounded = Math.round(val);
  return rounded.toLocaleString('en-KE');
}

export function generateProfitStatementPdf(options: GenerateStatementOptions): void {
  const {
    periodLabel = 'Current Operating Period',
    companySummary,
    truckSummaries,
    orderProfitLedger,
    truckFilter,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const config = getDepotConfig();
  const primaryColor = [15, 30, 53];  // #0f1e35 (Deep Navy)
  const emeraldColor = [16, 185, 129]; // #10b981
  const lightBg = [248, 250, 252];     // #f8fafc

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190 mm width

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line
  doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(config.depot_name || 'TARITA PETROLEUM', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Petroleum Fuel Management & Commercial Analytics (PMS & AGO)', margin, 24);
  doc.text(`${config.physical_address}`, margin, 29);
  doc.text(`Tel: ${config.contact_phone} | Email: ${config.contact_email}`, margin, 34);

  // Right Header: STATEMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('COMMERCIAL P&L STATEMENT', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Scope: ${truckFilter ? `Tanker ${truckFilter}` : 'Company-Wide Fleet Operations'}`, pageWidth - margin, 24, { align: 'right' });
  doc.text(`Period: ${periodLabel}`, pageWidth - margin, 29, { align: 'right' });
  doc.text(`EPRA Lic: ${config.epra_license} | PIN: ${config.kra_pin}`, pageWidth - margin, 34, { align: 'right' });

  // 2. Executive P&L Summary Cards
  let y = 52;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE FINANCIAL & PROFITABILITY SUMMARY', margin, y);

  y += 5;
  // 4 Summary Metric Boxes
  const boxW = (contentWidth - 9) / 4;
  const boxH = 22;

  // Box 1: Total Revenue
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, boxW, boxH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('GROSS COMMERCIAL SALES', margin + 3, y + 6);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(companySummary.total_revenue), margin + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${formatLitres(companySummary.total_volume_litres)} sold`, margin + 3, y + 19);

  // Box 2: Total COGS
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + boxW + 3, y, boxW, boxH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL LANDED COSTS (COGS)', margin + boxW + 6, y + 6);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(companySummary.total_cost), margin + boxW + 6, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Fuel + Truck Expenses', margin + boxW + 6, y + 19);

  // Box 3: Net Profit
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(margin + (boxW + 3) * 2, y, boxW, boxH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('NET COMMERCIAL PROFIT', margin + (boxW + 3) * 2 + 3, y + 6);
  doc.setFontSize(10);
  doc.setTextColor(companySummary.net_profit >= 0 ? 4 : 220, companySummary.net_profit >= 0 ? 120 : 38, companySummary.net_profit >= 0 ? 87 : 38);
  doc.text(formatCurrency(companySummary.net_profit), margin + (boxW + 3) * 2 + 3, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`Margin: ${companySummary.profit_margin_pct}%`, margin + (boxW + 3) * 2 + 3, y + 19);

  // Box 4: Volume & Top Truck
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(margin + (boxW + 3) * 3, y, boxW, boxH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(109, 40, 217);
  doc.text('FLEET ACTIVITY & TOP TRUCK', margin + (boxW + 3) * 3 + 3, y + 6);
  doc.setFontSize(9.5);
  doc.setTextColor(76, 29, 149);
  doc.text(companySummary.top_performing_truck?.registration_number || 'All Fleet', margin + (boxW + 3) * 3 + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(109, 40, 217);
  doc.text(`${companySummary.total_orders_count} transactions logged`, margin + (boxW + 3) * 3 + 3, y + 19);

  // 3. Section 2: Fleet / Truck Profitability Matrix
  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('FLEET & TRUCK SALES & PROFITABILITY MATRIX', margin, y);

  y += 4;
  // Table Header
  doc.setFillColor(15, 30, 53);
  doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  // Clean spaced columns (Total width: 190 mm)
  doc.text('TANKER / TRUCK', margin + 3, y + 4.8);
  doc.text('TRANSPORTER / DRIVER', margin + 32, y + 4.8);
  doc.text('TRIPS', margin + 86, y + 4.8, { align: 'right' });
  doc.text('VOLUME (L)', margin + 114, y + 4.8, { align: 'right' });
  doc.text('REVENUE (KES)', margin + 144, y + 4.8, { align: 'right' });
  doc.text('TOTAL COST (KES)', margin + 172, y + 4.8, { align: 'right' });
  doc.text('NET PROFIT (KES)', pageWidth - margin - 2, y + 4.8, { align: 'right' });

  y += 7;
  const trucksToDisplay = truckFilter
    ? truckSummaries.filter((t) => t.registration_number === truckFilter)
    : truckSummaries;

  trucksToDisplay.forEach((t, idx) => {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(t.registration_number, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const driverLabel = `${t.transporter || 'Direct'} · ${t.driver_name || 'Driver'}`;
    doc.text(driverLabel.length > 28 ? driverLabel.slice(0, 27) + '…' : driverLabel, margin + 32, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(String(t.total_trips), margin + 86, y + 4.5, { align: 'right' });
    doc.text(formatNum(t.total_volume_litres) + ' L', margin + 114, y + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(formatNum(t.total_revenue), margin + 144, y + 4.5, { align: 'right' });
    doc.text(formatNum(t.total_cost), margin + 172, y + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(t.net_profit >= 0 ? 5 : 220, t.net_profit >= 0 ? 150 : 38, t.net_profit >= 0 ? 105 : 38);
    doc.text(formatNum(t.net_profit), pageWidth - margin - 2, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  // 4. Section 3: Itemized Commercial Orders & Deliveries Profit Ledger
  y += 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ITEMIZED COMMERCIAL ORDER & DELIVERY PROFIT LEDGER', margin, y);

  y += 4;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('DATE / REF #', margin + 3, y + 4.8);
  doc.text('CUSTOMER / CONSIGNEE', margin + 38, y + 4.8);
  doc.text('TRUCK', margin + 88, y + 4.8);
  doc.text('VOLUME (L)', margin + 120, y + 4.8, { align: 'right' });
  doc.text('REVENUE (KES)', margin + 148, y + 4.8, { align: 'right' });
  doc.text('COST (KES)', margin + 174, y + 4.8, { align: 'right' });
  doc.text('PROFIT (KES)', pageWidth - margin - 2, y + 4.8, { align: 'right' });

  y += 7;
  const ledgerToDisplay = truckFilter
    ? orderProfitLedger.filter((item) => item.tanker_registration === truckFilter)
    : orderProfitLedger;

  const maxRows = Math.min(ledgerToDisplay.length, 30);
  for (let i = 0; i < maxRows; i++) {
    const item = ledgerToDisplay[i];
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(item.reference_number, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(item.customer_name.length > 25 ? item.customer_name.slice(0, 24) + '…' : item.customer_name, margin + 38, y + 4.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.tanker_registration, margin + 88, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(formatNum(item.volume_litres) + ' L', margin + 120, y + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(formatNum(item.revenue), margin + 148, y + 4.5, { align: 'right' });
    doc.text(formatNum(item.total_cost), margin + 174, y + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.net_profit >= 0 ? 5 : 220, item.net_profit >= 0 ? 150 : 38, item.net_profit >= 0 ? 105 : 38);
    doc.text(formatNum(item.net_profit), pageWidth - margin - 2, y + 4.5, { align: 'right' });

    y += 6.5;
  }

  // 5. Certification Signatures Block
  y += 8;
  if (y > 255) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Chief Financial Officer / Financial Controller:', margin + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature: ___________________________', margin + 5, y + 13);
  doc.text(`Date: ${new Date().toLocaleDateString('en-KE')}`, margin + 5, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('Managing Director / Terminal Operations Manager:', margin + 98, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature: ___________________________', margin + 98, y + 13);
  doc.text('Official Stamp / Verification Seal', margin + 98, y + 19);

  // 6. Footer
  const footerY = 286;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'TARITA PETROLEUM Financial Reporting · Regulated by Energy and Petroleum Regulatory Authority (EPRA)',
    margin,
    footerY + 4
  );
  doc.text(
    `Generated on ${new Date().toLocaleString('en-KE')} · Period: ${periodLabel} · Confidential`,
    margin,
    footerY + 8
  );

  // Save the PDF
  const filename = `Commercial_PL_Statement_${truckFilter ? `${truckFilter}_` : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
