ALTER TABLE listing_reports ADD COLUMN reason_codes TEXT[];
UPDATE listing_reports SET reason_codes = ARRAY[reason_code];
ALTER TABLE listing_reports ALTER COLUMN reason_codes SET NOT NULL;
