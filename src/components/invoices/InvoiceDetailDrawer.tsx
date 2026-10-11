import { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Download,
  Printer,
  DollarSign,
  Calendar,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Landmark,
} from 'lucide-react';
import type { Invoice, Payment } from '../../types';
import { getInvoicePayments } from '../../services/invoiceService';
import { getDepotConfig } from '../../services/settingsService';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';

interface InvoiceDetailDrawerProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export function InvoiceDetailDrawer({
  invoice,
  isOpen,
  onClose,
  onRecordPayment,
}: InvoiceDetailDrawerProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    if (isOpen && invoice) {
      setLoadingPayments(true);
      getInvoicePayments(invoice.id)
        .then((res) => setPayments(res))
        .catch((err) => console.error('Failed to load invoice payments:', err))
        .finally(() => setLoadingPayments(false));
    } else {
      setPayments([]);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const config = getDepotConfig();
  const balanceDue = Number(invoice.balance_due || 0);
  const isPaid = balanceDue <= 0 || invoice.status === 'PAID';
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = !isPaid && invoice.due_date < today;

  const handleDownloadPdf = () => {
    generateInvoicePdf(invoice, payments);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl md:max-w-2xl bg-white shadow-2xl flex flex-col h-full animate-slide-left">
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-[#0f1e35] text-white flex items-start justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                    {invoice.invoice_number}
                  </h2>
                  <StatusBadge status={isOverdue ? 'OVERDUE' : invoice.status} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Billed To: {invoice.customer?.name} ({invoice.customer?.code})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-white transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Print Invoice</span>
              </button>
            </div>

            {!isPaid && (
              <button
                onClick={() => onRecordPayment(invoice)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Overdue Warning Banner */}
            {isOverdue && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-800 font-medium">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">This invoice is past its due date ({invoice.due_date})</p>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Outstanding balance of {formatCurrency(balanceDue)} is overdue. Contact customer for settlement.
                  </p>
                </div>
              </div>
            )}

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Subtotal</span>
                <span className="font-bold font-mono text-gray-900 text-xs mt-0.5 block">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">VAT (16%)</span>
                <span className="font-bold font-mono text-gray-900 text-xs mt-0.5 block">
                  {formatCurrency(invoice.tax_amount)}
                </span>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Amount</span>
                <span className="font-bold font-mono text-purple-900 text-xs mt-0.5 block">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Amount Paid</span>
                <span className="font-bold font-mono text-emerald-600 text-xs mt-0.5 block">
                  {formatCurrency(invoice.amount_paid)}
                </span>
              </div>
            </div>

            {/* Balance Due Highlight */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isPaid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isPaid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <p className="text-xs font-bold">
                    {isPaid ? 'Settled in Full' : 'Outstanding Balance Due'}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {isPaid
                      ? 'No pending receivables for this invoice'
                      : `Payment due on or before ${formatDate(invoice.due_date)}`}
                  </p>
                </div>
              </div>

              <span className="font-mono text-lg font-black">
                {formatCurrency(balanceDue)}
              </span>
            </div>

            {/* Official Bank Payment & Settlement Details Card */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-blue-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-700" />
                  <span>Official Bank Payment &amp; Remittance Details</span>
                </h4>
                <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                  Beneficiary Account
                </span>
              </div>

              <p className="text-[11px] text-gray-500">
                Please remit payments directly to the designated commercial bank account or M-Pesa paybill below:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Bank & Branch */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Commercial Bank</span>
                  <span className="font-bold text-gray-900 block mt-0.5">{config.bank_name}</span>
                  <span className="text-[10px] text-gray-500">{config.bank_branch}</span>
                </div>

                {/* Account Name */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Beneficiary Account Name</span>
                  <span className="font-bold text-gray-900 block mt-0.5">{config.bank_account_name}</span>
                  <span className="text-[10px] text-gray-500">Currency: Kenya Shillings (KES)</span>
                </div>

                {/* Account Number with Copy Button */}
                <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-blue-600 uppercase font-bold block">Bank Account Number (KES)</span>
                    <span className="font-mono text-base font-black text-[#0f1e35] tracking-wider">
                      {config.bank_account_number}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Swift / BIC: {config.bank_swift_code}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(config.bank_account_number, 'account')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {copiedField === 'account' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Copy Account</span>
                      </>
                    )}
                  </button>
                </div>

                {/* M-Pesa Paybill with Copy Button */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">M-Pesa Mobile Paybill</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        Paybill: <strong className="text-emerald-700 font-extrabold">{config.mpesa_paybill}</strong>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="font-mono text-xs text-gray-700">
                        Account: <strong className="font-bold text-gray-900">{invoice.invoice_number}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(config.mpesa_paybill, 'paybill')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {copiedField === 'paybill' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span>Copy Paybill</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                <strong>Remittance Advice:</strong> Always quote <strong>{invoice.invoice_number}</strong> on your bank transfer remarks or deposit narrative for immediate reconciliation.
              </div>
            </div>

            {/* Billed Customer Card */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Billed Customer Profile
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Customer Name</span>
                  <span className="font-bold text-gray-900">{invoice.customer?.name}</span>
                  <span className="text-gray-400 ml-1 font-mono">({invoice.customer?.code})</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Customer Balance</span>
                  <span className="font-bold font-mono text-red-600">
                    {formatCurrency(Number(invoice.customer?.current_balance || 0))}
                  </span>
                </div>
                {invoice.customer?.phone && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{invoice.customer.phone}</span>
                  </div>
                )}
                {invoice.customer?.email && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{invoice.customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Commercial Invoice Details */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Commercial Terms &amp; Dates
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Issue Date</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(invoice.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Payment Due</span>
                  <span className={`font-semibold flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {invoice.due_date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Linked Contract</span>
                  <span className="font-mono font-semibold text-blue-700 mt-0.5 block">
                    {invoice.order_id ? invoice.order_id.substring(0, 8).toUpperCase() : 'Terminal Direct'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Receipts History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Payments Applied to this Invoice
                </h4>
                <span className="text-[11px] font-semibold text-gray-500">
                  {payments.length} receipt{payments.length === 1 ? '' : 's'}
                </span>
              </div>

              {loadingPayments ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading payment receipts…</div>
              ) : payments.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-400">
                  No payments have been recorded for this invoice yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{p.payment_method}</span>
                          {p.reference_number && (
                            <span className="font-mono text-gray-500 text-[10px]">
                              · Ref: {p.reference_number}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 block">
                          Applied on {formatDate(p.payment_date)}
                        </span>
                      </div>

                      <span className="font-bold font-mono text-emerald-600 text-sm">
                        +{formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>

              {!isPaid && (
                <button
                  onClick={() => onRecordPayment(invoice)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
