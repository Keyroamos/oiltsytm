-- Migration 002: Add missing columns to dispatches table
-- Run this in your Supabase SQL Editor if these columns are missing

ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS driver_phone TEXT;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS seal_number TEXT;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS initial_meter_reading DECIMAL(15, 2);
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS final_meter_reading DECIMAL(15, 2);
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS loading_start_time TIMESTAMPTZ;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS loading_end_time TIMESTAMPTZ;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS quantity_loaded DECIMAL(15, 2);
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS loading_bay TEXT;
ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Also add COMPLETED status to dispatch_status enum if missing
DO $$ BEGIN
  ALTER TYPE dispatch_status ADD VALUE IF NOT EXISTS 'COMPLETED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Also add IN_TRANSIT status to dispatch_status enum if missing
DO $$ BEGIN
  ALTER TYPE dispatch_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
