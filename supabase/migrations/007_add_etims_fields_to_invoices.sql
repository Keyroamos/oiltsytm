-- Migration 007: Add KRA eTIMS fiscalization fields to invoices table
-- Run this in your Supabase SQL Editor

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS etims_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS etims_cu_number TEXT,
  ADD COLUMN IF NOT EXISTS etims_scu_id TEXT,
  ADD COLUMN IF NOT EXISTS etims_signing_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS etims_transmitted_at TIMESTAMPTZ;

-- Index for eTIMS status queries
CREATE INDEX IF NOT EXISTS idx_invoices_etims_status ON invoices(etims_status);
CREATE INDEX IF NOT EXISTS idx_invoices_etims_cu_number ON invoices(etims_cu_number);
