import { Prisma } from "../../generated/prisma/client";

export async function createNotification(
  tx: Prisma.TransactionClient,
  input: {
    recipientId: string;
    audience: "TENANT" | "OWNER" | "ADMIN";
    eventKey: string;
    title: string;
    body: string;
    link: { resourceType: string; resourceId: string };
  },
): Promise<{ id: string }> {
  return tx.notification.create({
    data: {
      recipientId: input.recipientId,
      audience: input.audience,
      eventKey: input.eventKey,
      title: input.title,
      body: input.body,
      resourceType: input.link.resourceType,
      resourceId: input.link.resourceId,
    },
    select: { id: true },
  });
}
