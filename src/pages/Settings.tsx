import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Fuel,
  Building2,
  Sliders,
  Bell,
  CheckCircle2,
  Edit2,
  DollarSign,
  Save,
  Loader2,
  X,
} from 'lucide-react';
import type { Product } from '../types';
import {
  getProducts,
  updateProductPrice,
  getDepotConfig,
  saveDepotConfig,
  type DepotConfig,
} from '../services/settingsService';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

type SettingsTab = 'PRICING' | 'DEPOT' | 'TOLERANCES' | 'POLICIES';

const PRODUCT_THEMES: Record<string, { badge: string; border: string }> = {
  AGO: { badge: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
  PMS: { badge: 'bg-blue-100 text-blue-800', border: 'border-blue-200' },
};

export function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || 'PRICING').toUpperCase() as SettingsTab;
  const validTabs: SettingsTab[] = ['PRICING', 'DEPOT', 'TOLERANCES', 'POLICIES'];
  const activeTab: SettingsTab = validTabs.includes(tabParam) ? tabParam : 'PRICING';
  const setActiveTab = (tab: SettingsTab) => setSearchParams({ tab }, { replace: true });

  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<DepotConfig>(getDepotConfig());
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Price edit modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getProducts();
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleOpenPriceModal = (p: Product) => {
    setEditingProduct(p);
    setNewPrice(String(p.current_price));
    setPriceError(null);
  };

  const handleSavePrice = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const priceNum = parseFloat(newPrice);
    if (!priceNum || priceNum <= 0) {
      setPriceError('Please enter a valid positive price per litre.');
      return;
    }

    setSavingPrice(true);
    setPriceError(null);
    try {
      await updateProductPrice(editingProduct.id, priceNum, user?.id);
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      setPriceError(err?.message || 'Failed to update product price.');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    saveDepotConfig(config, user?.id);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'PRICING', label: 'Fuel Pricing (EPRA)', icon: Fuel },
    { id: 'DEPOT', label: 'Company & Regulatory', icon: Building2 },
    { id: 'TOLERANCES', label: 'Stock & Tolerances', icon: Sliders },
    { id: 'POLICIES', label: 'Alerts & Policies', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-700" />
            System Configuration &amp; Settings
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Fuel product tariff rates, EPRA compliance standards, and terminal operational thresholds
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* Main Settings Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Navigation bar */}
        <div className="flex items-center overflow-x-auto border-b border-gray-100 px-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 py-4 px-4 border-b-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#1e3a5f] text-[#1e3a5f]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* ─── FUEL PRICING TAB ────────────────────────────────────────────── */}
          {activeTab === 'PRICING' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Current Selling Prices (per Litre)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live benchmark tariff applied to customer fuel orders and invoice calculations
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading product prices…</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {products.map((p) => {
                    const theme = PRODUCT_THEMES[p.code] || {
                      badge: 'bg-gray-100 text-gray-800',
                      border: 'border-gray-200',
                    };
                    return (
                      <div
                        key={p.id}
                        className={`p-5 rounded-2xl border ${theme.border} bg-gray-50/50 space-y-3 flex flex-col justify-between`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded-md font-mono font-bold text-xs ${theme.badge}`}>
                              {p.code}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold">Active Fuel Product</span>
                          </div>

                          <h4 className="text-base font-bold text-gray-900 mt-2">{p.name}</h4>
                          <p className="text-xs text-gray-500">{p.description || 'Petroleum motor fuel distillate'}</p>

                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Gate Price</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-2xl font-extrabold text-gray-900 font-mono">
                                {formatCurrency(p.current_price)}
                              </span>
                              <span className="text-xs text-gray-500 font-semibold">/ Litre</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenPriceModal(p)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Adjust Price</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── DEPOT & REGULATORY PROFILE TAB ─────────────────────────────── */}
          {activeTab === 'DEPOT' && (
            <form onSubmit={handleSaveConfig} className="space-y-5 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Company Regulatory Profile</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Statutory details printed on official waybills, invoices, and dispatch notes
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Terminal Facility Name *</label>
                  <input
                    type="text"
                    value={config.depot_name}
                    onChange={(e) => setConfig({ ...config, depot_name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">EPRA License # *</label>
                  <input
                    type="text"
                    value={config.epra_license}
                    onChange={(e) => setConfig({ ...config, epra_license: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">KRA VAT PIN *</label>
                  <input
                    type="text"
                    value={config.kra_pin}
                    onChange={(e) => setConfig({ ...config, kra_pin: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={config.contact_phone}
                    onChange={(e) => setConfig({ ...config, contact_phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={config.contact_email}
                    onChange={(e) => setConfig({ ...config, contact_email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Address</label>
                  <input
                    type="text"
                    value={config.physical_address}
                    onChange={(e) => setConfig({ ...config, physical_address: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              {/* Bank Account Section */}
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Bank Account &amp; Settlement Details (Printed on Invoices)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Account numbers, bank branches, and M-Pesa paybill shown on customer invoices &amp; PDF downloads
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Commercial Bank Name *</label>
                    <input
                      type="text"
                      value={config.bank_name}
                      onChange={(e) => setConfig({ ...config, bank_name: e.target.value })}
                      required
                      placeholder="e.g. Standard Chartered Bank Kenya"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={config.bank_branch}
                      onChange={(e) => setConfig({ ...config, bank_branch: e.target.value })}
                      placeholder="e.g. Industrial Area Branch, Nairobi"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Name (Beneficiary) *</label>
                    <input
                      type="text"
                      value={config.bank_account_name}
                      onChange={(e) => setConfig({ ...config, bank_account_name: e.target.value })}
                      required
                      placeholder="e.g. TARITA PETROLEUM LIMITED"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number (KES) *</label>
                    <input
                      type="text"
                      value={config.bank_account_number}
                      onChange={(e) => setConfig({ ...config, bank_account_number: e.target.value })}
                      required
                      placeholder="e.g. 0102045678900"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Swift / BIC Code</label>
                    <input
                      type="text"
                      value={config.bank_swift_code}
                      onChange={(e) => setConfig({ ...config, bank_swift_code: e.target.value })}
                      placeholder="e.g. SCBLKENX"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">M-Pesa Paybill Number</label>
                    <input
                      type="text"
                      value={config.mpesa_paybill}
                      onChange={(e) => setConfig({ ...config, mpesa_paybill: e.target.value })}
                      placeholder="e.g. 889900"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Company Profile &amp; Banking Details</span>
                </button>
              </div>
            </form>
          )}

          {/* ─── STOCK & TOLERANCES TAB ──────────────────────────────────────── */}
          {activeTab === 'TOLERANCES' && (
            <form onSubmit={handleSaveConfig} className="space-y-5 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Storage Tanks &amp; Dipping Tolerances</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Thresholds for tank inventory reconciliation, safety headroom, and automated variance flags
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-800">Physical Dip Variance Tolerance (%)</label>
                    <span className="font-mono font-bold text-xs text-blue-700">{config.dip_tolerance_pct}%</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Acceptable percentage difference between physical tank dip calculation and system book balance.
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={config.dip_tolerance_pct}
                    onChange={(e) => setConfig({ ...config, dip_tolerance_pct: parseFloat(e.target.value) || 0.5 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-800">Tank Safety Headroom Reserve (%)</label>
                    <span className="font-mono font-bold text-xs text-amber-700">{config.safety_headroom_pct}%</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Thermal expansion safety buffer reserved at the top of vertical storage tanks.
                  </p>
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    max="15.0"
                    value={config.safety_headroom_pct}
                    onChange={(e) => setConfig({ ...config, safety_headroom_pct: parseFloat(e.target.value) || 5.0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Tolerances</span>
                </button>
              </div>
            </form>
          )}

          {/* ─── POLICIES TAB ────────────────────────────────────────────────── */}
          {activeTab === 'POLICIES' && (
            <form onSubmit={handleSaveConfig} className="space-y-5 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-gray-900">System Policies &amp; Alert Windows</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automated statutory compliance reminders and default commercial payment periods
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Tanker Compliance Expiry Warning Lead Time (Days)
                  </label>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Days prior to EPRA inspection or insurance expiry when warnings start appearing on the dispatch bay.
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={config.compliance_alert_days}
                    onChange={(e) => setConfig({ ...config, compliance_alert_days: parseInt(e.target.value, 10) || 14 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Default Commercial Credit Terms (Days)
                  </label>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Pre-populated invoice payment due date offset for newly generated customer invoices.
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={config.default_credit_days}
                    onChange={(e) => setConfig({ ...config, default_credit_days: parseInt(e.target.value, 10) || 30 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Operational Policies</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Adjust Price Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />

          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Adjust Fuel Price</h3>
                  <p className="text-xs text-gray-500">{editingProduct.name} ({editingProduct.code})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="p-6 space-y-4">
              {priceError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {priceError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Gate Selling Price (KES per Litre) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    required
                    className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-gray-300 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Current rate: {formatCurrency(editingProduct.current_price)}/L
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingPrice ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Updating…</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" />Update Tariff</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
