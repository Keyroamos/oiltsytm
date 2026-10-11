import { jsPDF } from 'jspdf';
import type { Customer, Invoice, Payment } from '../types';
import { getDepotConfig } from '../services/settingsService';

interface StatementEntry {
  date: Date;
  dateStr: string;
  type: 'INVOICE' | 'PAYMENT';
  ref: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function generateCustomerStatementPdf(
  customer: Customer,
  invoices: Invoice[],
  payments: Payment[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const config = getDepotConfig();
  const primaryColor = [15, 30, 53];
  const amberColor = [245, 158, 11];
  const grayColor = [100, 116, 139];
  const lightBg = [248, 250, 252];

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line
  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(config.depot_name || 'TARITA PETROLEUM', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Petroleum & Logistics Management System (PMS & AGO)', margin, 24);
  doc.text(`${config.physical_address}`, margin, 29);
  doc.text(`Tel: ${config.contact_phone} | Email: ${config.contact_email}`, margin, 34);

  // Right Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(245, 158, 11);
  doc.text('STATEMENT OF ACCOUNT', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const printDate = new Date().toLocaleDateString('en-GB');
  doc.text(`Date Printed: ${printDate}`, pageWidth - margin, 26, { align: 'right' });

  let y = 54;

  // 2. Customer Summary Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CUSTOMER DETAILS', margin + 5, y + 7);

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(11);
  doc.text(customer.name, margin + 5, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Account Code: ${customer.code}`, margin + 5, y + 21);
  doc.text(`Contact: ${customer.phone || 'N/A'} | ${customer.email || 'N/A'}`, margin + 5, y + 26);
  doc.text(`Credit Limit: KES ${Number(customer.credit_limit).toLocaleString('en-KE')}`, margin + 5, y + 31);

  // Right Side of Customer Box - Current Balance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('CURRENT OUTSTANDING BALANCE', pageWidth - margin - 5, y + 15, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text(`KES ${Number(customer.current_balance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 23, { align: 'right' });

  y += 45;

  // 3. Ledger Prep
  const entries: StatementEntry[] = [];

  for (const inv of invoices) {
    if (inv.status === 'CANCELLED') continue;
    entries.push({
      date: new Date(inv.created_at),
      dateStr: new Date(inv.created_at).toLocaleDateString('en-GB'),
      type: 'INVOICE',
      ref: inv.invoice_number,
      description: 'Tax Invoice',
      debit: Number(inv.total_amount),
      credit: 0,
      balance: 0,
    });
  }

  for (const pay of payments) {
    entries.push({
      date: new Date(pay.payment_date),
      dateStr: new Date(pay.payment_date).toLocaleDateString('en-GB'),
      type: 'PAYMENT',
      ref: pay.reference_number || 'Cash',
      description: `Payment - ${pay.payment_method}`,
      debit: 0,
      credit: Number(pay.amount),
      balance: 0,
    });
  }

  // Sort by date ascending
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance += entry.debit;
    runningBalance -= entry.credit;
    entry.balance = runningBalance;
  }

  // 4. Ledger Table Header
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DATE', margin + 3, y + 5.5);
  doc.text('REF', margin + 25, y + 5.5);
  doc.text('DESCRIPTION', margin + 55, y + 5.5);
  doc.text('DEBIT (KES)', margin + 110, y + 5.5, { align: 'right' });
  doc.text('CREDIT (KES)', margin + 140, y + 5.5, { align: 'right' });
  doc.text('BALANCE (KES)', pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 8;

  // Ledger Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (entries.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No transactions found for this customer.', pageWidth / 2, y + 10, { align: 'center' });
  } else {
    for (let i = 0; i < entries.length; i++) {
      const row = entries[i];
      if (y > 270) {
        doc.addPage();
        y = margin;
        // Reprint header
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('DATE', margin + 3, y + 5.5);
        doc.text('REF', margin + 25, y + 5.5);
        doc.text('DESCRIPTION', margin + 55, y + 5.5);
        doc.text('DEBIT (KES)', margin + 110, y + 5.5, { align: 'right' });
        doc.text('CREDIT (KES)', margin + 140, y + 5.5, { align: 'right' });
        doc.text('BALANCE (KES)', pageWidth - margin - 3, y + 5.5, { align: 'right' });
        y += 8;
        doc.setFont('helvetica', 'normal');
      }

      // Zebra striping
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }

      doc.setTextColor(71, 85, 105);
      doc.text(row.dateStr, margin + 3, y + 4.5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(row.ref, margin + 25, y + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(row.description, margin + 55, y + 4.5);
      
      doc.setFont('courier', 'normal');
      
      if (row.debit > 0) {
        doc.setTextColor(220, 38, 38); // Red for debit
        doc.text(row.debit.toLocaleString('en-KE', { minimumFractionDigits: 2 }), margin + 110, y + 4.5, { align: 'right' });
      } else {
        doc.text('-', margin + 110, y + 4.5, { align: 'right' });
      }

      if (row.credit > 0) {
        doc.setTextColor(16, 185, 129); // Green for credit
        doc.text(row.credit.toLocaleString('en-KE', { minimumFractionDigits: 2 }), margin + 140, y + 4.5, { align: 'right' });
      } else {
        doc.setTextColor(71, 85, 105);
        doc.text('-', margin + 140, y + 4.5, { align: 'right' });
      }

      doc.setFont('courier', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(row.balance.toLocaleString('en-KE', { minimumFractionDigits: 2 }), pageWidth - margin - 3, y + 4.5, { align: 'right' });

      y += 7;
    }
  }

  // 6. Footer & Terms
  const footerY = 280;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`System Generated on ${new Date().toLocaleString('en-KE')} · TARITA PETROLEUM LIMITED Kenya Terminal Systems`, margin, footerY + 5);

  const filename = `Statement_${customer.code}_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
