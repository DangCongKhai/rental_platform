import { assertCronRequest } from "@/server/cron";
import { prisma } from "@/server/db";
import { withTransaction } from "@/server/transaction";
import { releaseExpiredHolds } from "@/server/tenancies/expiry";

export async function POST(request: Request) {
  const denied = assertCronRequest(request);
  if (denied) return denied;
  const now = new Date();
  const due = await prisma.tenancy.findMany({
    where: {
      pendingContractId: { not: null },
      confirmationExpiresAt: { lte: now },
    },
    distinct: ["unitId"],
    select: { unitId: true },
    orderBy: { unitId: "asc" },
  });
  // Unit-scoped transactions keep the fallback bounded without a long global lock.
  for (const { unitId } of due) {
    await withTransaction((tx) => releaseExpiredHolds(tx, [unitId], now));
  }
  return Response.json({ processedUnits: due.length });
}
