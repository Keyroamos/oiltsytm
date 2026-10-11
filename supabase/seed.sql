-- ==========================================
-- SEED DATA FOR PETRODEPOT / NEXTWAVE ENERGY
-- ==========================================

-- 1. Products (Core product definitions)
INSERT INTO products (id, name, code, description, unit, current_price, is_active)
VALUES 
    ('b3b3a726-253c-4e8c-8f19-b5d123456781', 'Diesel', 'AGO', 'Automotive Gas Oil', 'L', 127.50, true),
    ('b3b3a726-253c-4e8c-8f19-b5d123456782', 'Petrol (PMS)', 'PMS', 'Premium Motor Spirit', 'L', 135.00, true),
    ('b3b3a726-253c-4e8c-8f19-b5d123456783', 'Gas (LPG)', 'LPG', 'Liquefied Petroleum Gas - Bulk Commercial Grade', 'L', 115.00, true)
ON CONFLICT (code) DO NOTHING;

-- 2. Storage Tanks (Initial zero-stock state)
INSERT INTO tanks (id, name, code, product_id, capacity_litres, current_stock_litres, minimum_level_litres, maximum_level_litres, status)
VALUES 
    ('c1c1c1c1-253c-4e8c-8f19-c1c1c1c1c1c1', 'Tank D-01', 'D-01', 'b3b3a726-253c-4e8c-8f19-b5d123456781', 500000, 0, 50000, 480000, 'ACTIVE'),
    ('c2c2c2c2-253c-4e8c-8f19-c2c2c2c2c2c2', 'Tank D-02', 'D-02', 'b3b3a726-253c-4e8c-8f19-b5d123456781', 500000, 0, 50000, 480000, 'ACTIVE'),
    ('c3c3c3c3-253c-4e8c-8f19-c3c3c3c3c3c3', 'Tank P-01', 'P-01', 'b3b3a726-253c-4e8c-8f19-b5d123456782', 500000, 0, 50000, 480000, 'ACTIVE'),
    ('c4c4c4c4-253c-4e8c-8f19-c4c4c4c4c4c4', 'Tank G-01 (LPG Bullet)', 'G-01', 'b3b3a726-253c-4e8c-8f19-b5d123456783', 300000, 0, 30000, 290000, 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- 3. Nextwave Energy Road Tanker Fleet (ProTrack365 GPS Tracked)
INSERT INTO tankers (registration_number, capacity_litres, number_of_compartments, transporter, status)
VALUES
    ('KDT 991Q', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDT 992Q', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDT 993Q', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDX 991B', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDX 992B', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDX 993B', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDX 994B', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDX 996B', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE'),
    ('KDX 997B', 45000, 3, 'NEXTWAVE ENERGY', 'AVAILABLE')
ON CONFLICT (registration_number) DO UPDATE SET
    transporter = EXCLUDED.transporter,
    status = EXCLUDED.status;


