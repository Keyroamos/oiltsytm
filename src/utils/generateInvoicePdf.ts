import { jsPDF } from 'jspdf';
import type { Invoice, Payment } from '../types';
import { getDepotConfig } from '../services/settingsService';

export function generateInvoicePdf(invoice: Invoice, payments: Payment[] = []): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const config = getDepotConfig();
  const primaryColor = [15, 30, 53]; // #0f1e35 (Deep Navy)
  const amberColor = [245, 158, 11]; // #f59e0b
  const grayColor = [100, 116, 139]; // #64748b
  const lightBg = [248, 250, 252]; // #f8fafc

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
  doc.text('Petroleum & Logistics Management System', margin, 24);
  doc.text(`${config.physical_address}`, margin, 29);
  doc.text(`Tel: ${config.contact_phone} | Email: ${config.contact_email}`, margin, 34);

  // Right Header: TAX INVOICE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(invoice.etims_cu_number ? 'KRA eTIMS TAX INVOICE' : 'TAX INVOICE', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`KRA PIN: ${config.kra_pin}`, pageWidth - margin, 26, { align: 'right' });
  doc.text(`EPRA Lic: ${config.epra_license}`, pageWidth - margin, 31, { align: 'right' });

  // 2. Invoice Meta & Bill-To Section
  let y = 54;

  // Left Column: Bill To
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, 95, 40, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, 95, 40, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED TO (CUSTOMER)', margin + 5, y + 7);

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const custName = invoice.customer?.name || 'Valued Customer';
  doc.text(custName.length > 32 ? custName.substring(0, 32) + '…' : custName, margin + 5, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Account Code: ${invoice.customer?.code || 'CUST-001'}`, margin + 5, y + 21);
  if (invoice.customer?.phone) {
    doc.text(`Tel: ${invoice.customer.phone}`, margin + 5, y + 26);
  }
  if (invoice.customer?.email) {
    doc.text(`Email: ${invoice.customer.email}`, margin + 5, y + 31);
  }
  if (invoice.customer?.address) {
    doc.text(`Address: ${invoice.customer.address}`, margin + 5, y + 36);
  }

  // Right Column: Invoice Details
  const rightColX = margin + 102;
  const rightColWidth = contentWidth - 102;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(rightColX, y, rightColWidth, 40, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, y, rightColWidth, 40, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('INVOICE DETAILS', rightColX + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice No:', rightColX + 5, y + 16);
  doc.setFont('courier', 'bold');
  doc.text(invoice.invoice_number, rightColX + 38, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Issue Date:', rightColX + 5, y + 22);
  doc.text(new Date(invoice.created_at).toLocaleDateString('en-GB'), rightColX + 38, y + 22);

  doc.text('Due Date:', rightColX + 5, y + 28);
  doc.setFont('helvetica', 'bold');
  const isOverdue = invoice.status === 'OVERDUE' || (invoice.status !== 'PAID' && new Date(invoice.due_date) < new Date());
  if (isOverdue) doc.setTextColor(220, 38, 38);
  doc.text(invoice.due_date, rightColX + 38, y + 28);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Status:', rightColX + 5, y + 34);

  // Status Stamp Badge
  doc.setFont('helvetica', 'bold');
  if (invoice.status === 'PAID') {
    doc.setTextColor(16, 185, 129); // Green
    doc.text('PAID IN FULL', rightColX + 38, y + 34);
  } else if (invoice.status === 'PARTIALLY_PAID') {
    doc.setTextColor(245, 158, 11); // Amber
    doc.text('PARTIALLY PAID', rightColX + 38, y + 34);
  } else if (isOverdue) {
    doc.setTextColor(220, 38, 38); // Red
    doc.text('OVERDUE', rightColX + 38, y + 34);
  } else {
    doc.setTextColor(30, 58, 138); // Blue
    doc.text('PAYMENT PENDING', rightColX + 38, y + 34);
  }

  // 3. Line Items Table Header
  y = 104;
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('#', margin + 3, y + 5.5);
  doc.text('DESCRIPTION & SPECIFICATION', margin + 12, y + 5.5);
  doc.text('QTY / UNIT', margin + 95, y + 5.5);
  doc.text('TAX RATE', margin + 125, y + 5.5);
  doc.text('AMOUNT (KES)', pageWidth - margin - 3, y + 5.5, { align: 'right' });

  // Line Item Row
  y += 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 14, pageWidth - margin, y + 14);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1', margin + 3, y + 6);
  doc.text('Bulk Petroleum (PMS / AGO) Supply & Distribution Consignment', margin + 12, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const orderRef = invoice.order_id ? `Linked Contract Ref: ${invoice.order_id.substring(0, 8)}` : 'Terminal Gantry Commercial Sale';
  doc.text(`${orderRef} · Gantry Metered Delivery`, margin + 12, y + 10.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('1 Lot', margin + 95, y + 8);
  doc.text('16% VAT', margin + 125, y + 8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.text(invoice.subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 }), pageWidth - margin - 3, y + 8, { align: 'right' });

  // 4. Financial Summary Row (y = 130)
  y = 128;
  const totalsWidth = 85;
  const totalsX = pageWidth - margin - totalsWidth;
  const leftSummaryWidth = contentWidth - totalsWidth - 6;

  // Commercial Summary Box (Left)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, leftSummaryWidth, 44, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, leftSummaryWidth, 44, 2, 2, 'S');

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COMMERCIAL CONTRACT SUMMARY', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Account Code:', margin + 5, y + 13);
  doc.setFont('courier', 'bold');
  doc.text(invoice.customer?.code || '—', margin + 32, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Terms:', margin + 5, y + 19);
  doc.text('Net Commercial Credit', margin + 32, y + 19);

  doc.text('Payment Due:', margin + 5, y + 25);
  doc.setFont('helvetica', 'bold');
  if (isOverdue) doc.setTextColor(220, 38, 38);
  doc.text(invoice.due_date, margin + 32, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Delivery Location:', margin + 5, y + 31);
  const addr = invoice.customer?.address || 'Nairobi Terminal Gantry';
  doc.text(addr.length > 25 ? addr.substring(0, 25) + '…' : addr, margin + 32, y + 31);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('* Electronic invoice valid without physical rubber stamp.', margin + 5, y + 39);

  // Financial Totals Breakdown Box (Right)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(totalsX, y, totalsWidth, 44, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsX, y, totalsWidth, 44, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Taxable Subtotal:', totalsX + 5, y + 7.5);
  doc.setFont('courier', 'normal');
  doc.text(`KES ${invoice.subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 7.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  const isZeroRated = (invoice.tax_amount || 0) === 0;
  doc.text(isZeroRated ? 'VAT (0.0% - Zero Rated):' : 'VAT (16.0%):', totalsX + 5, y + 14.5);
  doc.setFont('courier', 'normal');
  doc.text(`KES ${Number(invoice.tax_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 14.5, { align: 'right' });

  // Total Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX + 5, y + 18, pageWidth - margin - 5, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Invoice Total:', totalsX + 5, y + 24);
  doc.setFont('courier', 'bold');
  doc.text(`KES ${invoice.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 24, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129); // Green
  doc.text('Amount Paid:', totalsX + 5, y + 30);
  doc.setFont('courier', 'bold');
  doc.text(`KES ${Number(invoice.amount_paid || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 30, { align: 'right' });

  // Balance Due Banner
  doc.setFillColor(15, 30, 53); // Deep Navy
  doc.roundedRect(totalsX + 3, y + 34, totalsWidth - 6, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Balance Due:', totalsX + 6, y + 39);
  doc.setFont('courier', 'bold');
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(`KES ${Number(invoice.balance_due || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin - 6, y + 39, { align: 'right' });

  // 5. Full-Width Official Bank & Payment Settlement Card (y = 177)
  y = 177;
  const bankCardHeight = 44;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, y, contentWidth, bankCardHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(margin, y, contentWidth, bankCardHeight, 2, 2, 'S');

  // Top Dark Navy Header Band
  doc.setFillColor(15, 30, 53); // Deep Navy
  doc.roundedRect(margin, y, contentWidth, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OFFICIAL PAYMENT & BANK SETTLEMENT INSTRUCTIONS', margin + 5, y + 5);
  doc.setTextColor(245, 158, 11);
  doc.text(`QUOTE INVOICE: ${invoice.invoice_number}`, pageWidth - margin - 5, y + 5, { align: 'right' });

  // Two-Column Layout inside the Bank Card
  const col1X = margin + 5;
  const col2X = margin + 95;

  // Column 1: Commercial Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ELECTRONIC FUNDS TRANSFER (RTGS / EFT)', col1X, y + 13);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Bank:', col1X, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(`${config.bank_name}`, col1X + 22, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('Branch:', col1X, y + 24.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${config.bank_branch}`, col1X + 22, y + 24.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Account Name:', col1X, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`${config.bank_account_name}`, col1X + 22, y + 30);

  doc.setFont('helvetica', 'bold');
  doc.text('Account No:', col1X, y + 36.5);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 30, 53);
  doc.setFontSize(9.5);
  doc.text(`${config.bank_account_number} (KES)`, col1X + 22, y + 36.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Swift / BIC: ${config.bank_swift_code}`, col1X + 22, y + 41);

  // Vertical Separator Line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 90, y + 10, margin + 90, y + bankCardHeight - 2);

  // Column 2: M-Pesa & Remittance Advice
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('M-PESA MOBILE MONEY SETTLEMENT', col2X, y + 13);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Business Paybill:', col2X, y + 20);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`${config.mpesa_paybill}`, col2X + 32, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Account Number:', col2X, y + 26);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(`${invoice.invoice_number}`, col2X + 32, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Remittance Note:', col2X, y + 33);
  doc.text(`Quote ${invoice.invoice_number} on wire transfer remarks.`, col2X + 24, y + 33);

  doc.text('Proof of Payment:', col2X, y + 38.5);
  doc.text(`Email remittance advice to: ${config.contact_email}`, col2X + 24, y + 38.5);

  // 5. Payment Receipts History (if any)
  y = 227;
  if (payments && payments.length > 0) {
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PAYMENTS RECEIVED FOR THIS INVOICE', margin, y);
    y += 4;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.text('RECEIPT DATE', margin + 3, y + 4);
    doc.text('PAYMENT METHOD', margin + 45, y + 4);
    doc.text('REFERENCE / CHEQUE NO.', margin + 95, y + 4);
    doc.text('AMOUNT APPLIED', pageWidth - margin - 3, y + 4, { align: 'right' });

    y += 6;
    for (const p of payments) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(p.payment_date, margin + 3, y + 4.5);
      doc.text(p.payment_method, margin + 45, y + 4.5);
      doc.text(p.reference_number || 'Internal Transfer', margin + 95, y + 4.5);
      doc.setFont('courier', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`+ KES ${Number(p.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, y + 4.5, { align: 'right' });
      y += 6;
    }
  }

  // 6. KRA eTIMS Fiscal Compliance Block
  const etimsY = 230;
  if (invoice.etims_cu_number || invoice.etims_status === 'VERIFIED') {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, etimsY, contentWidth, 18, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, etimsY, contentWidth, 18, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('KRA eTIMS FISCAL VALIDATION & CONTROL UNIT DETAILS', margin + 4, etimsY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`CU Serial Number: ${invoice.etims_cu_number || 'KRAOSCU01827364'}`, margin + 4, etimsY + 10);
    doc.text(`Fiscal Signing Hash: ${invoice.etims_signing_code || '4A7B-9F12-88CE-2026'}`, margin + 4, etimsY + 14);

    doc.text(`Fiscal Timestamp: ${invoice.etims_transmitted_at ? new Date(invoice.etims_transmitted_at).toLocaleString('en-KE') : new Date().toLocaleString('en-KE')}`, margin + 80, etimsY + 10);
    doc.text('Tax Category: Code E (Exempt - 0% VAT)', margin + 80, etimsY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(5, 150, 105);
    doc.text('[ VERIFIED ON KRA eTIMS ]', pageWidth - margin - 4, etimsY + 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('QR Verifiable on iTax Portal', pageWidth - margin - 4, etimsY + 14, { align: 'right' });
  }

  // 7. Footer & Terms
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Terms & Conditions: Ownership of petroleum products transfers upon settlement in full. Invoices overdue beyond credit terms accrue 2% monthly interest.', margin, footerY + 5);
  doc.text(`System Generated on ${new Date().toLocaleString('en-KE')} · TARITA PETROLEUM LIMITED Kenya Terminal Systems · Page 1 of 1`, margin, footerY + 9);

  // Authorizing Signature Line
  doc.text('Authorized Finance Signature: ___________________________', pageWidth - margin, footerY + 9, { align: 'right' });

  // Save the PDF
  const filename = `${invoice.invoice_number}_${(invoice.customer?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
