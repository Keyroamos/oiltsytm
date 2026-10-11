import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  Download,
  DollarSign,
  Building2,
  FileText,
  Calendar,
} from 'lucide-react';
import type { PaymentMethod } from '../types';
import { getAllPayments, type PaymentWithRelations } from '../services/paymentService';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCSV } from '../services/reportService';

const METHOD_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; badgeBg: string }
> = {
  BANK: { label: 'Bank Transfer', icon: Building2, color: 'text-blue-600', badgeBg: 'bg-blue-50 border-blue-200 text-blue-700' },
  CREDIT: { label: 'Credit Memo', icon: DollarSign, color: 'text-gray-600', badgeBg: 'bg-gray-50 border-gray-200 text-gray-700' },
};

export function Payments() {
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getAllPayments();
      setPayments(list);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate KPIs
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const bankTotal = payments
    .filter((p) => p.payment_method === 'BANK')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const creditTotal = payments
    .filter((p) => p.payment_method === 'CREDIT')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  // Filter
  const filteredPayments = payments.filter((p) => {
    const matchesMethod = selectedMethod === 'ALL' || p.payment_method === selectedMethod;
    const matchesSearch =
      searchQuery === '' ||
      p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.invoice?.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesSearch;
  });

  const handleExportCSV = () => {
    const exportRows = filteredPayments.map((p) => ({
      payment_date: p.payment_date,
      customer: p.customer?.name || 'Unknown',
      customer_code: p.customer?.code || '',
      invoice_number: p.invoice?.invoice_number || '',
      payment_method: p.payment_method,
      amount_kes: p.amount,
      reference_number: p.reference_number || '',
      notes: p.notes || '',
    }));
    exportToCSV(exportRows, 'tarita_payments_ledger');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Payment Transactions Ledger
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit trail of customer payments, receipts, banking references, and M-Pesa settlements
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={payments.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export Payments CSV</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total Collected"
          value={formatCurrency(totalCollected)}
          subtitle={`${payments.length} transactions recorded`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Bank Transfers"
          value={formatCurrency(bankTotal)}
          subtitle="Direct RTGS / EFT settlements"
          icon={Building2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Credit Memos"
          value={formatCurrency(creditTotal)}
          subtitle="Credit adjustments"
          icon={DollarSign}
          iconColor="text-gray-600"
          iconBg="bg-gray-50"
        />
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedMethod('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedMethod === 'ALL' ? 'bg-[#1e3a5f] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Methods
          </button>
          {(Object.keys(METHOD_CONFIG) as PaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMethod(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedMethod === m ? 'bg-[#1e3a5f] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {METHOD_CONFIG[m].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference #, customer, invoice..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>
          <button onClick={loadData} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Transactions History
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {filteredPayments.length} payment{filteredPayments.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading && payments.length === 0 ? (
          <div className="p-6"><LoadingSkeleton count={4} type="row" /></div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={CreditCard}
              title="No payment records found"
              description="Record payments against outstanding customer invoices in the Invoices section."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Payment Date</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Invoice #</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Method</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Reference #</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Amount Paid</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map((p) => {
                  const cfg = METHOD_CONFIG[p.payment_method] || { label: p.payment_method, icon: DollarSign, color: 'text-gray-600', badgeBg: 'bg-gray-50 border-gray-200 text-gray-700' };
                  const Icon = cfg.icon;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(p.payment_date)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 block">{p.customer?.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{p.customer?.code}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-blue-700 block">{p.invoice?.invoice_number}</span>
                        <span className="text-[10px] text-gray-400">Total: {formatCurrency(Number(p.invoice?.total_amount || 0))}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${cfg.badgeBg}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-gray-900 block">
                          {p.reference_number || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="font-bold font-mono text-emerald-600 text-sm">
                          +{formatCurrency(p.amount)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate text-[11px]">
                        {p.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
