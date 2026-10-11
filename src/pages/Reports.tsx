import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart2,
  Download,
  RefreshCw,
  TrendingUp,
  Package,
  Activity,
  Shield,
  ArrowUp,
  ArrowDown,
  Minus,
  Globe,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  getStockSummary,
  getStockMovements,
  getSalesRevenueByProduct,
  getSalesRevenueByCustomer,
  getAuditLogs,
  exportToCSV,
  type DashboardStockSummary,
  type StockMovementRow,
  type SalesRevenueByProduct,
  type SalesRevenueByCustomer,
  type AuditLogRow,
} from '../services/reportService';
import {
  getFourQuantitiesSummary,
  type FourQuantitiesRow,
} from '../services/purchaseService';
import { formatCurrency, formatDateTime, formatLitres } from '../utils/formatters';

type ReportTab = 'STOCK' | 'MOVEMENTS' | 'REVENUE' | 'EPRA_MARKET' | 'AUDIT';

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4'];

const PRODUCT_COLORS: Record<string, string> = {
  AGO: '#f59e0b',
  PMS: '#3b82f6',
};

export function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || 'STOCK').toUpperCase() as ReportTab;
  const validTabs: ReportTab[] = ['STOCK', 'MOVEMENTS', 'REVENUE', 'EPRA_MARKET', 'AUDIT'];
  const activeTab: ReportTab = validTabs.includes(tabParam) ? tabParam : 'STOCK';

  const setActiveTab = (tab: ReportTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const [loading, setLoading] = useState(false);

  // Data states
  const [stockData, setStockData] = useState<DashboardStockSummary[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [revByProduct, setRevByProduct] = useState<SalesRevenueByProduct[]>([]);
  const [revByCustomer, setRevByCustomer] = useState<SalesRevenueByCustomer[]>([]);
  const [fourQRows, setFourQRows] = useState<FourQuantitiesRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);

  // Date filter for movements
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      setStockData(await getStockSummary());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      setMovements(await getStockMovements(fromDate, toDate));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const loadRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const [byProd, byCust] = await Promise.all([getSalesRevenueByProduct(), getSalesRevenueByCustomer()]);
      setRevByProduct(byProd);
      setRevByCustomer(byCust);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEpraMarket = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await getFourQuantitiesSummary();
      setFourQRows(summary.rows);
    } catch (err) {
      console.error('Failed to load EPRA market report:', err);
      setFourQRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      setAuditLogs(await getAuditLogs(200));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'STOCK') loadStock();
    else if (activeTab === 'MOVEMENTS') loadMovements();
    else if (activeTab === 'REVENUE') loadRevenue();
    else if (activeTab === 'EPRA_MARKET') loadEpraMarket();
    else if (activeTab === 'AUDIT') loadAudit();
  }, [activeTab, loadStock, loadMovements, loadRevenue, loadEpraMarket, loadAudit]);

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'STOCK', label: 'Stock Position', icon: Package },
    { id: 'MOVEMENTS', label: 'Product Movements', icon: Activity },
    { id: 'REVENUE', label: 'Sales Revenue & Tax', icon: TrendingUp },
    { id: 'EPRA_MARKET', label: 'EPRA Local / Transit', icon: Globe },
    { id: 'AUDIT', label: 'Audit Trail', icon: Shield },
  ];

  const totalInventoryValue = stockData.reduce((s, r) => s + r.value_kes, 0);
  const totalStockLitres = stockData.reduce((s, r) => s + r.current_stock_litres, 0);

  const txTypeIcon = (type: string) => {
    if (type === 'RECEIVING') return <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />;
    if (type === 'DISPATCH') return <ArrowUp className="w-3.5 h-3.5 text-red-500" />;
    return <Minus className="w-3.5 h-3.5 text-blue-500" />;
  };

  const txTypeColor = (type: string) => {
    if (type === 'RECEIVING') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (type === 'DISPATCH') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-600" />
            Reports & Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Operational insights, stock reconciliation, sales analytics, and system audit trail
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'MOVEMENTS') exportToCSV(movements, 'stock_movements');
            else if (activeTab === 'EPRA_MARKET') exportToCSV(fourQRows, 'epra_four_quantities');
            else if (activeTab === 'REVENUE') exportToCSV(revByCustomer, 'sales_by_customer');
            else if (activeTab === 'AUDIT') exportToCSV(auditLogs, 'audit_logs');
            else exportToCSV(stockData, 'stock_inventory');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center overflow-x-auto border-b border-gray-100 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 py-4 px-4 border-b-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
          <div className="ml-auto p-2">
            <button onClick={() => {
              if (activeTab === 'STOCK') loadStock();
              else if (activeTab === 'MOVEMENTS') loadMovements();
              else if (activeTab === 'REVENUE') loadRevenue();
              else if (activeTab === 'EPRA_MARKET') loadEpraMarket();
              else loadAudit();
            }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* ─── STOCK INVENTORY TAB ─────────────────────────────────────────────── */}
          {activeTab === 'STOCK' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                  <span className="text-[10px] font-bold text-purple-600 uppercase block">Total Inventory Value</span>
                  <span className="text-lg font-extrabold text-purple-900 font-mono block mt-1">{formatCurrency(totalInventoryValue)}</span>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase block">Total Stock Volume</span>
                  <span className="text-lg font-extrabold text-blue-900 font-mono block mt-1">{formatLitres(totalStockLitres)}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Active Storage Tanks</span>
                  <span className="text-lg font-extrabold text-gray-900 font-mono block mt-1">{stockData.length} Tanks</span>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Products Stored</span>
                  <span className="text-lg font-extrabold text-amber-900 font-mono block mt-1">
                    {new Set(stockData.map((s) => s.product_code)).size} Types
                  </span>
                </div>
              </div>

              {/* Bar Chart: Stock per Tank */}
              {stockData.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider">Current Stock Level by Tank</h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stockData} margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="tank_code" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}kL`}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(v) => [formatLitres(Number(v)), 'Current Stock']}
                        contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="current_stock_litres" radius={[6, 6, 0, 0]}>
                        {stockData.map((entry) => (
                          <Cell
                            key={entry.tank_code}
                            fill={PRODUCT_COLORS[entry.product_code] || '#6366f1'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Inventory Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Tank</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Product</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Capacity</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Current Stock</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Utilization</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Inventory Value (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stockData.map((s) => (
                      <tr key={s.tank_code} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold font-mono text-gray-900">{s.tank_code}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[s.product_code] || '#6366f1' }} />
                            {s.product_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">{formatLitres(s.capacity_litres)}</td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-gray-900">{formatLitres(s.current_stock_litres)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${s.utilization_pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${s.utilization_pct}%` }}
                              />
                            </div>
                            <span className="font-bold text-gray-700">{s.utilization_pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-purple-800">{formatCurrency(s.value_kes)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                      <td colSpan={3} className="px-4 py-3 text-xs uppercase text-gray-500">Totals</td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-gray-900">{formatLitres(totalStockLitres)}</td>
                      <td />
                      <td className="px-4 py-3 text-right font-extrabold font-mono text-purple-900">{formatCurrency(totalInventoryValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── STOCK MOVEMENTS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'MOVEMENTS' && (
            <div className="space-y-4">
              {/* Date Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span>From:</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span>To:</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <button
                  onClick={loadMovements}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
                >
                  Apply Filter
                </button>
                <span className="text-xs text-gray-500">{movements.length} transactions</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Date & Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Tank</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Product</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Quantity (L)</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Before</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">After</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {movements.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">No stock transactions found for the selected period.</td></tr>
                    ) : movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{formatDateTime(m.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold text-[10px] ${txTypeColor(m.transaction_type)}`}>
                            {txTypeIcon(m.transaction_type)}
                            {m.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold font-mono text-gray-900">{m.tank_code}</td>
                        <td className="px-4 py-3 text-gray-700">{m.product_name}</td>
                        <td className={`px-4 py-3 text-right font-bold font-mono ${
                          m.transaction_type === 'RECEIVING' ? 'text-emerald-600' :
                          m.transaction_type === 'DISPATCH' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {m.transaction_type === 'DISPATCH' ? '-' : '+'}{formatLitres(m.quantity_litres)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">{formatLitres(m.previous_stock_litres)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{formatLitres(m.new_stock_litres)}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── REVENUE TAB ─────────────────────────────────────────────────────── */}
          {activeTab === 'REVENUE' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie: Revenue by Product */}
                {revByProduct.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider">Revenue by Fuel Product</h4>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={revByProduct}
                          dataKey="total_invoiced"
                          nameKey="product_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ product_code, percent, ...rest }: any) => `${product_code ?? rest.name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {revByProduct.map((entry, idx) => (
                            <Cell key={entry.product_code} fill={PRODUCT_COLORS[entry.product_code] || PIE_COLORS[idx]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [formatCurrency(Number(v)), 'Invoiced']}
                          contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e5e7eb' }}
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Revenue by Product Table */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider">Sales Performance by Product</h4>
                  <div className="space-y-2">
                    {revByProduct.map((r) => (
                      <div key={r.product_code} className="p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Product</span>
                          <span className="font-bold text-gray-900">{r.product_name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Total Invoiced</span>
                          <span className="font-bold text-gray-900 font-mono">{formatCurrency(r.total_invoiced)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Collected</span>
                          <span className="font-bold text-emerald-600 font-mono">{formatCurrency(r.total_collected)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Revenue by Customer */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Revenue by Customer</h4>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Customer</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Total Invoiced</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Total Paid</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase text-[10px]">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {revByCustomer.map((c) => (
                        <tr key={c.customer_code} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-900">{c.customer_name}</span>
                            <span className="text-gray-400 ml-2 font-mono text-[10px]">({c.customer_code})</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{formatCurrency(c.total_invoiced)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(c.total_paid)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            <span className={c.balance_due > 0 ? 'text-red-600' : 'text-emerald-600'}>
                              {formatCurrency(c.balance_due)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── EPRA & MARKET CLASSIFICATION TAB (Spec §8.2, §10.1) ─────────── */}
          {activeTab === 'EPRA_MARKET' && (
            <div className="space-y-6">
              {/* EPRA Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Local Market Quota</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-200 text-sky-900">16% VAT</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-sky-900">
                    {formatLitres(fourQRows.filter((r) => r.market_type === 'LOCAL').reduce((s, r) => s + r.allocated_litres, 0))}
                  </p>
                  <p className="text-[11px] text-sky-700">Domestic petroleum product allocation</p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Transit Export Quota</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900">0% VAT Exempt</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-purple-900">
                    {formatLitres(fourQRows.filter((r) => r.market_type === 'TRANSIT').reduce((s, r) => s + r.allocated_litres, 0))}
                  </p>
                  <p className="text-[11px] text-purple-700">Cross-border customs transit petroleum</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Regulatory Compliance</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">EPRA &amp; eTIMS</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-900">
                    {formatLitres(fourQRows.reduce((s, r) => s + r.sold_dispatched_litres, 0))}
                  </p>
                  <p className="text-[11px] text-emerald-700">Total volume reconciled &amp; certified</p>
                </div>
              </div>

              {/* Four Quantities / EPRA Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-3 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-sky-600" />
                      EPRA Monthly Position &amp; Four-Quantities Ledger
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Statutory monthly return separating Local and Transit product allocations, liftings &amp; sales
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      exportToCSV(
                        fourQRows.map((r) => ({
                          product: r.product_name,
                          code: r.product_code,
                          market: r.market_type,
                          allocated: r.allocated_litres,
                          purchased: r.purchased_litres,
                          received: r.received_lifted_litres,
                          sold: r.sold_dispatched_litres,
                          closing_stock: r.received_lifted_litres - r.sold_dispatched_litres,
                        })),
                        'epra_monthly_report'
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Export EPRA CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase text-[10px]">Product</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase text-[10px]">Market</th>
                        <th className="px-4 py-3 text-right font-semibold text-indigo-600 uppercase text-[10px]">Allocated (L)</th>
                        <th className="px-4 py-3 text-right font-semibold text-violet-600 uppercase text-[10px]">Purchased (L)</th>
                        <th className="px-4 py-3 text-right font-semibold text-blue-600 uppercase text-[10px]">Lifted / Received (L)</th>
                        <th className="px-4 py-3 text-right font-semibold text-emerald-600 uppercase text-[10px]">Sold / Delivered (L)</th>
                        <th className="px-4 py-3 text-right font-semibold text-amber-600 uppercase text-[10px]">Closing Stock (L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {fourQRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs">
                            No monthly allocation or purchase records found for the current period.
                          </td>
                        </tr>
                      ) : (
                        fourQRows.map((r, i) => (
                          <tr key={`${r.product_code}-${r.market_type}-${i}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-900">{r.product_name}</span>
                              <span className="font-mono text-gray-400 ml-1.5 font-semibold text-[10px]">({r.product_code})</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                                  r.market_type === 'LOCAL'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}
                              >
                                {r.market_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700">
                              {formatLitres(r.allocated_litres)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-violet-700">
                              {formatLitres(r.purchased_litres)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                              {formatLitres(r.received_lifted_litres)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                              {formatLitres(r.sold_dispatched_litres)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                              {formatLitres(Math.max(0, r.received_lifted_litres - r.sold_dispatched_litres))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── AUDIT LOGS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-3">
              <span className="text-xs text-gray-500">{auditLogs.length} recent audit events</span>
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No audit log events found.</p>
                ) : auditLogs.map((log) => {
                  const actionColor =
                    log.action.includes('CREATED') || log.action.includes('REGISTERED')
                      ? 'bg-emerald-100 text-emerald-800'
                      : log.action.includes('CONFIRMED') || log.action.includes('APPROVED')
                      ? 'bg-blue-100 text-blue-800'
                      : log.action.includes('DELETED') || log.action.includes('CANCELLED')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-700';

                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 mt-0.5 ${actionColor}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 leading-relaxed">{log.description}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{formatDateTime(log.created_at)} · {log.entity_type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
