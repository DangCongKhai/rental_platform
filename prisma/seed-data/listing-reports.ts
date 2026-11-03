// Shared with the isolated seed SQL regression test.
export const listingReportSeedSql = `INSERT INTO listing_reports (
       id, listing_id, reporter_id, reason_code, reason_codes, description, status,
       resolution_summary, reviewed_by, reviewed_at
     ) VALUES
       ($1::uuid, $5::uuid, $6::uuid, 'MISLEADING', ARRAY['MISLEADING'], 'The photos do not match the studio.', 'OPEN', NULL, NULL, NULL),
       ($2::uuid, $5::uuid, $7::uuid, 'OTHER', ARRAY['OTHER'], 'The rent on the listing looks wrong.', 'REVIEWING', NULL, NULL, NULL),
       ($3::uuid, $5::uuid, $8::uuid, 'OTHER', ARRAY['OTHER'], 'This listing should no longer be public.', 'RESOLVED', 'The listing was suspended.', $9::uuid, now()),
       ($4::uuid, $10::uuid, $8::uuid, 'OTHER', ARRAY['OTHER'], 'Hidden listing report.', 'DISMISSED', 'The listing is not public.', $9::uuid, now())`;
