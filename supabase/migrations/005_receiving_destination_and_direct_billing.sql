-- Migration 005: Add delivery destination and direct-to-client billing to receiving_records
-- Run this in your Supabase SQL Editor

-- Destination type: 'COMPANY_DEPOT' (stored in depot tanker fleet) or 'DIRECT_CLIENT' (delivered straight to customer site)
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS destination_type TEXT DEFAULT 'COMPANY_DEPOT';
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS destination_customer_id UUID REFERENCES customers(id);
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS client_selling_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS client_total_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE receiving_records ADD COLUMN IF NOT EXISTS generated_invoice_id UUID REFERENCES invoices(id);
