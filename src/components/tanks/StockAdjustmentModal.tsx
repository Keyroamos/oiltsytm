import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Fuel } from 'lucide-react';
import type { Tank } from '../../types';
import { recordStockAdjustment } from '../../services/tankService';
import { formatLitres, formatNumber } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface StockAdjustmentModalProps {
  tank: Tank | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustmentModal({
  tank,
  isOpen,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const { user } = useAuth();
  const [physicalStock, setPhysicalStock] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !tank) return null;

  const currentStock = Number(tank.current_stock_litres);
  const parsedPhysical = physicalStock ? parseFloat(physicalStock) : currentStock;
  const variance = !isNaN(parsedPhysical) ? parsedPhysical - currentStock : 0;
  const isNegativeVariance = variance < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isNaN(parsedPhysical) || parsedPhysical < 0) {
      setError('Please enter a valid non-negative physical stock quantity.');
      return;
    }

    if (parsedPhysical > tank.capacity_litres) {
      setError(`Physical stock cannot exceed total tank capacity of ${formatLitres(tank.capacity_litres)}.`);
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a descriptive reason for this adjustment (min 5 characters).');
      return;
    }

    setLoading(true);
    try {
      await recordStockAdjustment({
        tankId: tank.id,
        physicalStock: parsedPhysical,
        reason: reason.trim(),
        userId: user?.id,
      });

      setSuccessMsg(`Stock on ${tank.code} successfully adjusted to ${formatLitres(parsedPhysical)}.`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setPhysicalStock('');
        setReason('');
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to record stock adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Physical Stock Reconciliation</h3>
              <p className="text-xs text-gray-500">{tank.code} · {tank.name} ({tank.product?.name})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <p className="font-semibold">{successMsg}</p>
            </div>
          )}

          {/* Current Book Stock vs New Physical */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Book Balance</span>
              <span className="text-base font-bold text-gray-800">{formatLitres(currentStock)}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Cap: {formatLitres(tank.capacity_litres)}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Calculated Variance</span>
              <span
                className={`text-base font-bold ${
                  variance === 0
                    ? 'text-gray-600'
                    : isNegativeVariance
                    ? 'text-red-600'
                    : 'text-emerald-600'
                }`}
              >
                {variance > 0 ? '+' : ''}{formatNumber(variance)} L
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {currentStock > 0 ? ((variance / currentStock) * 100).toFixed(2) : 0}% change
              </span>
            </div>
          </div>

          {/* Input: Physical Dip Reading */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Physical Dip Reading / Measured Stock (Litres) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max={tank.capacity_litres}
                value={physicalStock}
                onChange={(e) => setPhysicalStock(e.target.value)}
                placeholder={`Current book balance: ${currentStock}`}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                LITRES
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Safe fill capacity: {formatLitres(tank.maximum_level_litres)} · Max: {formatLitres(tank.capacity_litres)}
            </p>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Reason / Reconciliation Note <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Daily physical dip reconciliation, calibration variance adjustment, temperature correction..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || successMsg !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating Ledger…
                </>
              ) : (
                <>
                  Confirm Adjustment
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
