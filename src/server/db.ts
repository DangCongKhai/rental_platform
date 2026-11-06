import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      // A transaction holds one connection. Prisma sends the next
      // statement before the previous one returns, which pg 8.16
      // rejects unless the connection is in pipeline mode.
      pipeline: true,
    }),
  });
}

function getPrisma() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

// The client connects on first use so tests and builds can import this module
// without a database. One instance is reused across hot reloads.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
