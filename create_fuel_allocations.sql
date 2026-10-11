-- ============================================================
-- TARITA ERP - Fuel Allocations Table Migration
-- 
-- Copy ALL of this SQL and paste it into Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wamcotcjwffawgzmqgpl/sql/new
-- Then click "Run" (or Ctrl+Enter)
-- ============================================================

-- 1. Create the fuel_allocations table
CREATE TABLE IF NOT EXISTS public.fuel_allocations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_reference      TEXT NOT NULL,
  allocation_period         TEXT NOT NULL,
  supplier_id               UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  product_id                UUID REFERENCES public.products(id)  ON DELETE RESTRICT,
  allocated_quantity_litres NUMERIC(15,2) NOT NULL DEFAULT 0,
  allocated_quantity_mt     NUMERIC(15,4),
  allocated_quantity_m3     NUMERIC(15,4),
  lifted_quantity_litres    NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_quantity_litres NUMERIC(15,2) NOT NULL DEFAULT 0,
  source_terminal           TEXT,
  period_start_date         DATE NOT NULL,
  period_end_date           DATE,
  status                    TEXT NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE','COMPLETED','EXPIRED')),
  notes                     TEXT,
  created_by                UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security on the new table
ALTER TABLE public.fuel_allocations ENABLE ROW LEVEL SECURITY;

-- 3. Policy: authenticated users can do everything on fuel_allocations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fuel_allocations'
    AND policyname = 'allow_authenticated'
  ) THEN
    CREATE POLICY allow_authenticated ON public.fuel_allocations
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Policy: ensure authenticated users can SELECT from suppliers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'suppliers'
    AND policyname = 'allow_auth_read'
  ) THEN
    CREATE POLICY allow_auth_read ON public.suppliers
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 5. Policy: ensure authenticated users can SELECT from products
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'products'
    AND policyname = 'allow_auth_read'
  ) THEN
    CREATE POLICY allow_auth_read ON public.products
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 6. Auto-update updated_at on edits
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fuel_allocations_updated_at'
  ) THEN
    CREATE TRIGGER trg_fuel_allocations_updated_at
      BEFORE UPDATE ON public.fuel_allocations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Confirm success
SELECT 'fuel_allocations table ready!' AS result;
