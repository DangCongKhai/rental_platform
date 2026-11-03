export type ConfirmableTerms = {
  ownerConfirmedAt: Date | null;
  tenantConfirmedAt: Date | null;
  tenantRejectedAt: Date | null;
  versionNumber: number;
};
/** Proposed or rejected versions never become the current rent or deposit. */
export function currentTerms<T extends ConfirmableTerms>(
  contracts: readonly T[],
): T | null {
  return contracts
    .filter(
      (c) => c.ownerConfirmedAt && c.tenantConfirmedAt && !c.tenantRejectedAt,
    )
    .reduce<T | null>(
      (latest, c) =>
        !latest || c.versionNumber > latest.versionNumber ? c : latest,
      null,
    );
}
