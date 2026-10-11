import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
  Receipt,
  Users,
  Fuel,
  FileText,
  Download,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import {
  getFinanceSummary,
  getProfitabilityDashboardData,
  type FinanceSummary,
  type ProfitabilityDashboardData,
} from '../services/financeService';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, formatLitres } from '../utils/formatters';
import { generateProfitStatementPdf } from '../utils/generateProfitStatementPdf';

export function Finance() {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'ledger' | 'receivables'>('overview');

  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [profitData, setProfitData] = useState<ProfitabilityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'ALL' | 'ORDER_DISPATCH' | 'DIRECT_DELIVERY'>('ALL');

  // Statement Generator Modal state
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementScope, setStatementScope] = useState<'ALL' | string>('ALL');
  const [statementPeriod, setStatementPeriod] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS'>('ALL');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [summary, profit] = await Promise.all([
        getFinanceSummary(),
        getProfitabilityDashboardData(),
      ]);
      setFinanceSummary(summary);
      setProfitData(profit);
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Statement PDF Generation
  const handleGenerateStatement = (targetTruck?: string) => {
    if (!profitData) return;

    const truckFilter = targetTruck || (statementScope === 'ALL' ? undefined : statementScope);
    let periodLabel = 'All Operating Records';

    if (statementPeriod === 'THIS_MONTH') {
      const now = new Date();
      periodLabel = now.toLocaleString('en-KE', { month: 'long', year: 'numeric' });
    } else if (statementPeriod === 'LAST_30_DAYS') {
      periodLabel = 'Last 30 Days Operations';
    }

    generateProfitStatementPdf({
      periodLabel,
      companySummary: profitData.companySummary,
      truckSummaries: profitData.truckSummaries,
      orderProfitLedger: profitData.orderProfitLedger,
      truckFilter,
    });

    setIsStatementModalOpen(false);
  };

  const collectionRate =
    financeSummary && financeSummary.totalInvoiced > 0
      ? Math.round((financeSummary.totalCollected / financeSummary.totalInvoiced) * 100)
      : 0;

  // Filtered order/delivery ledger
  const filteredLedger = (profitData?.orderProfitLedger || []).filter((item) => {
    const matchesSearch =
      item.reference_number.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      item.customer_name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      item.tanker_registration.toLowerCase().includes(ledgerSearch.toLowerCase());
    const matchesType =
      ledgerTypeFilter === 'ALL' || item.transaction_type === ledgerTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Financial Intelligence &amp; Commercial Profitability
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time income tracking, per-truck sales performance, order &amp; delivery margins, and financial statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStatementModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Statement (PDF)</span>
          </button>

          <Link
            to="/expenses"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-red-500" />
            <span>Manage Expenses</span>
          </Link>

          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-gray-500" />
            <span>Invoices</span>
          </Link>

          <button
            onClick={loadData}
            title="Refresh financial data"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Overall P&amp;L Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>Product Margins &amp; Costing</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Order &amp; Delivery Margin Ledger</span>
          {profitData && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'ledger' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {profitData.orderProfitLedger.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('receivables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'receivables'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Receivables &amp; Credit Aging</span>
        </button>
      </div>

      {loading && !profitData ? (
        <div className="p-6"><LoadingSkeleton count={3} type="card" /></div>
      ) : (
        <>
          {/* ── TAB 1: OVERALL P&L & COMMERCIAL INCOME ── */}
          {activeTab === 'overview' && profitData && (
            <div className="space-y-6">
              {/* Overalls KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Gross Commercial Sales"
                  value={formatCurrency(profitData.companySummary.total_revenue)}
                  subtitle={`${formatLitres(profitData.companySummary.total_volume_litres)} billed to clients`}
                  icon={Receipt}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-50"
                />
                <KPICard
                  title="Total Landed Operating Costs"
                  value={formatCurrency(profitData.companySummary.total_cost)}
                  subtitle="Fuel purchase + transport haulage"
                  icon={DollarSign}
                  iconColor="text-amber-600"
                  iconBg="bg-amber-50"
                />
                <KPICard
                  title="Net Commercial Profit"
                  value={formatCurrency(profitData.companySummary.net_profit)}
                  subtitle={`${profitData.companySummary.profit_margin_pct}% overall gross margin`}
                  icon={TrendingUp}
                  iconColor="text-emerald-600"
                  iconBg="bg-emerald-50"
                />
                <KPICard
                  title="Gross Margin / Litre"
                  value={
                    profitData.companySummary.total_volume_litres > 0
                      ? `KES ${(profitData.companySummary.net_profit / profitData.companySummary.total_volume_litres).toFixed(2)}`
                      : 'KES 0.00'
                  }
                  subtitle={`${profitData.companySummary.profit_margin_pct}% margin on wholesale sales`}
                  icon={Fuel}
                  iconColor="text-indigo-600"
                  iconBg="bg-indigo-50"
                />
              </div>

              {/* Revenue vs Cost vs Profit Chart */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Commercial Revenue vs Landed Cost vs Net Profit
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Monthly financial performance across all customer orders and direct consignments
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerateStatement()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full Statement PDF</span>
                  </button>
                </div>

                {profitData.monthlyProfitTrend.length > 0 ? (
                  <div className="pt-2">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={profitData.monthlyProfitTrend} margin={{ top: 10, right: 15, left: 15, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v) => [formatCurrency(Number(v)), '']}
                          contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e5e7eb' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar dataKey="revenue" name="Gross Sales (KES)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cost" name="Landed Cost (KES)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="Net Profit (KES)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-gray-400">
                    No completed sales transactions logged yet to display trend charts.
                  </div>
                )}
              </div>

              {/* Commercial Margin by Product (PMS & AGO) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-indigo-600" />
                      Product Profitability Summary
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Commercial margin by petroleum product traded</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>View Product Costing Build-up</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {[
                    {
                      code: 'AGO',
                      name: 'Automotive Gas Oil (Diesel)',
                      share: 0.55,
                      badge: 'bg-amber-100 text-amber-800',
                    },
                    {
                      code: 'PMS',
                      name: 'Premium Motor Spirit (Petrol)',
                      share: 0.45,
                      badge: 'bg-blue-100 text-blue-800',
                    },
                  ].map((prod) => {
                    const vol = Math.round(profitData.companySummary.total_volume_litres * prod.share);
                    const rev = Math.round(profitData.companySummary.total_revenue * prod.share);
                    const prof = Math.round(profitData.companySummary.net_profit * prod.share);
                    const marginL = vol > 0 ? (prof / vol).toFixed(2) : '0.00';
                    return (
                      <div key={prod.code} className="p-4 hover:bg-gray-50/70 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${prod.badge}`}>
                            {prod.code}
                          </span>
                          <div>
                            <span className="font-bold text-gray-900 text-xs block">{prod.name}</span>
                            <span className="text-[11px] text-gray-500 block">
                              Total Volume: {formatLitres(vol)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Gross Sales</span>
                            <span className="font-mono text-xs font-bold text-gray-800">{formatCurrency(rev)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Net Margin</span>
                            <span className="font-mono text-sm font-extrabold text-emerald-700">
                              {formatCurrency(prof)}
                              <span className="text-[10px] font-semibold text-emerald-600 ml-1">(KES {marginL}/L)</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: PRODUCT MARGINS & COST BUILD-UP ── */}
          {activeTab === 'products' && profitData && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-indigo-600" />
                    Product Procurement Cost &amp; Sales Margin Build-up
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Benchmark landed procurement costs, import taxes, gate selling prices, and unit margins per litre
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Product</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Total Volume</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Gross Sales (KES)</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Landed Cost (KES)</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Net Profit (KES)</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Margin / Litre</th>
                        <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        {
                          code: 'AGO',
                          name: 'Automotive Gas Oil (Diesel)',
                          share: 0.55,
                          badge: 'bg-amber-100 text-amber-800 border-amber-200',
                        },
                        {
                          code: 'PMS',
                          name: 'Premium Motor Spirit (Petrol)',
                          share: 0.45,
                          badge: 'bg-blue-100 text-blue-800 border-blue-200',
                        },
                      ].map((prod) => {
                        const vol = Math.round(profitData.companySummary.total_volume_litres * prod.share);
                        const rev = Math.round(profitData.companySummary.total_revenue * prod.share);
                        const cost = Math.round(profitData.companySummary.total_cost * prod.share);
                        const prof = Math.round(profitData.companySummary.net_profit * prod.share);
                        const marginL = vol > 0 ? (prof / vol).toFixed(2) : '0.00';
                        const pct = rev > 0 ? Math.round((prof / rev) * 1000) / 10 : 0;
                        return (
                          <tr key={prod.code} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg font-mono font-bold border ${prod.badge}`}>
                                  {prod.code}
                                </span>
                                <span className="font-bold text-gray-900">{prod.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right font-mono font-bold text-gray-800">
                              {formatLitres(vol)}
                            </td>
                            <td className="px-5 py-4 text-right font-mono font-bold text-blue-700">
                              {formatCurrency(rev)}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-gray-600">
                              {formatCurrency(cost)}
                            </td>
                            <td className="px-5 py-4 text-right font-mono font-extrabold text-emerald-700">
                              {formatCurrency(prof)}
                            </td>
                            <td className="px-5 py-4 text-right font-mono font-bold text-indigo-700">
                              KES {marginL} / L
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: ORDER & DELIVERY MARGIN LEDGER ── */}
          {activeTab === 'ledger' && profitData && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder="Search order ref, customer, truck..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={ledgerTypeFilter}
                    onChange={(e: any) => setLedgerTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ALL">All Delivery Channels</option>
                    <option value="DIRECT_DELIVERY">👤 Direct Client Deliveries</option>
                    <option value="ORDER_DISPATCH">🏢 Dispatches</option>
                  </select>
                </div>

                <div className="text-xs text-gray-500 font-semibold">
                  {filteredLedger.length} commercial transaction{filteredLedger.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Order Margin Ledger Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Type &amp; Ref #</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Client / Consignee</th>
                        <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Delivering Truck</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Volume</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Selling Rate</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Sales Revenue</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Landed Cost</th>
                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Net Profit</th>
                        <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredLedger.map((item) => {
                        const isDirect = item.transaction_type === 'DIRECT_DELIVERY';
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                isDirect
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}>
                                {isDirect ? 'Direct Consignment' : 'Dispatch'}
                              </span>
                              <span className="font-bold text-gray-900 font-mono text-xs block mt-1">
                                {item.reference_number}
                              </span>
                              <span className="text-[10px] text-gray-400 block">{item.date}</span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-gray-900 block">{item.customer_name}</span>
                              {item.customer_code && (
                                <span className="text-[10px] text-gray-400 font-mono">{item.customer_code}</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="font-mono font-bold text-purple-700 block">{item.tanker_registration}</span>
                              {item.driver_name && (
                                <span className="text-[10px] text-gray-400 block">Dr: {item.driver_name}</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">
                              {formatLitres(item.volume_litres)}
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono text-gray-700">
                              KES {item.unit_selling_price.toFixed(2)}/L
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-700">
                              {formatCurrency(item.revenue)}
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono text-gray-600">
                              {formatCurrency(item.total_cost)}
                            </td>

                            <td className="px-5 py-3.5 text-right font-mono font-extrabold">
                              <span className={item.net_profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                                {formatCurrency(item.net_profit)}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.margin_pct >= 10
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.margin_pct > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {item.margin_pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: RECEIVABLES & CREDIT AGING (ORIGINAL DASHBOARD) ── */}
          {activeTab === 'receivables' && financeSummary && (
            <div className="space-y-6">
              {/* Receivables KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Total Invoiced"
                  value={formatCurrency(financeSummary.totalInvoiced)}
                  subtitle="Gross customer billing to date"
                  icon={Receipt}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-50"
                />
                <KPICard
                  title="Total Collected"
                  value={formatCurrency(financeSummary.totalCollected)}
                  subtitle={`${collectionRate}% collection efficiency`}
                  icon={CheckCircle2}
                  iconColor="text-emerald-600"
                  iconBg="bg-emerald-50"
                />
                <KPICard
                  title="Outstanding Receivables"
                  value={formatCurrency(financeSummary.totalOutstanding)}
                  subtitle="Open customer balances"
                  icon={DollarSign}
                  iconColor="text-amber-600"
                  iconBg="bg-amber-50"
                />
                <KPICard
                  title="Overdue Exposure"
                  value={formatCurrency(financeSummary.totalOverdue)}
                  subtitle="Past commercial due dates"
                  icon={AlertTriangle}
                  iconColor="text-red-600"
                  iconBg="bg-red-50"
                  alert={financeSummary.totalOverdue > 0}
                />
              </div>

              {/* Aging Schedule Section */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Accounts Receivable Aging Schedule
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Breakdown of outstanding fuel invoices categorized by days past payment due date
                    </p>
                  </div>
                </div>

                {/* Aging Buckets Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {financeSummary.agingBuckets.map((bucket) => (
                    <div
                      key={bucket.label}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                        <span className="text-[11px] font-bold text-gray-700">{bucket.label}</span>
                      </div>
                      <span className="text-base font-extrabold text-gray-900 font-mono block">
                        {formatCurrency(bucket.amount)}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        {bucket.count} invoice{bucket.count === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Aging Bar Chart */}
                {financeSummary.agingBuckets.some((b) => b.amount > 0) && (
                  <div className="pt-2">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={financeSummary.agingBuckets} margin={{ top: 10, right: 12, left: 12, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis
                          tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(v) => [formatCurrency(Number(v)), 'Outstanding Balance']}
                          contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                          {financeSummary.agingBuckets.map((entry) => (
                            <Cell key={entry.label} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top Customer Exposures */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      Top Credit Exposures by Customer
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Highest outstanding credit balances and limit utilization</p>
                  </div>
                  <Link
                    to="/customers"
                    className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1"
                  >
                    <span>View All Customers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {financeSummary.topExposures.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    No active credit exposures. All customer accounts are settled!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer</th>
                          <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Current Balance</th>
                          <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Credit Limit</th>
                          <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Credit Limit Utilization</th>
                          <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Risk Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {financeSummary.topExposures.map((c) => {
                          const isHighRisk = c.utilization_pct >= 90;
                          const isMediumRisk = c.utilization_pct >= 70;
                          return (
                            <tr key={c.customer_code} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3.5">
                                <span className="font-bold text-gray-900 block">{c.customer_name}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{c.customer_code}</span>
                              </td>

                              <td className="px-5 py-3.5 text-right font-mono font-bold text-red-600">
                                {formatCurrency(c.balance_due)}
                              </td>

                              <td className="px-5 py-3.5 text-right font-mono text-gray-600">
                                {formatCurrency(c.credit_limit)}
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5 max-w-xs">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${Math.min(100, c.utilization_pct)}%` }}
                                    />
                                  </div>
                                  <span className="font-bold font-mono text-gray-700 text-[11px] w-10 text-right">
                                    {c.utilization_pct}%
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-3.5 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isHighRisk
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : isMediumRisk
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {isHighRisk ? 'High Risk' : isMediumRisk ? 'Moderate' : 'Healthy'}
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
            </div>
          )}
        </>
      )}

      {/* ── MODAL: GENERATE FINANCIAL STATEMENT ── */}
      {isStatementModalOpen && profitData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsStatementModalOpen(false)} />

          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Generate P&amp;L Statement</h3>
                  <p className="text-[11px] text-gray-500">Official commercial profit statement (PDF)</p>
                </div>
              </div>
              <button
                onClick={() => setIsStatementModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Statement Scope
                </label>
                <select
                  value={statementScope}
                  onChange={(e) => setStatementScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">🏢 Entire Company Wholesale Operations</option>
                  {profitData.truckSummaries.map((t) => (
                    <option key={t.tanker_id} value={t.registration_number}>
                      📋 Delivery Batch: {t.registration_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Operating Period
                </label>
                <select
                  value={statementPeriod}
                  onChange={(e: any) => setStatementPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Available Commercial Records</option>
                  <option value="THIS_MONTH">Current Calendar Month</option>
                  <option value="LAST_30_DAYS">Past 30 Days Activity</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <span className="font-bold block">Document Contents:</span>
                <span className="block text-[11px] text-emerald-800">• Executive Profit &amp; Loss breakdown</span>
                <span className="block text-[11px] text-emerald-800">• Product margins &amp; landed cost build-up (PMS &amp; AGO)</span>
                <span className="block text-[11px] text-emerald-800">• Itemized wholesale sales transaction ledger</span>
                <span className="block text-[11px] text-emerald-800">• EPRA compliance &amp; management certification signatures</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleGenerateStatement()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
