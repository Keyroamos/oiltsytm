import React, { useState } from 'react';
import { X, Fuel, Loader2, Plus } from 'lucide-react';
import type { Product } from '../../types';
import { createTank } from '../../services/tankService';
import { useAuth } from '../../context/AuthContext';

interface AddTankModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTankModal({
  products,
  isOpen,
  onClose,
  onSuccess,
}: AddTankModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [capacity, setCapacity] = useState('500000');
  const [initialStock, setInitialStock] = useState('0');
  const [minLevel, setMinLevel] = useState('50000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const capNum = parseFloat(capacity);
    const stockNum = parseFloat(initialStock);
    const minNum = parseFloat(minLevel);

    if (!name.trim() || !code.trim()) {
      setError('Vessel name and code are required.');
      return;
    }

    if (isNaN(capNum) || capNum <= 0) {
      setError('Please provide a valid vessel capacity in litres.');
      return;
    }

    if (stockNum > capNum) {
      setError('Initial stock cannot exceed vessel capacity.');
      return;
    }

    setLoading(true);
    try {
      await createTank({
        name: name.trim(),
        code: code.trim(),
        product_id: productId || products[0].id,
        capacity_litres: capNum,
        initial_stock_litres: stockNum,
        minimum_level_litres: minNum,
        maximum_level_litres: capNum,
        userId: user?.id,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add vessel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Commission New Storage Vessel</h3>
              <p className="text-xs text-gray-500">Add bulk fuel storage vessel to registry</p>
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vessel Code *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. D-03"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vessel Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vessel D-03"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Product *</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — Current Price: KES {p.current_price}/L
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Capacity (Litres) *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Fuel Level (Litres)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum Safety Level (Litres)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
            <p className="text-[10px] text-gray-400 mt-1">Triggers low-stock warnings when levels dip below this threshold.</p>
          </div>

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
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Commissioning…
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Commission Vessel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
