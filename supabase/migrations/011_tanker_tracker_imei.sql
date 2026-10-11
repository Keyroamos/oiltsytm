-- ==============================================================================
-- MIGRATION 011: ProTrack365 GPS Tracker Telematics Schema & Fleet Sync
-- ==============================================================================

-- 1. Add Telematics Columns to tankers table
ALTER TABLE tankers ADD COLUMN IF NOT EXISTS tracker_imei TEXT;
ALTER TABLE tankers ADD COLUMN IF NOT EXISTS tracker_sim TEXT;
ALTER TABLE tankers ADD COLUMN IF NOT EXISTS tracker_iccid TEXT;
ALTER TABLE tankers ADD COLUMN IF NOT EXISTS tracker_model TEXT DEFAULT 'VT05S';
ALTER TABLE tankers ADD COLUMN IF NOT EXISTS tracker_activated_at TIMESTAMPTZ;
ALTER TABLE tankers ADD COLUMN IF NOT EXISTS tracker_expires_at TIMESTAMPTZ;

-- 2. Column Documentation
COMMENT ON COLUMN tankers.tracker_imei IS 'ProTrack365 GPS device IMEI (15-digit)';
COMMENT ON COLUMN tankers.tracker_sim IS 'Tracker SIM card telephone number (e.g. +254...)';
COMMENT ON COLUMN tankers.tracker_iccid IS 'SIM card ICCID identifier (20-digit)';
COMMENT ON COLUMN tankers.tracker_model IS 'Tracker hardware model (VT05S)';
COMMENT ON COLUMN tankers.tracker_activated_at IS 'Device activation timestamp';
COMMENT ON COLUMN tankers.tracker_expires_at IS 'Platform service subscription expiration timestamp';

-- 3. Populate All 9 Nextwave Energy Road Tankers with Real Device Telematics
UPDATE tankers SET
    tracker_imei = '355139086515480',
    tracker_sim = '+254798845827',
    tracker_iccid = '89254021434289636592',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-10 13:47:05+00',
    tracker_expires_at = '2027-09-17 04:45:31+00'
WHERE registration_number = 'KDT 991Q';

UPDATE tankers SET
    tracker_imei = '355139086522742',
    tracker_sim = '+254799394359',
    tracker_iccid = '89254021434289637210',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-10 14:16:18+00',
    tracker_expires_at = '2027-09-17 05:15:00+00'
WHERE registration_number = 'KDT 992Q';

UPDATE tankers SET
    tracker_imei = '355139086516587',
    tracker_sim = '+254791543972',
    tracker_iccid = '89254021434289635834',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-11 11:50:06+00',
    tracker_expires_at = '2027-09-18 02:52:13+00'
WHERE registration_number = 'KDT 993Q';

UPDATE tankers SET
    tracker_imei = '355139086520134',
    tracker_sim = '+254799395721',
    tracker_iccid = '89254021434289634563',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-10 15:30:58+00',
    tracker_expires_at = '2027-09-17 06:29:45+00'
WHERE registration_number = 'KDX 991B';

UPDATE tankers SET
    tracker_imei = '355139086522650',
    tracker_sim = '+254799467056',
    tracker_iccid = '89254021434289637863',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-10 16:23:12+00',
    tracker_expires_at = '2027-09-17 07:20:29+00'
WHERE registration_number = 'KDX 992B';

UPDATE tankers SET
    tracker_imei = '355139086523427',
    tracker_sim = '+254799466128',
    tracker_iccid = '89254021434289634720',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-10 15:34:13+00',
    tracker_expires_at = '2027-09-17 06:35:46+00'
WHERE registration_number = 'KDX 993B';

UPDATE tankers SET
    tracker_imei = '355139086522866',
    tracker_sim = '+254791641462',
    tracker_iccid = '89254021434289635842',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-10 15:59:19+00',
    tracker_expires_at = '2027-09-17 06:57:13+00'
WHERE registration_number = 'KDX 994B';

UPDATE tankers SET
    tracker_imei = '355139086518948',
    tracker_sim = '+254799466373',
    tracker_iccid = '89254021434289637830',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-11 09:04:38+00',
    tracker_expires_at = '2027-09-17 23:44:36+00'
WHERE registration_number = 'KDX 996B';

UPDATE tankers SET
    tracker_imei = '355139086520019',
    tracker_sim = '+254796256055',
    tracker_iccid = '89254021434289635347',
    tracker_model = 'VT05S',
    tracker_activated_at = '2026-09-10 14:51:39+00',
    tracker_expires_at = '2027-09-17 05:51:09+00'
WHERE registration_number = 'KDX 997B';
