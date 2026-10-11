import { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingCart,
  Receipt,
  Truck,
  DollarSign,
  AlertTriangle,
  Loader2,
  Download,
} from 'lucide-react';
import type { Customer, UUID } from '../../types';
import { getCustomerDetails, type CustomerDetailData } from '../../services/customerService';
import { formatCurrency, formatDateTime, formatLitres } from '../../utils/formatters';
import { generateCustomerStatementPdf } from '../../utils/generateCustomerStatementPdf';
import { StatusBadge } from '../common/StatusBadge';

interface CustomerDetailDrawerProps {
  customerId: UUID | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
}

export function CustomerDetailDrawer({
  customerId,
  isOpen,
  onClose,
  onEdit,
}: CustomerDetailDrawerProps) {
  const [data, setData] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'INVOICES' | 'DISPATCHES' | 'PAYMENTS'>('OVERVIEW');

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      getCustomerDetails(customerId)
        .then((res) => setData(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  const customer = data?.customer;
  const limit = customer ? Number(customer.credit_limit) : 0;
  const balance = customer ? Number(customer.current_balance) : 0;
  const available = Math.max(0, limit - balance);
  const utilizationPct = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;
  const isOverLimit = balance >= limit;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Top Header */}
          <div className="p-6 border-b border-gray-100 bg-[#0f1e35] text-white flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {customer?.name || 'Loading Customer…'}
                  </h2>
                  <span className="text-xs font-mono font-bold bg-white/10 text-amber-400 px-2 py-0.5 rounded">
                    {customer?.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Terms: {customer?.payment_terms || '30 Days Net'} · {customer?.is_active ? 'Active Account' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {customer && data && (
                <button
                  onClick={() => generateCustomerStatementPdf(customer, data.invoices, data.payments)}
                  className="px-3 py-1.5 flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Statement
                </button>
              )}
              {customer && (
                <button
                  onClick={() => onEdit(customer)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading || !customer ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
            </div>
          ) : (
            <>
              {/* Credit Health Strip */}
              <div className="p-5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    Credit Facility Status
                  </span>
                  <span className={`text-xs font-bold ${isOverLimit ? 'text-red-600' : 'text-emerald-600'}`}>
                    {utilizationPct}% Utilized {isOverLimit ? '(Limit Exceeded)' : ''}
                  </span>
                </div>

                <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      utilizationPct >= 90 ? 'bg-red-500' : utilizationPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${utilizationPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] text-gray-400 block font-semibold">Credit Limit</span>
                    <span className="text-xs font-bold text-gray-900 font-mono">{formatCurrency(limit)}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] text-gray-400 block font-semibold">Outstanding</span>
                    <span className="text-xs font-bold text-red-600 font-mono">{formatCurrency(balance)}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] text-gray-400 block font-semibold">Available</span>
                    <span className="text-xs font-bold text-emerald-600 font-mono">{formatCurrency(available)}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 px-6 border-b border-gray-200 bg-white">
                {[
                  { id: 'OVERVIEW', label: 'Overview', icon: Building2 },
                  { id: 'ORDERS', label: `Orders (${data.orders.length})`, icon: ShoppingCart },
                  { id: 'INVOICES', label: `Invoices (${data.invoices.length})`, icon: Receipt },
                  { id: 'DISPATCHES', label: `Dispatches (${data.dispatches.length})`, icon: Truck },
                  { id: 'PAYMENTS', label: `Payments (${data.payments.length})`, icon: DollarSign },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`inline-flex items-center gap-1.5 py-3.5 px-2 border-b-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        isActive
                          ? 'border-[#1e3a5f] text-[#1e3a5f]'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'OVERVIEW' && (
                  <div className="space-y-5">
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Contact & Billing</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{customer.phone || 'No phone recorded'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{customer.email || 'No email recorded'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{customer.address || 'No physical address recorded'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>Registered: {new Date(customer.created_at).toLocaleDateString('en-KE')}</span>
                        </div>
                      </div>
                    </div>

                    {isOverLimit && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Credit Limit Exceeded</p>
                          <p className="text-[11px] text-red-700 mt-0.5">
                            This customer has reached or exceeded their approved credit limit. New fuel orders will require authorized management override.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'ORDERS' && (
                  <div className="space-y-3">
                    {data.orders.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">No fuel orders placed yet.</p>
                    ) : (
                      data.orders.map((o) => (
                        <div key={o.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-900 font-mono block">{o.order_number}</span>
                            <span className="text-[10px] text-gray-400">{formatDateTime(o.created_at)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900 block font-mono">{formatCurrency(o.total_amount)}</span>
                            <span className="text-[10px] text-gray-500">{formatLitres(o.quantity_litres)} {o.product?.name}</span>
                          </div>
                          <StatusBadge status={o.status} />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'INVOICES' && (
                  <div className="space-y-3">
                    {data.invoices.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">No invoices generated yet.</p>
                    ) : (
                      data.invoices.map((inv) => (
                        <div key={inv.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-900 font-mono block">{inv.invoice_number}</span>
                            <span className="text-[10px] text-gray-400">Due: {inv.due_date}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900 block font-mono">{formatCurrency(inv.total_amount)}</span>
                            <span className="text-[10px] text-red-600">Due: {formatCurrency(inv.balance_due)}</span>
                          </div>
                          <StatusBadge status={inv.status} />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'DISPATCHES' && (
                  <div className="space-y-3">
                    {data.dispatches.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">No tanker dispatches recorded.</p>
                    ) : (
                      data.dispatches.map((d) => (
                        <div key={d.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-900 font-mono block">{d.dispatch_number}</span>
                            <span className="text-[10px] text-gray-400">{d.tanker?.registration_number || 'Tanker unassigned'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900 block font-mono">{formatLitres(d.quantity_loaded || d.quantity_ordered)}</span>
                            <span className="text-[10px] text-gray-500">{d.product?.name}</span>
                          </div>
                          <StatusBadge status={d.status} />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'PAYMENTS' && (
                  <div className="space-y-3">
                    {data.payments.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">No payments recorded yet.</p>
                    ) : (
                      data.payments.map((p) => (
                        <div key={p.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-gray-900 font-mono block">{p.payment_method} · {p.reference_number || 'Direct'}</span>
                            <span className="text-[10px] text-gray-400">{p.payment_date}</span>
                          </div>
                          <span className="font-bold text-emerald-600 font-mono text-sm">+{formatCurrency(p.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
