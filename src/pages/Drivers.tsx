import { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Plus, Search, Phone, CreditCard, Calendar,
  CheckCircle2, AlertCircle, Clock, Pencil, Trash2, X,
  Loader2, ShieldCheck, AlertTriangle, RefreshCw, Truck,
} from 'lucide-react';
import type { Driver } from '../types';
import {
  getDrivers, createDriver, updateDriver,
  toggleDriverStatus, deleteDriver, syncDriversFromTankers,
  type CreateDriverInput,
} from '../services/driverService';

const STATUS_CONFIG = {
  ACTIVE:   { label: 'Active',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  INACTIVE: { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200',         dot: 'bg-gray-400' },
  ON_LEAVE: { label: 'On Leave', color: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
};

const EMPTY: CreateDriverInput = {
  name: '', phone: '', license_number: '', license_expiry: '',
  national_id: '', status: 'ACTIVE', notes: '',
};

export function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<CreateDriverInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDrivers(await getDrivers());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncDriversFromTankers();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(null); setShowModal(true); };
  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({
      name: d.name, phone: d.phone ?? '', license_number: d.license_number ?? '',
      license_expiry: d.license_expiry ?? '', national_id: d.national_id ?? '',
      status: d.status, notes: d.notes ?? '',
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Driver name is required.'); return; }
    setSaving(true); setError(null);
    try {
      if (editing) {
        await updateDriver(editing.id, form);
      } else {
        await createDriver(form);
      }
      setShowModal(false);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (d: Driver) => {
    const next = d.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try { await toggleDriverStatus(d.id, next); await load(); }
    catch (e: any) { setError(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteDriver(deleteTarget.id); setDeleteTarget(null); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) ||
      (d.phone ?? '').includes(q) || (d.license_number ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    ACTIVE:   drivers.filter(d => d.status === 'ACTIVE').length,
    INACTIVE: drivers.filter(d => d.status === 'INACTIVE').length,
    ON_LEAVE: drivers.filter(d => d.status === 'ON_LEAVE').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-500" /> Drivers Registry
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all licensed fuel tanker drivers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
            title="Sync drivers assigned to tankers in fleet"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync from Fleet'}</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Driver
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: drivers.length, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: counts.ACTIVE, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'On Leave', value: counts.ON_LEAVE, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Inactive', value: counts.INACTIVE, icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or licence..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Global error */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <UserCheck className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-semibold">No drivers found</p>
            <p className="text-xs mt-1">{search ? 'Try a different search' : 'Click "Sync from Fleet" or "Add Driver"'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Driver</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Licence No.</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Licence Expiry</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Fleet Assignment / Notes</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d) => {
                  const cfg = STATUS_CONFIG[d.status];
                  const isExpired = d.license_expiry && new Date(d.license_expiry) < new Date();
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{d.name}</p>
                            {d.national_id && <p className="text-xs text-gray-400">ID: {d.national_id}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {d.phone ? (
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{d.phone}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {d.license_number ? (
                          <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {d.license_number}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {d.license_expiry ? (
                          <span className={`flex items-center gap-1 text-xs font-medium ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(d.license_expiry).toLocaleDateString('en-KE')}
                            {isExpired && <span className="text-red-500 font-bold">(Expired)</span>}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {d.notes ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md max-w-xs truncate">
                            <Truck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span className="truncate">{d.notes}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleToggle(d)} title={d.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{editing ? 'Edit Driver' : 'Register Driver'}</h3>
                  <p className="text-xs text-gray-400">Fill in the driver details below</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Kamau"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+254 7xx xxx xxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
                {/* National ID */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">National ID</label>
                  <input type="text" value={form.national_id} onChange={(e) => setForm(f => ({ ...f, national_id: e.target.value }))}
                    placeholder="e.g. 12345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Licence Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> Licence Number
                  </label>
                  <input type="text" value={form.license_number} onChange={(e) => setForm(f => ({ ...f, license_number: e.target.value.toUpperCase() }))}
                    placeholder="e.g. DLN123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
                {/* Licence Expiry */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Licence Expiry
                  </label>
                  <input type="date" value={form.license_expiry} onChange={(e) => setForm(f => ({ ...f, license_expiry: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white">
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any additional information..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Register Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Driver?</h3>
                <p className="text-xs text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong> from the drivers registry?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
