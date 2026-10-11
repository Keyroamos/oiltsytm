-- Migration 006: Create expenses tracking table with truck linking & manual entry
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,          -- 'TRUCK_MAINTENANCE', 'TRUCK_FUEL', 'TYRES_SPARES', 'DRIVER_ALLOWANCE', 'TOLLS_WEIGHBRIDGE', 'PERMITS_LICENSES', 'TRUCK_INSURANCE', 'DEPOT_OPERATIONS', 'ADMIN_OVERHEAD', 'OTHER'
  title TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  allocation_type TEXT DEFAULT 'TRUCK', -- 'TRUCK' or 'DEPOT_GENERAL'
  tanker_id UUID REFERENCES tankers(id) ON DELETE SET NULL,
  vehicle_registration TEXT,       -- Auto-populated from tanker or manually entered
  payee_vendor TEXT,               -- e.g. 'Toyota Kenya', 'Shell', 'KenHA', 'NTSA'
  payment_method TEXT DEFAULT 'BANK_TRANSFER', -- 'CASH', 'BANK_TRANSFER', 'MPESA', 'PETTY_CASH', 'CHEQUE'
  reference_number TEXT,           -- Receipt or invoice ref #
  status TEXT DEFAULT 'PAID',      -- 'PAID', 'PENDING', 'APPROVED'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_tanker_id ON expenses(tanker_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_reg ON expenses(vehicle_registration);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read/write access
CREATE POLICY "Allow all authenticated operations on expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon read/insert for testing environments
CREATE POLICY "Allow anon read/insert on expenses"
  ON expenses FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
