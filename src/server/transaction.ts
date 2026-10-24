import { Prisma } from "../../generated/prisma/client";
import { prisma } from "./db";

class RollbackSignal extends Error {
  constructor(readonly result: unknown) {
    super("rollback");
    this.name = "RollbackSignal";
  }
}

function findRollback(error: unknown): RollbackSignal | undefined {
  if (error instanceof RollbackSignal) return error;
  if (error instanceof Error && error.cause !== undefined) {
    return findRollback(error.cause);
  }
  return undefined;
}

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx));
}

/** Runs `fn` inside a transaction and always rolls it back. For tests. */
export async function withRolledBackTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await fn(tx);
      throw new RollbackSignal(result);
    });
  } catch (error) {
    const rolledBack = findRollback(error);
    if (rolledBack) return rolledBack.result as T;
    throw error;
  }

  throw new Error("Transaction committed unexpectedly");
}
