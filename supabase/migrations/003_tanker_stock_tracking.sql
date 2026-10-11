-- Migration 003: Add LPG stock tracking to tankers
-- Run this in your Supabase SQL Editor

ALTER TABLE tankers ADD COLUMN IF NOT EXISTS current_stock_litres DECIMAL(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE tankers ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- Create a dummy tank for LPG to satisfy receiving_records FK constraint (tank_id is NOT NULL)
-- We'll use this as a "virtual" tank that represents the tanker fleet
DO $$
DECLARE
  lpg_product_id UUID;
  virtual_tank_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO lpg_product_id FROM products WHERE code = 'LPG' LIMIT 1;
  IF lpg_product_id IS NOT NULL THEN
    INSERT INTO tanks (id, name, code, product_id, capacity_litres, current_stock_litres, minimum_level_litres, maximum_level_litres, status)
    VALUES (virtual_tank_id, 'LPG Fleet (Virtual)', 'LPG-FLEET', lpg_product_id, 9999999, 0, 0, 9999999, 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
