import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Truck,
  Building2,
  Calendar,
  Trash2,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  getExpenses,
  getExpenseSummary,
  deleteExpense,
  type ExpenseSummary,
} from '../services/expenseService';
import { getTankers } from '../services/tankerService';
import type { Expense, ExpenseCategory, Tanker } from '../types';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { RecordExpenseModal } from '../components/expenses/RecordExpenseModal';
import { formatCurrency } from '../utils/formatters';

const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; color: string }> = {
  TRUCK_MAINTENANCE: { label: 'Truck Maintenance', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  TRUCK_FUEL: { label: 'Truck Diesel / Fuel', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  TYRES_SPARES: { label: 'Tyres & Spares', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DRIVER_ALLOWANCE: { label: 'Driver Allowances', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  TOLLS_WEIGHBRIDGE: { label: 'Road Tolls', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  PERMITS_LICENSES: { label: 'Permits & NTSA', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  TRUCK_INSURANCE: { label: 'Truck Insurance', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  DEPOT_OPERATIONS: { label: 'Operations', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  ADMIN_OVERHEAD: { label: 'Admin & Overhead', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  OTHER: { label: 'Other Incidental', color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [tankers, setTankers] = useState<Tanker[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [allocationFilter, setAllocationFilter] = useState<string>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [expList, sum, tankerList] = await Promise.all([
        getExpenses(),
        getExpenseSummary(),
        getTankers(),
      ]);
      setExpenses(expList);
      setSummary(sum);
      setTankers(tankerList);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    await deleteExpense(id);
    loadData();
  };

  const handleExportCsv = () => {
    if (expenses.length === 0) return;
    const headers = ['Expense #', 'Date', 'Category', 'Title', 'Vehicle', 'Payee', 'Amount (KES)', 'Method', 'Status'];
    const rows = filteredExpenses.map((e) => [
      e.expense_number,
      e.expense_date,
      e.category,
      `"${e.title.replace(/"/g, '""')}"`,
      e.vehicle_registration || 'General',
      `"${(e.payee_vendor || '').replace(/"/g, '""')}"`,
      e.amount,
      e.payment_method,
      e.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.expense_number.toLowerCase().includes(search.toLowerCase()) ||
      (e.vehicle_registration && e.vehicle_registration.toLowerCase().includes(search.toLowerCase())) ||
      (e.payee_vendor && e.payee_vendor.toLowerCase().includes(search.toLowerCase())) ||
      (e.reference_number && e.reference_number.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = categoryFilter === 'ALL' || e.category === categoryFilter;

    const matchesAlloc =
      allocationFilter === 'ALL' ||
      (allocationFilter === 'TRUCK' && (e.allocation_type === 'TRUCK' || e.vehicle_registration)) ||
      (allocationFilter === 'DEPOT_GENERAL' && e.allocation_type === 'DEPOT_GENERAL' && !e.vehicle_registration);

    return matchesSearch && matchesCat && matchesAlloc;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-600" />
            Operational &amp; Fleet Expenses
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Log, track and allocate truck maintenance, diesel, driver allowances, toll fees, and overhead
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh expenses"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Recorded Expenses"
          value={formatCurrency(summary?.totalAmount || 0)}
          subtitle={`${summary?.count || 0} commercial expense entries`}
          icon={DollarSign}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <KPICard
          title="This Month's Outflow"
          value={formatCurrency(summary?.totalThisMonth || 0)}
          subtitle="Current calendar month activity"
          icon={Calendar}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <KPICard
          title="Truck & Fleet Costs"
          value={formatCurrency(summary?.totalTruckExpenses || 0)}
          subtitle="Deducted from truck earnings"
          icon={Truck}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <KPICard
          title="Operational Overhead"
          value={formatCurrency(summary?.totalDepotExpenses || 0)}
          subtitle="Terminal utilities & facility costs"
          icon={Building2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, payee, truck reg, ref..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
          >
            <option value="ALL">All Categories</option>
            <option value="TRUCK_MAINTENANCE">🔧 Truck Maintenance & Repairs</option>
            <option value="TRUCK_FUEL">⛽ Truck Diesel / Fuel</option>
            <option value="TYRES_SPARES">🛞 Tyres & Spares</option>
            <option value="DRIVER_ALLOWANCE">👮 Driver Allowances</option>
            <option value="TOLLS_WEIGHBRIDGE">🛣️ Road Tolls</option>
            <option value="PERMITS_LICENSES">📜 Permits & Inspection</option>
            <option value="TRUCK_INSURANCE">🛡️ Truck Insurance</option>
            <option value="DEPOT_OPERATIONS">🏢 Operations</option>
            <option value="ADMIN_OVERHEAD">💼 Administrative & Overhead</option>
            <option value="OTHER">📦 Other Expenses</option>
          </select>

          <select
            value={allocationFilter}
            onChange={(e) => setAllocationFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
          >
            <option value="ALL">All Allocations</option>
            <option value="TRUCK">🚚 Vehicle-Specific Expenses</option>
            <option value="DEPOT_GENERAL">🏢 General Overhead</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 font-semibold">
          Showing {filteredExpenses.length} expense{filteredExpenses.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="p-6"><LoadingSkeleton count={4} type="card" /></div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No Expenses Recorded Yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Click "Record Expense" above to log vehicle repairs, diesel purchases, driver per diems, or general operational overhead.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record First Expense</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Expense Ref &amp; Date</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Category &amp; Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Vehicle / Allocation</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Payee / Vendor</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Amount (KES)</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Payment Mode</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExpenses.map((exp) => {
                  const catMeta = CATEGORY_LABELS[exp.category] || CATEGORY_LABELS.OTHER;
                  const isTruckAlloc = exp.allocation_type === 'TRUCK' || exp.vehicle_registration;
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-gray-900 block">{exp.expense_number}</span>
                        <span className="text-[10px] text-gray-400 block">{exp.expense_date}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                        <span className="font-bold text-gray-900 block mt-1">{exp.title}</span>
                        {exp.reference_number && (
                          <span className="text-[10px] text-gray-400 font-mono">Ref: {exp.reference_number}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {isTruckAlloc ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold text-[11px]">
                              <Truck className="w-3 h-3" />
                              {exp.vehicle_registration || exp.tanker?.registration_number || 'Truck'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[10px]">
                            <Building2 className="w-3 h-3" />
                            General Overhead
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-medium text-gray-800 block">{exp.payee_vendor || '—'}</span>
                        {exp.notes && (
                          <span className="text-[10px] text-gray-400 block truncate max-w-xs">{exp.notes}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono font-extrabold text-red-600">
                        {formatCurrency(exp.amount)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-mono font-medium">
                          {exp.payment_method.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          title="Delete expense entry"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        tankers={tankers}
      />
    </div>
  );
}
