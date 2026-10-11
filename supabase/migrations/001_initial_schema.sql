-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. Custom Enums
-- ==========================================
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN', 'DEPOT_MANAGER', 'LOADING_OFFICER', 
    'STOCK_OFFICER', 'SALES_OFFICER', 'ACCOUNTANT', 
    'DRIVER', 'AUDITOR', 'DIRECTOR'
);

CREATE TYPE tank_status AS ENUM (
    'ACTIVE', 'MAINTENANCE', 'INACTIVE'
);

CREATE TYPE stock_transaction_type AS ENUM (
    'RECEIVING', 'DISPATCH', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'
);

CREATE TYPE receiving_status AS ENUM (
    'PENDING', 'RECEIVED', 'REJECTED', 'CANCELLED'
);

CREATE TYPE tanker_status AS ENUM (
    'AVAILABLE', 'LOADING', 'LOADED', 'IN_TRANSIT', 
    'DELIVERED', 'MAINTENANCE', 'INACTIVE'
);

CREATE TYPE order_status AS ENUM (
    'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ALLOCATED', 
    'LOADING', 'DISPATCHED', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE dispatch_status AS ENUM (
    'PENDING', 'ASSIGNED', 'LOADING', 'LOADED', 
    'DISPATCHED', 'DELIVERED', 'CANCELLED'
);

CREATE TYPE invoice_status AS ENUM (
    'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'
);

CREATE TYPE payment_method AS ENUM (
    'CASH', 'BANK', 'MPESA', 'CARD', 'CREDIT'
);

-- ==========================================
-- 2. Core Tables
-- ==========================================

-- Profiles (Extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'LOADING_OFFICER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'L',
    current_price DECIMAL(12, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tanks
CREATE TABLE tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES products(id),
    capacity_litres DECIMAL(15, 2) NOT NULL,
    current_stock_litres DECIMAL(15, 2) NOT NULL DEFAULT 0,
    minimum_level_litres DECIMAL(15, 2) NOT NULL DEFAULT 0,
    maximum_level_litres DECIMAL(15, 2) NOT NULL,
    status tank_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT stock_bounds CHECK (current_stock_litres >= 0 AND current_stock_litres <= maximum_level_litres)
);

-- Stock Transactions (Immutable Ledger)
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id),
    product_id UUID NOT NULL REFERENCES products(id),
    transaction_type stock_transaction_type NOT NULL,
    quantity_litres DECIMAL(15, 2) NOT NULL,
    reference_type TEXT, -- e.g., 'RECEIVING', 'DISPATCH'
    reference_id UUID,
    previous_balance DECIMAL(15, 2) NOT NULL,
    new_balance DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    credit_terms TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tankers
CREATE TABLE tankers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT NOT NULL UNIQUE,
    capacity_litres DECIMAL(15, 2) NOT NULL,
    number_of_compartments INT NOT NULL DEFAULT 1,
    driver_name TEXT,
    driver_phone TEXT,
    transporter TEXT,
    status tanker_status NOT NULL DEFAULT 'AVAILABLE',
    insurance_expiry DATE,
    inspection_expiry DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Receiving Records
CREATE TABLE receiving_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    tank_id UUID NOT NULL REFERENCES tanks(id),
    tanker_id UUID REFERENCES tankers(id),
    quantity_ordered DECIMAL(15, 2) NOT NULL,
    quantity_received DECIMAL(15, 2),
    reference_number TEXT NOT NULL,
    arrival_time TIMESTAMPTZ,
    receiving_date DATE NOT NULL,
    driver_name TEXT,
    meter_reading DECIMAL(15, 2),
    quality_status TEXT,
    notes TEXT,
    status receiving_status NOT NULL DEFAULT 'PENDING',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_terms TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_litres DECIMAL(15, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'DRAFT',
    requested_date DATE NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dispatches
CREATE TABLE dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    tank_id UUID NOT NULL REFERENCES tanks(id),
    tanker_id UUID NOT NULL REFERENCES tankers(id),
    quantity_ordered DECIMAL(15, 2) NOT NULL,
    quantity_loaded DECIMAL(15, 2),
    loading_bay TEXT,
    loading_started_at TIMESTAMPTZ,
    loading_completed_at TIMESTAMPTZ,
    dispatch_time TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    driver_name TEXT,
    driver_phone TEXT,
    seal_number TEXT,
    status dispatch_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    order_id UUID REFERENCES orders(id),
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(15, 2) NOT NULL,
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount DECIMAL(15, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number TEXT,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================
-- 3. Triggers & Functions
-- ==========================================

-- Auto-update `updated_at` column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tanks_updated_at BEFORE UPDATE ON tanks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tankers_updated_at BEFORE UPDATE ON tankers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receiving_records_updated_at BEFORE UPDATE ON receiving_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dispatches_updated_at BEFORE UPDATE ON dispatches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on auth.user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), NEW.email, 'LOADING_OFFICER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ==========================================
-- 4. Indexes
-- ==========================================
CREATE INDEX idx_tanks_product ON tanks(product_id);
CREATE INDEX idx_stock_tx_tank ON stock_transactions(tank_id);
CREATE INDEX idx_receiving_tank ON receiving_records(tank_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_dispatches_order ON dispatches(order_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);


-- ==========================================
-- 5. Row Level Security (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tankers ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Baseline: Authenticated users can read most operational data
CREATE POLICY "Allow authenticated read on products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on tanks" ON tanks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on tankers" ON tankers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on dispatches" ON dispatches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on receiving" ON receiving_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on stock_tx" ON stock_transactions FOR SELECT TO authenticated USING (true);

-- Profiles: Users can read all profiles, but only update their own (or if Super Admin)
CREATE POLICY "Allow read all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow user update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Super Admins get full access to everything
-- (For MVP, we can grant full access to authenticated for ease of use, but let's implement basic full access for admins)
CREATE POLICY "Super Admins can do anything on products" ON products USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER'))
);

CREATE POLICY "Super Admins can do anything on tanks" ON tanks USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER'))
);

CREATE POLICY "Super Admins can do anything on tankers" ON tankers USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER'))
);

CREATE POLICY "Super Admins can do anything on customers" ON customers USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER', 'SALES_OFFICER'))
);

CREATE POLICY "Super Admins can do anything on orders" ON orders USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER', 'SALES_OFFICER'))
);

CREATE POLICY "Super Admins can do anything on dispatches" ON dispatches USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER', 'LOADING_OFFICER'))
);

CREATE POLICY "Super Admins can do anything on receiving" ON receiving_records USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER', 'STOCK_OFFICER'))
);

CREATE POLICY "Invoices full access for Finance" ON invoices USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ACCOUNTANT'))
);
CREATE POLICY "Invoices read for others" ON invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Payments full access for Finance" ON payments USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ACCOUNTANT'))
);
CREATE POLICY "Payments read for others" ON payments FOR SELECT TO authenticated USING (true);

-- Audit logs are insertable by the app (through RLS or functions) and readable by auditors/admins
CREATE POLICY "Audit logs insertable by authenticated" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Audit logs readable by auditors and admins" ON audit_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'AUDITOR', 'DIRECTOR'))
);

-- Stock Transactions are insert-only
CREATE POLICY "Stock transactions insertable by ops" ON stock_transactions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DEPOT_MANAGER', 'STOCK_OFFICER', 'LOADING_OFFICER'))
);
