import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  ChevronDown,
  Calendar,
  User,
  LogOut,
  Settings,
  Shield,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/suppliers': 'Suppliers',
  '/allocations': 'Allocations',
  '/purchases': 'Purchases',
  '/customers': 'Customers',
  '/orders': 'Wholesale Sales',
  '/sales': 'Wholesale Sales',
  '/outturns': 'Outturn / Delivery',
  '/invoices': 'Invoicing',
  '/payments': 'Payments',
  '/finance': 'Costing & Margins',
  '/costing': 'Costing & Margins',
  '/reports': 'Reports & Analytics',
  '/users': 'Users & Permissions',
  '/settings': 'Products & Settings',
  '/expenses': 'Operating Expenses',
};

function getTitle(pathname: string): string {
  if (pathname === '/') return routeTitles['/'];
  const match = Object.keys(routeTitles).find(
    (k) => k !== '/' && pathname.startsWith(k)
  );
  return match ? routeTitles[match] : 'Tarita Petroleum';
}

const notifications = [
  { id: 1, type: 'info', message: 'Allocation OCT-2026 active (AGO 1,073 MT, PMS 890 MT)', time: '5m ago' },
  { id: 2, type: 'success', message: 'Gulf Energy purchase USD 142,500 recorded (KES 18.5M)', time: '32m ago' },
  { id: 3, type: 'info', message: 'Wholesale sale to Diesel Power approved for delivery', time: '1h ago' },
  { id: 4, type: 'success', message: 'Outturn OUT-2026-001 confirmed within EPRA 0.5% tolerance', time: '2h ago' },
  { id: 5, type: 'warning', message: 'Invoice INV-2026-001 payment pending (30-day terms)', time: '3h ago' },
];

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, role, signOut } = useAuth();
  const title = getTitle(location.pathname);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const notifColors: Record<string, string> = {
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
    info: 'bg-blue-500',
    critical: 'bg-red-500',
  };

  const displayName = profile?.full_name || 'Operations Manager';
  const displayEmail = profile?.email || user?.email || 'admin@elg.co.ke';
  const displayRole = role || 'SUPER_ADMIN';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 h-16 flex items-center gap-4 relative z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{today}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                  {notifications.length} new
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', notifColors[n.type])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100">
                <button className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a5f] to-[#2d5282] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{initials || 'DM'}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{displayName}</p>
              <p className="text-[10px] text-gray-400 capitalize">{displayRole.toLowerCase().replace('_', ' ')}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                  <Shield className="w-2.5 h-2.5" />
                  {displayRole}
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      {(notifOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => { setNotifOpen(false); setProfileOpen(false); }}
        />
      )}
    </header>
  );
}
