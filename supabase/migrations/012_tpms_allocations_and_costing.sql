-- ==============================================================================
-- Migration 012: Tarita Petroleum Management System (TPMS) Core Schema
-- Implements Business & System Definition Part 1:
-- 1. Fuel Allocations (PMS / AGO period allocations in MT, m3, and Litres)
-- 2. Foreign-Currency Fuel Purchases (USD/KES FX rates, Product Entry Tax, landed costing)
-- 3. Customer Delivery Outturns (Offloaded vs loaded quantities, transit shrinkages)
-- 4. Local vs Transit market classification propagation across all tables
-- ==============================================================================

-- 1. Fuel Allocations Table
CREATE TABLE IF NOT EXISTS fuel_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_reference TEXT NOT NULL UNIQUE,
    allocation_period TEXT NOT NULL, -- e.g. "OCT-2026"
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    allocated_quantity_mt DECIMAL(15, 3),
    allocated_quantity_m3 DECIMAL(15, 3),
    allocated_quantity_litres DECIMAL(15, 2) NOT NULL,
    lifted_quantity_litres DECIMAL(15, 2) NOT NULL DEFAULT 0,
    remaining_quantity_litres DECIMAL(15, 2) NOT NULL,
    source_terminal TEXT DEFAULT 'Kipevu Oil Terminal (KOT)',
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, EXPIRED
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_allocations_supplier ON fuel_allocations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fuel_allocations_product ON fuel_allocations(product_id);
CREATE INDEX IF NOT EXISTS idx_fuel_allocations_period ON fuel_allocations(allocation_period);

-- 2. Fuel Purchases & Costing Table (Multi-currency USD/KES + Product Entry Tax)
CREATE TABLE IF NOT EXISTS fuel_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT NOT NULL UNIQUE, -- e.g. "PO-TARITA-2026-001"
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    allocation_id UUID REFERENCES fuel_allocations(id),
    market_type TEXT NOT NULL DEFAULT 'LOCAL', -- LOCAL or TRANSIT
    quantity_unit TEXT NOT NULL DEFAULT 'M3', -- MT, M3, or L
    quantity_value DECIMAL(15, 3) NOT NULL, -- e.g. 261.64 m3
    quantity_litres DECIMAL(15, 2) NOT NULL,
    quantity_mt DECIMAL(15, 3),
    currency TEXT NOT NULL DEFAULT 'USD', -- USD or KES
    unit_cost_currency DECIMAL(15, 4) NOT NULL,
    invoice_value_currency DECIMAL(15, 2) NOT NULL,
    exchange_rate DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    exchange_rate_date DATE NOT NULL,
    exchange_rate_source TEXT NOT NULL DEFAULT 'Central Bank of Kenya (CBK)',
    invoice_value_kes DECIMAL(15, 2) NOT NULL,
    -- Product Entry Tax (Retained strictly against this product entry transaction)
    product_entry_tax_kes DECIMAL(15, 2) NOT NULL DEFAULT 0,
    import_declaration_fee_kes DECIMAL(15, 2) NOT NULL DEFAULT 0,
    railway_development_levy_kes DECIMAL(15, 2) NOT NULL DEFAULT 0,
    petroleum_development_levy_kes DECIMAL(15, 2) NOT NULL DEFAULT 0,
    demurrage_port_charges_kes DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_landed_cost_kes DECIMAL(15, 2) NOT NULL,
    unit_landed_cost_kes_per_litre DECIMAL(15, 4) NOT NULL,
    reference_document TEXT, -- Bill of Lading, Importer Commercial Invoice #
    purchase_date DATE NOT NULL,
    lifted_quantity_litres DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ORDERED', -- ORDERED, PARTIALLY_LIFTED, COMPLETED, CANCELLED
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_purchases_supplier ON fuel_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fuel_purchases_product ON fuel_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_fuel_purchases_market ON fuel_purchases(market_type);
CREATE INDEX IF NOT EXISTS idx_fuel_purchases_allocation ON fuel_purchases(allocation_id);

-- 3. Customer Delivery Outturn Table (Customer confirmed delivered quantity vs loaded quantity)
CREATE TABLE IF NOT EXISTS customer_outturns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outturn_number TEXT NOT NULL UNIQUE, -- e.g. "OUT-2026-0001"
    dispatch_id UUID NOT NULL REFERENCES dispatches(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id UUID NOT NULL REFERENCES products(id),
    tanker_id UUID REFERENCES tankers(id),
    loaded_quantity_litres DECIMAL(15, 2) NOT NULL,
    offloaded_quantity_litres DECIMAL(15, 2) NOT NULL,
    variance_litres DECIMAL(15, 2) NOT NULL, -- offloaded - loaded
    variance_pct DECIMAL(8, 4) NOT NULL,
    allowable_tolerance_pct DECIMAL(5, 2) NOT NULL DEFAULT 0.50,
    outturn_status TEXT NOT NULL DEFAULT 'CONFIRMED', -- CONFIRMED, DISPUTED, INVESTIGATING
    delivery_destination TEXT,
    customer_rep_name TEXT,
    driver_name TEXT,
    meter_reading_before DECIMAL(15, 2),
    meter_reading_after DECIMAL(15, 2),
    outturn_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_outturns_dispatch ON customer_outturns(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_customer_outturns_customer ON customer_outturns(customer_id);

-- 4. Extend existing tables for Local/Transit & Cross-linking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS market_type TEXT NOT NULL DEFAULT 'LOCAL';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity_unit TEXT NOT NULL DEFAULT 'L';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity_unit_value DECIMAL(15, 3);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS etims_vat_amount DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS market_type TEXT NOT NULL DEFAULT 'LOCAL';
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS outturn_id UUID REFERENCES customer_outturns(id);
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS outturn_status TEXT DEFAULT 'PENDING_OFFLOAD';

ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS allocation_id UUID REFERENCES fuel_allocations(id);
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES fuel_purchases(id);
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS product_entry_tax DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12, 4) DEFAULT 1.0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS density_kg_l DECIMAL(6, 4) DEFAULT 0.8400;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS quantity_mt DECIMAL(15, 3);
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS quantity_m3 DECIMAL(15, 3);

-- Add sample seed data for Tarita Petroleum TPMS if not already populated
INSERT INTO suppliers (name, code, phone, email, address, credit_terms, is_active)
VALUES 
    ('Gulf Energy Limited', 'GULF', '+254 20 272 5000', 'procurement@gulfenergy.co.ke', 'Upper Hill, Nairobi', 'Net 30', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (name, code, phone, email, address, credit_limit, current_balance, payment_terms, kra_pin, is_active)
VALUES
    ('Diesel Power Company', 'DPC', '+254 711 988 221', 'info@dieselpower.co.ke', 'Mombasa Road, Industrial Area', 25000000.00, 0.00, 'Net 14 Days', 'P051239845Z', true)
ON CONFLICT (code) DO NOTHING;
