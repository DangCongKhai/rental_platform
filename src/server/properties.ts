import { requireUser } from "./auth";
import { prisma } from "./db";

export async function getMyProperties() {
    const user = await requireUser();

    return prisma.property.findMany({
        where: {
            ownerId: user.profileId,
            archivedAt: null,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        include: {
            _count: {
                select: {
                units: true,
                listings: true,
                },
            },
        },
    });
    }

    export async function getMyProperty(id: string) {
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
        },
    });
}