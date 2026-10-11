import React, { useState } from 'react';
import {
  X,
  DollarSign,
  Truck,
  Building2,
  Calendar,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Fuel,
  Shield,
  FileCheck,
  Disc,
  Users,
  Layers,
} from 'lucide-react';
import type { ExpenseCategory, ExpenseAllocationType, ExpensePaymentMethod, Tanker } from '../../types';
import { createExpense } from '../../services/expenseService';
import { useAuth } from '../../context/AuthContext';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tankers: Tanker[];
  defaultTankerId?: string;
}

interface CategoryOption {
  id: ExpenseCategory;
  label: string;
  icon: React.ElementType;
  defaultAllocation: ExpenseAllocationType;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'TRUCK_MAINTENANCE', label: 'Truck Repairs & Service', icon: Wrench, defaultAllocation: 'TRUCK' },
  { id: 'TRUCK_FUEL', label: 'Truck Fuel (Diesel)', icon: Fuel, defaultAllocation: 'TRUCK' },
  { id: 'TYRES_SPARES', label: 'Tyres & Spare Parts', icon: Disc, defaultAllocation: 'TRUCK' },
  { id: 'DRIVER_ALLOWANCE', label: 'Driver Allowances & Per Diem', icon: Users, defaultAllocation: 'TRUCK' },
  { id: 'TOLLS_WEIGHBRIDGE', label: 'Road Tolls & Weighbridge', icon: Layers, defaultAllocation: 'TRUCK' },
  { id: 'PERMITS_LICENSES', label: 'Permits, NTSA & Inspection', icon: FileCheck, defaultAllocation: 'TRUCK' },
  { id: 'TRUCK_INSURANCE', label: 'Truck Commercial Insurance', icon: Shield, defaultAllocation: 'TRUCK' },
  { id: 'DEPOT_OPERATIONS', label: 'Power, Security & Ops', icon: Building2, defaultAllocation: 'DEPOT_GENERAL' },
  { id: 'ADMIN_OVERHEAD', label: 'Administrative & Utilities', icon: DollarSign, defaultAllocation: 'DEPOT_GENERAL' },
  { id: 'OTHER', label: 'Other Incidental Expense', icon: FileText, defaultAllocation: 'DEPOT_GENERAL' },
];

export function RecordExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  tankers,
  defaultTankerId,
}: RecordExpenseModalProps) {
  const { user } = useAuth();

  const [category, setCategory] = useState<ExpenseCategory>('TRUCK_MAINTENANCE');
  const [allocationType, setAllocationType] = useState<ExpenseAllocationType>('TRUCK');
  const [tankerId, setTankerId] = useState(defaultTankerId || (tankers[0]?.id ?? ''));
  const [isManualVehicle, setIsManualVehicle] = useState(false);
  const [manualRegistration, setManualRegistration] = useState('');

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [payeeVendor, setPayeeVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCategorySelect = (cat: CategoryOption) => {
    setCategory(cat.id);
    setAllocationType(cat.defaultAllocation);
  };

  const selectedTanker = tankers.find((t) => t.id === tankerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid expense amount in KES.');
      return;
    }

    if (!title.trim()) {
      setError('Please provide an expense description.');
      return;
    }

    const vehicleReg =
      allocationType === 'TRUCK'
        ? isManualVehicle
          ? manualRegistration.trim().toUpperCase()
          : selectedTanker?.registration_number
        : undefined;

    setLoading(true);
    try {
      await createExpense({
        category,
        title: title.trim(),
        amount: parsedAmount,
        expense_date: expenseDate,
        allocation_type: allocationType,
        tanker_id: allocationType === 'TRUCK' && !isManualVehicle ? tankerId : undefined,
        vehicle_registration: vehicleReg,
        payee_vendor: payeeVendor.trim() || undefined,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        userId: user?.id,
      });

      setSuccess('✓ Expense recorded successfully and linked to accounts.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Record Operational Expense</h3>
              <p className="text-xs text-gray-500">Track truck-specific costs, repairs, permits, or overhead</p>
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

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-2">
              Expense Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold shadow-2xs'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className="text-[10px] leading-tight block">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allocation Toggle (Specific Truck vs Depot General) */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <label className="block text-xs font-bold text-gray-800">
              Expense Allocation *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAllocationType('TRUCK')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  allocationType === 'TRUCK'
                    ? 'border-purple-600 bg-white text-purple-900 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white/60'
                }`}
              >
                <Truck className={`w-4 h-4 ${allocationType === 'TRUCK' ? 'text-purple-600' : 'text-gray-400'}`} />
                <div>
                  <span className="text-xs font-bold block">Specific Road Tanker</span>
                  <span className="text-[10px] text-gray-500 block">Deducts from this truck's P&amp;L</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAllocationType('DEPOT_GENERAL')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  allocationType === 'DEPOT_GENERAL'
                    ? 'border-blue-600 bg-white text-blue-900 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white/60'
                }`}
              >
                <Building2 className={`w-4 h-4 ${allocationType === 'DEPOT_GENERAL' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <span className="text-xs font-bold block">General Overhead</span>
                  <span className="text-[10px] text-gray-500 block">Company-wide operational cost</span>
                </div>
              </button>
            </div>

            {/* Truck Selector or Manual Vehicle Entry */}
            {allocationType === 'TRUCK' && (
              <div className="pt-2 border-t border-gray-200/80 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Assign to Vehicle</span>
                  <button
                    type="button"
                    onClick={() => setIsManualVehicle(!isManualVehicle)}
                    className="text-[11px] text-purple-700 font-semibold hover:underline"
                  >
                    {isManualVehicle ? '← Select from fleet tankers' : 'Enter custom vehicle manually →'}
                  </button>
                </div>

                {!isManualVehicle ? (
                  <select
                    value={tankerId}
                    onChange={(e) => setTankerId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                  >
                    {tankers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.registration_number} ({t.transporter || 'Fleet'} · {t.driver_name || 'Driver'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={manualRegistration}
                      onChange={(e) => setManualRegistration(e.target.value.toUpperCase())}
                      placeholder="e.g. KDA 456Z (Type custom plate)"
                      className="w-full px-3 py-2.5 rounded-xl border border-purple-300 text-xs font-bold uppercase font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Custom vehicle registration entered manually for non-fleet trucks or hired haulage.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Expense Description / Purpose *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Brake pad overhaul, Toll tickets"
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Amount (KES) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  KES
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-12 pr-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Date, Payee & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" /> Expense Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payee / Service Vendor
              </label>
              <input
                type="text"
                value={payeeVendor}
                onChange={(e) => setPayeeVendor(e.target.value)}
                placeholder="e.g. Toyota, KenHA, Shell"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              >
                <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                <option value="MPESA">M-Pesa Business Till</option>
                <option value="CASH">Cash Payment</option>
                <option value="PETTY_CASH">Petty Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          {/* Reference # & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Receipt / Invoice Ref #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
                placeholder="e.g. RCPT-98124, MPESA-QWE99"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Additional Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Approved by ops manager"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Record Expense</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
