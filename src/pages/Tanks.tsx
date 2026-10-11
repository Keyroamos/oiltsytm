import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Fuel,
  Activity,
  RefreshCw,
  Search,
  DollarSign,
  Plus,
  TrendingUp,
  FileText,
  ArrowUpDown,
  ExternalLink,
  Award,
} from 'lucide-react';
import type { Tank, Product } from '../types';
import { getTanks, getProducts } from '../services/tankService';
import {
  getAllTanksSummary,
  getTankPerformance,
  type TankSummaryRow,
} from '../services/tankPerformanceService';
import { generateTankStatementPdf } from '../utils/generateTankStatementPdf';
import { TankCard } from '../components/tanks/TankCard';
import { AddTankModal } from '../components/tanks/AddTankModal';
import { StockAdjustmentModal } from '../components/tanks/StockAdjustmentModal';
import { ProductPriceModal } from '../components/tanks/ProductPriceModal';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatLitres, formatCurrency } from '../utils/formatters';

export function Tanks() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Profitability summaries state
  const [tankSummaries, setTankSummaries] = useState<TankSummaryRow[]>([]);
  const [perfLoading, setPerfLoading] = useState(true);
  const [downloadingTankId, setDownloadingTankId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'margin' | 'revenue' | 'profit' | 'litres' | 'code'>('margin');
  const [sortAsc, setSortAsc] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [isAddTankOpen, setIsAddTankOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [selectedTankForAdjust, setSelectedTankForAdjust] = useState<Tank | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tankList, prodList] = await Promise.all([
        getTanks(),
        getProducts(),
      ]);
      setTanks(tankList);
      setProducts(prodList);
    } catch (err) {
      console.error('Failed to load tanks & stock data:', err);
    } finally {
      setLoading(false);
    }

    try {
      setPerfLoading(true);
      const summaries = await getAllTanksSummary();
      setTankSummaries(summaries);
    } catch (err) {
      console.error('Failed to load tank performance summaries:', err);
    } finally {
      setPerfLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadStatement = async (tankId: string) => {
    try {
      setDownloadingTankId(tankId);
      const perf = await getTankPerformance(tankId);
      generateTankStatementPdf(perf);
    } catch (err: any) {
      console.error('Failed to download tank statement:', err);
      alert(`Failed to download statement: ${err?.message || err}`);
    } finally {
      setDownloadingTankId(null);
    }
  };

  // Product info
  const pmsProduct = products.find((p) => p.code === 'PMS');
  const agoProduct = products.find((p) => p.code === 'AGO');
  const pmsPrice = pmsProduct ? Number(pmsProduct.current_price) : 0;
  const agoPrice = agoProduct ? Number(agoProduct.current_price) : 0;

  // Storage Tank Stock calculations
  const pmsTanks = tanks.filter((t) => t.product?.code === 'PMS');
  const agoTanks = tanks.filter((t) => t.product?.code === 'AGO');

  const pmsStock = pmsTanks.reduce((s, t) => s + Number(t.current_stock_litres || 0), 0);
  const pmsCapacity = pmsTanks.reduce((s, t) => s + Number(t.capacity_litres || 0), 0);
  const pmsValue = pmsStock * pmsPrice;

  const agoStock = agoTanks.reduce((s, t) => s + Number(t.current_stock_litres || 0), 0);
  const agoCapacity = agoTanks.reduce((s, t) => s + Number(t.capacity_litres || 0), 0);
  const agoValue = agoStock * agoPrice;

  const totalStock = pmsStock + agoStock;
  const totalCapacity = pmsCapacity + agoCapacity;
  const totalStockValue = pmsValue + agoValue;
  const avgUtilization = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0;
  const lowStockCount = tanks.filter((t) => Number(t.current_stock_litres) <= Number(t.minimum_level_litres)).length;

  // Filtered tanks
  const filteredTanks = tanks.filter((t) => {
    const matchesSearch =
      searchQuery === '' ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = selectedProduct === 'ALL' || t.product?.code === selectedProduct;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    return matchesSearch && matchesProduct && matchesStatus;
  });

  // Filter and sort comparison rows
  const filteredSummaries = tankSummaries
    .filter((s) => {
      const matchesSearch =
        searchQuery === '' ||
        s.tank_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tank_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProduct = selectedProduct === 'ALL' || s.product_code === selectedProduct;
      return matchesSearch && matchesProduct;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortField === 'margin') comp = a.gross_margin_pct - b.gross_margin_pct;
      else if (sortField === 'revenue') comp = a.total_revenue - b.total_revenue;
      else if (sortField === 'profit') comp = a.gross_profit - b.gross_profit;
      else if (sortField === 'litres') comp = a.total_litres_dispatched - b.total_litres_dispatched;
      else if (sortField === 'code') comp = a.tank_code.localeCompare(b.tank_code);
      return sortAsc ? comp : -comp;
    });

  const totalDispatchedLitres = tankSummaries.reduce((sum, s) => sum + s.total_litres_dispatched, 0);
  const totalDispatchedRevenue = tankSummaries.reduce((sum, s) => sum + s.total_revenue, 0);
  const totalDispatchedCogs = tankSummaries.reduce((sum, s) => sum + s.total_cogs, 0);
  const totalDispatchedProfit = totalDispatchedRevenue - totalDispatchedCogs;
  const overallMarginPct =
    totalDispatchedRevenue > 0 ? (totalDispatchedProfit / totalDispatchedRevenue) * 100 : 0;

  const topMarginTank = [...tankSummaries]
    .filter((s) => s.total_revenue > 0)
    .sort((a, b) => b.gross_margin_pct - a.gross_margin_pct)[0];

  const handleAdjustStock = (tank: Tank) => {
    setSelectedTankForAdjust(tank);
    setIsAdjustOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-blue-600" />
            Storage Vessels &amp; Fuel Stock
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Bulk physical storage vessels for PMS (Super Petrol) &amp; AGO (Automotive Gas Oil) inventory
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddTankOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Storage Vessel</span>
          </button>
          <button
            onClick={() => setIsPriceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors shadow-sm"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Fuel Prices</span>
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="PMS Stock (Petrol)"
          value={formatLitres(pmsStock)}
          subtitle={`${pmsTanks.length} vessels · ${formatCurrency(pmsValue)}`}
          icon={Fuel}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="AGO Stock (Diesel)"
          value={formatLitres(agoStock)}
          subtitle={`${agoTanks.length} vessels · ${formatCurrency(agoValue)}`}
          icon={Fuel}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <KPICard
          title="Utilization"
          value={`${avgUtilization}%`}
          subtitle={`Capacity: ${formatLitres(totalCapacity)}`}
          icon={Activity}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          alert={lowStockCount > 0}
        />
        <KPICard
          title="Total Stock Value"
          value={formatCurrency(totalStockValue)}
          subtitle={`PMS: @${pmsPrice}/L · AGO: @${agoPrice}/L`}
          icon={DollarSign}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vessel code, name (e.g. D-01, P-01)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedProduct('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedProduct === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Vessels ({tanks.length})
            </button>
            <button
              onClick={() => setSelectedProduct('PMS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedProduct === 'PMS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              PMS Petrol Vessels ({pmsTanks.length})
            </button>
            <button
              onClick={() => setSelectedProduct('AGO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedProduct === 'AGO' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AGO Diesel Vessels ({agoTanks.length})
            </button>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Storage Vessels Grid */}
      <div>
        {loading && tanks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <LoadingSkeleton count={3} type="card" />
          </div>
        ) : filteredTanks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm">
            <EmptyState
              icon={Fuel}
              title="No Storage Vessels Found"
              description={
                searchQuery || selectedProduct !== 'ALL' || selectedStatus !== 'ALL'
                  ? 'No storage vessels match your selected filter criteria.'
                  : 'No PMS or AGO storage vessels registered yet. Click below to add your first storage vessel.'
              }
              action={{
                label: 'Add Storage Vessel',
                onClick: () => setIsAddTankOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTanks.map((tank) => (
              <TankCard
                key={tank.id}
                tank={tank}
                onAdjustStock={handleAdjustStock}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Vessel Profitability & Sales Comparison Section ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Vessel Profitability &amp; Sells Comparison
                </h3>
                <p className="text-xs text-gray-500">
                  Compare profit margins, sales volume, COGS, and revenue across bulk storage vessels
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="margin">Margin % (Highest)</option>
              <option value="profit">Gross Profit</option>
              <option value="revenue">Total Revenue</option>
              <option value="litres">Litres Sold</option>
              <option value="code">Vessel Code</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              title={sortAsc ? 'Ascending' : 'Descending'}
              className="px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs text-gray-600 flex items-center gap-1 font-semibold"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortAsc ? 'Asc' : 'Desc'}</span>
            </button>
          </div>
        </div>

        {/* Aggregated Quick Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 bg-gray-50/70 border-b border-gray-100">
          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Sells Revenue</span>
            <p className="text-lg sm:text-xl font-extrabold text-gray-900 font-mono mt-1">
              {formatCurrency(totalDispatchedRevenue)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {formatLitres(totalDispatchedLitres)} dispatched total
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Gross Profit</span>
            <p className={`text-lg sm:text-xl font-extrabold font-mono mt-1 ${totalDispatchedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalDispatchedProfit >= 0 ? '+' : ''}{formatCurrency(totalDispatchedProfit)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              COGS: {formatCurrency(totalDispatchedCogs)}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Average Margin</span>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-700 font-mono mt-1">
              {overallMarginPct.toFixed(1)}%
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">Weighted gross margin</p>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Top Margin Vessel</span>
            <p className="text-lg sm:text-xl font-extrabold text-blue-600 font-mono mt-1 flex items-center gap-1.5">
              {topMarginTank ? (
                <>
                  <span>{topMarginTank.tank_code}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    {topMarginTank.gross_margin_pct.toFixed(1)}%
                  </span>
                </>
              ) : (
                '—'
              )}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {topMarginTank ? `${topMarginTank.tank_name} (${topMarginTank.product_code})` : 'No sales recorded yet'}
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        {perfLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500 text-xs">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing profitability metrics for all storage vessels…</span>
            </div>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-500">
            No vessels found matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                  <th className="px-5 py-3 text-left">Vessel</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Litres Sold</th>
                  <th className="px-4 py-3 text-right">Avg Cost / L</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">COGS</th>
                  <th className="px-4 py-3 text-right">Gross Profit</th>
                  <th className="px-4 py-3 text-center">Margin %</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSummaries.map((s) => {
                  const isTopMargin = topMarginTank && topMarginTank.tank_id === s.tank_id && s.total_revenue > 0;
                  const isPMS = s.product_code === 'PMS';

                  return (
                    <tr
                      key={s.tank_id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isTopMargin ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Link
                            to={`/tanks/${s.tank_id}`}
                            className="font-mono font-bold text-gray-900 hover:text-blue-600 transition-colors underline decoration-dotted"
                          >
                            {s.tank_code}
                          </Link>
                          {isTopMargin && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Award className="w-2.5 h-2.5" />
                              Top Margin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{s.tank_name}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPMS
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {s.product_code}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-gray-700">
                        {formatLitres(s.current_stock_litres)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-gray-900">
                        {formatLitres(s.total_litres_dispatched)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-gray-600">
                        {s.currency === 'USD' ? `$${s.avg_cost_per_litre.toFixed(3)}` : `KES ${s.avg_cost_per_litre.toFixed(2)}`}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(s.total_revenue)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-gray-500">
                        {formatCurrency(s.total_cogs)}
                      </td>

                      <td
                        className={`px-4 py-3.5 text-right font-mono font-bold ${
                          s.gross_profit >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {s.gross_profit >= 0 ? '+' : ''}{formatCurrency(s.gross_profit)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {s.total_revenue === 0 ? (
                          <span className="text-[10px] text-gray-400 font-medium">No sales</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.gross_margin_pct >= 15
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.gross_margin_pct >= 5
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {s.gross_margin_pct.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/tanks/${s.tank_id}?tab=profitability`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[11px] font-semibold text-gray-700 transition-colors shadow-xs"
                            title="View customer dispatches, revenue and profit breakdown"
                          >
                            <span>Clients &amp; Details</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </Link>

                          <button
                            onClick={() => handleDownloadStatement(s.tank_id)}
                            disabled={downloadingTankId === s.tank_id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-semibold text-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                            title="Generate and download printable PDF statement"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>{downloadingTankId === s.tank_id ? 'PDF...' : 'Statement'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals Row */}
              <tfoot className="bg-gray-50/90 border-t-2 border-gray-200 font-semibold text-gray-900">
                <tr>
                  <td className="px-5 py-3 text-left font-bold" colSpan={3}>
                    TOTALS ({filteredSummaries.length} VESSELS)
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {formatLitres(totalDispatchedLitres)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-[10px]">
                    —
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                    {formatCurrency(totalDispatchedRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {formatCurrency(totalDispatchedCogs)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${totalDispatchedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {totalDispatchedProfit >= 0 ? '+' : ''}{formatCurrency(totalDispatchedProfit)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {overallMarginPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-[10px] text-gray-400">
                    STATEMENT READY
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTankModal
        products={products}
        isOpen={isAddTankOpen}
        onClose={() => setIsAddTankOpen(false)}
        onSuccess={loadData}
      />

      <ProductPriceModal
        products={products}
        isOpen={isPriceOpen}
        onClose={() => setIsPriceOpen(false)}
        onSuccess={loadData}
      />

      <StockAdjustmentModal
        tank={selectedTankForAdjust}
        isOpen={isAdjustOpen}
        onClose={() => {
          setIsAdjustOpen(false);
          setSelectedTankForAdjust(null);
        }}
        onSuccess={loadData}
      />
    </div>
  );
}

// Re-export TankDetails for routing
export { TankDetails } from './TankDetails';
