-- Add height and weight columns to vitals table
ALTER TABLE vitals 
ADD COLUMN IF NOT EXISTS weight NUMERIC(6, 2), -- in kg
ADD COLUMN IF NOT EXISTS height NUMERIC(5, 2); -- in cm

-- Add comments for clarity
COMMENT ON COLUMN vitals.weight IS 'Patient weight in kilograms';
COMMENT ON COLUMN vitals.height IS 'Patient height in centimeters';
