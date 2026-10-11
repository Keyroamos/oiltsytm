import { useState, useEffect, type FormEvent } from 'react';
import { X, Receipt, Loader2, DollarSign, PackageCheck, Truck, Edit3, CheckCircle2, CreditCard } from 'lucide-react';
import type { Customer } from '../../types';
import { createInvoice, getCustomerPendingBillableItems, type BillableItem } from '../../services/invoiceService';
import { getCustomers } from '../../services/customerService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface CreateInvoiceModalProps {
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInvoiceModal({
  customers,
  isOpen,
  onClose,
  onSuccess,
}: CreateInvoiceModalProps) {
  const { user } = useAuth();

  const [fallbackCustomers, setFallbackCustomers] = useState<Customer[]>([]);
  const activeCustomers = customers && customers.length > 0 ? customers : fallbackCustomers;

  const [customerId, setCustomerId] = useState('');
  const [pendingItems, setPendingItems] = useState<BillableItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('MANUAL');

  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxRate, setTaxRate] = useState('16');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [orderId, setOrderId] = useState<string | undefined>();
  const [receivingId, setReceivingId] = useState<string | undefined>();

  // Optional partial payment on issuance
  const [hasPartialPayment, setHasPartialPayment] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialMethod, setPartialMethod] = useState('BANK');
  const [partialReference, setPartialReference] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize customer on modal open or fetch if empty
  useEffect(() => {
    if (isOpen) {
      if (customers && customers.length > 0) {
        if (!customerId) setCustomerId(customers[0].id);
      } else {
        getCustomers()
          .then((list) => {
            setFallbackCustomers(list);
            if (list.length > 0 && !customerId) {
              setCustomerId(list[0].id);
            }
          })
          .catch((err) => console.error('Failed to fetch fallback customers:', err));
      }
      setError(null);
    }
  }, [isOpen, customers, customerId]);

  // When customer changes, load pending billable items (orders or direct drop-ship deliveries)
  useEffect(() => {
    if (!isOpen || !customerId) return;

    let isMounted = true;
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const items = await getCustomerPendingBillableItems(customerId);
        if (!isMounted) return;
        setPendingItems(items);

        if (items.length > 0) {
          // Auto-select the first pending item
          const first = items[0];
          applySelectedItem(first);
        } else {
          // Reset to manual mode
          setSelectedItemId('MANUAL');
          setOrderId(undefined);
          setReceivingId(undefined);
          setSubtotal('');
          setQuantity('');
          setUnitPrice('');
          setNotes('');
        }
      } catch (err) {
        console.warn('Failed to load pending items:', err);
      } finally {
        if (isMounted) setLoadingItems(false);
      }
    };

    fetchItems();

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerId]);

  const applySelectedItem = (item: BillableItem) => {
    setSelectedItemId(item.id);
    setQuantity(String(item.quantityLitres));
    setUnitPrice(String(item.unitPrice));
    setSubtotal(String(item.totalAmount));
    if (item.suggestedDueDate) {
      setDueDate(item.suggestedDueDate);
    }
    setOrderId(item.orderId);
    setReceivingId(item.receivingId);

    if (item.type === 'ORDER') {
      setNotes(`Commercial fuel supply for Order ${item.reference} - ${item.quantityLitres.toLocaleString()} L of ${item.productName} @ KES ${item.unitPrice}/L`);
    } else {
      setNotes(`Direct-to-client fuel delivery ${item.reference} - ${item.quantityLitres.toLocaleString()} L of ${item.productName} @ KES ${item.unitPrice}/L`);
    }
  };

  const handleManualSelection = () => {
    setSelectedItemId('MANUAL');
    setOrderId(undefined);
    setReceivingId(undefined);
    setQuantity('');
    setUnitPrice('');
    setSubtotal('');
    setNotes('');
  };

  // When quantity or unit price changes, auto-calculate subtotal
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const q = parseFloat(val) || 0;
    const p = parseFloat(unitPrice) || 0;
    if (q > 0 && p > 0) {
      setSubtotal(String(Math.round(q * p)));
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(val) || 0;
    if (q > 0 && p > 0) {
      setSubtotal(String(Math.round(q * p)));
    }
  };

  if (!isOpen) return null;

  const subtotalNum = parseFloat(subtotal) || 0;
  const taxRateNum = parseFloat(taxRate) / 100 || 0;
  const taxAmount = subtotalNum * taxRateNum;
  const totalAmount = subtotalNum + taxAmount;

  const partialAmountNum = parseFloat(partialAmount) || 0;
  const balanceDueNum = Math.max(0, totalAmount - (hasPartialPayment ? partialAmountNum : 0));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (subtotalNum <= 0) {
      setError('Please enter a valid invoice subtotal amount.');
      return;
    }

    if (hasPartialPayment && partialAmountNum <= 0) {
      setError('Please enter the partial payment amount received.');
      return;
    }

    if (hasPartialPayment && partialAmountNum > totalAmount) {
      setError('Partial payment cannot exceed the invoice total.');
      return;
    }

    setLoading(true);
    try {
      await createInvoice(
        {
          customer_id: customerId,
          order_id: orderId,
          receiving_id: receivingId,
          subtotal: subtotalNum,
          tax_rate: taxRateNum,
          due_date: dueDate,
          notes: notes.trim() || undefined,
          amount_paid: hasPartialPayment ? partialAmountNum : 0,
          payment_method: hasPartialPayment ? (partialMethod as any) : undefined,
          payment_reference: hasPartialPayment ? partialReference.trim() || undefined : undefined,
        },
        user?.id
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Generate Commercial Invoice</h3>
              <p className="text-xs text-gray-500">Bill approved orders and direct drop-ship deliveries</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">{error}</div>
          )}

          {/* Customer Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Bill-To Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-gray-900"
            >
              {activeCustomers.length === 0 ? (
                <option value="" disabled>Loading customers...</option>
              ) : (
                activeCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Pending Billable Items Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-800">
                Pending Deliveries & Contracts Awaiting Invoicing
              </label>
              {loadingItems && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
            </div>

            {pendingItems.length > 0 ? (
              <div className="space-y-2">
                {pendingItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => applySelectedItem(item)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.type === 'ORDER'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {item.type === 'ORDER' ? (
                            <PackageCheck className="w-4 h-4" />
                          ) : (
                            <Truck className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 font-mono">
                              {item.reference}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                item.type === 'ORDER'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.type === 'ORDER' ? 'Order' : 'Direct-to-Client'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {item.productName}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {item.quantityLitres.toLocaleString()} L @ KES {item.unitPrice}/L
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-900 font-mono block">
                          {formatCurrency(item.totalAmount)}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Manual entry option */}
                <div
                  onClick={handleManualSelection}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2 text-xs font-semibold ${
                    selectedItemId === 'MANUAL'
                      ? 'border-gray-400 bg-gray-100/70 text-gray-900'
                      : 'border-dashed border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Custom / Manual Billing Entry</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-500 flex items-center justify-between">
                <span>✓ All known orders and direct deliveries for this customer are already invoiced.</span>
                <span className="text-emerald-700 font-bold">Manual Mode</span>
              </div>
            )}
          </div>

          {/* Pricing & Quantity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Volume Quantity (Litres)</label>
              <input
                type="number"
                step="any"
                min="1"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="e.g. 25600"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price (KES / Litre)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={unitPrice}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  placeholder="e.g. 115.00"
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subtotal (KES, excl. tax) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                  placeholder="e.g. 2944000"
                  required
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">VAT Rate (%)</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="16">16% (Standard Petroleum VAT - KRA Tax Code B)</option>
                <option value="0">0% (Zero-Rated / Exempt)</option>
                <option value="8">8% (Special Petroleum Rate)</option>
              </select>
            </div>
          </div>

          {/* Invoice Calculation Card */}
          {subtotalNum > 0 && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-700">
                <span>Taxable Subtotal</span>
                <span className="font-mono font-semibold">{formatCurrency(subtotalNum)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span>VAT ({taxRate}%)</span>
                <span className="font-mono font-semibold">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-900 border-t border-emerald-200 pt-2 font-bold text-sm">
                <span>Invoice Total</span>
                <span className="font-mono">{formatCurrency(totalAmount)}</span>
              </div>
              {hasPartialPayment && partialAmountNum > 0 && (
                <>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Partial Payment Received</span>
                    <span className="font-mono font-bold text-emerald-700">- {formatCurrency(partialAmountNum)}</span>
                  </div>
                  <div className="flex items-center justify-between text-red-700 border-t border-emerald-200 pt-2 font-bold text-sm">
                    <span>Balance Due</span>
                    <span className="font-mono">{formatCurrency(balanceDueNum)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Notes / Reference</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional billing notes or contract reference"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Partial Payment Toggle */}
          <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setHasPartialPayment(!hasPartialPayment)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors ${
                hasPartialPayment
                  ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
                  : 'bg-gray-50/80 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className={`w-3.5 h-3.5 ${hasPartialPayment ? 'text-amber-600' : 'text-gray-400'}`} />
                <span>Record a Partial / Advance Payment at Issuance?</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                hasPartialPayment ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-500'
              }`}>
                {hasPartialPayment ? 'YES' : 'NO'}
              </span>
            </button>

            {hasPartialPayment && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Paid (KES) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        max={totalAmount}
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder={`e.g. ${Math.round(totalAmount / 2).toLocaleString()}`}
                        className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-amber-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={partialMethod}
                      onChange={(e) => setPartialMethod(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="BANK">Bank Wire Transfer</option>
                      <option value="MPESA">M-PESA</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="CREDIT">Credit Account</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Reference / Transaction ID</label>
                  <input
                    type="text"
                    value={partialReference}
                    onChange={(e) => setPartialReference(e.target.value)}
                    placeholder="e.g. CHQ-001234 / MPESA TXN ID / Wire Ref"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || subtotalNum <= 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Issuing Invoice…</>
              ) : (
                <><DollarSign className="w-3.5 h-3.5" />Issue Invoice</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
