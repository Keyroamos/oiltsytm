import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  DollarSign,
  Fuel,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { Order, Customer, Product } from '../types';
import { getOrders, getOrderPrerequisites, updateOrderStatus } from '../services/orderService';
import { CreateOrderModal } from '../components/orders/CreateOrderModal';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { KPICard } from '../components/common/KPICard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDateTime, formatLitres } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export function Orders() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [prereqs, setPrereqs] = useState<{ customers: Customer[]; products: Product[] }>({
    customers: [],
    products: [],
  });

  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [orderList, prereqData] = await Promise.all([
        getOrders(),
        getOrderPrerequisites(),
      ]);
      setOrders(orderList);
      setPrereqs(prereqData);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get('open') === 'new') {
      setIsCreateOpen(true);
      loadData();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadData]);

  // Aggregate Metrics
  const totalVolume = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + Number(o.quantity_litres || 0), 0);

  const pendingApprovalsCount = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;
  const approvedReadyCount = orders.filter((o) => ['APPROVED', 'ALLOCATED'].includes(o.status)).length;
  const pipelineValue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    let matchesStatus = true;
    if (selectedStatus === 'PENDING') matchesStatus = o.status === 'PENDING_APPROVAL';
    else if (selectedStatus === 'APPROVED') matchesStatus = ['APPROVED', 'ALLOCATED'].includes(o.status);
    else if (selectedStatus === 'PROGRESS') matchesStatus = ['LOADING', 'DISPATCHED'].includes(o.status);
    else if (selectedStatus === 'COMPLETED') matchesStatus = o.status === 'COMPLETED';
    else if (selectedStatus === 'CANCELLED') matchesStatus = o.status === 'CANCELLED';

    const matchesProduct =
      selectedProduct === 'ALL' || o.product?.code === selectedProduct;

    const matchesSearch =
      searchQuery === '' ||
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer?.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.product?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesProduct && matchesSearch;
  });

  const handleQuickApprove = async (order: Order) => {
    const vatDesc = order.market_type === 'LOCAL' ? '16% VAT' : '0% VAT (Transit)';
    if (!window.confirm(`Approve fuel contract ${order.order_number} for ${order.customer?.name}?\n\nThis will automatically generate a ${vatDesc} sales invoice ready for eTIMS fiscalization.`)) {
      return;
    }

    setApprovingId(order.id);
    try {
      await updateOrderStatus(order.id, 'APPROVED', user?.id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve order');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Wholesale Fuel Sales
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sales to retailers &amp; commercial customers — Local/Transit classification, eTIMS VAT compliance &amp; fulfillment
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Wholesale Sale</span>
        </button>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Order Book Volume"
          value={formatLitres(totalVolume)}
          subtitle="All active contracts"
          icon={Fuel}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Pending Approvals"
          value={String(pendingApprovalsCount)}
          subtitle="Require manager sign-off"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          alert={pendingApprovalsCount > 0}
        />
        <KPICard
          title="Approved & Ready"
          value={String(approvedReadyCount)}
          subtitle="Ready for lifting / delivery"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Contract Pipeline Value"
          value={formatCurrency(pipelineValue)}
          subtitle="Gross order revenue"
          icon={DollarSign}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'PENDING', label: `Pending (${pendingApprovalsCount})` },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
                  ? 'bg-[#1e3a5f] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product Filter & Search */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          >
            <option value="ALL">All Products</option>
            {prereqs.products.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            title="Reload orders"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Directory Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Customer Fuel Orders Ledger
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading && orders.length === 0 ? (
          <div className="p-6">
            <LoadingSkeleton count={4} type="row" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={ShoppingCart}
              title="No customer orders found"
              description="No fuel orders match your selected status or filter parameters."
              action={{
                label: 'Place Order',
                onClick: () => setIsCreateOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Order #</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Product</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Quantity</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Unit Price</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Total Contract Value</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Delivery Date</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((o) => {
                  const isPending = o.status === 'PENDING_APPROVAL';
                  const isApproving = approvingId === o.id;

                  const productDotColor =
                    o.product?.code === 'AGO'
                      ? 'bg-amber-500'
                      : o.product?.code === 'PMS'
                      ? 'bg-blue-500'
                      : 'bg-purple-500';

                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 font-mono block">{o.order_number}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{formatDateTime(o.created_at)}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-800 block">{o.customer?.name}</span>
                        <span className="text-[10px] text-gray-400 block">{o.customer?.code}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                          <span className={`w-2 h-2 rounded-full ${productDotColor}`} />
                          {o.product?.name}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-gray-900 font-mono">
                        {formatLitres(o.quantity_litres)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono text-gray-600">
                        KES {o.unit_price}/L
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-purple-900 font-mono">
                        {formatCurrency(o.total_amount)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={o.status} />
                      </td>

                      <td className="px-5 py-3.5 text-gray-700">
                        {o.requested_date}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleQuickApprove(o)}
                              disabled={isApproving}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isApproving ? 'Approving…' : 'Approve'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold transition-colors"
                          >
                            <span>Details</span>
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
      <CreateOrderModal
        customers={prereqs.customers}
        products={prereqs.products}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
      />

      <OrderDetailModal
        order={selectedOrder}
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
