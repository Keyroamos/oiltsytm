import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Package,
  CheckCircle2,
  Clock,
  Activity,
  FileText,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type { Dispatch, Order, Tanker, Tank } from '../types';
import {
  getDispatches,
  getDispatchPrerequisites,
} from '../services/dispatchService';
import { CreateDispatchModal } from '../components/dispatch/CreateDispatchModal';
import { DispatchDetailModal } from '../components/dispatch/DispatchDetailModal';
import { KPICard } from '../components/common/KPICard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDateTime, formatLitres } from '../utils/formatters';
import { generateGatePassPdf } from '../utils/generateGatePassPdf';

export function Dispatch() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [prereqs, setPrereqs] = useState<{
    approvedOrders: Order[];
    availableTankers: Tanker[];
    tanks: Tank[];
  }>({ approvedOrders: [], availableTankers: [], tanks: [] });

  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dispatchList, prereqData] = await Promise.all([
        getDispatches(),
        getDispatchPrerequisites(),
      ]);
      setDispatches(dispatchList);
      setPrereqs(prereqData);
    } catch (err) {
      console.error('Failed to load dispatch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPI metrics
  const loadingCount = dispatches.filter((d) => d.status === 'LOADING').length;
  const inTransitCount = dispatches.filter((d) => d.status === 'DISPATCHED').length;
  const completedToday = dispatches.filter((d) => {
    const today = new Date().toISOString().split('T')[0];
    return (d.status === 'DELIVERED' || d.status === 'COMPLETED') && d.created_at?.startsWith(today);
  }).length;
  const totalVolumeDispatched = dispatches
    .filter((d) => d.status === 'DELIVERED' || d.status === 'COMPLETED')
    .reduce((s, d) => s + Number(d.quantity_loaded || d.quantity_ordered || 0), 0);

  // Filter
  const filteredDispatches = dispatches.filter((d) => {
    let matchesStatus = true;
    if (selectedStatus === 'LOADING') matchesStatus = d.status === 'LOADING';
    else if (selectedStatus === 'DISPATCHED') matchesStatus = d.status === 'DISPATCHED';
    else if (selectedStatus === 'COMPLETED') matchesStatus = d.status === 'DELIVERED' || d.status === 'COMPLETED';

    const matchesSearch =
      searchQuery === '' ||
      d.dispatch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tanker?.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.driver_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Loading Bay & Dispatch Operations
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Allocate approved orders to road tankers, confirm fuel loading, and track deliveries
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Loading Batch</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Currently Loading"
          value={String(loadingCount)}
          subtitle="Active at loading bays"
          icon={Package}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          alert={loadingCount > 0}
        />
        <KPICard
          title="In Transit"
          value={String(inTransitCount)}
          subtitle="Tankers en route"
          icon={Activity}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <KPICard
          title="Delivered Today"
          value={String(completedToday)}
          subtitle="Completed deliveries"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Total Volume Dispatched"
          value={formatLitres(totalVolumeDispatched)}
          subtitle="Cumulative loads delivered"
          icon={Truck}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Pending approvals banner */}
      {prereqs.approvedOrders.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{prereqs.approvedOrders.length} approved order{prereqs.approvedOrders.length > 1 ? 's' : ''} ready for tanker allocation</span>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700 transition-colors"
          >
            Allocate Now →
          </button>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Dispatches' },
            { id: 'LOADING', label: `Loading (${loadingCount})` },
            { id: 'DISPATCHED', label: `In Transit (${inTransitCount})` },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dispatch #, customer..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dispatches Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Dispatch Operations Ledger
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {filteredDispatches.length} record{filteredDispatches.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading && dispatches.length === 0 ? (
          <div className="p-6"><LoadingSkeleton count={4} type="row" /></div>
        ) : filteredDispatches.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Truck}
              title="No dispatch operations found"
              description="Allocate approved customer orders to road tankers to begin a dispatch."
              action={{ label: 'New Loading Batch', onClick: () => setIsCreateOpen(true) }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Dispatch #</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Product</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Qty Loaded</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Tanker & Driver</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Source Tank</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDispatches.map((d) => {
                  const productDotColor =
                    d.product?.code === 'AGO'
                      ? 'bg-amber-500'
                      : d.product?.code === 'PMS'
                      ? 'bg-blue-500'
                      : 'bg-purple-500';

                  const isActive = ['LOADING', 'DISPATCHED'].includes(d.status);

                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 font-mono block">{d.dispatch_number}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{formatDateTime(d.created_at)}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-800 block">{d.customer?.name}</span>
                        <span className="text-[10px] text-gray-400 block">{d.customer?.code}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                          <span className={`w-2 h-2 rounded-full ${productDotColor}`} />
                          {d.product?.name}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">
                        {d.quantity_loaded
                          ? formatLitres(d.quantity_loaded)
                          : <span className="text-gray-400 font-normal">{formatLitres(d.quantity_ordered)} (ordered)</span>}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 font-mono block">{d.tanker?.registration_number || 'N/A'}</span>
                        <span className="text-[10px] text-gray-400 block">{d.driver_name || 'Driver unrecorded'}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-indigo-800 font-mono block">{d.tank?.code || '—'}</span>
                        <span className="text-[10px] text-gray-400 block">{d.tank?.name}</span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={d.status} />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(d.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateGatePassPdf(d);
                              }}
                              title="Download Gate Pass (PDF)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition-colors shadow-sm"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Gate Pass</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedDispatch(d)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors shadow-sm ${
                              isActive
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span>{isActive ? 'Manage' : 'Details'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
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

      {/* Modals */}
      <CreateDispatchModal
        approvedOrders={prereqs.approvedOrders}
        availableTankers={prereqs.availableTankers}
        tanks={prereqs.tanks}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
      />

      <DispatchDetailModal
        dispatch={selectedDispatch}
        isOpen={selectedDispatch !== null}
        onClose={() => setSelectedDispatch(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
