import { amenityCatalogJson } from "@/server/listings/public-api";

export function GET() {
  return Response.json(amenityCatalogJson());
}
