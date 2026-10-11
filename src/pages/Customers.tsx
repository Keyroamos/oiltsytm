import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Building2,
  ExternalLink,
  Edit2,
  CheckCircle2,
  ShoppingCart,
  ArrowLeft,
} from 'lucide-react';
import type { Customer, UUID } from '../types';
import { getCustomers } from '../services/customerService';
import { AddEditCustomerModal } from '../components/customers/AddEditCustomerModal';
import { CustomerDetailDrawer } from '../components/customers/CustomerDetailDrawer';
import { KPICard } from '../components/common/KPICard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency } from '../utils/formatters';

export function Customers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromOrders = searchParams.get('from') === 'orders';
  const action = searchParams.get('action');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'HEALTHY' | 'HIGH' | 'EXCEEDED'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals / Drawer state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<UUID | null>(null);

  useEffect(() => {
    if (action === 'new') {
      setEditingCustomer(null);
      setIsAddEditOpen(true);
    }
  }, [action]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getCustomers();
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate metrics
  const totalReceivables = customers.reduce((s, c) => s + Number(c.current_balance || 0), 0);
  const totalCreditLimit = customers.reduce((s, c) => s + Number(c.credit_limit || 0), 0);
  const overallUtilization = totalCreditLimit > 0 ? Math.round((totalReceivables / totalCreditLimit) * 100) : 0;
  const activeCount = customers.filter((c) => c.is_active).length;

  // Filtering
  const filteredCustomers = customers.filter((c) => {
    const limit = Number(c.credit_limit || 0);
    const balance = Number(c.current_balance || 0);
    const util = limit > 0 ? (balance / limit) * 100 : 0;

    let matchesHealth = true;
    if (creditFilter === 'HEALTHY') matchesHealth = util < 80;
    if (creditFilter === 'HIGH') matchesHealth = util >= 80 && util < 100;
    if (creditFilter === 'EXCEEDED') matchesHealth = util >= 100;

    const matchesStatus =
      statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? c.is_active : !c.is_active);

    const matchesSearch =
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesHealth && matchesStatus && matchesSearch;
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Fuel Order Redirection Notice Banner */}
      {fromOrders && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900">Registering Client for Fuel Order</p>
              <p className="text-[11px] text-blue-700">
                Register this client's profile &amp; credit terms. Once saved, you will be redirected automatically back to complete the fuel order.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/orders?open=new')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold transition-colors self-start sm:self-auto whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Orders</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Customer & Credit Management
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage commercial accounts, credit facilities, outstanding balances, and order limits
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Credit Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Receivables"
          value={formatCurrency(totalReceivables)}
          subtitle="Customer balances owed"
          icon={TrendingUp}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <KPICard
          title="Total Credit Granted"
          value={formatCurrency(totalCreditLimit)}
          subtitle="Combined credit lines"
          icon={CreditCard}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <KPICard
          title="Credit Utilization"
          value={`${overallUtilization}%`}
          subtitle="Receivables to limit ratio"
          icon={AlertTriangle}
          iconColor={overallUtilization >= 80 ? 'text-red-600' : 'text-blue-600'}
          iconBg={overallUtilization >= 80 ? 'bg-red-50' : 'bg-blue-50'}
        />
        <KPICard
          title="Active Client Accounts"
          value={`${activeCount} / ${customers.length}`}
          subtitle="Permitted to place orders"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Credit Health Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Accounts' },
            { id: 'HEALTHY', label: 'Healthy (<80%)' },
            { id: 'HIGH', label: 'High Exposure (80-99%)' },
            { id: 'EXCEEDED', label: 'Limit Exceeded (100%+)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCreditFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                creditFilter === tab.id
                  ? 'bg-[#1e3a5f] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, code, phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          <button
            onClick={loadData}
            title="Reload directory"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1e3a5f]" />
            Corporate Accounts Directory
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {filteredCustomers.length} account{filteredCustomers.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading && customers.length === 0 ? (
          <div className="p-6">
            <LoadingSkeleton count={4} type="row" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Users}
              title="No customer accounts found"
              description="No accounts match your search or credit filter criteria."
              action={{
                label: 'Register Customer',
                onClick: handleOpenAdd,
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Contact</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Credit Limit</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Outstanding</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Available Credit</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px] w-36">Credit Health</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((c) => {
                  const limit = Number(c.credit_limit || 0);
                  const balance = Number(c.current_balance || 0);
                  const available = Math.max(0, limit - balance);
                  const utilPct = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;
                  const isOverLimit = balance >= limit && limit > 0;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-xs font-mono">
                            {c.code}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{c.name}</span>
                            <span className="text-[10px] text-gray-400 block">{c.payment_terms || '30 Days Net'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-gray-600">
                        <span className="block font-mono text-[11px]">{c.phone || '—'}</span>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[140px]">{c.email || '—'}</span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900 font-mono">
                        {formatCurrency(limit)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-red-600 font-mono">
                        {formatCurrency(balance)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold font-mono">
                        <span className={available === 0 ? 'text-red-500' : 'text-emerald-600'}>
                          {formatCurrency(available)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={isOverLimit ? 'font-bold text-red-600' : 'text-gray-500'}>
                              {utilPct}%
                            </span>
                            {isOverLimit && <span className="text-[9px] font-bold text-red-600 uppercase">Limit Hit</span>}
                          </div>
                          <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                utilPct >= 90 ? 'bg-red-500' : utilPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${utilPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={c.is_active ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Account"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-[11px] font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
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

      {/* Modals & Drawer */}
      <AddEditCustomerModal
        customer={editingCustomer}
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={() => {
          loadData();
          if (fromOrders) {
            navigate('/orders?open=new');
          }
        }}
      />

      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        isOpen={selectedCustomerId !== null}
        onClose={() => setSelectedCustomerId(null)}
        onEdit={(cust) => {
          setSelectedCustomerId(null);
          handleOpenEdit(cust);
        }}
      />
    </div>
  );
}
