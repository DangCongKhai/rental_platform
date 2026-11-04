import Link from "next/link";
import { connection } from "next/server";
import { buttonClass } from "@/components/ui/button";
import { getAdminDashboard } from "@/server/admin/review";

export const instant = false;

function ageLabel(date: Date | null) {
  if (!date) return "Chưa rõ thời gian";
  const hours = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 3_600_000),
  );
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày${hours % 24 ? ` ${hours % 24} giờ` : ""}`;
}

export default async function AdminDashboardPage() {
  await connection();
  const { counts, oldest, recent } = await getAdminDashboard();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#bd7900]">
          Admin console
        </p>
        <h1 className="mt-1 text-3xl font-bold">Bảng điều khiển</h1>
      </header>
      <section
        aria-label="Số liệu tổng quan"
        className="grid gap-4 md:grid-cols-4"
      >
        {[
          [
            "Bài đăng chờ duyệt lần đầu",
            counts.pendingListings,
            "/admin/reviews",
            "Chờ lâu nhất",
          ],
          [
            "Báo cáo đang mở",
            counts.openReports,
            "/admin/reports",
            "Cần được xem xét",
          ],
          [
            "Bài đăng đang bị đình chỉ",
            counts.suspendedListings,
            "/admin/listings",
            "Trên toàn hệ thống",
          ],
        ].map(([label, count, href, hint]) => (
          <Link
            key={label}
            href={String(href)}
            className="rounded-xl border border-[#dce3eb] bg-white p-5 shadow-sm hover:border-[#8ba8c7]"
          >
            <p className="text-sm text-[#627184]">{label}</p>
            <p className="mt-1 text-3xl font-bold">{count}</p>
            <p className="mt-2 text-xs text-[#718096]">{hint}</p>
          </Link>
        ))}

        <div className="rounded-xl border border-[#dce3eb] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#627184]">Tài khoản đang hoạt động</p>
          <p className="mt-1 text-3xl font-bold">{counts.activeAccounts}</p>
          <p className="mt-2 text-xs text-[#718096]">Trạng thái ACTIVE</p>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <section className="overflow-hidden rounded-xl border border-[#dce3eb] bg-white">
          <div className="flex items-center justify-between border-b border-[#e7ebf0] px-5 py-4">
            <h2 className="font-bold">Chờ lâu nhất</h2>
            <Link
              href="/admin/reviews"
              className={buttonClass({
                variant: "secondary",
                className: "min-h-9 px-3 text-xs",
              })}
            >
              Mở hàng đợi
            </Link>
          </div>
          {oldest.length === 0 ? (
            <p className="p-6 text-sm text-[#718096]">
              Không có bài đăng nào đang chờ.
            </p>
          ) : (
            <ul className="divide-y divide-[#e7ebf0]">
              {oldest.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/reviews/${item.id}`}
                      className="font-semibold text-[#1c4d78] hover:underline"
                    >
                      {item.title || item.property.name}
                    </Link>
                    <p className="mt-1 text-xs text-[#718096]">
                      Chủ nhà {item.property.owner.fullName} ·{" "}
                      {item.property.name}
                    </p>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-[#fff0cf] px-2.5 py-1 text-xs font-semibold text-[#825500]">
                    {ageLabel(item.submittedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="overflow-hidden rounded-xl border border-[#dce3eb] bg-white">
          <div className="border-b border-[#e7ebf0] px-5 py-4">
            <h2 className="font-bold">Hoạt động kiểm duyệt gần đây</h2>
          </div>
          {recent.length === 0 ? (
            <p className="p-6 text-sm text-[#718096]">
              Chưa có quyết định kiểm duyệt.
            </p>
          ) : (
            <ul className="divide-y divide-[#e7ebf0]">
              {recent.map((item) => (
                <li key={item.id} className="px-5 py-3 text-sm">
                  <p>
                    <strong>
                      {item.reviewedBy?.fullName ?? "Quản trị viên"}
                    </strong>{" "}
                    đã{" "}
                    {item.moderationStatus === "APPROVED"
                      ? "duyệt"
                      : item.moderationStatus === "REJECTED"
                        ? "từ chối"
                        : "xem xét"}{" "}
                    <Link
                      className="font-medium text-[#1c4d78] hover:underline"
                      href={`/admin/reviews/${item.id}`}
                    >
                      {item.title || "tin đăng"}
                    </Link>
                  </p>
                  <time className="mt-1 block text-xs text-[#718096]">
                    {item.reviewedAt?.toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
