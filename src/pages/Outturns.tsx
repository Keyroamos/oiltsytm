import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  RefreshCw,
  Truck,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Scale,
  AlertCircle,
} from 'lucide-react';
import type { CustomerOutturn, Dispatch, Customer } from '../types';
import {
  getCustomerOutturns,
  createCustomerOutturn,
  getOutturnSummary,
  type OutturnSummary,
  type CreateOutturnInput,
} from '../services/outturnService';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatLitres, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const STATUS_STYLES = {
  CONFIRMED: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    icon: CheckCircle2,
  },
  DISPUTED: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800 border border-red-200',
    icon: AlertTriangle,
  },
  INVESTIGATING: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
    icon: AlertCircle,
  },
};

export function Outturns() {
  const { user } = useAuth();
  const [outturns, setOutturns] = useState<CustomerOutturn[]>([]);
  const [summary, setSummary] = useState<OutturnSummary | null>(null);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableError, setTableError] = useState<'setup_required' | null>(null);

  // Form
  const emptyForm = {
    dispatch_id: '',
    customer_id: '',
    product_id: '',
    tanker_id: '',
    loaded_quantity_litres: '',
    offloaded_quantity_litres: '',
    allowable_tolerance_pct: '0.5',
    delivery_destination: '',
    customer_rep_name: '',
    driver_name: '',
    meter_reading_before: '',
    meter_reading_after: '',
    outturn_date: new Date().toISOString().slice(0, 16),
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Real-time variance preview
  const variancePreview = (() => {
    const loaded = Number(form.loaded_quantity_litres) || 0;
    const offloaded = Number(form.offloaded_quantity_litres) || 0;
    const variance = offloaded - loaded;
    const pct = loaded > 0 ? (variance / loaded) * 100 : 0;
    const tol = Number(form.allowable_tolerance_pct) || 0.5;
    const within = Math.abs(pct) <= tol;
    return { variance, pct, within };
  })();

  // Auto-populate dispatch fields when dispatch is selected
  const handleDispatchChange = async (dispatchId: string) => {
    setForm((prev) => ({ ...prev, dispatch_id: dispatchId }));
    if (!dispatchId) return;
    const d = dispatches.find((d) => d.id === dispatchId);
    if (d) {
      setForm((prev) => ({
        ...prev,
        dispatch_id: dispatchId,
        customer_id: d.customer_id ?? '',
        product_id: d.product_id ?? '',
        tanker_id: d.tanker_id ?? '',
        loaded_quantity_litres: String(d.quantity_loaded ?? d.quantity_ordered ?? ''),
        driver_name: d.driver_name ?? '',
      }));
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Load dispatches and customers safely
      try {
        const [dispatchData, custData] = await Promise.all([
          supabase
            .from('dispatches')
            .select('id,dispatch_number,quantity_loaded,quantity_ordered,customer_id,product_id,tanker_id,driver_name,status')
            .in('status', ['DELIVERED', 'COMPLETED', 'IN_TRANSIT', 'DISPATCHED'])
            .order('created_at', { ascending: false })
            .limit(200),
          supabase.from('customers').select('id,name,code').eq('is_active', true),
        ]);
        setDispatches((dispatchData.data ?? []) as Dispatch[]);
        setCustomers((custData.data ?? []) as Customer[]);
      } catch (refErr) {
        console.error('Failed to load dispatch reference data:', refErr);
      }

      // 2. Load outturns
      try {
        const [outturnList, summaryData] = await Promise.all([
          getCustomerOutturns(),
          getOutturnSummary(),
        ]);
        setOutturns(outturnList);
        setSummary(summaryData);
        setTableError(null);
      } catch (outturnErr: any) {
        const msg: string = outturnErr?.message ?? '';
        if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('customer_outturns')) {
          setTableError('setup_required');
        } else {
          console.error('Failed to load outturns:', outturnErr);
        }
        setOutturns([]);
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
    if (!form.dispatch_id || !form.customer_id || !form.loaded_quantity_litres || !form.offloaded_quantity_litres) {
      setFormError('Dispatch, customer, loaded qty, and offloaded qty are all required.');
      return;
    }
    setSaving(true);
    try {
      const input: CreateOutturnInput = {
        dispatch_id: form.dispatch_id,
        customer_id: form.customer_id,
        product_id: form.product_id,
        tanker_id: form.tanker_id || undefined,
        loaded_quantity_litres: Number(form.loaded_quantity_litres),
        offloaded_quantity_litres: Number(form.offloaded_quantity_litres),
        allowable_tolerance_pct: Number(form.allowable_tolerance_pct) || 0.5,
        delivery_destination: form.delivery_destination || undefined,
        customer_rep_name: form.customer_rep_name || undefined,
        driver_name: form.driver_name || undefined,
        meter_reading_before: form.meter_reading_before ? Number(form.meter_reading_before) : undefined,
        meter_reading_after: form.meter_reading_after ? Number(form.meter_reading_after) : undefined,
        outturn_date: form.outturn_date ? new Date(form.outturn_date).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      await createCustomerOutturn(input, user?.id);
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to record outturn.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = outturns.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.outturn_status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      o.outturn_number.toLowerCase().includes(q) ||
      (o.customer?.name ?? '').toLowerCase().includes(q) ||
      (o.product?.code ?? '').toLowerCase().includes(q) ||
      (o.delivery_destination ?? '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {tableError === 'setup_required' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">Database Setup Required</h3>
              <p className="text-xs text-amber-700 mt-1">
                The <code className="bg-amber-100 px-1 rounded font-mono font-bold">customer_outturns</code> table is not yet in the database schema.
                Please execute the SQL script in your Supabase project to activate live delivery outturn reconciliation.
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

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
            Customer Outturns
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Delivered quantity vs loaded quantity — transit shrinkage tracking &amp; EPRA tolerance verification
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Record Outturn
        </button>
      </div>

      {/* ── KPIs ── */}
      {loading && !summary ? (
        <LoadingSkeleton count={4} type="card" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Loaded"
            value={formatLitres(summary?.total_loaded_litres ?? 0)}
            subtitle="Dispatched to customers"
            icon={Truck}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KPICard
            title="Total Offloaded"
            value={formatLitres(summary?.total_offloaded_litres ?? 0)}
            subtitle="Confirmed at destination"
            icon={ClipboardCheck}
            iconColor="text-teal-600"
            iconBg="bg-teal-50"
          />
          <KPICard
            title="Transit Variance"
            value={formatLitres(Math.abs(summary?.total_variance_litres ?? 0))}
            subtitle={`${(summary?.avg_variance_pct ?? 0).toFixed(3)}% average`}
            icon={TrendingDown}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
          <KPICard
            title="Disputed Deliveries"
            value={String(summary?.disputed_count ?? 0)}
            subtitle={`${summary?.confirmed_count ?? 0} confirmed`}
            icon={AlertTriangle}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by outturn #, customer, product, destination…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40">
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DISPUTED">Disputed</option>
            <option value="INVESTIGATING">Investigating</option>
          </select>
          <button onClick={loadData} disabled={loading} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Outturn Table ── */}
      {loading ? (
        <LoadingSkeleton count={5} type="card" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No outturns recorded"
          description="Record a customer outturn after each delivery to confirm offloaded quantity and detect transit shrinkages."
          action={{ label: 'Record Outturn', onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Outturn #</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Loaded</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Offloaded</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Variance</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Var %</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tolerance</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((o) => {
                  const style = STATUS_STYLES[o.outturn_status] ?? STATUS_STYLES.CONFIRMED;
                  const varianceNeg = o.variance_litres < 0;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-teal-700">{o.outturn_number}</span>
                        {o.delivery_destination && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{o.delivery_destination}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-800 text-xs">{o.customer?.name ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-gray-900 text-xs">{o.product?.code}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-700">
                        {formatLitres(o.loaded_quantity_litres)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-700">
                        {formatLitres(o.offloaded_quantity_litres)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-mono text-xs font-bold ${varianceNeg ? 'text-red-600' : 'text-emerald-600'}`}>
                        {varianceNeg ? '' : '+'}{formatLitres(o.variance_litres)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-mono text-xs font-bold ${varianceNeg ? 'text-red-600' : 'text-emerald-600'}`}>
                        {varianceNeg ? '' : '+'}{Number(o.variance_pct).toFixed(3)}%
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {o.is_within_tolerance ? (
                          <span className="flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Within ±{o.allowable_tolerance_pct}%
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Exceeds ±{o.allowable_tolerance_pct}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{formatDate(o.outturn_date)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit ${style.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {o.outturn_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900">Record Customer Outturn</h2>
                <p className="text-xs text-gray-500 mt-0.5">Confirm quantity offloaded at customer destination — tolerance flagged automatically</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Dispatch *</label>
                  <select required value={form.dispatch_id} onChange={(e) => handleDispatchChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40">
                    <option value="">Select a completed dispatch…</option>
                    {dispatches.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.dispatch_number} — {formatLitres(Number(d.quantity_loaded ?? d.quantity_ordered ?? 0))}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer *</label>
                  <select required value={form.customer_id} onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40">
                    <option value="">Select customer…</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Outturn Date/Time *</label>
                  <input type="datetime-local" required value={form.outturn_date} onChange={(e) => setForm((prev) => ({ ...prev, outturn_date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Loaded Quantity (L) *</label>
                  <input type="number" required min="1" step="0.01" value={form.loaded_quantity_litres}
                    onChange={(e) => setForm((prev) => ({ ...prev, loaded_quantity_litres: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Offloaded at Destination (L) *</label>
                  <input type="number" required min="0" step="0.01" value={form.offloaded_quantity_litres}
                    onChange={(e) => setForm((prev) => ({ ...prev, offloaded_quantity_litres: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Allowable Tolerance (%)</label>
                  <input type="number" step="0.01" min="0" max="5" value={form.allowable_tolerance_pct}
                    onChange={(e) => setForm((prev) => ({ ...prev, allowable_tolerance_pct: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Destination</label>
                  <input type="text" value={form.delivery_destination}
                    onChange={(e) => setForm((prev) => ({ ...prev, delivery_destination: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                    placeholder="e.g. Diesel Power Mombasa Rd Depot" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Rep Name</label>
                  <input type="text" value={form.customer_rep_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, customer_rep_name: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Driver Name</label>
                  <input type="text" value={form.driver_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, driver_name: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Meter Reading Before</label>
                  <input type="number" step="0.01" value={form.meter_reading_before}
                    onChange={(e) => setForm((prev) => ({ ...prev, meter_reading_before: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 font-mono" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Meter Reading After</label>
                  <input type="number" step="0.01" value={form.meter_reading_after}
                    onChange={(e) => setForm((prev) => ({ ...prev, meter_reading_after: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 font-mono" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40 resize-none"
                    placeholder="Any observations, discrepancies, or remarks…" />
                </div>
              </div>

              {/* Live Variance Preview */}
              {form.loaded_quantity_litres && form.offloaded_quantity_litres && (
                <div className={`rounded-2xl p-4 border ${variancePreview.within ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${variancePreview.within ? 'text-emerald-700' : 'text-red-700'}`}>
                    <Scale className="w-3.5 h-3.5" /> Outturn Variance Preview
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500">Variance (L)</p>
                      <p className={`text-sm font-bold ${variancePreview.variance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {variancePreview.variance >= 0 ? '+' : ''}{formatLitres(variancePreview.variance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Variance %</p>
                      <p className={`text-sm font-bold ${variancePreview.variance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {variancePreview.pct >= 0 ? '+' : ''}{variancePreview.pct.toFixed(3)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Result</p>
                      <p className={`text-sm font-bold ${variancePreview.within ? 'text-emerald-700' : 'text-red-700'}`}>
                        {variancePreview.within ? '✓ CONFIRMED' : '✗ DISPUTED'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                  {saving ? 'Recording…' : 'Record Outturn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
