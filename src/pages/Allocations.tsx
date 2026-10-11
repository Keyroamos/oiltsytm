import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import {
  Layers, Plus, Search, RefreshCw, Calendar, Package, TrendingUp, CheckCircle2,
  X, Loader2, Edit2, LayoutGrid, List, Fuel, Building2, BarChart2, Save,
  Filter, AlertTriangle, ArrowRight, Info,
} from 'lucide-react';
import type { FuelAllocation, AllocationStatus, Supplier, Product } from '../types';
import {
  getFuelAllocations, createFuelAllocation, updateFuelAllocation, getAllocationSummary,
  type AllocationSummary, type CreateFuelAllocationInput,
} from '../services/allocationService';
import { supabase } from '../lib/supabase';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatLitres, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS  = [2024, 2025, 2026, 2027, 2028];
const TERMINALS = [
  'Kipevu Oil Terminal (KOT)',
  'Kenya Petroleum Refineries (KPRL)',
  'Oil Libya Terminal',
  'Total Energies Terminal',
  'Hass Petroleum Terminal',
  'Other',
];
const STATUS_META: Record<AllocationStatus, { label: string; color: string; dot: string }> = {
  ACTIVE:    { label: 'Active',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  COMPLETED: { label: 'Completed', color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500'    },
  EXPIRED:   { label: 'Expired',   color: 'bg-gray-100 text-gray-500 border-gray-200',         dot: 'bg-gray-400'    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: AllocationStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function LiftedBar({ pct, lifted, total }: { pct: number; lifted: number; total: number }) {
  const clr = pct >= 90 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-indigo-500';
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>{formatLitres(lifted)} lifted</span>
        <span className="font-semibold">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${clr}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="text-[10px] text-gray-400 text-right">Remaining: {formatLitres(Math.max(0, total - lifted))}</div>
    </div>
  );
}

function defaultPeriod() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

function blankForm() {
  return {
    allocation_reference: '', allocation_period: defaultPeriod(),
    supplier_id: '', product_id: '',
    allocated_quantity_litres: '', allocated_quantity_mt: '', allocated_quantity_m3: '',
    source_terminal: 'Kipevu Oil Terminal (KOT)',
    period_start_date: new Date().toISOString().split('T')[0],
    period_end_date: '', notes: '', status: 'ACTIVE' as AllocationStatus,
  };
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all';

// ─── Four-Quantities Panel ─────────────────────────────────────────────────────
// Spec Section 6: Allocated / Purchased / Received / Sold — four distinct facts
interface FourQRow {
  product_code: string;
  product_name: string;
  allocated_litres: number;
  allocated_mt: number;
  purchased_litres: number;
  received_litres: number;
  sold_litres: number;
}

function FourQuantitiesPanel({ rows }: { rows: FourQRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Info className="w-4 h-4 text-indigo-500" />
        <div>
          <p className="text-sm font-bold text-gray-900">Product Position — Active Allocations</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            The four TPMS quantities per TPMS spec §6:{' '}
            <span className="font-semibold text-indigo-600">Allocated</span> →{' '}
            <span className="font-semibold text-violet-600">Purchased</span> →{' '}
            <span className="font-semibold text-blue-600">Received</span> →{' '}
            <span className="font-semibold text-emerald-600">Sold</span>
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Product</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-indigo-600 whitespace-nowrap">Allocated (L)</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-indigo-600 whitespace-nowrap">Allocated (MT)</th>
              <th className="px-3 py-3 text-center text-gray-300 text-xs"></th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-violet-600 whitespace-nowrap">Purchased (L)</th>
              <th className="px-3 py-3 text-center text-gray-300 text-xs"></th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-blue-600 whitespace-nowrap">Received (L)</th>
              <th className="px-3 py-3 text-center text-gray-300 text-xs"></th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-emerald-600 whitespace-nowrap">Sold (L)</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-amber-600 whitespace-nowrap">Balance (L)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => {
              const balance = r.allocated_litres - r.sold_litres;
              const pct = r.allocated_litres > 0 ? (r.received_litres / r.allocated_litres) * 100 : 0;
              return (
                <tr key={r.product_code} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        {r.product_code}
                      </span>
                      <span className="text-xs text-gray-500">{r.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-indigo-700">{formatLitres(r.allocated_litres)}</td>
                  <td className="px-4 py-4 text-right font-mono text-xs text-indigo-600">
                    {r.allocated_mt > 0 ? `${r.allocated_mt.toLocaleString(undefined, { maximumFractionDigits: 2 })} MT` : '—'}
                  </td>
                  <td className="px-3 py-4 text-center text-gray-300"><ArrowRight className="w-3 h-3 inline" /></td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-violet-700">{formatLitres(r.purchased_litres)}</td>
                  <td className="px-3 py-4 text-center text-gray-300"><ArrowRight className="w-3 h-3 inline" /></td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-blue-700">{formatLitres(r.received_litres)}</td>
                  <td className="px-3 py-4 text-center text-gray-300"><ArrowRight className="w-3 h-3 inline" /></td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-semibold text-emerald-700">{formatLitres(r.sold_litres)}</td>
                  <td className="px-4 py-4 text-right">
                    <div>
                      <p className={`font-mono text-xs font-bold ${balance > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                        {formatLitres(Math.max(0, balance))}
                      </p>
                      <div className="mt-1 w-24 ml-auto h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  mode: 'create' | 'edit';
  initial?: FuelAllocation;
  suppliers: Supplier[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
  userId?: string;
}

function AllocationModal({ mode, initial, suppliers, products, onClose, onSaved, userId }: ModalProps) {
  const [form, setForm] = useState(() => {
    if (mode === 'edit' && initial) {
      return {
        allocation_reference: initial.allocation_reference,
        allocation_period: initial.allocation_period,
        supplier_id: initial.supplier_id,
        product_id: initial.product_id,
        allocated_quantity_litres: String(initial.allocated_quantity_litres),
        allocated_quantity_mt: initial.allocated_quantity_mt ? String(initial.allocated_quantity_mt) : '',
        allocated_quantity_m3: initial.allocated_quantity_m3 ? String(initial.allocated_quantity_m3) : '',
        source_terminal: initial.source_terminal ?? 'Kipevu Oil Terminal (KOT)',
        period_start_date: initial.period_start_date,
        period_end_date: initial.period_end_date ?? '',
        notes: initial.notes ?? '',
        status: initial.status,
      };
    }
    return blankForm();
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parts = form.allocation_period.split('-');
  const periodMonth = parts[0] ?? MONTHS[new Date().getMonth()];
  const periodYear  = parts[1] ?? String(new Date().getFullYear());

  const buildRef = (period: string, productId: string) => {
    const code = products.find((p) => p.id === productId)?.code ?? '';
    return `ALLOC-${period}-${code}`.replace(/-$/, '');
  };

  const setPeriod = (month: string, year: string) => {
    const period = `${month}-${year}`;
    setForm((f) => ({ ...f, allocation_period: period, allocation_reference: buildRef(period, f.product_id) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.supplier_id)               { setError('Please select a supplier.'); return; }
    if (!form.product_id)                { setError('Please select a product.'); return; }
    if (!form.allocated_quantity_litres) { setError('Allocated litres is required.'); return; }
    if (!form.period_end_date)           { setError('Period end date is required.'); return; }
    setSaving(true);
    try {
      if (mode === 'create') {
        const input: CreateFuelAllocationInput = {
          allocation_reference: form.allocation_reference || buildRef(form.allocation_period, form.product_id),
          allocation_period: form.allocation_period,
          supplier_id: form.supplier_id,
          product_id: form.product_id,
          allocated_quantity_litres: Number(form.allocated_quantity_litres),
          allocated_quantity_mt: form.allocated_quantity_mt ? Number(form.allocated_quantity_mt) : undefined,
          allocated_quantity_m3: form.allocated_quantity_m3 ? Number(form.allocated_quantity_m3) : undefined,
          source_terminal: form.source_terminal,
          period_start_date: form.period_start_date,
          period_end_date: form.period_end_date,
          notes: form.notes || undefined,
        };
        await createFuelAllocation(input, userId);
      } else if (initial) {
        await updateFuelAllocation(initial.id, {
          allocated_quantity_litres: Number(form.allocated_quantity_litres),
          allocated_quantity_mt: form.allocated_quantity_mt ? Number(form.allocated_quantity_mt) : undefined,
          allocated_quantity_m3: form.allocated_quantity_m3 ? Number(form.allocated_quantity_m3) : undefined,
          source_terminal: form.source_terminal,
          period_end_date: form.period_end_date,
          status: form.status as AllocationStatus,
          notes: form.notes || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {mode === 'create' ? 'New Fuel Allocation' : 'Edit Allocation'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {mode === 'create'
                ? 'Record a supplier quota for a reporting period (e.g. PMS 890 MT, AGO 1,073 MT)'
                : `Editing ${initial?.allocation_reference}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Period, Supplier, Product */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Allocation Period & Reference</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Allocation Period *</label>
                <div className="flex gap-2">
                  <select value={periodMonth} onChange={(e) => setPeriod(e.target.value, periodYear)}
                    className={`flex-1 ${inputCls}`} disabled={mode === 'edit'}>
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={periodYear} onChange={(e) => setPeriod(periodMonth, e.target.value)}
                    className={`w-28 ${inputCls}`} disabled={mode === 'edit'}>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier *</label>
                <select required value={form.supplier_id}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                  className={inputCls} disabled={mode === 'edit'}>
                  <option value="">— Select supplier —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product *</label>
                <select required value={form.product_id}
                  onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value, allocation_reference: buildRef(f.allocation_period, e.target.value) }))}
                  className={inputCls} disabled={mode === 'edit'}>
                  <option value="">— Select product —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Allocation Reference</label>
                <input type="text" value={form.allocation_reference}
                  onChange={(e) => setForm((f) => ({ ...f, allocation_reference: e.target.value }))}
                  className={`${inputCls} font-mono`} placeholder="e.g. ALLOC-OCT-2026-PMS" />
              </div>
            </div>
          </div>

          {/* Quantities in all three units — spec §4-D */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Allocated Quantities</h3>
            <div className="bg-indigo-50/60 rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-indigo-700 font-medium">
                Spec §4-D: Enter quantities in all applicable units. Example: PMS 890 MT / AGO 1,073 MT.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Litres *</label>
                  <input type="number" required min="1" step="0.01" value={form.allocated_quantity_litres}
                    onChange={(e) => setForm((f) => ({ ...f, allocated_quantity_litres: e.target.value }))}
                    className={`${inputCls} font-mono`} placeholder="e.g. 1,073,000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Metric Tonnes (MT)</label>
                  <input type="number" min="0" step="0.001" value={form.allocated_quantity_mt}
                    onChange={(e) => setForm((f) => ({ ...f, allocated_quantity_mt: e.target.value }))}
                    className={`${inputCls} font-mono`} placeholder="e.g. 1073.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cubic Metres (m&#179;)</label>
                  <input type="number" min="0" step="0.001" value={form.allocated_quantity_m3}
                    onChange={(e) => setForm((f) => ({ ...f, allocated_quantity_m3: e.target.value }))}
                    className={`${inputCls} font-mono`} placeholder="e.g. 1073.00" />
                </div>
              </div>
            </div>
          </div>

          {/* Source & Period */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Source Terminal & Validity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Source Terminal</label>
                <select value={form.source_terminal}
                  onChange={(e) => setForm((f) => ({ ...f, source_terminal: e.target.value }))}
                  className={inputCls}>
                  {TERMINALS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Period Start *</label>
                <input type="date" required value={form.period_start_date}
                  onChange={(e) => setForm((f) => ({ ...f, period_start_date: e.target.value }))}
                  className={inputCls} disabled={mode === 'edit'} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Period End *</label>
                <input type="date" required value={form.period_end_date}
                  onChange={(e) => setForm((f) => ({ ...f, period_end_date: e.target.value }))}
                  className={inputCls} />
              </div>
              {mode === 'edit' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AllocationStatus }))}
                    className={inputCls}>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={`${inputCls} resize-none`} placeholder="Optional remarks for this allocation…" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'create' ? <Plus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : mode === 'create' ? 'Create Allocation' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card View ────────────────────────────────────────────────────────────────
function AllocationCard({ alloc, onEdit }: { alloc: FuelAllocation; onEdit: (a: FuelAllocation) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{alloc.allocation_period}</p>
          <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{alloc.allocation_reference}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 truncate">{alloc.supplier?.name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Fuel className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500">{alloc.product?.name ?? '—'} ({alloc.product?.code ?? '—'})</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusPill status={alloc.status} />
          <button onClick={() => onEdit(alloc)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            title="Edit allocation">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* All three units — spec requires Litres AND MT/m³ */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Litres', value: formatLitres(alloc.allocated_quantity_litres), hi: true },
          { label: 'MT',     value: alloc.allocated_quantity_mt ? `${Number(alloc.allocated_quantity_mt).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT` : '—', hi: false },
          { label: 'm\u00b3', value: alloc.allocated_quantity_m3 ? `${Number(alloc.allocated_quantity_m3).toLocaleString(undefined, { maximumFractionDigits: 2 })} m\u00b3` : '—', hi: false },
        ].map(({ label, value, hi }) => (
          <div key={label} className={`rounded-xl p-2.5 ${hi ? 'bg-indigo-50' : 'bg-gray-50'}`}>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
            <p className={`text-xs font-bold mt-0.5 ${hi ? 'text-indigo-700' : 'text-gray-800'}`}>{value}</p>
          </div>
        ))}
      </div>
      <LiftedBar pct={alloc.lifted_pct ?? 0} lifted={alloc.lifted_quantity_litres} total={alloc.allocated_quantity_litres} />
      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(alloc.period_start_date)} &ndash; {formatDate(alloc.period_end_date)}
        </span>
        <span className="truncate max-w-[120px] text-right">{alloc.source_terminal ?? '—'}</span>
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────
function AllocationTable({ allocs, onEdit }: { allocs: FuelAllocation[]; onEdit: (a: FuelAllocation) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {['Reference', 'Period', 'Supplier', 'Product', 'Alloc (L)', 'Alloc (MT)', 'Alloc (m\u00b3)', 'Lifted (L)', 'Remaining (L)', 'Progress', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allocs.map((a) => (
              <tr key={a.id} className="hover:bg-indigo-50/30 transition-colors group">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">{a.allocation_reference}</td>
                <td className="px-4 py-3 text-xs font-bold text-indigo-600 whitespace-nowrap">{a.allocation_period}</td>
                <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap max-w-[140px] truncate">{a.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                    {a.product?.code ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-right font-semibold text-gray-800 whitespace-nowrap font-mono">
                  {Number(a.allocated_quantity_litres).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-right text-indigo-700 whitespace-nowrap font-mono">
                  {a.allocated_quantity_mt ? `${Number(a.allocated_quantity_mt).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-right text-indigo-600 whitespace-nowrap font-mono">
                  {a.allocated_quantity_m3 ? `${Number(a.allocated_quantity_m3).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-right text-gray-600 whitespace-nowrap font-mono">{Number(a.lifted_quantity_litres).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-right text-gray-600 whitespace-nowrap font-mono">{Number(a.remaining_quantity_litres).toLocaleString()}</td>
                <td className="px-4 py-3 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${(a.lifted_pct ?? 0) >= 90 ? 'bg-emerald-500' : (a.lifted_pct ?? 0) >= 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, a.lifted_pct ?? 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 w-10 text-right">{(a.lifted_pct ?? 0).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => onEdit(a)}
                    className="p-1.5 rounded-lg border border-transparent text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function Allocations() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<FuelAllocation[]>([]);
  const [summary, setSummary] = useState<AllocationSummary | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AllocationStatus>('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<FuelAllocation | null>(null);
  const [fourQRows, setFourQRows] = useState<FourQRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setTableError(null);
    try {
      const [supRes, prodRes] = await Promise.all([
        supabase.from('suppliers').select('id, name, code, is_active, phone, email, address, credit_terms, created_at, updated_at').order('name'),
        supabase.from('products').select('id, name, code, unit, current_price, is_active, created_at, updated_at').order('name'),
      ]);
      setSuppliers((supRes.data ?? []) as Supplier[]);
      setProducts((prodRes.data ?? []) as Product[]);

      try {
        const [allocList, summaryData] = await Promise.all([
          getFuelAllocations(),
          getAllocationSummary(),
        ]);
        setAllocations(allocList);
        setSummary(summaryData);

        // Four-quantities panel: aggregate from active allocations + downstream tables
        const activeAllocs = allocList.filter((a) => a.status === 'ACTIVE');
        const productMap = new Map<string, FourQRow>();
        for (const a of activeAllocs) {
          const code = a.product?.code ?? 'OTHER';
          if (!productMap.has(code)) {
            productMap.set(code, {
              product_code: code,
              product_name: a.product?.name ?? code,
              allocated_litres: 0,
              allocated_mt: 0,
              purchased_litres: 0,
              received_litres: 0,
              sold_litres: 0,
            });
          }
          const row = productMap.get(code)!;
          row.allocated_litres += Number(a.allocated_quantity_litres ?? 0);
          row.allocated_mt += Number(a.allocated_quantity_mt ?? 0);
        }

        const [purchRes, recvRes, ordRes] = await Promise.all([
          supabase.from('fuel_purchases').select('quantity_litres, product:products(code)').neq('status', 'CANCELLED'),
          supabase.from('receiving_records').select('quantity_received, quantity_ordered, product:products(code)').eq('status', 'RECEIVED'),
          supabase.from('orders').select('quantity_litres, product:products(code)').neq('status', 'CANCELLED'),
        ]);

        for (const p of purchRes.data ?? []) {
          const code = (p as any).product?.code;
          if (code && productMap.has(code)) productMap.get(code)!.purchased_litres += Number((p as any).quantity_litres ?? 0);
        }
        for (const r of recvRes.data ?? []) {
          const code = (r as any).product?.code;
          if (code && productMap.has(code)) productMap.get(code)!.received_litres += Number((r as any).quantity_received ?? (r as any).quantity_ordered ?? 0);
        }
        for (const o of ordRes.data ?? []) {
          const code = (o as any).product?.code;
          if (code && productMap.has(code)) productMap.get(code)!.sold_litres += Number((o as any).quantity_litres ?? 0);
        }

        setFourQRows(Array.from(productMap.values()));
      } catch (allocErr: any) {
        const msg: string = allocErr?.message ?? '';
        if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('fuel_allocations')) {
          setTableError('setup_required');
        } else {
          console.error('Failed to load allocations:', allocErr);
        }
        setAllocations([]);
        setSummary(null);
        setFourQRows([]);
      }
    } catch (err) {
      console.error('Failed to load reference data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const uniquePeriods = useMemo(() => Array.from(new Set(allocations.map((a) => a.allocation_period))).sort().reverse(), [allocations]);
  const uniqueProductCodes = useMemo(() => Array.from(new Set(allocations.map((a) => a.product?.code).filter(Boolean))), [allocations]);
  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    allocations.forEach((a) => { if (a.supplier_id && a.supplier?.name) map.set(a.supplier_id, a.supplier.name); });
    return Array.from(map.entries());
  }, [allocations]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allocations.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (productFilter !== 'ALL' && a.product?.code !== productFilter) return false;
      if (supplierFilter !== 'ALL' && a.supplier_id !== supplierFilter) return false;
      if (periodFilter !== 'ALL' && a.allocation_period !== periodFilter) return false;
      if (q) {
        const hay = [a.allocation_reference, a.supplier?.name, a.product?.name, a.product?.code, a.allocation_period, a.source_terminal].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allocations, search, statusFilter, productFilter, supplierFilter, periodFilter]);

  const openEdit   = (alloc: FuelAllocation) => { setEditTarget(alloc); setModalMode('edit'); };
  const openCreate = () => { setEditTarget(null); setModalMode('create'); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };
  const hasFilters = !!(search || statusFilter !== 'ALL' || productFilter !== 'ALL' || supplierFilter !== 'ALL' || periodFilter !== 'ALL');
  const clearFilters = () => { setSearch(''); setStatusFilter('ALL'); setProductFilter('ALL'); setSupplierFilter('ALL'); setPeriodFilter('ALL'); };

  return (
    <div className="space-y-6">
      {tableError === 'setup_required' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">Database Setup Required</h3>
              <p className="text-xs text-amber-700 mt-1">
                The <code className="bg-amber-100 px-1 rounded font-mono">fuel_allocations</code> table doesn't exist yet. Please run the SQL migration.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a href="https://supabase.com/dashboard/project/wamcotcjwffawgzmqgpl/sql/new" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors">
                  Open SQL Editor ↗
                </a>
                <span className="text-xs text-amber-600">Run: <code className="font-mono">create_fuel_allocations.sql</code> (project root)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Allocation Register
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Supplier period quotas — allocated, lifted &amp; remaining quantities per product</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button onClick={() => setView('cards')} className={`p-2 rounded-lg transition-all ${view === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="Card view"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView('table')} className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="Table view"><List className="w-4 h-4" /></button>
          </div>
          <button onClick={loadData} disabled={loading} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md">
            <Plus className="w-4 h-4" /> New Allocation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading && !summary ? <LoadingSkeleton count={4} type="card" /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Allocated"    value={formatLitres(summary?.total_allocated_litres ?? 0)}  subtitle="All periods combined" icon={Layers}       iconColor="text-indigo-600"  iconBg="bg-indigo-50"  />
          <KPICard title="Total Lifted"       value={formatLitres(summary?.total_lifted_litres ?? 0)}     subtitle="Against allocations"  icon={TrendingUp}   iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <KPICard title="Balance Remaining"  value={formatLitres(summary?.total_remaining_litres ?? 0)}  subtitle="Yet to be lifted"     icon={Package}      iconColor="text-amber-600"   iconBg="bg-amber-50"   />
          <KPICard title="Active Allocations" value={String(summary?.active_count ?? 0)}                  subtitle="Live quota periods"   icon={CheckCircle2} iconColor="text-blue-600"    iconBg="bg-blue-50"    />
        </div>
      )}

      {/* Four-Quantities Panel */}
      {!loading && fourQRows.length > 0 && <FourQuantitiesPanel rows={fourQRows} />}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search reference, supplier, product…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}
              className="pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 appearance-none bg-white">
              <option value="ALL">All Periods</option>
              {uniquePeriods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}
              className="pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 appearance-none bg-white">
              <option value="ALL">All Suppliers</option>
              {uniqueSuppliers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div className="relative">
            <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
              className="pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 appearance-none bg-white">
              <option value="ALL">All Products</option>
              {uniqueProductCodes.map((code) => <option key={code as string} value={code as string}>{code}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 appearance-none bg-white">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-400">Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of <span className="font-semibold text-gray-700">{allocations.length}</span> allocations</p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton count={6} type="card" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Layers} title="No allocations found"
          description={hasFilters ? 'No allocations match your filters. Try clearing the filters.' : 'Create your first supplier allocation quota for a reporting period.'}
          action={{ label: 'New Allocation', onClick: openCreate }} />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((alloc) => <AllocationCard key={alloc.id} alloc={alloc} onEdit={openEdit} />)}
        </div>
      ) : (
        <AllocationTable allocs={filtered} onEdit={openEdit} />
      )}

      {/* Lifting Progress by Product */}
      {!loading && allocations.some((a) => a.status === 'ACTIVE') && (() => {
        const byProduct = allocations.filter((a) => a.status === 'ACTIVE').reduce((map, a) => {
          const key = a.product?.code ?? 'OTHER';
          const cur = map.get(key) ?? { name: a.product?.name ?? key, alloc: 0, lifted: 0 };
          cur.alloc  += a.allocated_quantity_litres;
          cur.lifted += a.lifted_quantity_litres;
          map.set(key, cur);
          return map;
        }, new Map<string, { name: string; alloc: number; lifted: number }>());
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5" /> Lifting Progress by Product — Active Allocations
            </h3>
            <div className="space-y-4">
              {Array.from(byProduct.entries()).map(([code, { name, alloc: tot, lifted }]) => {
                const pct = tot > 0 ? (lifted / tot) * 100 : 0;
                return (
                  <div key={code} className="flex items-center gap-4">
                    <div className="w-24 flex-shrink-0">
                      <p className="text-xs font-bold text-gray-800">{code}</p>
                      <p className="text-[10px] text-gray-400 truncate">{name}</p>
                    </div>
                    <div className="flex-1"><LiftedBar pct={pct} lifted={lifted} total={tot} /></div>
                    <div className="text-right flex-shrink-0 w-28">
                      <p className="text-xs font-bold text-gray-800">{formatLitres(tot)}</p>
                      <p className="text-[10px] text-gray-400">allocated</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Modal */}
      {modalMode && (
        <AllocationModal
          mode={modalMode}
          initial={editTarget ?? undefined}
          suppliers={suppliers}
          products={products}
          onClose={closeModal}
          onSaved={loadData}
          userId={user?.id}
        />
      )}
    </div>
  );
}
