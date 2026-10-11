-- ===================================================================
-- Migration 009: Tanker Live Location Tracking
-- Adds GPS location tracking to tankers for real-time fleet visibility
-- ===================================================================

-- Add current location snapshot fields to the tankers table
ALTER TABLE tankers
  ADD COLUMN IF NOT EXISTS current_latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_address   TEXT,
  ADD COLUMN IF NOT EXISTS speed_kmh          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS heading_degrees    DOUBLE PRECISION;

-- Location history / breadcrumb trail table
CREATE TABLE IF NOT EXISTS tanker_locations (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tanker_id     UUID          NOT NULL REFERENCES tankers(id) ON DELETE CASCADE,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  address       TEXT,
  speed_kmh     DOUBLE PRECISION,
  heading_degrees DOUBLE PRECISION,
  accuracy_m    DOUBLE PRECISION,
  source        TEXT          NOT NULL DEFAULT 'MANUAL', -- 'GPS', 'MANUAL', 'DRIVER_APP'
  recorded_by   UUID          REFERENCES profiles(id),
  notes         TEXT,
  recorded_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by tanker and time
CREATE INDEX IF NOT EXISTS idx_tanker_locations_tanker_id ON tanker_locations(tanker_id);
CREATE INDEX IF NOT EXISTS idx_tanker_locations_recorded_at ON tanker_locations(recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE tanker_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can read, staff can insert)
CREATE POLICY "tanker_locations_read" ON tanker_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tanker_locations_insert" ON tanker_locations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "tanker_locations_update" ON tanker_locations
  FOR UPDATE TO authenticated USING (true);

-- Trigger: keep tankers.current_* columns in sync with latest location
CREATE OR REPLACE FUNCTION sync_tanker_current_location()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tankers SET
    current_latitude    = NEW.latitude,
    current_longitude   = NEW.longitude,
    location_address    = NEW.address,
    speed_kmh           = NEW.speed_kmh,
    heading_degrees     = NEW.heading_degrees,
    location_updated_at = NEW.recorded_at
  WHERE id = NEW.tanker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_tanker_location ON tanker_locations;
CREATE TRIGGER trg_sync_tanker_location
  AFTER INSERT ON tanker_locations
  FOR EACH ROW EXECUTE FUNCTION sync_tanker_current_location();

-- Enable realtime for location updates
ALTER PUBLICATION supabase_realtime ADD TABLE tanker_locations;
