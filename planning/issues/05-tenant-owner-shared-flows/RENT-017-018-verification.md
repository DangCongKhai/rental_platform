# RENT-017 and RENT-018 verification

Both issues pass only when the command below exits 0 and the manual checks match. The integration tests need `DATABASE_URL`.

```bash
npx vitest run \
  src/domain/tenancies/calendar-months.test.ts \
  src/domain/tenancies/current-terms.test.ts \
  src/components/tenancies/confirmation-countdown.test.tsx \
  src/server/tenancies/actions.integration.test.ts \
  src/server/tenancies/expiry.integration.test.ts
```

## RENT-017

- Proposal stores version 1, accepts the request, and notifies the tenant (`atomically proposes...`).
- An overlapping hold saves nothing, including when two proposals race (`rolls back every database write when overlapping...`).
- A failed notification rolls the proposal back (`rolls back the hold...`).
- Wrong hash or an old version is refused; decline frees the dates; revision adds version 2; confirm locks the terms (`rejects wrong hash...`).
- An unrelated user cannot download the contract (`authorizes private download...`).
- Move-in is refused before the start date or before both sides confirm, and succeeds after that (`records move-in...`).
- A term under 3 calendar months is a field error and writes nothing (`rejects a term under three calendar months...`).
- In the app: from a pending owner request, the form shows unit, dates and money, the agreed rules, then the PDF. After submit, the tenant review page can confirm or decline, and both detail pages show the version history.

## RENT-018

- Confirm at the exact deadline is refused, the tenancy becomes `EXPIRED`, the blocked dates are cleared, and the request stays `ACCEPTED` (`refuses confirmation exactly at deadline...`).
- A new proposal can use those dates without waiting for cron (`new proposal reuses expired dates...`).
- An expired renewal keeps the confirmed dates. The expiry integration file covers this fallback directly. Renewal actions themselves are RENT-020.
- `POST /api/cron/expire-holds` returns 401 without `CRON_SECRET` and releases due holds with it (`cron refuses absent/wrong credentials...`).
- The countdown test disables confirm and decline at the deadline without submitting.
- In the app: open an expired tenancy as the owner and as the tenant. Both show “Hết hạn”, and the confirm button is disabled. Search can still offer that unit for the same dates.
