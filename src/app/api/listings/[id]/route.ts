import { listingDetailJson } from "@/server/listings/public-api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await listingDetailJson(id);
  if (!body) return Response.json({ message: "Tin đăng không khả dụng" }, { status: 404 });
  return Response.json(body);
}
