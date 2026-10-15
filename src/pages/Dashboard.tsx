import {
  Fuel,
  ArrowDownToLine,
  Truck,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  Database,
} from 'lucide-react';
import { KPICard } from '../components/common/KPICard';
import { StockOverview } from '../components/dashboard/StockOverview';
import { MovementTimeline } from '../components/dashboard/MovementTimeline';
import { RecentDeliveries } from '../components/dashboard/RecentDeliveries';
import { StockSummaryTable } from '../components/dashboard/StockSummaryTable';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatLitres } from '../utils/formatters';

export function Dashboard() {
  const { data, loading, error, refresh } = useDashboardData();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton count={4} type="card" />
        <LoadingSkeleton count={4} type="card" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LoadingSkeleton count={3} type="card" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalStock: 0,
    todayReceived: 0,
    todayDispatched: 0,
    todaySales: 0,
    outstandingReceivables: 0,
    outstandingPayables: 0,
    activeTankers: 0,
    alertCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Sync Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            Live Supabase Sync
          </span>
          {error && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              (Offline fallback)
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Row 1 — Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Stock"
          value={formatLitres(kpis.totalStock)}
          subtitle="All tanks combined"
          icon={Fuel}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <KPICard
          title="Today's Received"
          value={formatLitres(kpis.todayReceived)}
          subtitle="Inbound deliveries"
          icon={ArrowDownToLine}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Today's Dispatched"
          value={formatLitres(kpis.todayDispatched)}
          subtitle="Outbound dispatches"
          icon={Truck}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Today's Sales"
          value={formatCurrency(kpis.todaySales)}
          subtitle="Revenue today"
          icon={DollarSign}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Row 2 — Financial & Operations KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Outstanding Receivables"
          value={formatCurrency(kpis.outstandingReceivables)}
          subtitle="Owed by customers"
          icon={TrendingUp}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <KPICard
          title="Outstanding Payables"
          value={formatCurrency(kpis.outstandingPayables)}
          subtitle="Owed to suppliers"
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <KPICard
          title="Wholesale Orders"
          value={String(data?.recentDeliveries?.length || 0)}
          subtitle="Customer contracts"
          icon={ShoppingCart}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <KPICard
          title="Alerts"
          value={String(kpis.alertCount)}
          subtitle="Require attention"
          icon={AlertTriangle}
          alert={kpis.alertCount > 0}
        />
      </div>

      {/* Row 3 — Charts & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StockOverview data={data?.stockOverview} />
        <MovementTimeline movements={data?.movements} />
      </div>

      {/* Row 4 — Recent Deliveries */}
      <RecentDeliveries deliveries={data?.recentDeliveries} />

      {/* Row 5 — Stock Summary Table */}
      <StockSummaryTable summary={data?.stockSummary} />
    </div>
  );
}
