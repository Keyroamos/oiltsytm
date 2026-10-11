-- Migration 008: Add kra_pin to customers table for KRA eTIMS compliance
-- Run this in your Supabase SQL Editor

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS kra_pin TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_kra_pin ON customers(kra_pin);
