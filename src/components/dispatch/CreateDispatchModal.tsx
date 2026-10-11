import { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import type { Order, Tanker, Tank } from '../../types';
import { createDispatch } from '../../services/dispatchService';
import { getTankerCompliance } from '../../services/tankerService';
import { formatCurrency, formatLitres } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { DriverCombobox } from '../common/DriverCombobox';

interface CreateDispatchModalProps {
  approvedOrders: Order[];
  availableTankers: Tanker[];
  tanks: Tank[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDispatchModal({
  approvedOrders,
  availableTankers,
  tanks,
  isOpen,
  onClose,
  onSuccess,
}: CreateDispatchModalProps) {
  const { user } = useAuth();

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedTankId, setSelectedTankId] = useState('');
  const [selectedTankerId, setSelectedTankerId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [initialMeter, setInitialMeter] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (approvedOrders.length > 0) {
        const first = approvedOrders[0];
        setSelectedOrderId(first.id);
        // Auto-select matching tank
        const matchingTank = tanks.find((t) => t.product_id === first.product_id);
        if (matchingTank) setSelectedTankId(matchingTank.id);
      }
      if (availableTankers.length > 0) {
        setSelectedTankerId(availableTankers[0].id);
        setDriverName(availableTankers[0].driver_name || '');
      }
      setSealNumber('');
      setInitialMeter('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, approvedOrders, availableTankers, tanks]);

  if (!isOpen) return null;

  const selectedOrder = approvedOrders.find((o) => o.id === selectedOrderId);
  const selectedTanker = availableTankers.find((t) => t.id === selectedTankerId);
  const selectedTank = tanks.find((t) => t.id === selectedTankId);

  // Filter tanks to product match
  const matchingTanks = selectedOrder
    ? tanks.filter((t) => t.product_id === selectedOrder.product_id)
    : tanks;

  // Tank stock check
  const tankStock = selectedTank ? Number(selectedTank.current_stock_litres || 0) : 0;
  const orderQty = selectedOrder ? Number(selectedOrder.quantity_litres) : 0;
  const insufficientStock = selectedTank && orderQty > tankStock;

  // Tanker compliance
  const compliance = selectedTanker ? getTankerCompliance(selectedTanker) : null;
  const canDispatch = compliance?.canDispatch ?? true;

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = approvedOrders.find((o) => o.id === orderId);
    if (order) {
      const match = tanks.find((t) => t.product_id === order.product_id);
      if (match) setSelectedTankId(match.id);
    }
  };

  const handleTankerChange = (tankerId: string) => {
    setSelectedTankerId(tankerId);
    const tanker = availableTankers.find((t) => t.id === tankerId);
    if (tanker?.driver_name) setDriverName(tanker.driver_name);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedOrderId || !selectedTankId || !selectedTankerId) {
      setError('Please select an order, source tank, and dispatch tanker.');
      return;
    }

    if (!canDispatch) {
      setError('Selected tanker has expired or missing statutory certificates. Choose a compliant vehicle.');
      return;
    }

    if (insufficientStock) {
      setError(`Insufficient tank stock. Available: ${formatLitres(tankStock)}, Required: ${formatLitres(orderQty)}.`);
      return;
    }

    if (!selectedOrder) return;

    setLoading(true);
    try {
      await createDispatch(
        {
          order_id: selectedOrderId,
          tank_id: selectedTankId,
          tanker_id: selectedTankerId,
          quantity_ordered: Number(selectedOrder.quantity_litres),
          product_id: selectedOrder.product_id,
          customer_id: selectedOrder.customer_id,
          driver_name: driverName.trim() || undefined,
          seal_number: sealNumber.trim() || undefined,
          initial_meter_reading: initialMeter ? parseFloat(initialMeter) : undefined,
          notes: notes.trim() || undefined,
        },
        user?.id
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate dispatch.');
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
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Initiate Tanker Loading</h3>
              <p className="text-xs text-gray-500">Assign approved order to tanker and start loading bay</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
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

          {/* Order Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Approved Fuel Order *</label>
            {approvedOrders.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No approved orders are currently available for dispatch. Approve orders in the Orders module first.
              </div>
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => handleOrderChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {approvedOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} — {o.customer?.name} | {formatLitres(o.quantity_litres)} {o.product?.name}
                  </option>
                ))}
              </select>
            )}

            {selectedOrder && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <span className="text-[10px] text-gray-400 block">Product</span>
                  <span className="font-bold text-gray-900">{selectedOrder.product?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Volume</span>
                  <span className="font-bold text-gray-900 font-mono">{formatLitres(selectedOrder.quantity_litres)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Contract Value</span>
                  <span className="font-bold text-purple-900 font-mono">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Source Tank Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Source Storage Tank *</label>
            <select
              value={selectedTankId}
              onChange={(e) => setSelectedTankId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {matchingTanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name} | Available: {formatLitres(Number(t.current_stock_litres))}
                </option>
              ))}
            </select>

            {insufficientStock && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Insufficient stock! Only {formatLitres(tankStock)} available in this tank.
              </div>
            )}
          </div>

          {/* Road Tanker Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Dispatch Road Tanker *</label>
            <select
              value={selectedTankerId}
              onChange={(e) => handleTankerChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {availableTankers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.registration_number} — {t.transporter || 'Independent'} | Cap: {formatLitres(t.capacity_litres)}
                </option>
              ))}
            </select>

            {selectedTanker && compliance && (
              <div
                className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-semibold ${
                  compliance.hasExpired
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : compliance.hasExpiringSoon
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : compliance.hasMissingCerts
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {compliance.hasExpired ? (
                  <>
                    <ShieldX className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                    <span>
                      Compliance Alert — Certificates have expired (
                      {compliance.insuranceStatus === 'EXPIRED' && compliance.inspectionStatus === 'EXPIRED'
                        ? 'Insurance & Inspection'
                        : compliance.insuranceStatus === 'EXPIRED'
                        ? 'Commercial Insurance'
                        : 'Safety Inspection'}
                      ). Cannot dispatch.
                    </span>
                  </>
                ) : compliance.hasExpiringSoon ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>
                      Compliance Notice — Certificate expiring soon (
                      {compliance.daysToInsuranceExpiry !== null && compliance.daysToInsuranceExpiry <= 30
                        ? `Insurance: ${compliance.daysToInsuranceExpiry}d`
                        : ''}
                      {compliance.daysToInsuranceExpiry !== null &&
                      compliance.daysToInsuranceExpiry <= 30 &&
                      compliance.daysToInspectionExpiry !== null &&
                      compliance.daysToInspectionExpiry <= 30
                        ? ', '
                        : ''}
                      {compliance.daysToInspectionExpiry !== null && compliance.daysToInspectionExpiry <= 30
                        ? `Inspection: ${compliance.daysToInspectionExpiry}d`
                        : ''}
                      ). Dispatch permitted; renewal due soon.
                    </span>
                  </>
                ) : compliance.hasMissingCerts ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                    <span>
                      No Certificate Data — {compliance.insuranceStatus === 'NO_CERT' && compliance.inspectionStatus === 'NO_CERT'
                        ? 'Insurance & Inspection certificates'
                        : compliance.insuranceStatus === 'NO_CERT'
                        ? 'Insurance certificate'
                        : 'Inspection certificate'} not recorded. Dispatch allowed; update records.
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Fully Compliant — Insurance &amp; Inspection Valid</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Driver & Loading Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <DriverCombobox
              value={driverName}
              onChange={(name) => setDriverName(name)}
              label="Driver Name"
              placeholder="Select or search driver..."
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Seal Number</label>
              <input
                type="text"
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                placeholder="e.g. SL-00123"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Meter Reading (L)</label>
              <input
                type="number"
                value={initialMeter}
                onChange={(e) => setInitialMeter(e.target.value)}
                placeholder="e.g. 125000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bay number, priority, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !canDispatch || !!insufficientStock || approvedOrders.length === 0}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Starting Loading…</>
              ) : (
                <><Truck className="w-3.5 h-3.5" />Start Tanker Loading</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
