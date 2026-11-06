UPDATE units
SET deposit = advertised_monthly_rent - 1
WHERE deposit IS NOT NULL
  AND advertised_monthly_rent IS NOT NULL
  AND deposit >= advertised_monthly_rent
  AND advertised_monthly_rent >= 1;

UPDATE units
SET deposit = NULL
WHERE deposit IS NOT NULL
  AND advertised_monthly_rent IS NOT NULL
  AND deposit >= advertised_monthly_rent;

ALTER TABLE units
  ADD CONSTRAINT units_deposit_below_rent
  CHECK (
    deposit IS NULL
    OR advertised_monthly_rent IS NULL
    OR deposit < advertised_monthly_rent
  );
