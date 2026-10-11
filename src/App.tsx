import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Receiving } from './pages/Receiving';
import { Tanks, TankDetails } from './pages/Tanks';
import { Customers } from './pages/Customers';
import { Orders } from './pages/Orders';
import { Invoices } from './pages/Invoices';
import { Expenses } from './pages/Expenses';
import { Payments } from './pages/Payments';
import { Suppliers } from './pages/Suppliers';
import { Reports } from './pages/Reports';
import { Finance } from './pages/Finance';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { FuelingSplashScreen } from './components/common/FuelingSplashScreen';
// ─── TPMS: Procurement & Compliance Modules ──────────────────────────────────
import { Allocations } from './pages/Allocations';
import { Purchases } from './pages/Purchases';
import { Outturns } from './pages/Outturns';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1e35]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <FuelingSplashScreen onComplete={() => setShowSplash(false)} />}
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Procurement (Modules 2, 3, 4, 5) */}
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="allocations" element={<Allocations />} />
            <Route path="purchases" element={<Purchases />} />

            {/* Stock & Storage (Module 6) */}
            <Route path="receiving" element={<Receiving />} />
            <Route path="tanks" element={<Tanks />} />
            <Route path="tanks/:id" element={<TankDetails />} />

            {/* Sales & Deliveries (Modules 7, 8, 9) */}
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<Orders />} />
            <Route path="outturns" element={<Outturns />} />

            {/* Finance & Invoicing (Modules 10, 11, 13) */}
            <Route path="invoices" element={<Invoices />} />
            <Route path="payments" element={<Payments />} />
            <Route path="finance" element={<Finance />} />
            <Route path="expenses" element={<Expenses />} />

            {/* Reporting & Compliance (Modules 14, 16) */}
            <Route path="reports" element={<Reports />} />

            {/* Administration & System (Modules 15, 3, 12) */}
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />

            {/* TPMS Spec Nomenclature Aliases */}
            <Route path="sales" element={<Navigate to="/orders" replace />} />
            <Route path="costing" element={<Navigate to="/finance" replace />} />
            <Route path="pricing" element={<Navigate to="/settings?tab=PRICING" replace />} />
            <Route path="products" element={<Navigate to="/settings?tab=PRICING" replace />} />
            <Route path="movements" element={<Navigate to="/reports?tab=MOVEMENTS" replace />} />
            <Route path="audit" element={<Navigate to="/reports?tab=AUDIT" replace />} />
            <Route path="stock" element={<Navigate to="/reports?tab=STOCK" replace />} />

            {/* Obsolete Fleet Redirects */}
            <Route path="dispatch" element={<Navigate to="/outturns" replace />} />
            <Route path="tankers" element={<Navigate to="/orders" replace />} />
            <Route path="drivers" element={<Navigate to="/orders" replace />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </>
  );
}
