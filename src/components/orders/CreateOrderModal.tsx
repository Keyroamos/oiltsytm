import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Loader2, AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';
import type { Customer, Product } from '../../types';
import { createOrder } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface CreateOrderModalProps {
  customers: Customer[];
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrderModal({
  customers,
  products,
  isOpen,
  onClose,
  onSuccess,
}: CreateOrderModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('40000');
  const [unitPrice, setUnitPrice] = useState('127.50');
  const [requestedDate, setRequestedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [allowCreditOverride, setAllowCreditOverride] = useState(false);

  const [marketType, setMarketType] = useState<'LOCAL' | 'TRANSIT'>('LOCAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRedirectAddCustomer = () => {
    onClose();
    navigate('/customers?action=new&from=orders');
  };

  useEffect(() => {
    if (isOpen) {
      if (customers.length > 0 && !customerId) setCustomerId(customers[0].id);
      if (products.length > 0 && !productId) {
        setProductId(products[0].id);
        setUnitPrice(String(products[0].current_price));
      }
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, customers, products, customerId, productId]);

  // When product changes, update default unit price
  const handleProductChange = (prodId: string) => {
    setProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setUnitPrice(String(prod.current_price));
    }
  };

  if (!isOpen) return null;

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const creditLimit = selectedCustomer ? Number(selectedCustomer.credit_limit || 0) : 0;
  const currentBalance = selectedCustomer ? Number(selectedCustomer.current_balance || 0) : 0;
  const availableCredit = Math.max(0, creditLimit - currentBalance);

  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(unitPrice) || 0;
  const orderTotal = qtyNum * priceNum;
  const vatRate = marketType === 'LOCAL' ? 0.16 : 0.0;
  const vatAmount = Math.round(orderTotal * vatRate * 100) / 100;
  const grandTotal = orderTotal + vatAmount;

  const isExceedingCredit = selectedCustomer && grandTotal > availableCredit;

  const handleSubmit = async (submitForApproval: boolean) => {
    setError(null);
    setSuccess(null);

    if (qtyNum <= 0) {
      setError('Please specify an order volume greater than zero.');
      return;
    }

    if (priceNum <= 0) {
      setError('Unit price must be greater than zero.');
      return;
    }

    if (isExceedingCredit && !allowCreditOverride) {
      setError(
        `Customer credit limit exceeded! Available credit: ${formatCurrency(availableCredit)}. Order total (inc. VAT): ${formatCurrency(grandTotal)}. Authorization required to proceed.`
      );
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder(
        {
          customer_id: customerId,
          product_id: productId,
          quantity_litres: qtyNum,
          unit_price: priceNum,
          requested_date: requestedDate,
          market_type: marketType,
          vat_amount: vatAmount,
          notes: notes.trim() ? `${notes.trim()}${allowCreditOverride ? ' [Manager Credit Override Approved]' : ''}` : undefined,
          submitForApproval,
          userId: user?.id,
        },
        user?.id
      );

      setSuccess(
        `Sale ${order.order_number} created successfully (${submitForApproval ? 'Submitted for Approval' : 'Saved as Draft'}).`
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to place wholesale sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">New Customer Fuel Order</h3>
              <p className="text-xs text-gray-500">Create bulk fuel contract order & verify credit facility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Customer Selection & Live Credit Gauge */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">Customer Account *</label>
              <button
                type="button"
                onClick={handleRedirectAddCustomer}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors shadow-xs"
                title="Add and register a new corporate client"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Add Customer</span>
              </button>
            </div>
            <select
              value={customerId}
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  handleRedirectAddCustomer();
                } else {
                  setCustomerId(e.target.value);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            >
              {customers.length === 0 ? (
                <option value="" disabled>No customers registered — click Add Customer</option>
              ) : (
                customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) — Terms: {c.payment_terms || '30 Days'}
                  </option>
                ))
              )}
              <option value="__add_new__" className="text-blue-600 font-bold bg-blue-50">
                ➕ Customer not listed? Register New Customer &rarr;
              </option>
            </select>

            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 px-0.5">
              <span>Client not registered in the system?</span>
              <button
                type="button"
                onClick={handleRedirectAddCustomer}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Add Customer &amp; Set Credit Limit &rarr;</span>
              </button>
            </div>

            {selectedCustomer && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Credit Limit</span>
                  <span className="font-bold text-gray-800">{formatCurrency(creditLimit)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Current Balance</span>
                  <span className="font-bold text-red-600">{formatCurrency(currentBalance)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Available Credit</span>
                  <span className={`font-bold ${availableCredit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(availableCredit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Market Classification (Local vs. Transit) per TPMS Spec §8.2 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Market Classification &amp; Regulatory Treatment *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMarketType('LOCAL')}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  marketType === 'LOCAL'
                    ? 'border-sky-500 bg-sky-50/70 text-sky-950 ring-2 ring-sky-500/20'
                    : 'border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold">Local Market</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-200 text-sky-800">
                    16% eTIMS VAT
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Domestic Kenyan fuel sale with standard statutory VAT</p>
              </button>

              <button
                type="button"
                onClick={() => setMarketType('TRANSIT')}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  marketType === 'TRANSIT'
                    ? 'border-purple-500 bg-purple-50/70 text-purple-950 ring-2 ring-purple-500/20'
                    : 'border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-100/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold">Transit Export</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-purple-200 text-purple-800">
                    0% VAT Exempt
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Cross-border customs transit (Uganda, Rwanda, DRC)</p>
              </button>
            </div>
          </div>

          {/* Product & Unit Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Fuel Product *</label>
              <select
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — KES {p.current_price}/L
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Price (KES / Litre) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Total Amount Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity (Litres) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  LITRES
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Contract &amp; eTIMS VAT</label>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>Gross (excl. VAT)</span>
                  <span className="font-mono font-semibold">{formatCurrency(orderTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>eTIMS VAT ({marketType === 'LOCAL' ? '16%' : '0%'})</span>
                  <span className="font-mono font-semibold text-purple-700">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-purple-200 text-xs font-bold text-purple-900">
                  <span>Total Payable</span>
                  <span className="font-mono text-sm">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Limit Warning & Override */}
          {isExceedingCredit && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Customer Credit Limit Exceeded!</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Order amount of {formatCurrency(orderTotal)} exceeds customer available credit ({formatCurrency(availableCredit)}) by {formatCurrency(orderTotal - availableCredit)}.
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="creditOverride"
                  checked={allowCreditOverride}
                  onChange={(e) => setAllowCreditOverride(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="creditOverride" className="font-semibold text-amber-900 cursor-pointer">
                  Authorize management credit limit override for this order
                </label>
              </div>
            </div>
          )}

          {/* Requested Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Requested Delivery Date *</label>
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Priority customer dispatch"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Stock Notice Banner (Business Rule #4) */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-center gap-2">
            <span className="font-bold">Business Rule Note:</span>
            <span>Placing or approving an order does NOT deduct tank stock. Stock is only deducted upon confirmed loading and dispatch.</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={loading || (isExceedingCredit && !allowCreditOverride)}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting Order…
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Submit for Approval
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
