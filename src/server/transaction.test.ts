import { beforeEach, describe, expect, it, vi } from "vitest";
import { withRolledBackTransaction, withTransaction } from "./transaction";

const { transaction } = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    $transaction: transaction,
  },
}));

beforeEach(() => {
  transaction.mockReset();
  transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn({ tag: "tx" }),
  );
});

describe("withTransaction", () => {
  it("commits by returning the callback result from the same transaction", async () => {
    const result = await withTransaction(async (tx) => {
      expect(tx).toEqual({ tag: "tx" });
      return 7;
    });

    expect(result).toBe(7);
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("does not commit when the callback throws", async () => {
    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        try {
          return await fn({ tag: "tx" });
        } catch (error) {
          throw error;
        }
      },
    );

    await expect(
      withTransaction(async () => {
        throw new Error("constraint");
      }),
    ).rejects.toThrow("constraint");
  });
});

describe("withRolledBackTransaction", () => {
  it("returns the callback result and still aborts the transaction", async () => {
    let aborted = false;
    transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        try {
          return await fn({ tag: "tx" });
        } catch (error) {
          aborted = true;
          throw error;
        }
      },
    );

    await expect(withRolledBackTransaction(async () => "done")).resolves.toBe(
      "done",
    );
    expect(aborted).toBe(true);
  });
});
