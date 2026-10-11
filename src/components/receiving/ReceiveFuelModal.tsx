import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownToLine,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Fuel,
  Calendar,
  Gauge,
  Ship,
  Receipt,
  Globe,
  Anchor,
} from 'lucide-react';
import type { Supplier, Product, Tank, VesselMarketType, VesselCurrency } from '../../types';
import { createFuelReceipt } from '../../services/receivingService';
import { formatLitres, formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface ReceiveFuelModalProps {
  suppliers: Supplier[];
  products: Product[];
  tanks: Tank[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveFuelModal({
  suppliers = [],
  products = [],
  tanks = [],
  isOpen,
  onClose,
  onSuccess,
}: ReceiveFuelModalProps) {
  const { user } = useAuth();

  const [fallbackTanks, setFallbackTanks] = useState<Tank[]>([]);
  const activeTanks = tanks && tanks.length > 0 ? tanks : fallbackTanks;

  const [activeTab, setActiveTab] = useState<'consignment' | 'expenses'>('consignment');

  // Consignment state
  const [supplierId, setSupplierId] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [marketType, setMarketType] = useState<VesselMarketType>('LOCAL');
  const [currency, setCurrency] = useState<VesselCurrency>('KES');
  const [productId, setProductId] = useState('');
  const [tankId, setTankId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [reference, setReference] = useState('');
  const [receivingDate, setReceivingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meterReading, setMeterReading] = useState('');
  const [qualityStatus, setQualityStatus] = useState('PASSED');
  const [notes, setNotes] = useState('');

  // Expenses state
  const [demurrageCost, setDemurrageCost] = useState('');
  const [portCharges, setPortCharges] = useState('');
  const [inspectionFees, setInspectionFees] = useState('');
  const [pumpingCharges, setPumpingCharges] = useState('');
  const [customsDuty, setCustomsDuty] = useState('');
  const [otherExpenses, setOtherExpenses] = useState('');
  const [otherExpensesNote, setOtherExpensesNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback load tanks if not provided
  useEffect(() => {
    if (isOpen && (!tanks || tanks.length === 0)) {
      import('../../lib/supabase').then(({ supabase }) => {
        supabase
          .from('tanks')
          .select('*, product:products(*)')
          .eq('status', 'ACTIVE')
          .order('code')
          .then(({ data }) => {
            if (data) setFallbackTanks(data as Tank[]);
          });
      });
    }
  }, [isOpen, tanks]);

  // Handle market regime change: LOCAL (KES) vs TRANSIT (USD)
  const handleMarketRegimeChange = (type: VesselMarketType) => {
    setMarketType(type);
    if (type === 'TRANSIT') {
      setCurrency('USD');
      // Set reasonable default transit price in USD per litre
      setPurchasePrice('0.850');
    } else {
      setCurrency('KES');
      const prod = products.find((p) => p.id === productId);
      if (prod?.current_price) {
        setPurchasePrice(String(prod.current_price));
      } else {
        setPurchasePrice('162.00');
      }
    }
  };

  // Initialize on modal open
  useEffect(() => {
    if (isOpen) {
      if (suppliers.length > 0 && !supplierId) {
        setSupplierId(suppliers[0].id);
      }

      // Default product to AGO (Diesel) or PMS
      const defaultProduct =
        products.find((p) => p.code === 'AGO') ||
        products.find((p) => p.code === 'PMS') ||
        products[0];

      if (defaultProduct) {
        setProductId(defaultProduct.id);
        if (marketType === 'LOCAL' && defaultProduct.current_price) {
          setPurchasePrice(String(defaultProduct.current_price));
        } else if (marketType === 'TRANSIT') {
          setPurchasePrice('0.850');
        }
      }

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setReference(`RCV-2026-${randomSuffix}`);
      setReceivingDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setMeterReading('');
      setNotes('');
      setDemurrageCost('');
      setPortCharges('');
      setInspectionFees('');
      setPumpingCharges('');
      setCustomsDuty('');
      setOtherExpenses('');
      setOtherExpensesNote('');
      setError(null);
      setActiveTab('consignment');
    }
  }, [isOpen, suppliers, products]);

  // Filter tanks matching the selected product
  const matchingTanks = (activeTanks || []).filter((t) => t.product_id === productId);

  // When selected product or matching tanks change, select the first compatible tank
  useEffect(() => {
    if (matchingTanks.length > 0) {
      const currentStillValid = matchingTanks.some((t) => t.id === tankId);
      if (!currentStillValid) {
        setTankId(matchingTanks[0].id);
      }
    } else {
      setTankId('');
    }
  }, [productId, matchingTanks, tankId]);

  // When product changes, update default purchase price
  const handleProductSelect = (p: Product) => {
    setProductId(p.id);
    if (marketType === 'LOCAL' && p.current_price) {
      setPurchasePrice(String(p.current_price));
    } else if (marketType === 'TRANSIT') {
      setPurchasePrice('0.850');
    }
  };

  if (!isOpen) return null;

  const selectedProduct = (products || []).find((p) => p.id === productId);
  const selectedTank = (activeTanks || []).find((t) => t.id === tankId);

  const tankCapacity = selectedTank
    ? Number(selectedTank.maximum_level_litres || selectedTank.capacity_litres)
    : 0;
  const tankCurrentStock = selectedTank ? Number(selectedTank.current_stock_litres || 0) : 0;
  const tankUllage = Math.max(0, tankCapacity - tankCurrentStock);

  const enteredQty = parseFloat(quantity) || 0;
  const enteredPrice = parseFloat(purchasePrice) || 0;
  const basePurchaseTotal = Math.round(enteredQty * enteredPrice * 100) / 100;

  // Expenses summation
  const numDemurrage = parseFloat(demurrageCost) || 0;
  const numPort = parseFloat(portCharges) || 0;
  const numInspection = parseFloat(inspectionFees) || 0;
  const numPumping = parseFloat(pumpingCharges) || 0;
  const numCustoms = parseFloat(customsDuty) || 0;
  const numOther = parseFloat(otherExpenses) || 0;

  const totalExpenses = numDemurrage + numPort + numInspection + numPumping + numCustoms + numOther;
  const landedTotalCost = basePurchaseTotal + totalExpenses;
  const landedCostPerLitre = enteredQty > 0 ? landedTotalCost / enteredQty : 0;

  const isExceedingCapacity = enteredQty > 0 && enteredQty > tankUllage;

  const formatMoney = (amount: number) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    return formatCurrency(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Please select the supplying vendor or cargo trader.');
      return;
    }

    if (!vesselName.trim()) {
      setError('Please enter the Vessel Name / Ship IMO reference (e.g. MT Sea Pioneer).');
      return;
    }

    if (!productId) {
      setError('Please select the fuel product.');
      return;
    }

    if (!tankId) {
      setError('Please select the target storage vessel.');
      return;
    }

    if (enteredQty <= 0) {
      setError('Please enter a valid received quantity in litres.');
      return;
    }

    if (enteredPrice <= 0) {
      setError(`Please enter the purchase price per litre in ${currency}.`);
      return;
    }

    if (isExceedingCapacity) {
      setError(
        `Quantity (${formatLitres(enteredQty)}) exceeds available space in ${selectedTank?.name || 'vessel'} (${formatLitres(tankUllage)}).`
      );
      return;
    }

    setLoading(true);
    try {
      await createFuelReceipt({
        supplier_id: supplierId,
        product_id: productId,
        tank_id: tankId,
        quantity: enteredQty,
        purchase_price: enteredPrice,
        reference_number: reference,
        receiving_date: receivingDate,
        vessel_name: vesselName.trim(),
        market_type: marketType,
        currency: currency,
        meter_reading: meterReading ? parseFloat(meterReading) : undefined,
        quality_status: qualityStatus,
        notes: notes || undefined,
        demurrage_cost: numDemurrage || undefined,
        port_charges: numPort || undefined,
        inspection_fees: numInspection || undefined,
        pumping_charges: numPumping || undefined,
        customs_duty: numCustoms || undefined,
        other_expenses: numOther || undefined,
        other_expenses_note: otherExpensesNote || undefined,
        userId: user?.id,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record vessel fuel intake.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-200 font-sans">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Inbound Vessel Fuel Discharge &amp; Intake</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  marketType === 'LOCAL'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {marketType} ({currency})
                </span>
              </div>
              <p className="text-xs text-gray-500">Discharge marine vessel bulk cargo directly into storage vessels</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 pb-1 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('consignment')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'consignment'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Ship className="w-3.5 h-3.5 text-amber-600" />
            <span>Consignment &amp; Vessel Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'expenses'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span>Consignment Expenses</span>
            {totalExpenses > 0 && (
              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                {formatMoney(totalExpenses)}
              </span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: CONSIGNMENT DETAILS                                         */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'consignment' && (
            <div className="space-y-4">
              {/* Row: Supplier & Vessel Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Supplier / Cargo Trader *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-gray-900"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Anchor className="w-3.5 h-3.5 text-blue-600" />
                    Vessel Name / Ship IMO *
                  </label>
                  <input
                    type="text"
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    placeholder="e.g. MT Sea Pioneer (IMO 9412356)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-gray-900 placeholder:font-normal"
                    required
                  />
                </div>
              </div>

              {/* Market Regime & Payment Currency Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  Consignment Market Regime &amp; Payment Currency *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleMarketRegimeChange('LOCAL')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      marketType === 'LOCAL'
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">LOCAL Consignment</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">
                          KES
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">Domestic fuel supply — Paid in Kenyan Shillings</p>
                    </div>
                    {marketType === 'LOCAL' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarketRegimeChange('TRANSIT')}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      marketType === 'TRANSIT'
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-600/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">TRANSIT Consignment</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono">
                          USD ($)
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">Regional transit cargo — Paid in US Dollars</p>
                    </div>
                    {marketType === 'TRANSIT' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Product Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-600" />
                  Fuel Product Being Received *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {products.map((p) => {
                    const isSelected = p.id === productId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProductSelect(p)}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-500/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                              p.code === 'AGO'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {p.code}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">{p.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              Std Price: KES {p.current_price}/L
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Storage Vessel Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Target Storage Vessel (To which vessel is it being stored?) *
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {matchingTanks.length} vessel{matchingTanks.length === 1 ? '' : 's'} available for {selectedProduct?.name}
                  </span>
                </div>

                {matchingTanks.length === 0 ? (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-xs text-orange-800">
                    No active storage vessel configured for {selectedProduct?.name || 'this product'}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matchingTanks.map((t) => {
                      const isSelected = t.id === tankId;
                      const cap = Number(t.maximum_level_litres || t.capacity_litres);
                      const curr = Number(t.current_stock_litres || 0);
                      const ullage = Math.max(0, cap - curr);
                      const pct = cap > 0 ? (curr / cap) * 100 : 0;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setTankId(t.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/20'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {t.code}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-900 block">{t.name}</span>
                                <span className="text-[10px] text-gray-500 font-mono block">
                                  Current: {formatLitres(curr)} / {formatLitres(cap)}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-bold text-emerald-700 block font-mono">
                                Available: {formatLitres(ullage)}
                              </span>
                              <span className="text-[9px] text-gray-400 font-mono">
                                {pct.toFixed(1)}% Full
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Volume Received & Purchase Price */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-amber-50/40 rounded-2xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Volume Received (Litres) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 270000"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-gray-900"
                      required
                    />

                    {/* Quick Volume Buttons */}
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {[10000, 20000, 30000, 40000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setQuantity(String(v))}
                          className="px-2 py-0.5 rounded-lg border border-gray-200 text-[10px] font-mono text-gray-600 hover:bg-white transition-colors"
                        >
                          +{v / 1000}k
                        </button>
                      ))}
                      {tankUllage > 0 && (
                        <button
                          type="button"
                          onClick={() => setQuantity(String(Math.floor(tankUllage)))}
                          className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold hover:bg-emerald-200 transition-colors"
                          title="Fill to maximum vessel safe ullage"
                        >
                          Max Fill ({formatLitres(tankUllage)})
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center justify-between">
                      <span>Purchasing Price per Litre ({currency}) *</span>
                      <span className="text-[10px] font-mono text-gray-500 font-normal">
                        Paid in {currency}
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                        {currency === 'USD' ? '$' : 'KES'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder={currency === 'USD' ? '0.850' : '162.00'}
                        className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-gray-900"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Total Purchase Value Card */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                  <span className="font-semibold text-gray-600">Base Fuel Purchase Value ({currency}):</span>
                  <span className="font-mono font-extrabold text-base text-gray-900">
                    {formatMoney(basePurchaseTotal)}
                  </span>
                </div>
              </div>

              {/* Date, Ref & Flow Meter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Intake Date *
                  </label>
                  <input
                    type="date"
                    value={receivingDate}
                    onChange={(e) => setReceivingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Consignment Ref # *
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. RCV-2026-941"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-gray-400" />
                    Meter / Dip Gauge
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={meterReading}
                    onChange={(e) => setMeterReading(e.target.value)}
                    placeholder="e.g. 1450200"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Quality Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quality Inspection Status
                  </label>
                  <select
                    value={qualityStatus}
                    onChange={(e) => setQualityStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-gray-900"
                  >
                    <option value="PASSED">Passed (Density &amp; Purity Certified)</option>
                    <option value="PENDING_TESTING">Testing Pending / Provisional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Intake Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Vessel berth 2, density 0.835, port inspector certified"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Link to Expenses tab */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>Have marine demurrage, port charges, or inspection expenses for this vessel?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('expenses')}
                  className="font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1"
                >
                  <span>Fill Consignment Expenses &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: CONSIGNMENT DISCHARGE EXPENSES                              */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-800">
                <p className="font-bold mb-0.5">Vessel Discharge &amp; Marine Intake Expenses ({currency})</p>
                <p className="text-[11px] text-blue-700">
                  Expenses recorded here will be added to the consignment total landed cost and automatically saved into the company <strong>Expenses</strong> ledger under Operations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Demurrage / Berth Fees ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                      {currency === 'USD' ? '$' : 'KES'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={demurrageCost}
                      onChange={(e) => setDemurrageCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Port &amp; Jetty Charges ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                      {currency === 'USD' ? '$' : 'KES'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={portCharges}
                      onChange={(e) => setPortCharges(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Marine Surveyor &amp; Inspection Fees ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                      {currency === 'USD' ? '$' : 'KES'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={inspectionFees}
                      onChange={(e) => setInspectionFees(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pumping &amp; Pipeline Discharge Charges ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                      {currency === 'USD' ? '$' : 'KES'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={pumpingCharges}
                      onChange={(e) => setPumpingCharges(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Customs Duty &amp; Port Levies ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                      {currency === 'USD' ? '$' : 'KES'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={customsDuty}
                      onChange={(e) => setCustomsDuty(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Other Intake Expenses ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                      {currency === 'USD' ? '$' : 'KES'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={otherExpenses}
                      onChange={(e) => setOtherExpenses(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Other Expenses Note / Payee Details
                </label>
                <input
                  type="text"
                  value={otherExpensesNote}
                  onChange={(e) => setOtherExpensesNote(e.target.value)}
                  placeholder="e.g. Jetty security clearance, diver inspection fees"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Total Landed Cost Summary Card */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Base Fuel Purchase:</span>
                  <span className="font-mono font-bold text-gray-900">{formatMoney(basePurchaseTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Consignment Expenses Total:</span>
                  <span className="font-mono font-bold text-blue-700">{formatMoney(totalExpenses)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900">Total Consignment Landed Cost:</span>
                  <span className="font-mono font-extrabold text-base text-gray-900">{formatMoney(landedTotalCost)}</span>
                </div>
                {enteredQty > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Landed Cost per Litre:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {currency === 'USD' ? `$${landedCostPerLitre.toFixed(3)}/L` : `KES ${landedCostPerLitre.toFixed(2)}/L`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-[11px] text-gray-500">
              {marketType === 'LOCAL' ? 'Domestic Cargo (KES)' : 'Transit Regional Cargo (USD)'}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || isExceedingCapacity || enteredQty <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="w-4 h-4" />
                )}
                <span>Confirm Vessel Discharge &amp; Update Stock</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
