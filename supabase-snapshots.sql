-- Sensor Snapshots Table
-- Records sensor readings every 2 hours (8AM-6PM) for each kit
-- Used to generate monthly client usage reports

CREATE TABLE IF NOT EXISTS sensor_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperature REAL,
  humidity REAL,
  moisture REAL,
  tank_state TEXT,
  flow_rate REAL,
  total_flow REAL,
  valve_state TEXT,
  pump_state TEXT,
  fan_state TEXT,
  mode TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries by kit and date range
CREATE INDEX IF NOT EXISTS idx_snapshots_kit_date ON sensor_snapshots(kit_id, recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE sensor_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert snapshots
CREATE POLICY "Allow authenticated insert" ON sensor_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to read all snapshots
CREATE POLICY "Allow authenticated select" ON sensor_snapshots
  FOR SELECT TO authenticated
  USING (true);
