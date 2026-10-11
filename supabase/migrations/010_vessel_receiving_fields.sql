-- Migration 010: Add vessel intake fields, market regime (LOCAL/TRANSIT), currency (KES/USD), and discharge expenses
-- Run this in your Supabase SQL Editor if applying directly to database

ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS vessel_name TEXT;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS market_type TEXT DEFAULT 'LOCAL';
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES';
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS port_charges DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS demurrage_cost DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS inspection_fees DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS pumping_charges DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS customs_duty DECIMAL(15, 2) DEFAULT 0;

-- Indexes for querying by vessel name and market regime
CREATE INDEX IF NOT EXISTS idx_receiving_vessel_name ON receiving_records(vessel_name);
CREATE INDEX IF NOT EXISTS idx_receiving_market_type ON receiving_records(market_type);
