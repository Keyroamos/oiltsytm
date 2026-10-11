import { useState } from 'react';
import { X, DollarSign, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Product } from '../../types';
import { updateProductPrice } from '../../services/tankService';
import { useAuth } from '../../context/AuthContext';

interface ProductPriceModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductPriceModal({
  products,
  isOpen,
  onClose,
  onSuccess,
}: ProductPriceModalProps) {
  const { user } = useAuth();
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    products.forEach((p) => {
      initial[p.id] = String(p.current_price);
    });
    return initial;
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdate = async (productId: string, productName: string) => {
    const val = parseFloat(prices[productId]);
    if (isNaN(val) || val <= 0) {
      setError(`Please enter a valid price for ${productName}.`);
      return;
    }

    setLoadingId(productId);
    setError(null);
    setSuccess(null);

    try {
      await updateProductPrice(productId, val, user?.id);
      setSuccess(`Price for ${productName} updated to KES ${val}/L.`);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to update price');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Fuel Price Configuration</h3>
              <p className="text-xs text-gray-500">Current selling rates per litre</p>
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
            <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <div className="space-y-3">
            {products.map((p) => {
              const isLoading = loadingId === p.id;
              return (
                <div key={p.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-900">{p.name}</span>
                    <span className="text-[10px] text-gray-400 block">{p.code} · Per {p.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                        KES
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={prices[p.id] ?? p.current_price}
                        onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })}
                        className="w-full pl-9 pr-2 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-800 text-right focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleUpdate(p.id, p.name)}
                      className="px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
