-- ============================================================
-- TARITA PETROLEUM MANAGEMENT SYSTEM (TPMS)
-- Database Migration: Fuel Purchases, Customer Outturns & Compliance
--
-- How to apply:
-- 1. Open Supabase Dashboard:
--    https://supabase.com/dashboard/project/wamcotcjwffawgzmqgpl/sql/new
-- 2. Paste this entire script into the SQL Editor
-- 3. Click "Run" (or Ctrl+Enter)
-- ============================================================

-- ── 1. Fuel Allocations (in case not yet created) ─────────────
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

ALTER TABLE public.fuel_allocations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fuel_allocations' AND policyname = 'allow_authenticated'
  ) THEN
    CREATE POLICY allow_authenticated ON public.fuel_allocations
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 2. Fuel Purchases (Foreign Currency & Product Entry Tax) ─
-- Spec §4.C, §4.J, §7, §8: Supplier, Product, Currency (USD/KES), FX rate,
-- Taxes: PET, IDF, RDL, PDL, port charges, Total Landed Cost, Local/Transit
CREATE TABLE IF NOT EXISTS public.fuel_purchases (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number                 TEXT NOT NULL UNIQUE,
  supplier_id                     UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  product_id                      UUID REFERENCES public.products(id)  ON DELETE RESTRICT,
  allocation_id                   UUID REFERENCES public.fuel_allocations(id) ON DELETE SET NULL,
  market_type                     TEXT NOT NULL DEFAULT 'LOCAL'
                                  CHECK (market_type IN ('LOCAL', 'TRANSIT')),
  quantity_unit                   TEXT NOT NULL DEFAULT 'L'
                                  CHECK (quantity_unit IN ('MT', 'M3', 'L')),
  quantity_value                  NUMERIC(15,3) NOT NULL DEFAULT 0,
  quantity_litres                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  quantity_mt                     NUMERIC(15,4),
  currency                        TEXT NOT NULL DEFAULT 'KES'
                                  CHECK (currency IN ('USD', 'KES')),
  unit_cost_currency              NUMERIC(15,4) NOT NULL DEFAULT 0,
  invoice_value_currency          NUMERIC(15,2) NOT NULL DEFAULT 0,
  exchange_rate                   NUMERIC(15,4) NOT NULL DEFAULT 1.0000,
  exchange_rate_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  exchange_rate_source            TEXT NOT NULL DEFAULT 'CBK',
  invoice_value_kes               NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Product Entry Tax and charges (Spec §8.1)
  product_entry_tax_kes           NUMERIC(15,2) NOT NULL DEFAULT 0,
  import_declaration_fee_kes      NUMERIC(15,2) NOT NULL DEFAULT 0,
  railway_development_levy_kes    NUMERIC(15,2) NOT NULL DEFAULT 0,
  petroleum_development_levy_kes  NUMERIC(15,2) NOT NULL DEFAULT 0,
  demurrage_port_charges_kes      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_landed_cost_kes           NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_landed_cost_kes_per_litre  NUMERIC(15,4) NOT NULL DEFAULT 0,
  reference_document              TEXT,
  purchase_date                   DATE NOT NULL DEFAULT CURRENT_DATE,
  lifted_quantity_litres          NUMERIC(15,2) NOT NULL DEFAULT 0,
  status                          TEXT NOT NULL DEFAULT 'ORDERED'
                                  CHECK (status IN ('ORDERED', 'PARTIALLY_LIFTED', 'COMPLETED', 'CANCELLED')),
  notes                           TEXT,
  created_by                      UUID,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fuel_purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fuel_purchases' AND policyname = 'allow_authenticated_purchases'
  ) THEN
    CREATE POLICY allow_authenticated_purchases ON public.fuel_purchases
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 3. Customer Outturns (Delivery & Loss Reconciliation) ─────
-- Spec §4.E, §9 (Module 9): Delivery & outturn verification, variance & tolerance
CREATE TABLE IF NOT EXISTS public.customer_outturns (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outturn_number              TEXT NOT NULL UNIQUE,
  dispatch_id                 UUID,
  customer_id                 UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  product_id                  UUID REFERENCES public.products(id)  ON DELETE RESTRICT,
  tanker_id                   UUID,
  loaded_quantity_litres      NUMERIC(15,2) NOT NULL DEFAULT 0,
  offloaded_quantity_litres   NUMERIC(15,2) NOT NULL DEFAULT 0,
  variance_litres             NUMERIC(15,2) NOT NULL DEFAULT 0,
  variance_pct                NUMERIC(8,4) NOT NULL DEFAULT 0,
  allowable_tolerance_pct     NUMERIC(5,2) NOT NULL DEFAULT 0.5,
  outturn_status              TEXT NOT NULL DEFAULT 'CONFIRMED'
                              CHECK (outturn_status IN ('CONFIRMED', 'DISPUTED', 'INVESTIGATING')),
  delivery_destination        TEXT,
  customer_rep_name           TEXT,
  driver_name                 TEXT,
  meter_reading_before        NUMERIC(15,2),
  meter_reading_after         NUMERIC(15,2),
  outturn_date                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes                       TEXT,
  created_by                  UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_outturns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_outturns' AND policyname = 'allow_authenticated_outturns'
  ) THEN
    CREATE POLICY allow_authenticated_outturns ON public.customer_outturns
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 4. Extend Orders for Wholesale Sales Compliance ─────────
-- Spec §4.F, §8.2: Local/Transit classification and eTIMS VAT amount
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS market_type TEXT DEFAULT 'LOCAL' CHECK (market_type IN ('LOCAL', 'TRANSIT'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15,2) DEFAULT 0;

-- ── 5. Helper RPC Functions ──────────────────────────────────
-- Updates lifted quantity on an allocation when a purchase or lifting occurs
CREATE OR REPLACE FUNCTION public.increment_allocation_lifted(
  p_allocation_id UUID,
  p_quantity NUMERIC
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.fuel_allocations
  SET
    lifted_quantity_litres = lifted_quantity_litres + p_quantity,
    remaining_quantity_litres = GREATEST(0, allocated_quantity_litres - (lifted_quantity_litres + p_quantity)),
    updated_at = NOW()
  WHERE id = p_allocation_id;
END;
$$;

-- Triggers for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fuel_purchases_updated_at') THEN
    CREATE TRIGGER trg_fuel_purchases_updated_at
      BEFORE UPDATE ON public.fuel_purchases
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customer_outturns_updated_at') THEN
    CREATE TRIGGER trg_customer_outturns_updated_at
      BEFORE UPDATE ON public.customer_outturns
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── Confirm Status ──────────────────────────────────────────
SELECT 'TPMS schema ready: fuel_allocations, fuel_purchases, customer_outturns, orders updated!' AS status;
