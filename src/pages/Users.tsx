import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  UserCog,
  Plus,
  Search,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
  Edit2,
  Users as UsersIcon,
  ShieldCheck,
  X,
  Loader2,
  Mail,
  Phone,
  Key,
} from 'lucide-react';
import type { Profile, UserRole } from '../types';
import {
  getUsers,
  updateUser,
  createStaffProfile,
  ROLE_PERMISSIONS,
} from '../services/userService';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const ALL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'DEPOT_MANAGER',
  'LOADING_OFFICER',
  'STOCK_OFFICER',
  'SALES_OFFICER',
  'ACCOUNTANT',
  'AUDITOR',
  'DIRECTOR',
  'DRIVER',
];

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  DEPOT_MANAGER: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  STOCK_OFFICER: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LOADING_OFFICER: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  SALES_OFFICER: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ACCOUNTANT: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  AUDITOR: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  DIRECTOR: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  DRIVER: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

export function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [viewTab, setViewTab] = useState<'USERS' | 'PERMISSIONS'>('USERS');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('LOADING_OFFICER');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userList = await getUsers();
      setUsers(userList);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('LOADING_OFFICER');
    setIsActive(true);
    setError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (u: Profile) => {
    setEditingUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole(u.role);
    setIsActive(u.is_active);
    setError(null);
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingUser) {
        await updateUser(
          editingUser.id,
          {
            full_name: fullName.trim(),
            phone: phone.trim() || undefined,
            role,
            is_active: isActive,
          },
          currentUser?.id
        );
        setEditingUser(null);
      } else {
        if (!fullName.trim() || !email.trim()) {
          setError('Please provide full name and email address.');
          setSaving(false);
          return;
        }
        await createStaffProfile(
          {
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            role,
            is_active: isActive,
          },
          currentUser?.id
        );
        setIsAddOpen(false);
      }
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save user account.');
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const activeCount = users.filter((u) => u.is_active).length;
  const adminCount = users.filter((u) => ['SUPER_ADMIN', 'DEPOT_MANAGER'].includes(u.role)).length;
  const operationsCount = users.filter((u) => ['LOADING_OFFICER', 'STOCK_OFFICER'].includes(u.role)).length;

  // Filter
  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    const matchesSearch =
      searchQuery === '' ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-purple-600" />
            Users & Access Control
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Role-based access permissions, user accounts, and authentication policies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewTab('USERS')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewTab === 'USERS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              User Accounts
            </button>
            <button
              onClick={() => setViewTab('PERMISSIONS')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewTab === 'PERMISSIONS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Roles Matrix
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Staff Users"
          value={String(users.length)}
          subtitle="Registered profiles"
          icon={UsersIcon}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <KPICard
          title="Active Accounts"
          value={String(activeCount)}
          subtitle="Permitted system logins"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="Managers & Admins"
          value={String(adminCount)}
          subtitle="Full operational control"
          icon={ShieldCheck}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <KPICard
          title="Operations Personnel"
          value={String(operationsCount)}
          subtitle="Loading & Stock officers"
          icon={Key}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {viewTab === 'USERS' ? (
        <>
          {/* Filter & Search */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedRoleFilter === 'ALL' ? 'bg-[#1e3a5f] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Roles
              </button>
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedRoleFilter === r ? 'bg-[#1e3a5f] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {ROLE_PERMISSIONS[r]?.label || r}
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
                  placeholder="Search staff, email, phone..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
              <button onClick={loadData} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Authorized Staff Accounts
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
                {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading && users.length === 0 ? (
              <div className="p-6"><LoadingSkeleton count={4} type="row" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No users found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">User</th>
                      <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Role</th>
                      <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Contact</th>
                      <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                      <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Joined</th>
                      <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((u) => {
                      const roleStyle = ROLE_COLORS[u.role] || {
                        bg: 'bg-gray-50',
                        text: 'text-gray-700',
                        border: 'border-gray-200',
                      };
                      return (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                                {u.full_name?.charAt(0)?.toUpperCase() || u.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 block">{u.full_name}</span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] font-bold ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                            >
                              {ROLE_PERMISSIONS[u.role]?.label || u.role}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-gray-600">
                            {u.phone ? (
                              <span className="flex items-center gap-1 text-[11px] font-mono">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {u.phone}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                                <XCircle className="w-3 h-3" />
                                Suspended
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-gray-400 text-[11px]">
                            {formatDate(u.created_at)}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => openEditModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit Access</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Role Permissions Matrix */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_ROLES.map((r) => {
            const roleInfo = ROLE_PERMISSIONS[r];
            const roleStyle = ROLE_COLORS[r] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
            const count = users.filter((u) => u.role === r).length;

            return (
              <div key={r} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                    {roleInfo?.label || r}
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">{count} user{count === 1 ? '' : 's'}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{roleInfo?.description}</p>
                <div className="pt-2 border-t border-gray-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Capabilities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {roleInfo?.permissions.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-[10px] text-gray-700 font-medium">
                        ✓ {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(isAddOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setIsAddOpen(false);
              setEditingUser(null);
            }}
          />

          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingUser ? 'Edit Staff Permissions' : 'Add Staff Account'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingUser ? editingUser.email : 'Assign credentials & operational role'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingUser(null);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Samuel Karanja"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="s.karanja@elg.co.ke"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_PERMISSIONS[r]?.label || r} — {ROLE_PERMISSIONS[r]?.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-gray-800 cursor-pointer">
                  Account Active &amp; Login Permitted
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingUser(null);
                  }}
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
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving Account…</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" />{editingUser ? 'Update Permissions' : 'Create User'}</>
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
