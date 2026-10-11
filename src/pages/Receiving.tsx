import { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownToLine,
  Search,
  RefreshCw,
  CheckCircle2,
  Eye,
  FileDown,
  DollarSign,
  Building2,
  Ship,
  Globe,
} from 'lucide-react';
import type { ReceivingRecord, Supplier, Product, Tank } from '../types';
import {
  getReceivingRecords,
  getReceivingPrerequisites,
  confirmPendingReceipt,
} from '../services/receivingService';
import { ReceiveFuelModal } from '../components/receiving/ReceiveFuelModal';
import { ReceivingDetailDrawer } from '../components/receiving/ReceivingDetailDrawer';
import { StatusBadge } from '../components/common/StatusBadge';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDateTime, formatLitres, formatCurrency } from '../utils/formatters';
import { generateGrnPdf } from '../utils/generateGrnPdf';
import { useAuth } from '../context/AuthContext';

export function Receiving() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ReceivingRecord[]>([]);
  const [prereqs, setPrereqs] = useState<{
    suppliers: Supplier[];
    products: Product[];
    tanks: Tank[];
  }>({ suppliers: [], products: [], tanks: [] });

  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'LOCAL' | 'TRANSIT'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ReceivingRecord | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recList, prereqData] = await Promise.all([
        getReceivingRecords(),
        getReceivingPrerequisites(),
      ]);
      setRecords(recList);
      setPrereqs(prereqData);
    } catch (err) {
      console.error('Failed to load receiving data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatConsignmentMoney = (amount: number, currency?: string) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount);
    }
    return formatCurrency(amount);
  };

  // Derived KPI metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReceivedLitres = records
    .filter((r) => r.status === 'RECEIVED' && (r.receiving_date === todayStr || r.created_at?.startsWith(todayStr)))
    .reduce((sum, r) => sum + Number(r.quantity_received || r.quantity_ordered || 0), 0);

  const totalLocalCost = records
    .filter((r) => (r.currency || (r.market_type === 'TRANSIT' ? 'USD' : 'KES')) === 'KES')
    .reduce((sum, r) => sum + Number(r.total_cost || r.purchase_total || 0), 0);

  const totalTransitCost = records
    .filter((r) => (r.currency || (r.market_type === 'TRANSIT' ? 'USD' : 'KES')) === 'USD')
    .reduce((sum, r) => sum + Number(r.total_cost || r.purchase_total || 0), 0);


  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesProduct =
      selectedProduct === 'ALL' || r.product?.code === selectedProduct;
    const matchesMarket =
      selectedMarket === 'ALL' ||
      (selectedMarket === 'TRANSIT' && r.market_type === 'TRANSIT') ||
      (selectedMarket === 'LOCAL' && (r.market_type === 'LOCAL' || !r.market_type));
    const matchesStatus =
      selectedStatus === 'ALL' || r.status === selectedStatus;
    const matchesSearch =
      searchQuery === '' ||
      r.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.vessel_name && r.vessel_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tank?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tank?.code.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProduct && matchesMarket && matchesStatus && matchesSearch;
  });

  const handleConfirmReceipt = async (record: ReceivingRecord) => {
    const prodName = record.product?.name || 'fuel';
    const targetTank = record.tank?.name || 'Storage Vessel';
    const vessel = record.vessel_name || 'Vessel';
    const confirmMsg = `Confirm intake of ${formatLitres(record.quantity_ordered)} of ${prodName} from vessel "${vessel}" into ${targetTank}?\n\nThis will immediately update storage vessel inventory.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setConfirmingId(record.id);
    try {
      await confirmPendingReceipt(record.id, user?.id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm receipt');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-600" />
            Vessel Fuel Receiving &amp; Intake
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Log marine vessel discharges, classify Local (KES) &amp; Transit (USD) consignments, and record intake expenses
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Ship className="w-4 h-4" />
          <span>Receive Vessel Consignment</span>
        </button>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's Vessel Intake"
          value={formatLitres(todayReceivedLitres)}
          subtitle="Discharged into storage vessels"
          icon={ArrowDownToLine}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Local Consignment Value"
          value={formatCurrency(totalLocalCost)}
          subtitle="Total Local (KES) Landed Cost"
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Transit Consignment Value"
          value={formatConsignmentMoney(totalTransitCost, 'USD')}
          subtitle="Total Transit (USD) Landed Cost"
          icon={Globe}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <KPICard
          title="Storage Vessels"
          value={`${prereqs.tanks.length} Vessels`}
          subtitle="Active storage vessels"
          icon={Building2}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Product & Market Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Product Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedProduct('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedProduct === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Products
            </button>
            {prereqs.products.map((p) => (
              <button
                key={p.code}
                onClick={() => setSelectedProduct(p.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedProduct === p.code
                    ? p.code === 'AGO'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Market Regime Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedMarket('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedMarket === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Regimes
            </button>
            <button
              onClick={() => setSelectedMarket('LOCAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedMarket === 'LOCAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Local (KES)
            </button>
            <button
              onClick={() => setSelectedMarket('TRANSIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedMarket === 'TRANSIT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Transit (USD)
            </button>
          </div>
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vessel, ref, supplier..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={loadData}
            title="Refresh records"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Receiving Manifests Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Ship className="w-4 h-4 text-blue-600" />
            Vessel Inbound Discharges &amp; Consignments
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {filteredRecords.length} consignment{filteredRecords.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading && records.length === 0 ? (
          <div className="p-6">
            <LoadingSkeleton count={3} type="row" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Ship}
              title="No vessel receiving records found"
              description="No inbound vessel consignments match the selected filters."
              action={{
                label: 'Receive Vessel Consignment',
                onClick: () => setIsModalOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Reference #</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Vessel &amp; Supplier</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Market Regime</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Product</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Target Storage Vessel</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Quantity</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Landed Cost</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Quality</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.map((r) => {
                  const qty = Number(r.quantity_received || r.quantity_ordered || 0);
                  const isPending = r.status === 'PENDING';
                  const isConfirming = confirmingId === r.id;
                  const isTransit = r.market_type === 'TRANSIT' || r.currency === 'USD';
                  const currency = isTransit ? 'USD' : (r.currency || 'KES');
                  const unitSymbol = currency === 'USD' ? '$' : 'KES ';
                  const landedTotal = Number(r.total_cost || r.purchase_total || 0);
                  const deliveryExpenses = Number(r.total_delivery_cost || 0);

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td
                        className="px-5 py-3.5 cursor-pointer group"
                        onClick={() => setSelectedRecord(r)}
                      >
                        <span className="font-bold text-gray-900 font-mono block group-hover:text-blue-600 transition-colors">
                          {r.reference_number}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {formatDateTime(r.arrival_time || r.created_at)}
                        </span>
                      </td>

                      <td
                        className="px-5 py-3.5 cursor-pointer group"
                        onClick={() => setSelectedRecord(r)}
                      >
                        <div className="flex items-center gap-1.5">
                          <Ship className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="font-bold text-gray-900 block group-hover:text-blue-600 transition-colors">
                            {r.vessel_name || 'Marine Vessel'}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 block mt-0.5">
                          {r.supplier?.name || '—'} {r.supplier?.code ? `(${r.supplier.code})` : ''}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isTransit
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isTransit ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                          {isTransit ? 'TRANSIT (USD)' : 'LOCAL (KES)'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              r.product?.code === 'AGO' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                          />
                          {r.product?.name || 'Petroleum Fuel'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 font-mono font-bold text-[11px] flex items-center justify-center border border-blue-200">
                            {r.tank?.code || 'VESSEL'}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block text-xs">
                              {r.tank?.name || 'Storage Vessel'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              Storage Vessel
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">
                        +{formatLitres(qty)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="font-bold text-gray-900 font-mono block">
                          {landedTotal > 0 ? formatConsignmentMoney(landedTotal, currency) : '—'}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          {r.purchase_price ? (
                            <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                              @{unitSymbol}{r.purchase_price}/L
                            </span>
                          ) : null}
                          {deliveryExpenses > 0 && (
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-mono font-semibold" title={`Expenses: ${formatConsignmentMoney(deliveryExpenses, currency)}`}>
                              +exp
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.quality_status === 'PASSED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.quality_status === 'FAILED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {r.quality_status || 'PASSED'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedRecord(r)}
                            title="View vessel intake details & expenses"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors text-[11px] font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span>Details</span>
                          </button>

                          <button
                            onClick={() => generateGrnPdf(r)}
                            title="Download Goods Received Note (GRN)"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-colors text-[11px] font-semibold"
                          >
                            <FileDown className="w-3.5 h-3.5 text-blue-600" />
                            <span>GRN</span>
                          </button>

                          {isPending && (
                            <button
                              onClick={() => handleConfirmReceipt(r)}
                              disabled={isConfirming}
                              title="Confirm receipt into storage vessel"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-[11px] font-bold shadow-xs disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isConfirming ? 'Confirming…' : 'Confirm'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vessel Intake Modal */}
      <ReceiveFuelModal
        suppliers={prereqs.suppliers}
        products={prereqs.products}
        tanks={prereqs.tanks}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Receiving Detail Drawer */}
      <ReceivingDetailDrawer
        record={selectedRecord}
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onConfirm={(rec) => handleConfirmReceipt(rec)}
      />
    </div>
  );
}
