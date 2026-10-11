import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Fuel,
  Layers,
  ShoppingBag,
  ArrowRightLeft,
  Users,
  ShoppingCart,
  ClipboardCheck,
  Receipt,
  CreditCard,
  Calculator,
  BarChart3,
  UserCog,
  History,
  Settings,
  X,
  CheckCircle2,
  MonitorDown,
  Download,
  Package,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Navigation per TPMS Spec Doc Section 9: High-level TPMS Modules ─────────
//
// Module #  │ Spec Label               │ Sidebar Label        │ Path / Note
// ──────────┼──────────────────────────┼──────────────────────┼─────────────────────────────────────────
//  1        │ Dashboard                │ Dashboard            │ /
//  2        │ Suppliers                │ Suppliers            │ /suppliers
//  3        │ Products                 │ Products & Pricing   │ /settings?tab=PRICING
//  4        │ Allocations              │ Allocations          │ /allocations
//  5        │ Purchases                │ Purchases            │ /purchases
//  6        │ Product Movements        │ Product Movements    │ /reports?tab=MOVEMENTS
//  7        │ Customers                │ Customers            │ /customers
//  8        │ Wholesale Sales          │ Wholesale Sales      │ /orders
//  9        │ Outturn / Delivery       │ Outturn / Delivery   │ /outturns
// 10        │ Invoicing                │ Invoicing            │ /invoices
// 11        │ Payments                 │ Payments             │ /payments
// 12        │ Pricing                  │ Pricing              │ /settings?tab=PRICING  (same as #3)
// 13        │ Costing                  │ Costing              │ /finance
// 14        │ Reports                  │ Reports              │ /reports
// 15        │ Users and Permissions    │ Users & Permissions  │ /users
// 16        │ Audit Trail              │ Audit Trail          │ /reports?tab=AUDIT
//
// Note: Modules 3 and 12 (Products & Pricing) resolve to the same Settings page.
// They are merged into a single nav entry "Products & Pricing" to avoid duplicate links.
//
interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  section: string;
}

const navItems: NavItem[] = [
  // ── Module 1 ─────────────────────────────────────────────────
  { label: 'Dashboard',           path: '/',                        icon: LayoutDashboard, section: 'Overview' },

  // ── Procurement (Modules 2, 3, 4, 5) ─────────────────────────
  { label: 'Suppliers',           path: '/suppliers',               icon: Building2,       section: 'Procurement' },
  { label: 'Products & Pricing',  path: '/settings?tab=PRICING',    icon: Fuel,            section: 'Procurement' },
  { label: 'Allocations',         path: '/allocations',             icon: Layers,          section: 'Procurement' },
  { label: 'Purchases',           path: '/purchases',               icon: ShoppingBag,     section: 'Procurement' },

  // ── Stock (Module 6) ─────────────────────────────────────────
  { label: 'Product Movements',   path: '/reports?tab=MOVEMENTS',   icon: ArrowRightLeft,  section: 'Stock' },

  // ── Sales (Modules 7, 8, 9) ──────────────────────────────────
  { label: 'Customers',           path: '/customers',               icon: Users,           section: 'Sales' },
  { label: 'Wholesale Sales',     path: '/orders',                  icon: ShoppingCart,    section: 'Sales' },
  { label: 'Outturn / Delivery',  path: '/outturns',                icon: ClipboardCheck,  section: 'Sales' },

  // ── Finance (Modules 10, 11, 13) ─────────────────────────────
  { label: 'Invoicing',           path: '/invoices',                icon: Receipt,         section: 'Finance' },
  { label: 'Payments',            path: '/payments',                icon: CreditCard,      section: 'Finance' },
  { label: 'Costing',             path: '/finance',                 icon: Calculator,      section: 'Finance' },

  // ── Reporting (Module 14, 16) ─────────────────────────────────
  { label: 'Reports',             path: '/reports',                 icon: BarChart3,       section: 'Reporting' },
  { label: 'Audit Trail',         path: '/reports?tab=AUDIT',       icon: History,         section: 'Reporting' },

  // ── Administration (Module 15) ───────────────────────────────
  { label: 'Users & Permissions', path: '/users',                   icon: UserCog,         section: 'Administration' },

  // ── System ───────────────────────────────────────────────────
  { label: 'Settings',            path: '/settings',                icon: Settings,        section: 'System' },
];

const sections = [
  'Overview',
  'Procurement',
  'Stock',
  'Sales',
  'Finance',
  'Reporting',
  'Administration',
  'System',
];

// Helper: match a nav item as "active" accounting for ?tab= query params
function isNavItemActive(itemPath: string, currentPathname: string, currentSearch: string): boolean {
  const [itemBase, itemQuery] = itemPath.split('?');

  // Exact match for root "/"
  if (itemBase === '/') return currentPathname === '/';

  if (!currentPathname.startsWith(itemBase)) return false;

  // If the item has a query param, both path AND query must match
  if (itemQuery) {
    const itemParams = new URLSearchParams(itemQuery);
    const pageParams = new URLSearchParams(currentSearch);
    for (const [key, val] of itemParams.entries()) {
      if (pageParams.get(key)?.toUpperCase() !== val.toUpperCase()) return false;
    }
    return true;
  }

  // Plain path match — but if the current URL has a ?tab= that corresponds to a
  // different sub-nav item, don't highlight the plain item.
  return true;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        'To install Tarita Petroleum on your desktop:\n\n1. Look at the right side of your browser address bar\n2. Click the Install icon (desktop screen or down-arrow icon)\n3. Click "Install" to create a desktop shortcut with the Tarita Petroleum icon.'
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1e35] text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white shadow-sm overflow-hidden p-1">
            <img src="/tarita_icon.png" alt="Tarita Petroleum Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-white leading-tight tracking-wide">TARITA PETROLEUM</p>
            <p className="text-[10px] text-cyan-400 font-semibold tracking-wider">Fuelling Progress</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        {sections.map((section) => {
          const items = navItems.filter((i) => i.section === section);
          return (
            <div key={section} className="mb-5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                {section}
              </p>
              {items.map(({ label, path, icon: Icon }) => {
                const active = isNavItemActive(path, location.pathname, location.search);
                // Strip query string for NavLink `to` so router handles it correctly
                const [basePath, queryStr] = path.split('?');
                const navTo = queryStr ? `${basePath}?${queryStr}` : basePath;
                return (
                  <NavLink
                    key={`${section}-${path}`}
                    to={navTo}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 group',
                      active
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/8'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0 transition-colors',
                        active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    {label}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Install Desktop App (PWA) */}
      {!isInstalled && (
        <div className="px-3 pt-2 pb-1">
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/30 transition-all text-xs font-semibold group shadow-sm"
            title="Install Tarita Petroleum as a desktop application"
          >
            <div className="flex items-center gap-2">
              <MonitorDown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Install Desktop App</span>
            </div>
            <Download className="w-3.5 h-3.5 text-amber-400/80" />
          </button>
        </div>
      )}

      {/* Company identity footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="bg-white/6 rounded-xl p-3.5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Tarita Petroleum Ltd</p>
              <div className="flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">OMC · Kenya</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            TPMS v1.1 · PMS &amp; AGO<br />EPRA / KRA eTIMS Compliant
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative w-64 flex flex-col flex-shrink-0 h-full z-10">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
