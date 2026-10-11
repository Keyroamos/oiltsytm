import { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Send,
  ShieldCheck,
  Check,
  FileCode,
  Download,
  FileDown,
  Eye,
  X,
} from 'lucide-react';
import type { Invoice, Customer } from '../types';
import { getInvoices } from '../services/invoiceService';
import { getCustomers } from '../services/customerService';
import { transmitInvoiceToEtims, downloadEtimsJson, downloadEtimsCsv } from '../services/etimsService';
import { CreateInvoiceModal } from '../components/invoices/CreateInvoiceModal';
import { RecordPaymentModal } from '../components/invoices/RecordPaymentModal';
import { InvoiceDetailDrawer } from '../components/invoices/InvoiceDetailDrawer';
import { KPICard } from '../components/common/KPICard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateInvoicePdf } from '../utils/generateInvoicePdf';
import { useAuth } from '../context/AuthContext';

export function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);

  // eTIMS state
  const [transmittingId, setTransmittingId] = useState<string | null>(null);
  const [etimsSuccessModal, setEtimsSuccessModal] = useState<{ invoice: Invoice; result: any } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invResult, custResult] = await Promise.allSettled([
        getInvoices(),
        getCustomers(),
      ]);

      if (invResult.status === 'fulfilled') {
        setInvoices(invResult.value);
      } else {
        console.error('Failed to load invoices:', invResult.reason);
      }

      if (custResult.status === 'fulfilled') {
        setCustomers(custResult.value);
      } else {
        console.error('Failed to load customers:', custResult.reason);
      }
    } catch (err) {
      console.error('Failed to load invoices page data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTransmitEtims = async (inv: Invoice) => {
    try {
      setTransmittingId(inv.id);
      const res = await transmitInvoiceToEtims(inv, user?.id);
      setEtimsSuccessModal({ invoice: inv, result: res });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to transmit invoice to eTIMS.');
    } finally {
      setTransmittingId(null);
    }
  };

  // KPI aggregates
  const totalOutstanding = invoices
    .filter((i) => !['PAID', 'CANCELLED'].includes(i.status))
    .reduce((s, i) => s + Number(i.balance_due || 0), 0);

  const totalRevenue = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.total_amount || 0), 0);

  const overdueCount = invoices.filter((i) => {
    const today = new Date().toISOString().split('T')[0];
    return i.status !== 'PAID' && i.status !== 'CANCELLED' && i.due_date < today;
  }).length;

  const issuedCount = invoices.filter((i) => i.status === 'ISSUED').length;

  // Filter
  const filteredInvoices = invoices.filter((i) => {
    let matchesStatus = true;
    if (selectedStatus === 'OUTSTANDING') matchesStatus = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status);
    else if (selectedStatus === 'PAID') matchesStatus = i.status === 'PAID';
    else if (selectedStatus === 'OVERDUE') {
      const today = new Date().toISOString().split('T')[0];
      matchesStatus = i.status !== 'PAID' && i.status !== 'CANCELLED' && i.due_date < today;
    }

    const matchesSearch =
      searchQuery === '' ||
      i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.customer?.code?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Invoices & Payment Collections
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Commercial invoice management, VAT billing, and payment receipt recording
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="Balances yet to be collected"
          icon={TrendingUp}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <KPICard
          title="Total Revenue Collected"
          value={formatCurrency(totalRevenue)}
          subtitle="Fully paid invoices"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Overdue Invoices"
          value={String(overdueCount)}
          subtitle="Past payment due date"
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          alert={overdueCount > 0}
        />
        <KPICard
          title="Awaiting Payment"
          value={String(issuedCount)}
          subtitle="Freshly issued invoices"
          icon={DollarSign}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-red-800 font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{overdueCount} invoice{overdueCount > 1 ? 's are' : ' is'} past due. Follow up on collections immediately.</span>
          </div>
          <button
            onClick={() => setSelectedStatus('OVERDUE')}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-[11px] hover:bg-red-700 transition-colors"
          >
            View Overdue →
          </button>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'OUTSTANDING', label: 'Outstanding' },
            { id: 'OVERDUE', label: `Overdue (${overdueCount})` },
            { id: 'PAID', label: 'Paid' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
                  ? 'bg-[#1e3a5f] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>
          <button onClick={loadData} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Invoice Ledger
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading && invoices.length === 0 ? (
          <div className="p-6"><LoadingSkeleton count={4} type="row" /></div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Receipt}
              title="No invoices found"
              description="No invoices match your selected filter. Issue an invoice from a completed dispatch."
              action={{ label: 'Generate Invoice', onClick: () => setIsCreateOpen(true) }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Invoice #</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Subtotal</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Total (0% VAT)</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Paid</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Balance Due</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">eTIMS Compliance</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.map((inv) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isOverdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.due_date < today;
                  const canPay = !['PAID', 'CANCELLED'].includes(inv.status) && Number(inv.balance_due) > 0;
                  const isEtimsVerified = Boolean(inv.etims_cu_number || inv.etims_status === 'VERIFIED');

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td
                        className="px-5 py-3.5 cursor-pointer group"
                        onClick={() => setDrawerInvoice(inv)}
                      >
                        <span className="font-bold text-gray-900 font-mono block group-hover:text-blue-600 transition-colors">
                          {inv.invoice_number}
                        </span>
                        <span className="text-[10px] text-gray-400 block">{formatDate(inv.created_at)}</span>
                      </td>

                      <td
                        className="px-5 py-3.5 cursor-pointer group"
                        onClick={() => setDrawerInvoice(inv)}
                      >
                        <span className="font-semibold text-gray-800 block group-hover:text-blue-600 transition-colors">
                          {inv.customer?.name}
                        </span>
                        <span className="text-[10px] text-gray-400">{inv.customer?.code}</span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono text-gray-700">
                        {formatCurrency(inv.subtotal)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">
                        {formatCurrency(inv.total_amount)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-emerald-600 font-mono">
                        {formatCurrency(inv.amount_paid)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold font-mono">
                        <span className={Number(inv.balance_due) > 0 ? 'text-red-600' : 'text-emerald-600'}>
                          {formatCurrency(inv.balance_due)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {isEtimsVerified ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              eTIMS Verified
                            </span>
                            <span className="text-[8px] font-mono text-gray-400 mt-0.5 max-w-[90px] truncate block">
                              {inv.etims_cu_number}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            eTIMS Pending
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={isOverdue && inv.status !== 'PAID' ? 'OVERDUE' : inv.status} />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">

                          {/* Core action group */}
                          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden divide-x divide-gray-200 bg-white shadow-xs">
                            <button
                              onClick={() => setDrawerInvoice(inv)}
                              title="View Details"
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => generateInvoicePdf(inv)}
                              title="Download PDF"
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* eTIMS action */}
                          {!isEtimsVerified ? (
                            <button
                              onClick={() => handleTransmitEtims(inv)}
                              disabled={transmittingId === inv.id}
                              title="Transmit to KRA eTIMS"
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-[10px] font-bold shadow-xs disabled:opacity-50 whitespace-nowrap"
                            >
                              {transmittingId === inv.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              eTIMS
                            </button>
                          ) : (
                            <div className="flex items-center rounded-lg border border-emerald-200 overflow-hidden divide-x divide-emerald-200 bg-emerald-50/50 shadow-xs">
                              <button
                                onClick={() => downloadEtimsJson(inv)}
                                title="Download eTIMS JSON"
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => downloadEtimsCsv(inv)}
                                title="Download eTIMS CSV"
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Pay / Settled */}
                          {canPay ? (
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              title="Record Payment"
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-[10px] font-bold hover:bg-[#2d5282] transition-colors shadow-xs whitespace-nowrap"
                            >
                              <DollarSign className="w-3 h-3" />
                              Pay
                            </button>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold px-1">
                              <Check className="w-3 h-3" />
                              Paid
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateInvoiceModal
        customers={customers}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
      />

      <RecordPaymentModal
        invoice={selectedInvoice}
        isOpen={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        onSuccess={loadData}
      />

      <InvoiceDetailDrawer
        invoice={drawerInvoice}
        isOpen={drawerInvoice !== null}
        onClose={() => setDrawerInvoice(null)}
        onRecordPayment={(inv) => {
          setDrawerInvoice(null);
          setSelectedInvoice(inv);
        }}
      />

      {/* eTIMS Fiscalization Result Modal */}
      {etimsSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEtimsSuccessModal(null)} />

          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">KRA eTIMS Fiscalization Confirmed</h3>
                  <p className="text-[11px] text-gray-500">Official Electronic Tax Invoice registered with KRA</p>
                </div>
              </div>
              <button
                onClick={() => setEtimsSuccessModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Invoice Number:</span>
                <span className="font-mono font-bold text-emerald-950">{etimsSuccessModal.invoice.invoice_number}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">KRA CU Serial Number:</span>
                <span className="font-mono font-bold text-emerald-800">{etimsSuccessModal.result.cuNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Fiscal Signing Hash:</span>
                <span className="font-mono text-emerald-800">{etimsSuccessModal.result.signingCode}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Tax Classification:</span>
                <span className="font-bold text-emerald-800">Tax Code B (Petroleum Products - 16% VAT)</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-emerald-200/80 pt-2 font-bold">
                <span className="text-emerald-900">Fiscal Total Amount:</span>
                <span className="font-mono text-emerald-950">{formatCurrency(etimsSuccessModal.invoice.total_amount)}</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
              <p className="font-semibold text-gray-700">✓ Real-Time Fiscal Signing Complete</p>
              <p>The invoice details have been cryptographically verified according to KRA eTIMS VSCU/OSCU specifications. You can download the official KRA PDF invoice or export the eTIMS payload.</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => downloadEtimsJson(etimsSuccessModal.invoice)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FileCode className="w-3.5 h-3.5 text-purple-600" />
                <span>eTIMS JSON</span>
              </button>

              <button
                type="button"
                onClick={() => downloadEtimsCsv(etimsSuccessModal.invoice)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Portal CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  generateInvoicePdf({
                    ...etimsSuccessModal.invoice,
                    etims_cu_number: etimsSuccessModal.result.cuNumber,
                    etims_signing_code: etimsSuccessModal.result.signingCode,
                    etims_status: 'VERIFIED',
                  });
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download eTIMS PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
