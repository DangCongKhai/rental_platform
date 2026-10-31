import {
  listingsIndexJson,
  validationResponse,
} from "@/server/listings/public-api";

export async function GET(request: Request) {
  try {
    const body = await listingsIndexJson(new URL(request.url).searchParams);
    return Response.json(body);
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return Response.json(invalid.body, { status: invalid.status });
    throw error;
  }
}
