import { useState, useEffect, type FormEvent } from 'react';
import { X, DollarSign, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import type { Invoice, PaymentMethod } from '../../types';
import { recordPayment, getInvoicePayments } from '../../services/invoiceService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface RecordPaymentModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: any }[] = [
  { value: 'BANK', label: 'Bank Transfer', icon: Building2 },
  { value: 'CREDIT', label: 'Credit Memo', icon: DollarSign },
];

export function RecordPaymentModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const { user } = useAuth();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorPayments, setPriorPayments] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && invoice) {
      setAmount(String(invoice.balance_due));
      setPaymentMethod('BANK');
      setReferenceNumber('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError(null);
      // Load prior payments
      getInvoicePayments(invoice.id)
        .then(setPriorPayments)
        .catch(console.error);
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const amountNum = parseFloat(amount) || 0;
  const balanceDue = Number(invoice.balance_due || 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amountNum <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (amountNum > balanceDue) {
      setError(`Amount ${formatCurrency(amountNum)} exceeds outstanding balance ${formatCurrency(balanceDue)}.`);
      return;
    }

    setLoading(true);
    try {
      await recordPayment(
        {
          invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          amount: amountNum,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || undefined,
          payment_date: paymentDate,
          notes: notes.trim() || undefined,
        },
        user?.id
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
              <p className="text-xs text-gray-500">{invoice.invoice_number} · {invoice.customer?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">{error}</div>
          )}

          {/* Invoice Summary */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block">Invoice Total</span>
              <span className="font-bold text-gray-900 font-mono">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Amount Paid</span>
              <span className="font-bold text-emerald-600 font-mono">{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block">Balance Due</span>
              <span className={`font-bold font-mono ${balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Payment Method *</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-[10px] font-bold transition-colors ${
                        isSelected
                          ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:block">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount (KES) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / Transaction No.</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ref / Cheque #"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Partial, advance, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
            </div>

            {/* Prior Payments List */}
            {priorPayments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Prior Payments Received</h4>
                {priorPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <div>
                      <span className="font-semibold text-gray-800">{p.payment_method}</span>
                      {p.reference_number && <span className="text-gray-400 font-mono ml-2">· {p.reference_number}</span>}
                      <span className="text-gray-400 block text-[10px]">{p.payment_date}</span>
                    </div>
                    <span className="font-bold text-emerald-600 font-mono">+{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || amountNum <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Recording…</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" />Record Payment</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
