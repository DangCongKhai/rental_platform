import { Prisma } from "../../generated/prisma/client";

export async function createNotification(
  tx: Prisma.TransactionClient,
  input: {
    recipientId: string;
    eventKey: string;
    title: string;
    body: string;
    link: { resourceType: string; resourceId: string };
  },
): Promise<{ id: string }> {
  return tx.notification.create({
    data: {
      recipientId: input.recipientId,
      eventKey: input.eventKey,
      title: input.title,
      body: input.body,
      resourceType: input.link.resourceType,
      resourceId: input.link.resourceId,
    },
    select: { id: true },
  });
}
