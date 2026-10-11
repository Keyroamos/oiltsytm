import { useState } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  Package,
  Loader2,
  MapPin,
  FileDown,
  ShieldCheck,
} from 'lucide-react';
import type { Dispatch } from '../../types';
import { confirmDispatch, markDelivered } from '../../services/dispatchService';
import { formatDateTime, formatLitres } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { generateGatePassPdf } from '../../utils/generateGatePassPdf';

interface DispatchDetailModalProps {
  dispatch: Dispatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { status: 'LOADING', label: 'Loading' },
  { status: 'LOADED', label: 'Loaded & Sealed' },
  { status: 'DISPATCHED', label: 'Dispatched' },
  { status: 'IN_TRANSIT', label: 'In Transit' },
  { status: 'COMPLETED', label: 'Delivered' },
];

export function DispatchDetailModal({
  dispatch,
  isOpen,
  onClose,
  onSuccess,
}: DispatchDetailModalProps) {
  const { user } = useAuth();
  const [quantityLoaded, setQuantityLoaded] = useState('');
  const [finalMeter, setFinalMeter] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !dispatch) return null;

  const stepIndex = (() => {
    switch (dispatch.status) {
      case 'LOADING': return 0;
      case 'LOADED': return 1;
      case 'DISPATCHED': return 2;
      case 'IN_TRANSIT': return 3;
      case 'DELIVERED':
      case 'COMPLETED': return 4;
      default: return 0;
    }
  })();

  const handleConfirmDispatch = async () => {
    const qty = parseFloat(quantityLoaded);
    if (!qty || qty <= 0) {
      setError('Please enter the actual quantity loaded in litres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await confirmDispatch(
        dispatch.id,
        {
          quantity_loaded: qty,
          final_meter_reading: finalMeter ? parseFloat(finalMeter) : undefined,
          seal_number: sealNumber.trim() || undefined,
        },
        user?.id
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm dispatch.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!window.confirm(`Mark dispatch ${dispatch.dispatch_number} as delivered to ${dispatch.customer?.name}?`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await markDelivered(dispatch.id, user?.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark as delivered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 font-mono">{dispatch.dispatch_number}</h3>
                <StatusBadge status={dispatch.status} />
              </div>
              <p className="text-xs text-gray-500">
                {dispatch.customer?.name} · {dispatch.tanker?.registration_number || 'Tanker unassigned'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Gate Pass button — only when loaded/dispatched/completed */}
            {['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(dispatch.status) && (
              <button
                onClick={() => generateGatePassPdf(dispatch)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm"
                title="Issue Official Gate Pass for Driver"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Gate Pass</span>
                <FileDown className="w-3 h-3" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Workflow progress */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">
              Dispatch Lifecycle Progress
            </span>
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-gray-200 z-0" />
              {STEPS.map((step, idx) => {
                const isDone = idx <= stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <div key={step.status} className="relative z-10 flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isDone
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-indigo-100' : ''}`}>
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold hidden sm:block whitespace-nowrap ${
                      isCurrent ? 'text-indigo-700 font-bold' : isDone ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispatch details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Product</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5 block">{dispatch.product?.name}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Qty Ordered</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5 block font-mono">{formatLitres(dispatch.quantity_ordered)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Qty Loaded</span>
              <span className="text-xs font-bold text-emerald-700 mt-0.5 block font-mono">
                {dispatch.quantity_loaded ? formatLitres(dispatch.quantity_loaded) : '—'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Source Tank</span>
              <span className="text-xs font-bold text-indigo-800 mt-0.5 block font-mono">{dispatch.tank?.code || '—'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Driver</span>
              <span className="font-semibold text-gray-900 mt-0.5 block">{dispatch.driver_name || '—'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Seal #</span>
              <span className="font-mono font-bold text-gray-900 mt-0.5 block">{dispatch.seal_number || '—'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Loading Started</span>
              <span className="font-semibold text-gray-900 mt-0.5 block">
                {dispatch.loading_start_time ? formatDateTime(dispatch.loading_start_time) : formatDateTime(dispatch.created_at)}
              </span>
            </div>
          </div>

          {/* Confirm Loading section (only for LOADING status) */}
          {dispatch.status === 'LOADING' && (
            <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-4">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                Confirm Loading & Dispatch — Record Final Measurements
              </h4>
              <p className="text-[11px] text-indigo-700">
                Confirming will <strong>deduct {formatLitres(dispatch.quantity_ordered)}</strong> from{' '}
                <strong>{dispatch.tank?.code}</strong> tank and dispatch the tanker.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">Actual Qty Loaded (L) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={quantityLoaded}
                    onChange={(e) => setQuantityLoaded(e.target.value)}
                    placeholder={String(dispatch.quantity_ordered)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">Final Meter Reading</label>
                  <input
                    type="number"
                    value={finalMeter}
                    onChange={(e) => setFinalMeter(e.target.value)}
                    placeholder="e.g. 170000"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">Seal Number (confirm)</label>
                  <input
                    type="text"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value)}
                    placeholder={dispatch.seal_number || 'SL-XXXXX'}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDispatch}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Processing Dispatch…</>
                ) : (
                  <><Truck className="w-4 h-4" />Confirm Loading &amp; Dispatch Tanker</>
                )}
              </button>
            </div>
          )}

          {/* Mark Delivered (DISPATCHED status) */}
          {dispatch.status === 'DISPATCHED' && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Tanker is in transit to {dispatch.customer?.name}
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleMarkDelivered}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm Delivery Completed
              </button>
            </div>
          )}

          {/* Completed summary + Gate Pass Prompt */}
          {(dispatch.status === 'COMPLETED' || dispatch.status === 'DELIVERED') && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Delivery completed. {formatLitres(dispatch.quantity_loaded || dispatch.quantity_ordered)} successfully delivered to {dispatch.customer?.name}.
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-amber-900">Gate Pass Available</p>
                    <p className="text-amber-700 mt-0.5">Issue the driver an official exit permit to present at the gate.</p>
                  </div>
                </div>
                <button
                  onClick={() => generateGatePassPdf(dispatch)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download Gate Pass
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => generateGatePassPdf(dispatch)}
              disabled={!['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(dispatch.status)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Issue Gate Pass (PDF)
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
