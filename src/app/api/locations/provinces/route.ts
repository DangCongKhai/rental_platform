import {
  AdministrativeDivisionError,
  getCurrentProvinces,
} from "@/server/administrative-divisions";

export async function GET() {
  try {
    return Response.json(await getCurrentProvinces());
  } catch (error) {
    const status =
      error instanceof AdministrativeDivisionError ? error.status : undefined;
    console.error("Failed to load provinces.", status, error);
    return Response.json(
      { error: "Không thể tải danh sách tỉnh/thành. Vui lòng thử lại." },
      { status: 502 },
    );
  }
}
