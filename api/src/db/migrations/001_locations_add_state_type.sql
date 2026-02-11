-- Allow 'state' in locations.type (for country -> state -> city -> district, e.g. US)
-- Run this on existing DBs after schema already has locations with (country, city, district).
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_type_check;
ALTER TABLE locations ADD CONSTRAINT locations_type_check
  CHECK (type IN ('country', 'state', 'city', 'district'));
