import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import type { Supplier } from '../types';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
} from '../services/supplierService';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

export function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditTerms, setCreditTerms] = useState('Net 30');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getSuppliers();
      setSuppliers(list);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setName('');
    setCode('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCreditTerms('Net 30');
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setCode(s.code);
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setCreditTerms(s.credit_terms || 'Net 30');
    setIsActive(s.is_active);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingSupplier) {
        await updateSupplier(
          editingSupplier.id,
          {
            name: name.trim(),
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            credit_terms: creditTerms.trim() || undefined,
            is_active: isActive,
          },
          user?.id
        );
      } else {
        if (!name.trim() || !code.trim()) {
          setError('Supplier name and unique code are required.');
          setSaving(false);
          return;
        }
        await createSupplier(
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            credit_terms: creditTerms.trim() || undefined,
            is_active: isActive,
          },
          user?.id
        );
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  // KPIs
  const activeCount = suppliers.filter((s) => s.is_active).length;
  const inactiveCount = suppliers.length - activeCount;

  // Filter
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesStatus =
      statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? s.is_active : !s.is_active);
    const matchesSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Fuel Suppliers Directory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Licensed oil marketing companies (OMCs), fuel import partners, and procurement terms
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register Supplier</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Suppliers"
          value={String(suppliers.length)}
          subtitle="Registered Petroleum Supply Partners (PMS & AGO)"
          icon={Building2}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <KPICard
          title="Active Contracts"
          value={String(activeCount)}
          subtitle="Currently supplying fuel"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Standard Payment Terms"
          value="Net 30"
          subtitle="Common commercial baseline"
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Inactive / On Hold"
          value={String(inactiveCount)}
          subtitle="Suspended accounts"
          icon={XCircle}
          iconColor="text-gray-400"
          iconBg="bg-gray-100"
        />
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Suppliers' },
            { id: 'ACTIVE', label: `Active (${activeCount})` },
            { id: 'INACTIVE', label: `Inactive (${inactiveCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#1e3a5f] text-white'
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
              placeholder="Search supplier, code..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>
          <button onClick={loadData} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Suppliers Grid / Cards */}
      {loading && suppliers.length === 0 ? (
        <div className="p-6"><LoadingSkeleton count={3} type="card" /></div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <EmptyState
            icon={Building2}
            title="No suppliers found"
            description="Add your fuel marketing partners and importers to begin receiving fuel consignments."
            action={{ label: 'Register Supplier', onClick: openAddModal }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {s.code.substring(0, 3)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm leading-snug">{s.name}</h4>
                      <span className="text-[10px] font-mono text-gray-400">{s.code}</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      s.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    {s.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
                  {s.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono">{s.phone}</span>
                    </p>
                  )}
                  {s.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{s.email}</span>
                    </p>
                  )}
                  {s.address && (
                    <p className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{s.address}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-indigo-700 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Terms: {s.credit_terms || 'Net 30'}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end">
                <button
                  onClick={() => openEditModal(s)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingSupplier ? 'Edit Supplier' : 'Register Petroleum Supplier'}
                  </h3>
                  <p className="text-xs text-gray-500">Corporate fuel supply partner details</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vivo Energy Kenya PLC"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier Code *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. VIVO"
                    disabled={!!editingSupplier}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={creditTerms}
                    onChange={(e) => setCreditTerms(e.target.value)}
                    placeholder="Net 30 / Advance"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 20 123456"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@vivoenergy.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Office / Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. KPRL Refinery Road, Changamwe, Mombasa"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="supplierActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="supplierActiveToggle" className="text-xs font-semibold text-gray-800 cursor-pointer">
                  Supplier Active for Fuel Consignments
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" />{editingSupplier ? 'Save Changes' : 'Register Supplier'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
