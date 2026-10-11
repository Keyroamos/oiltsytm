import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Globe,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  FileText,
  Calculator,
  Building2,
  Fuel,
  Tag,
  Receipt,
} from 'lucide-react';
import type { FuelPurchase, FuelAllocation, Supplier, Product, MarketType, PurchaseCurrency, QuantityUnit } from '../types';
import {
  getFuelPurchases,
  createFuelPurchase,
  getPurchaseSummary,
  type PurchaseSummary,
  type CreateFuelPurchaseInput,
} from '../services/purchaseService';
import { getFuelAllocations } from '../services/allocationService';
import { getSuppliers } from '../services/supplierService';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatLitres, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Style helpers ────────────────────────────────────────────────────────────
const MARKET_COLORS: Record<MarketType, string> = {
  LOCAL:   'bg-sky-100 text-sky-800 border border-sky-200',
  TRANSIT: 'bg-purple-100 text-purple-800 border border-purple-200',
};

const STATUS_COLORS: Record<string, string> = {
  ORDERED:          'bg-amber-100 text-amber-800 border border-amber-200',
  PARTIALLY_LIFTED: 'bg-blue-100 text-blue-800 border border-blue-200',
  COMPLETED:        'bg-emerald-100 text-emerald-800 border border-emerald-200',
  CANCELLED:        'bg-gray-100 text-gray-600 border border-gray-200',
};

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition-all';

function Num({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-xs ${className}`}>{children}</span>;
}

// ─── Expandable Detail Row — shows full costing breakdown ─────────────────────
// Spec: "Tax amount paid/associated with the entry" and "Tax type and reference" must be traceable
function PurchaseDetailRow({ purchase }: { purchase: FuelPurchase }) {
  const taxes = [
    { label: 'Customs Duty (PET)',              value: purchase.product_entry_tax_kes },
    { label: 'Import Declaration Fee (IDF)',     value: purchase.import_declaration_fee_kes },
    { label: 'Railway Development Levy (RML)',   value: purchase.railway_development_levy_kes },
    { label: 'Petroleum Development Levy (PDL)', value: purchase.petroleum_development_levy_kes },
    { label: 'Port Charges / Demurrage',         value: purchase.demurrage_port_charges_kes },
  ].filter((t) => Number(t.value) > 0);

  const totalTaxes = taxes.reduce((s, t) => s + Number(t.value), 0);

  return (
    <tr className="bg-violet-50/30 border-b border-violet-100">
      <td colSpan={13} className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Volume Breakdown */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Volume</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Litres</span>
                <span className="font-mono font-semibold text-gray-800">{formatLitres(purchase.quantity_litres)}</span>
              </div>
              {Number(purchase.quantity_mt) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Metric Tonnes (MT)</span>
                  <span className="font-mono text-gray-700">{Number(purchase.quantity_mt).toLocaleString(undefined, { maximumFractionDigits: 3 })} MT</span>
                </div>
              )}
              {Number(purchase.quantity_value) > 0 && purchase.quantity_unit === 'M3' && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Cubic Metres (m&#179;)</span>
                  <span className="font-mono text-gray-700">{Number(purchase.quantity_value).toLocaleString(undefined, { maximumFractionDigits: 3 })} m&#179;</span>
                </div>
              )}
            </div>
          </div>

          {/* FX & Invoice */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Foreign Currency &amp; Invoice</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Invoice Currency</span>
                <span className="font-semibold text-gray-800">{purchase.currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Invoice Value ({purchase.currency})</span>
                <span className="font-mono text-gray-800">{Number(purchase.invoice_value_currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Exchange Rate</span>
                <span className="font-mono text-gray-700">{Number(purchase.exchange_rate).toFixed(4)}</span>
              </div>
              {purchase.exchange_rate_date && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Rate Date</span>
                  <span className="text-gray-700">{formatDate(purchase.exchange_rate_date)}</span>
                </div>
              )}
              {purchase.exchange_rate_source && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Rate Source</span>
                  <span className="text-gray-700 text-right max-w-[160px] truncate">{purchase.exchange_rate_source}</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                <span className="text-gray-500 font-semibold">Invoice Value (KES)</span>
                <span className="font-mono font-bold text-blue-700">{formatCurrency(purchase.invoice_value_kes)}</span>
              </div>
            </div>
          </div>

          {/* Tax Breakdown — Spec: tax type and amount must be traceable per entry */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Product Entry Tax &amp; Charges (KES)
            </p>
            {taxes.length > 0 ? (
              <div className="space-y-1.5">
                {taxes.map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-mono text-gray-800">{formatCurrency(Number(value))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                  <span className="font-semibold text-gray-700">Total Taxes</span>
                  <span className="font-mono font-bold text-amber-700">{formatCurrency(totalTaxes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Invoice (KES)</span>
                  <span className="font-mono text-gray-600">{formatCurrency(purchase.invoice_value_kes)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-violet-200 bg-violet-50 -mx-2 px-2 py-1.5 rounded-lg">
                  <span className="font-bold text-violet-800">Total Landed Cost</span>
                  <span className="font-mono font-bold text-violet-800">{formatCurrency(purchase.total_landed_cost_kes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Per Litre</span>
                  <span className="font-mono font-semibold text-emerald-700">KES {Number(purchase.unit_landed_cost_kes_per_litre).toFixed(4)}/L</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">No additional taxes recorded</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-violet-200">
                  <span className="font-bold text-violet-800">Total Landed Cost</span>
                  <span className="font-mono font-bold text-violet-800">{formatCurrency(purchase.total_landed_cost_kes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Per Litre</span>
                  <span className="font-mono font-semibold text-emerald-700">KES {Number(purchase.unit_landed_cost_kes_per_litre).toFixed(4)}/L</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reference Document & Notes */}
        {(purchase.reference_document || purchase.notes || purchase.allocation?.allocation_reference) && (
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-violet-100">
            {purchase.reference_document && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Ref Doc:</span>
                <span className="font-mono font-semibold">{purchase.reference_document}</span>
              </div>
            )}
            {purchase.allocation?.allocation_reference && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Allocation:</span>
                <span className="font-semibold text-indigo-600">{purchase.allocation.allocation_reference}</span>
              </div>
            )}
            {purchase.notes && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 italic">
                <span>&ldquo;{purchase.notes}&rdquo;</span>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function Purchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allocations, setAllocations] = useState<FuelAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketType>('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [tableError, setTableError] = useState<'setup_required' | null>(null);

  // Form state
  const emptyForm = {
    supplier_id: '',
    product_id: '',
    allocation_id: '',
    market_type: 'LOCAL' as MarketType,
    quantity_unit: 'M3' as QuantityUnit,
    quantity_value: '',
    quantity_litres: '',
    quantity_mt: '',
    currency: 'USD' as PurchaseCurrency,
    unit_cost_currency: '',
    invoice_value_currency: '',
    exchange_rate: '',
    exchange_rate_date: new Date().toISOString().split('T')[0],
    exchange_rate_source: 'Central Bank of Kenya (CBK)',
    invoice_value_kes: '',
    product_entry_tax_kes: '0',
    import_declaration_fee_kes: '0',
    railway_development_levy_kes: '0',
    petroleum_development_levy_kes: '0',
    demurrage_port_charges_kes: '0',
    reference_document: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Live landed cost preview
  const landedCostPreview = (() => {
    const kes    = Number(form.invoice_value_kes) || 0;
    const taxes  = Number(form.product_entry_tax_kes) + Number(form.import_declaration_fee_kes)
                 + Number(form.railway_development_levy_kes) + Number(form.petroleum_development_levy_kes)
                 + Number(form.demurrage_port_charges_kes);
    const total  = kes + taxes;
    const litres = Number(form.quantity_litres) || 0;
    return { total, perLitre: litres > 0 ? total / litres : 0, taxes };
  })();

  // Auto-compute KES on USD*rate change
  const handleFxChange = (field: 'invoice_value_currency' | 'exchange_rate', value: string) => {
    const updated = { ...form, [field]: value };
    const inv  = Number(updated.invoice_value_currency) || 0;
    const rate = Number(updated.exchange_rate) || 0;
    updated.invoice_value_kes = inv > 0 && rate > 0 ? String(Math.round(inv * rate * 100) / 100) : '';
    setForm(updated);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Load reference data safely
      try {
        const [supplierList, prodData, allocList] = await Promise.all([
          getSuppliers().catch(() => []),
          supabase.from('products').select('id,name,code').eq('is_active', true),
          getFuelAllocations({ status: 'ACTIVE' }).catch(() => []),
        ]);
        setSuppliers(supplierList);
        setProducts((prodData.data ?? []) as Product[]);
        setAllocations(allocList);
      } catch (refErr) {
        console.error('Failed to load reference data:', refErr);
      }

      // 2. Load purchases
      try {
        const [purchList, summaryData] = await Promise.all([
          getFuelPurchases(),
          getPurchaseSummary(),
        ]);
        setPurchases(purchList);
        setSummary(summaryData);
        setTableError(null);
      } catch (purchErr: any) {
        const msg: string = purchErr?.message ?? '';
        if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('fuel_purchases')) {
          setTableError('setup_required');
        } else {
          console.error('Failed to load purchases:', purchErr);
        }
        setPurchases([]);
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.supplier_id || !form.product_id || !form.quantity_litres || !form.exchange_rate) {
      setFormError('Supplier, product, quantity in litres, and exchange rate are required.');
      return;
    }
    setSaving(true);
    try {
      const input: CreateFuelPurchaseInput = {
        supplier_id: form.supplier_id,
        product_id: form.product_id,
        allocation_id: form.allocation_id || undefined,
        market_type: form.market_type,
        quantity_unit: form.quantity_unit,
        quantity_value: Number(form.quantity_value) || Number(form.quantity_litres),
        quantity_litres: Number(form.quantity_litres),
        quantity_mt: form.quantity_mt ? Number(form.quantity_mt) : undefined,
        currency: form.currency,
        unit_cost_currency: Number(form.unit_cost_currency) || 0,
        invoice_value_currency: Number(form.invoice_value_currency) || 0,
        exchange_rate: Number(form.exchange_rate),
        exchange_rate_date: form.exchange_rate_date,
        exchange_rate_source: form.exchange_rate_source,
        invoice_value_kes: Number(form.invoice_value_kes) || 0,
        product_entry_tax_kes: Number(form.product_entry_tax_kes) || 0,
        import_declaration_fee_kes: Number(form.import_declaration_fee_kes) || 0,
        railway_development_levy_kes: Number(form.railway_development_levy_kes) || 0,
        petroleum_development_levy_kes: Number(form.petroleum_development_levy_kes) || 0,
        demurrage_port_charges_kes: Number(form.demurrage_port_charges_kes) || 0,
        reference_document: form.reference_document || undefined,
        purchase_date: form.purchase_date,
        notes: form.notes || undefined,
      };
      await createFuelPurchase(input, user?.id);
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to create purchase.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = purchases.filter((p) => {
    const matchesMarket  = marketFilter === 'ALL' || p.market_type === marketFilter;
    const matchesProduct = productFilter === 'ALL' || p.product?.code === productFilter;
    const matchesStatus  = statusFilter === 'ALL' || p.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch  = !q || p.purchase_number.toLowerCase().includes(q) || (p.supplier?.name ?? '').toLowerCase().includes(q) || (p.product?.code ?? '').toLowerCase().includes(q) || (p.reference_document ?? '').toLowerCase().includes(q);
    return matchesMarket && matchesProduct && matchesStatus && matchesSearch;
  });

  const uniqueProducts = Array.from(new Set(purchases.map((p) => p.product?.code).filter(Boolean)));
  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      {tableError === 'setup_required' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">Database Setup Required</h3>
              <p className="text-xs text-amber-700 mt-1">
                The <code className="bg-amber-100 px-1 rounded font-mono font-bold">fuel_purchases</code> table is not yet in the database schema.
                Please execute the SQL script in your Supabase project to activate live purchases and landed costing.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href="https://supabase.com/dashboard/project/wamcotcjwffawgzmqgpl/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
                >
                  Open Supabase SQL Editor &rarr;
                </a>
                <span className="text-xs text-amber-700">
                  SQL File: <code className="font-mono font-bold text-amber-900">create_tpms_tables.sql</code> (in project root)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-600" />
            Fuel Purchases
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Multi-currency procurement — USD/KES FX, Product Entry Tax, Import Charges &amp; Landed Costing
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Record Purchase
        </button>
      </div>

      {/* KPIs */}
      {loading && !summary ? (
        <LoadingSkeleton count={4} type="card" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Landed Cost" value={formatCurrency(summary?.total_purchases_kes ?? 0)} subtitle="All purchases (KES)" icon={DollarSign} iconColor="text-violet-600" iconBg="bg-violet-50" />
          <KPICard title="Total Volume"      value={formatLitres(summary?.total_volume_litres ?? 0)}   subtitle="Purchased litres"      icon={BarChart3}  iconColor="text-blue-600"   iconBg="bg-blue-50"   />
          <KPICard title="Product Entry Tax" value={formatCurrency(summary?.total_product_entry_tax_kes ?? 0)} subtitle="Taxes on product entry" icon={Globe} iconColor="text-amber-600" iconBg="bg-amber-50" />
          <KPICard title="Avg Landed Cost"   value={`KES ${(summary?.avg_landed_cost_per_litre ?? 0).toFixed(2)}/L`} subtitle="Per litre" icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search PO#, supplier, product, bill of lading…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400"
            />
          </div>
          <div className="relative">
            <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
              className="pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 appearance-none bg-white">
              <option value="ALL">All Products</option>
              {uniqueProducts.map((c) => <option key={c} value={c as string}>{c}</option>)}
            </select>
          </div>
          <select value={marketFilter} onChange={(e) => setMarketFilter(e.target.value as any)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40">
            <option value="ALL">Local + Transit</option>
            <option value="LOCAL">Local Market</option>
            <option value="TRANSIT">Transit (Landlocked)</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40">
            <option value="ALL">All Statuses</option>
            <option value="ORDERED">Ordered</option>
            <option value="PARTIALLY_LIFTED">Partially Lifted</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button onClick={loadData} disabled={loading} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-400">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{' '}
            <span className="font-semibold text-gray-700">{purchases.length}</span> purchases
          </p>
          <p className="text-xs text-gray-400">
            Click a row to expand the full costing breakdown
          </p>
        </div>
      </div>

      {/* Purchases Table */}
      {loading ? (
        <LoadingSkeleton count={5} type="card" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchases recorded"
          description="Record a fuel purchase to track procurement costs, FX rates and product entry taxes."
          action={{ label: 'Record Purchase', onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-8 px-3 py-3"></th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">PO Number</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Supplier</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Product</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Market</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Litres</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">MT</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Invoice ({'{'}CCY{'}'})</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">FX Rate</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-violet-600 uppercase tracking-wider whitespace-nowrap">Landed (KES)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">KES/L</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => toggleExpand(p.id)}
                      className={`hover:bg-violet-50/40 transition-colors cursor-pointer border-b border-gray-50 ${expandedId === p.id ? 'bg-violet-50/30' : ''}`}
                    >
                      <td className="px-3 py-3.5 text-gray-400">
                        {expandedId === p.id
                          ? <ChevronDown className="w-3.5 h-3.5 text-violet-500" />
                          : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-violet-700">{p.purchase_number}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.purchase_date)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-800 max-w-[140px] truncate">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          {p.supplier?.name ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Fuel className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          <span className="text-xs font-bold text-gray-800">{p.product?.code ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${MARKET_COLORS[p.market_type]}`}>
                          {p.market_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Num className="text-gray-800 font-semibold">{formatLitres(p.quantity_litres)}</Num>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Num className="text-gray-600">
                          {Number(p.quantity_mt) > 0 ? `${Number(p.quantity_mt).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                        </Num>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Num className="text-gray-600">
                          {p.currency} {Number(p.invoice_value_currency).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Num>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Num className="text-gray-600">{Number(p.exchange_rate).toFixed(4)}</Num>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Num className="text-violet-700 font-bold">{formatCurrency(p.total_landed_cost_kes)}</Num>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Num className="text-emerald-700">KES {Number(p.unit_landed_cost_kes_per_litre).toFixed(2)}</Num>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[p.status] ?? ''}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                    {expandedId === p.id && <PurchaseDetailRow key={`detail-${p.id}`} purchase={p} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Record Fuel Purchase</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Multi-currency procurement with Local/Transit classification, FX rate, Product Entry Tax and Landed Cost
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              {/* Section 1: Purchase Details */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Purchase Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier *</label>
                    <select required value={form.supplier_id} onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value }))} className={inputCls}>
                      <option value="">Select supplier…</option>
                      {suppliers.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Product *</label>
                    <select required value={form.product_id} onChange={(e) => setForm((p) => ({ ...p, product_id: e.target.value }))} className={inputCls}>
                      <option value="">Select product…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Market Type *</label>
                    <select value={form.market_type} onChange={(e) => setForm((p) => ({ ...p, market_type: e.target.value as MarketType }))} className={inputCls}>
                      <option value="LOCAL">Local Market</option>
                      <option value="TRANSIT">Transit (Landlocked)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Link to Allocation</label>
                    <select value={form.allocation_id} onChange={(e) => setForm((p) => ({ ...p, allocation_id: e.target.value }))} className={inputCls}>
                      <option value="">None (standalone purchase)</option>
                      {allocations.map((a) => <option key={a.id} value={a.id}>{a.allocation_reference} — {a.product?.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Date *</label>
                    <input type="date" required value={form.purchase_date} onChange={(e) => setForm((p) => ({ ...p, purchase_date: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Reference Document</label>
                    <input type="text" value={form.reference_document} onChange={(e) => setForm((p) => ({ ...p, reference_document: e.target.value }))}
                      placeholder="B/L No., Invoice Ref, Delivery Note…" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Section 2: Quantity — all three units */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Quantity (Spec: M3 / MT / Litres)
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Unit</label>
                    <select value={form.quantity_unit} onChange={(e) => setForm((p) => ({ ...p, quantity_unit: e.target.value as QuantityUnit }))} className={inputCls}>
                      <option value="M3">m&#179; (Cubic Metres)</option>
                      <option value="MT">MT (Metric Tonnes)</option>
                      <option value="L">L (Litres)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Qty in {form.quantity_unit}</label>
                    <input type="number" min="0.001" step="0.001" value={form.quantity_value}
                      onChange={(e) => setForm((p) => ({ ...p, quantity_value: e.target.value }))}
                      className={`${inputCls} font-mono`} placeholder="e.g. 261.64" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Litres *</label>
                    <input type="number" required min="1" step="0.01" value={form.quantity_litres}
                      onChange={(e) => setForm((p) => ({ ...p, quantity_litres: e.target.value }))}
                      className={`${inputCls} font-mono`} placeholder="e.g. 261640" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">MT (optional)</label>
                    <input type="number" min="0" step="0.001" value={form.quantity_mt}
                      onChange={(e) => setForm((p) => ({ ...p, quantity_mt: e.target.value }))}
                      className={`${inputCls} font-mono`} placeholder="e.g. 220.06" />
                  </div>
                </div>
              </div>

              {/* Section 3: Foreign Currency Pricing */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Foreign Currency Pricing (Spec §7)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Currency *</label>
                    <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as PurchaseCurrency }))} className={inputCls}>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="KES">KES (Kenya Shilling)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Cost ({form.currency})</label>
                    <input type="number" min="0" step="0.0001" value={form.unit_cost_currency}
                      onChange={(e) => setForm((p) => ({ ...p, unit_cost_currency: e.target.value }))}
                      className={`${inputCls} font-mono`} placeholder={form.currency === 'USD' ? 'e.g. 0.5850' : 'e.g. 88.00'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Value ({form.currency}) *</label>
                    <input type="number" required min="0" step="0.01" value={form.invoice_value_currency}
                      onChange={(e) => handleFxChange('invoice_value_currency', e.target.value)}
                      className={`${inputCls} font-mono`} placeholder={form.currency === 'USD' ? 'e.g. 152909.40' : 'e.g. 23000000'} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Exchange Rate (USD→KES) *</label>
                    <input type="number" required min="0" step="0.0001" value={form.exchange_rate}
                      onChange={(e) => handleFxChange('exchange_rate', e.target.value)}
                      className={`${inputCls} font-mono`} placeholder="e.g. 129.50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate Date *</label>
                    <input type="date" required value={form.exchange_rate_date}
                      onChange={(e) => setForm((p) => ({ ...p, exchange_rate_date: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate Source</label>
                    <input type="text" value={form.exchange_rate_source}
                      onChange={(e) => setForm((p) => ({ ...p, exchange_rate_source: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Value KES <span className="font-normal text-gray-400">(auto-computed from {form.currency} × Rate)</span></label>
                    <input type="number" value={form.invoice_value_kes}
                      onChange={(e) => setForm((p) => ({ ...p, invoice_value_kes: e.target.value }))}
                      className={`${inputCls} bg-blue-50 font-mono font-bold text-blue-800`}
                      placeholder="Will auto-compute from invoice × rate" />
                  </div>
                </div>
              </div>

              {/* Section 4: Product Entry Tax — Spec: all KRA tax types per entry */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" /> Product Entry Tax &amp; Import Charges (KES)
                </h3>
                <p className="text-[11px] text-gray-500 mb-3">
                  Spec §7: Record each tax type separately so they remain traceable per purchase transaction.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { field: 'product_entry_tax_kes',           label: 'Customs Duty (PET)' },
                    { field: 'import_declaration_fee_kes',       label: 'Import Declaration Fee (IDF)' },
                    { field: 'railway_development_levy_kes',     label: 'Railway Development Levy (RML)' },
                    { field: 'petroleum_development_levy_kes',   label: 'Petroleum Development Levy (PDL)' },
                    { field: 'demurrage_port_charges_kes',       label: 'Port Charges / Demurrage' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                      <input type="number" min="0" step="0.01"
                        value={(form as any)[field]}
                        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                        className={`${inputCls} font-mono`} placeholder="0.00" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Landed Cost Preview */}
              {landedCostPreview.total > 0 && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" /> Landed Cost Preview
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500">Total Taxes &amp; Charges</p>
                      <p className="text-sm font-bold text-amber-800">{formatCurrency(landedCostPreview.taxes)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Total Landed Cost (KES)</p>
                      <p className="text-sm font-bold text-violet-800">{formatCurrency(landedCostPreview.total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Per Litre (KES)</p>
                      <p className="text-sm font-bold text-emerald-700">KES {landedCostPreview.perLitre.toFixed(4)}/L</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className={`${inputCls} resize-none`} placeholder="Optional notes…" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Recording…' : 'Record Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
