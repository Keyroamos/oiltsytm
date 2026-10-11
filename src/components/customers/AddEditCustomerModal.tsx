import { useState, useEffect, type FormEvent } from 'react';
import { X, Users, Loader2, DollarSign } from 'lucide-react';
import type { Customer } from '../../types';
import { createCustomer, updateCustomer } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';

interface AddEditCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEditCustomerModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: AddEditCustomerModalProps) {
  const { user } = useAuth();
  const isEdit = !!customer;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('5000000');
  const [paymentTerms, setPaymentTerms] = useState('30 Days');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setName(customer.name);
        setCode(customer.code);
        setPhone(customer.phone || '');
        setEmail(customer.email || '');
        setAddress(customer.address || '');
        setCreditLimit(String(customer.credit_limit || 0));
        setPaymentTerms(customer.payment_terms || '30 Days');
        setIsActive(customer.is_active);
      } else {
        setName('');
        setCode('');
        setPhone('+254');
        setEmail('');
        setAddress('Nairobi');
        setCreditLimit('5000000');
        setPaymentTerms('30 Days');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const limitNum = parseFloat(creditLimit);
    if (!name.trim() || !code.trim()) {
      setError('Customer name and unique company code are required.');
      return;
    }

    if (isNaN(limitNum) || limitNum < 0) {
      setError('Please provide a valid non-negative credit limit in KES.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && customer) {
        await updateCustomer(
          customer.id,
          {
            name: name.trim(),
            code: code.trim(),
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            credit_limit: limitNum,
            payment_terms: paymentTerms.trim(),
            is_active: isActive,
          },
          user?.id
        );
      } else {
        await createCustomer(
          {
            name: name.trim(),
            code: code.trim(),
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            credit_limit: limitNum,
            payment_terms: paymentTerms.trim(),
            is_active: isActive,
          },
          user?.id
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save customer account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 flex items-center justify-center text-[#1e3a5f]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Customer Account' : 'Register Corporate Customer'}
              </h3>
              <p className="text-xs text-gray-500">
                {isEdit ? `Update credentials & credit terms for ${customer?.name}` : 'Create customer profile and credit limit'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Customer Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Energy Ltd"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. APX"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 700 000 000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@company.co.ke"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Delivery Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Mombasa Road Terminal, Station 4"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          {/* Credit Limit & Payment Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-purple-50/50 rounded-xl border border-purple-100">
            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1">Credit Limit (KES) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-600">KES</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  required
                  className="w-full pl-11 pr-3 py-2 rounded-lg border border-purple-200 text-xs font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-purple-200 text-xs font-semibold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                <option value="7 Days">7 Days Net</option>
                <option value="14 Days">14 Days Net</option>
                <option value="30 Days">30 Days Net</option>
                <option value="45 Days">45 Days Net</option>
              </select>
            </div>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]/20"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Active Trading Account (Permitted to place orders and receive dispatches)
            </label>
          </div>

          {/* Footer */}
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
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <DollarSign className="w-3.5 h-3.5" />
                  {isEdit ? 'Update Account' : 'Register Customer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
