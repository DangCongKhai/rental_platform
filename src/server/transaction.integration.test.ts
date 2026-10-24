import { Prisma } from "@prisma/client/extension";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL;
console.log("databaseUrl", databaseUrl);
describe.skipIf(!databaseUrl)("withRolledBackTransaction integration", () => {
  it("removes an insert after the transaction rolls back", async () => {
    const { prisma } = await import("./db");
    const { withRolledBackTransaction } = await import("./transaction");
    const table = `rollback_probe_${crypto.randomUUID().replaceAll("-", "")}`;
    if (!/^rollback_probe_[0-9a-f]+$/.test(table)) {
      throw new Error("Unsafe rollback probe name");
    }

    await prisma.$executeRawUnsafe(`CREATE TABLE "${table}" (id integer)`);
    try {
      await withRolledBackTransaction(async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(`INSERT INTO "${table}" (id) VALUES (1)`);
        return "inserted";
      });

      const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
        `SELECT id FROM "${table}"`,
      );
      expect(rows).toEqual([]);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}"`);
      await prisma.$disconnect();
    }
  });
});
