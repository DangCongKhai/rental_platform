import { getCurrentProvinces } from "@/server/administrative-divisions";

export async function GET() {
  try {
    return Response.json(await getCurrentProvinces());
  } catch {
    return Response.json(
      { error: "Không thể tải danh sách tỉnh/thành. Vui lòng thử lại." },
      { status: 502 },
    );
  }
}
