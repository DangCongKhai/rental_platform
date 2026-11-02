import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getReviewQueue } from "@/server/admin/review";

export const instant = false;

export default async function AdminReviewQueuePage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; decision?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const queue = await getReviewQueue(page, params.q ?? "");
  const href = (nextPage: number) => `/admin/reviews?page=${nextPage}${queue.search ? `&q=${encodeURIComponent(queue.search)}` : ""}`;
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#bd7900]">Kiểm duyệt</p><h1 className="mt-1 text-3xl font-bold">Hàng đợi kiểm duyệt</h1><p className="mt-1 text-sm text-[#627184]">Chỉ hiển thị bài đăng gửi duyệt lần đầu, sắp xếp từ cũ nhất.</p></div>
        <form action="/admin/reviews" className="flex gap-2"><input name="q" defaultValue={queue.search} placeholder="Tìm tiêu đề hoặc chủ nhà" aria-label="Tìm tiêu đề hoặc chủ nhà" className="min-h-10 w-64 rounded-lg border border-[#cad4df] bg-white px-3 text-sm outline-none focus:border-[#376da5]"/><button className={buttonClass({ className: "min-h-10 rounded-lg px-4 text-sm" })}>Tìm</button></form>
      </header>
      {params.decision === "approved" && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">Đã phê duyệt bài đăng. Chủ nhà có thể tiếp tục bước công khai.</p>}
      {params.decision === "rejected" && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">Đã từ chối bài đăng và gửi lý do cho chủ nhà.</p>}
      <div className="overflow-x-auto rounded-xl border border-[#dce3eb] bg-white shadow-sm">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-[#f7f9fb] text-xs uppercase tracking-wide text-[#627184]"><tr>{["Tiêu đề", "Chủ nhà", "Bất động sản", "Căn", "Ảnh", "Đã chờ", ""].map((heading, index) => <th key={`${heading}-${index}`} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#e7ebf0]">
            {queue.rows.map((item) => <tr key={item.id}>
              <td className="max-w-64 px-4 py-4 font-semibold text-[#172331]">{item.title || item.property.name}</td><td className="px-4 py-4">{item.property.owner.fullName}</td><td className="px-4 py-4">{item.property.name}</td><td className="px-4 py-4">{item.property._count.units}</td><td className="px-4 py-4">{item.property._count.media}</td><td className="px-4 py-4">{item.submittedAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "—"}</td><td className="px-4 py-4"><Link href={`/admin/reviews/${item.id}`} className={buttonClass({ className: "min-h-9 rounded-lg px-3 text-xs" })}>Mở xem</Link></td>
            </tr>)}
          </tbody>
        </table>
        {queue.rows.length === 0 && <div className="p-10 text-center"><p className="font-semibold">{queue.search ? "Không tìm thấy bài đăng phù hợp." : "Không có bài đăng nào đang chờ."}</p><p className="mt-1 text-sm text-[#718096]">Bài đăng mới gửi duyệt sẽ xuất hiện tại đây.</p></div>}
      </div>
      <footer className="flex items-center justify-between text-sm text-[#627184]"><span>{queue.total} bài đăng · Trang {queue.page}/{queue.pageCount}</span><div className="flex gap-2">{queue.page > 1 && <Link href={href(queue.page - 1)} className={buttonClass({ variant: "secondary", className: "min-h-9 rounded-lg px-3 text-xs" })}>Trang trước</Link>}{queue.page < queue.pageCount && <Link href={href(queue.page + 1)} className={buttonClass({ variant: "secondary", className: "min-h-9 rounded-lg px-3 text-xs" })}>Trang sau</Link>}</div></footer>
    </div>
  );
}
