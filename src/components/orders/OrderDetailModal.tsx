import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  XCircle,
  Loader2,
  Calendar,
  Fuel,
  Receipt,
} from 'lucide-react';
import type { Order, OrderStatus, Invoice } from '../../types';
import { updateOrderStatus } from '../../services/orderService';
import { getInvoiceByOrderId } from '../../services/invoiceService';
import { formatCurrency, formatDateTime, formatLitres } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WORKFLOW_STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'DRAFT', label: 'Draft', icon: Clock },
  { status: 'PENDING_APPROVAL', label: 'Pending Approval', icon: Clock },
  { status: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { status: 'LOADING', label: 'Loading', icon: Fuel },
  { status: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: OrderDetailModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedInvoice, setLinkedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (isOpen && order?.id) {
      getInvoiceByOrderId(order.id)
        .then((inv) => setLinkedInvoice(inv))
        .catch(() => setLinkedInvoice(null));
    } else {
      setLinkedInvoice(null);
    }
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    setLoading(true);
    setError(null);
    try {
      await updateOrderStatus(order.id, nextStatus, user?.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (st: OrderStatus) => {
    switch (st) {
      case 'DRAFT': return 0;
      case 'PENDING_APPROVAL': return 1;
      case 'APPROVED':
      case 'ALLOCATED': return 2;
      case 'LOADING': return 3;
      case 'DISPATCHED': return 4;
      case 'COMPLETED': return 5;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 font-mono">{order.order_number}</h3>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-gray-500">{order.customer?.name} ({order.customer?.code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Workflow Progress Bar */}
          {!isCancelled ? (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">
                Order Lifecycle Workflow
              </span>
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 z-0" />
                {WORKFLOW_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-300 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[10px] mt-1 font-semibold whitespace-nowrap hidden sm:block ${
                        isCurrent ? 'text-emerald-700 font-bold' : isDone ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>This order was cancelled and will not proceed to loading.</span>
            </div>
          )}

          {/* Order Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Product</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">
                {order.product?.name} ({order.product?.code})
              </span>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Volume</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block font-mono">
                {formatLitres(order.quantity_litres)}
              </span>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Unit Price</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block font-mono">
                KES {order.unit_price}/L
              </span>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-100 sm:col-span-2">
              <span className="text-[10px] font-bold text-purple-700 uppercase block">Total Contract Value</span>
              <span className="text-base font-extrabold text-purple-900 mt-0.5 block font-mono">
                {formatCurrency(order.total_amount)}
              </span>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Requested Date</span>
              <span className="text-xs font-bold text-gray-900 mt-1 block">
                {order.requested_date}
              </span>
            </div>
          </div>

          {/* Linked Auto-Generated Commercial Invoice */}
          {linkedInvoice && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950 font-mono">{linkedInvoice.invoice_number}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      {linkedInvoice.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-medium block mt-0.5">
                    Billed: <strong className="font-mono">{formatCurrency(linkedInvoice.total_amount)}</strong> (incl. VAT) · Due: {linkedInvoice.due_date}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/invoices');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex-shrink-0"
              >
                <span>View Invoice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Notes & Metadata */}
          <div className="space-y-2 text-xs">
            {order.notes && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-700">
                <span className="font-bold text-gray-900 block mb-0.5">Order Notes:</span>
                <p>{order.notes}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-gray-500 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Created: {formatDateTime(order.created_at)}
              </span>
              {order.approved_at && (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Approved: {formatDateTime(order.approved_at)}
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>

            {order.status === 'DRAFT' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusChange('PENDING_APPROVAL')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                <span>Submit for Approval</span>
              </button>
            )}

            {order.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange('CANCELLED')}
                  className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Reject & Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleStatusChange('APPROVED')}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Approve Fuel Order</span>
                </button>
              </>
            )}

            {(order.status === 'APPROVED' || order.status === 'ALLOCATED') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/outturns');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
              >
                <span>Proceed to Outturn / Delivery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
