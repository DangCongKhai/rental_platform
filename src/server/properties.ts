import { connection } from "next/server";
import { requireUser } from "./auth";
import { prisma } from "./db";

export async function getMyProperties(archived = false) {
    await connection();
    const user = await requireUser();

    return prisma.property.findMany({
        where: {
            ownerId: user.profileId,
            archivedAt: archived ? { not: null } : null,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        include: {
            _count: {
                select: { units: true },
            },
            listings: {
                where: { archivedAt: null },
                orderBy: { updatedAt: "desc" },
                take: 1,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    coverMediaId: true,
                    moderationStatus: true,
                    publicationStatus: true,
                    reviewReason: true,
                    adminSuspendedAt: true,
                    suspensionReason: true,
                },
            },
        },
    });
}

    export async function getMyProperty(id: string) {
    await connection();
    const user = await requireUser();

    return prisma.property.findFirst({
        where: {
            id,
            ownerId: user.profileId,
            archivedAt: null,
        },
        include: {
            units: {
                where: { archivedAt: null },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            },
            listings: {
                where: { archivedAt: null },
                orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
                take: 1,
                select: { id: true, moderationStatus: true, publicationStatus: true },
            },
        },
    });
}
