-- Keep the multi-select report reasons already present in the live schema.
-- Existing rows in the live database retain their current arrays; fresh databases
-- initialize the column from the existing single primary reason.
ALTER TABLE public.listing_reports
  ADD COLUMN IF NOT EXISTS reason_codes TEXT[];

UPDATE public.listing_reports
SET reason_codes = ARRAY[reason_code]::TEXT[]
WHERE reason_codes IS NULL;

ALTER TABLE public.listing_reports
  ALTER COLUMN reason_codes SET NOT NULL;
