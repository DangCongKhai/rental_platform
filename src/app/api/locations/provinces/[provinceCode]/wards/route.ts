import { getCurrentWards } from "@/server/administrative-divisions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provinceCode: string }> },
) {
  const { provinceCode } = await params;
  if (!/^\d{1,3}$/u.test(provinceCode)) {
    return Response.json({ error: "Mã tỉnh/thành không hợp lệ." }, { status: 400 });
  }

  try {
    return Response.json(await getCurrentWards(provinceCode));
  } catch {
    return Response.json(
      { error: "Không thể tải danh sách phường/xã. Vui lòng thử lại." },
      { status: 502 },
    );
  }
}
