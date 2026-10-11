import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Fuel,
  Sliders,
  AlertTriangle,
  Layers,
  Clock,
  Wrench,
  CheckCircle2,
  Calendar,
  History,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  ArrowDownToLine,
} from 'lucide-react';
import type { Tank, StockTransaction } from '../types';
import { getTankById, getTankTransactions, updateTankStatus } from '../services/tankService';
import { getTankPerformance, type TankPerformanceData } from '../services/tankPerformanceService';
import { generateTankStatementPdf } from '../utils/generateTankStatementPdf';
import { StockAdjustmentModal } from '../components/tanks/StockAdjustmentModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  calcUtilization,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLitres,
  formatNumber,
  utilizationColor,
} from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export function TankDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tank, setTank] = useState<Tank | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [performance, setPerformance] = useState<TankPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [perfLoading, setPerfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'ledger' | 'profitability'>(
    tabFromUrl === 'profitability' ? 'profitability' : 'ledger'
  );

  useEffect(() => {
    if (tabFromUrl === 'profitability' || tabFromUrl === 'ledger') {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const loadTankData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [tankData, txList] = await Promise.all([
        getTankById(id),
        getTankTransactions(id),
      ]);
      setTank(tankData);
      setTransactions(txList);
    } catch (err: any) {
      console.error('Error loading tank details:', err);
      setError(err?.message || 'Tank not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPerformance = useCallback(async () => {
    if (!id) return;
    try {
      setPerfLoading(true);
      const perf = await getTankPerformance(id);
      setPerformance(perf);
    } catch (err) {
      console.error('Error loading tank performance:', err);
    } finally {
      setPerfLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTankData();
    loadPerformance();
  }, [loadTankData, loadPerformance]);

  const handleToggleMaintenance = async () => {
    if (!tank) return;
    setStatusLoading(true);
    try {
      const nextStatus = tank.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
      await updateTankStatus(tank.id, nextStatus, user?.id);
      await loadTankData();
    } catch (err: any) {
      alert(`Failed to update status: ${err?.message}`);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading && !tank) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <LoadingSkeleton count={4} type="card" />
        <LoadingSkeleton count={1} type="row" />
      </div>
    );
  }

  if (error || !tank) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <EmptyState
          icon={Fuel}
          title="Storage Vessel Not Found"
          description={error || "The requested storage vessel does not exist."}
          action={{
            label: 'Back to Vessels',
            onClick: () => navigate('/tanks'),
          }}
        />
      </div>
    );
  }

  const current = Number(tank.current_stock_litres);
  const capacity = Number(tank.capacity_litres);
  const minLevel = Number(tank.minimum_level_litres);
  const maxLevel = Number(tank.maximum_level_litres);
  const pct = calcUtilization(current, capacity);
  const ullage = Math.max(0, capacity - current);
  const price = tank.product?.current_price || 0;
  const bookValue = current * price;
  const isBelowMin = current <= minLevel;

  const productBadgeColor =
    tank.product?.code === 'AGO'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : tank.product?.code === 'PMS'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200';

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/tanks"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Storage Vessels</span>
        </Link>
        <span className="text-xs text-gray-400 font-mono">ID: {tank.id}</span>
      </div>

      {/* Main Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Fuel className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-gray-900 font-mono">{tank.code}</h1>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${productBadgeColor}`}>
                {tank.product?.name} ({tank.product?.code})
              </span>
              <StatusBadge status={tank.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{tank.name} · Bulk Fuel Storage Vessel</p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => performance && generateTankStatementPdf(performance)}
            disabled={!performance || perfLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors shadow-sm disabled:opacity-40"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{perfLoading ? 'Loading...' : 'Download Statement'}</span>
          </button>

          <button
            onClick={handleToggleMaintenance}
            disabled={statusLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Wrench className="w-3.5 h-3.5 text-gray-500" />
            <span>{tank.status === 'ACTIVE' ? 'Set Maintenance' : 'Set Active'}</span>
          </button>

          <button
            onClick={() => setIsAdjustOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Adjust Physical Stock</span>
          </button>
        </div>
      </div>

      {/* Low stock alert banner */}
      {isBelowMin && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Minimum Safety Level Triggered</p>
            <p className="text-amber-700 text-[11px] mt-0.5">
              Current volume ({formatLitres(current)}) is at or below the minimum buffer of {formatLitres(minLevel)}. Schedule inbound fuel replenishment.
            </p>
          </div>
        </div>
      )}

      {/* Tank Schematic & Specs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Schematic Cylinder Gauge */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Vessel Fill Schematic</p>

          <div className="relative w-36 h-64 rounded-3xl border-4 border-gray-300 bg-gray-50 overflow-hidden shadow-inner flex flex-col justify-end p-1">
            {/* Max level marker line */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 z-10"
              style={{ bottom: `${(maxLevel / capacity) * 100}%` }}
              title={`Max Threshold: ${formatLitres(maxLevel)}`}
            />

            {/* Min level marker line */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500 z-10"
              style={{ bottom: `${(minLevel / capacity) * 100}%` }}
              title={`Min Threshold: ${formatLitres(minLevel)}`}
            />

            {/* Fuel liquid fill */}
            <div
              className="w-full rounded-2xl transition-all duration-1000 bg-gradient-to-t from-amber-500 to-amber-400 relative overflow-hidden"
              style={{ height: `${pct}%` }}
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
            </div>

            {/* Percentage watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-800/80 drop-shadow-sm font-mono">
                {pct}%
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-amber-500" />
              Min Level
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-red-400" />
              Max Safe Fill
            </span>
          </div>
        </div>

        {/* Right: Technical Specifications */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Storage Specifications & Financial Valuation
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current Volume</span>
              <span className="text-lg font-extrabold text-gray-900 font-mono block mt-1">{formatLitres(current)}</span>
              <span className={`text-[10px] font-semibold mt-0.5 block ${utilizationColor(pct)}`}>
                {pct}% utilized
              </span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Capacity</span>
              <span className="text-lg font-extrabold text-gray-900 font-mono block mt-1">{formatLitres(capacity)}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Physical design volume</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Available Ullage</span>
              <span className="text-lg font-extrabold text-emerald-700 font-mono block mt-1">{formatLitres(ullage)}</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Space remaining to receive</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Min Safety Level</span>
              <span className="text-lg font-extrabold text-amber-700 font-mono block mt-1">{formatLitres(minLevel)}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Reorder trigger threshold</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current Price / Litre</span>
              <span className="text-lg font-extrabold text-gray-900 font-mono block mt-1">KES {price}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Per {tank.product?.unit || 'L'}</span>
            </div>

            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Total Book Value</span>
              <span className="text-lg font-extrabold text-purple-900 font-mono block mt-1">{formatCurrency(bookValue)}</span>
              <span className="text-[10px] text-purple-600 block mt-0.5">Inventory asset value</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Commissioned: {new Date(tank.created_at).toLocaleDateString('en-KE')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Calibration & dip certified
            </span>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveTab('ledger');
            setSearchParams({ tab: 'ledger' });
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'ledger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Stock Ledger
        </button>
        <button
          onClick={() => {
            setActiveTab('profitability');
            setSearchParams({ tab: 'profitability' });
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'profitability' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Profitability & Clients
        </button>
      </div>

      {/* Tab: Stock Ledger */}
      {activeTab === 'ledger' && (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Historical Stock Movement Ledger
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Every litre received, dispatched, or adjusted on {tank.code}
            </p>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {transactions.length} record{transactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Clock}
              title="No transactions recorded yet"
              description="Any receiving, dispatch, or stock adjustment for this tank will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Timestamp</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Type</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Quantity Change</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Previous Stock</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">New Balance</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Reference / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => {
                  const qty = Number(tx.quantity_litres);
                  const isPositive = qty > 0;
                  const isNegative = qty < 0;

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500 font-mono whitespace-nowrap">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            tx.transaction_type === 'RECEIVING'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tx.transaction_type === 'DISPATCH'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold font-mono ${
                          tx.transaction_type === 'RECEIVING' || (tx.transaction_type === 'ADJUSTMENT' && isPositive)
                            ? 'text-emerald-600'
                            : tx.transaction_type === 'DISPATCH' || (tx.transaction_type === 'ADJUSTMENT' && isNegative)
                            ? 'text-red-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {isPositive ? '+' : ''}{formatNumber(qty)} L
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 font-mono">
                        {formatLitres(tx.previous_balance)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900 font-mono">
                        {formatLitres(tx.new_balance)}
                      </td>
                      <td className="px-5 py-3 text-gray-700 max-w-xs truncate" title={tx.notes || ''}>
                        {tx.notes || tx.reference_type || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Tab: Profitability & Clients */}
      {activeTab === 'profitability' && (
        <div className="space-y-5">
          {perfLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center">
              <div className="flex items-center gap-3 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Computing profit analytics…
              </div>
            </div>
          ) : performance ? (
            <>
              {/* Profit KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: formatCurrency(performance.total_revenue), sub: `${formatLitres(performance.total_litres_dispatched)} sold`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: DollarSign },
                  { label: 'Gross Profit', value: formatCurrency(performance.gross_profit), sub: performance.gross_profit >= 0 ? 'Net positive margin' : 'Below cost basis', color: performance.gross_profit >= 0 ? 'text-blue-700' : 'text-red-700', bg: performance.gross_profit >= 0 ? 'bg-blue-50' : 'bg-red-50', border: performance.gross_profit >= 0 ? 'border-blue-100' : 'border-red-100', icon: TrendingUp },
                  { label: 'Avg Cost / Litre', value: performance.currency === 'USD' ? `$${performance.avg_cost_per_litre.toFixed(3)}/L` : `KES ${performance.avg_cost_per_litre.toFixed(2)}/L`, sub: performance.currency === 'USD' ? 'Transit — weighted USD cost' : 'Weighted avg purchase cost', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', icon: ArrowDownToLine },
                  { label: 'Gross Margin', value: `${performance.gross_margin_pct.toFixed(1)}%`, sub: performance.gross_margin_pct >= 15 ? 'Healthy margin ✓' : performance.gross_margin_pct >= 5 ? 'Moderate margin' : 'Low margin — review pricing', color: performance.gross_margin_pct >= 15 ? 'text-emerald-700' : performance.gross_margin_pct >= 5 ? 'text-amber-700' : 'text-red-700', bg: performance.gross_margin_pct >= 15 ? 'bg-emerald-50' : performance.gross_margin_pct >= 5 ? 'bg-amber-50' : 'bg-red-50', border: performance.gross_margin_pct >= 15 ? 'border-emerald-100' : performance.gross_margin_pct >= 5 ? 'border-amber-100' : 'border-red-100', icon: TrendingUp },
                ].map((kpi) => (
                  <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
                    </div>
                    <p className={`text-xl font-extrabold font-mono ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Client Dispatch Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Client Dispatch Revenue Breakdown
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      All customers served from {tank.code} — revenue and profit per dispatch
                    </p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">
                    {performance.clientDispatches.length} dispatch{performance.clientDispatches.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                {performance.clientDispatches.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      icon={Users}
                      title="No dispatches from this vessel yet"
                      description="Customer dispatches loaded from this vessel will appear here with full revenue and profit tracking."
                    />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Customer</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Litres</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Cost/L</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Sell/L</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Revenue</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">COGS</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Gross Profit</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Margin</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {performance.clientDispatches.map((d) => (
                            <tr key={d.dispatch_id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(d.date)}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{d.customer_name}</td>
                              <td className="px-4 py-3 text-right font-mono text-gray-700">{formatLitres(d.litres)}</td>
                              <td className="px-4 py-3 text-right font-mono text-amber-700">KES {d.cost_price_per_litre.toFixed(0)}</td>
                              <td className="px-4 py-3 text-right font-mono text-blue-700">KES {d.sell_price_per_litre.toFixed(0)}</td>
                              <td className="px-4 py-3 text-right font-bold font-mono text-gray-900">{formatCurrency(d.revenue)}</td>
                              <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrency(d.cogs)}</td>
                              <td className={`px-4 py-3 text-right font-bold font-mono ${d.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {d.gross_profit >= 0 ? '+' : ''}{formatCurrency(d.gross_profit)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  d.margin_pct >= 15 ? 'bg-emerald-100 text-emerald-800' :
                                  d.margin_pct >= 5 ? 'bg-amber-100 text-amber-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {d.margin_pct.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                                {d.invoice_number || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {/* Totals Footer */}
                        <tfoot>
                          <tr className="bg-[#1e3a5f] text-white">
                            <td colSpan={2} className="px-4 py-3 font-bold text-xs">TOTALS</td>
                            <td className="px-4 py-3 text-right font-bold font-mono text-xs">
                              {formatLitres(performance.total_litres_dispatched)}
                            </td>
                            <td colSpan={2} />
                            <td className="px-4 py-3 text-right font-bold font-mono text-xs">
                              {formatCurrency(performance.total_revenue)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-blue-200">
                              {formatCurrency(performance.total_cogs)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold font-mono text-xs text-amber-300">
                              +{formatCurrency(performance.gross_profit)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                                {performance.gross_margin_pct.toFixed(1)}%
                              </span>
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Receiving Cost History */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                    Vessel Intake &amp; Receiving Cost History
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fuel batches received into {tank.code} — forms the cost basis for margin calculation
                  </p>
                </div>
                {performance.receivingHistory.length === 0 ? (
                  <div className="py-10">
                    <EmptyState
                      icon={ArrowDownToLine}
                      title="No receiving records"
                      description="Vessel intake records will appear here once fuel is received into this storage vessel."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Date</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Supplier</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Vessel</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Market</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Reference</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Qty (L)</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Cost / L</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Total Cost</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase text-[10px]">Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {performance.receivingHistory.map((r) => {
                          const isUSD = r.currency === 'USD';
                          const costPerL = isUSD
                            ? `$${r.purchase_price.toFixed(3)}/L`
                            : `KES ${r.purchase_price.toFixed(2)}/L`;
                          const totalAmt = r.total_cost || r.quantity_litres * r.purchase_price;
                          const totalFormatted = isUSD
                            ? `$${totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : formatCurrency(totalAmt);
                          return (
                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(r.date)}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{r.supplier_name}</td>
                              <td className="px-4 py-3 font-mono text-blue-700 font-semibold">{r.vessel_name || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                  r.market_type === 'TRANSIT'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {r.market_type === 'TRANSIT' ? 'TRANSIT (USD)' : 'LOCAL (KES)'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-600">{r.reference_number}</td>
                              <td className="px-4 py-3 text-right font-mono text-gray-700">{formatLitres(r.quantity_litres)}</td>
                              <td className={`px-4 py-3 text-right font-bold font-mono ${isUSD ? 'text-purple-700' : 'text-amber-700'}`}>{costPerL}</td>
                              <td className="px-4 py-3 text-right font-bold font-mono text-gray-900">{totalFormatted}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  r.quality_status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {r.quality_status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        tank={tank}
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        onSuccess={loadTankData}
      />
    </div>
  );
}
