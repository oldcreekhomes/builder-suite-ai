-- Add insurance_required column to companies table
ALTER TABLE companies
ADD COLUMN insurance_required boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN companies.insurance_required IS 'Whether this company requires insurance tracking. Set to false for suppliers/vendors that do not need insurance.';