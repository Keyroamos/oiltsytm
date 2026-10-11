-- Migration 004: Add delivery expenses and purchasing price tracking to receiving_records
-- Run this in your Supabase SQL Editor

-- LPG Purchasing price and total product cost
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS purchase_total DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS total_cost DECIMAL(15, 2) DEFAULT 0;

-- Delivery / Logistics expenses
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS transport_cost DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS driver_allowance DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS toll_fees DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS loading_charges DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS other_expenses DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS other_expenses_note TEXT;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS total_delivery_cost DECIMAL(12, 2) DEFAULT 0;

-- Tanker GPS / live tracker columns
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS tanker_latitude DECIMAL(10, 7);
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS tanker_longitude DECIMAL(10, 7);
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS tanker_last_seen TIMESTAMPTZ;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS expected_arrival TIMESTAMPTZ;
