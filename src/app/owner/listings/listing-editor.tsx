"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import type { ListingCompletenessIssue } from "@/domain/listings/completeness";
import { archiveListing, hideListing, publishListing, saveListing, submitListing } from "@/server/listings/owner-listing-actions";

type EditorData = {
  property: { id: string; name: string; addressLine: string | null; ward: string | null; city: string | null; description: string | null; contentRevision: number };
  units: Array<{
    id: string; label: string; isMarketed: boolean; description: string | null; areaM2: number | null;
    advertisedMonthlyRent: number | null; deposit: number | null; minimumRentalMonths: number;
    maxOccupants: number | null; hasSelectedPhoto: boolean;
  }>;
  photos: Array<{ id: string; caption: string | null; signedUrl: string | null }>;
  listing: null | {
    id: string; title: string; description: string; coverMediaId: string | null; moderationStatus: string;
    publicationStatus: string; submittedContentRevision: number | null; reviewReason: string | null; adminSuspendedAt: Date | null; suspensionReason: string | null;
  };
  issues: ListingCompletenessIssue[];
};

const moderationLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};
const publicationLabels: Record<string, string> = { DRAFT: "Chưa đăng", PUBLISHED: "Đang công khai", HIDDEN: "Đã ẩn" };

export function ListingEditor({ initialData }: { initialData: EditorData }) {
  const router = useRouter();
  const [listingId, setListingId] = useState(initialData.listing?.id ?? null);
  const [revision, setRevision] = useState(initialData.property.contentRevision);
  const [title, setTitle] = useState(initialData.listing?.title ?? "");
  const [description, setDescription] = useState(initialData.listing?.description ?? "");
  const [coverMediaId, setCoverMediaId] = useState(initialData.listing?.coverMediaId ?? null);
  const [marketedUnitIds, setMarketedUnitIds] = useState(() => initialData.units.filter((unit) => unit.isMarketed).map((unit) => unit.id));
  const [issues, setIssues] = useState(initialData.issues);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listing = initialData.listing;
  const suspended = Boolean(listing?.adminSuspendedAt);

  function persist(then?: "submit" | "publish") {
    setMessage(null);
    startTransition(async () => {
      try {
        const saved = await saveListing(initialData.property.id, {
          listingId,
          expectedRevision: revision,
          title,
          description,
          coverMediaId,
          marketedUnitIds,
        });
        if (!saved.ok || !saved.data) {
          setMessage(saved.ok ? "Không nhận được dữ liệu tin đăng đã lưu." : saved.error);
          return;
        }
        setListingId(saved.data.id);
        setRevision(saved.data.contentRevision);
        setIssues(saved.data.issues);
        if (!listingId) router.replace(`/owner/listings/${saved.data.id}`);

        if (then === "submit") {
          if (saved.data.issues.length > 0) {
            setMessage(`Chưa thể gửi duyệt. ${saved.data.issues.map((issue) => issue.message).join(" ")}`);
            return;
          }
          const submitted = await submitListing(saved.data.id);
          if (!submitted.ok) {
            setMessage(submitted.error);
            return;
          }
          setMessage("Đã gửi tin đăng đến quản trị viên để xét duyệt.");
          router.refresh();
          return;
        }

        if (then === "publish") {
          const published = await publishListing(saved.data.id);
          if (!published.ok) {
            setMessage(published.error);
            return;
          }
          setMessage("Tin đăng đã được công khai.");
          router.refresh();
          return;
        }
        setMessage("Đã lưu bản nháp tin đăng.");
      } catch {
        setMessage("Không thể lưu tin đăng. Hãy thử lại.");
      }
    });
  }

  function runStateChange(action: (id: string) => Promise<{ ok: boolean; error?: string }>, successMessage: string, archive = false) {
    if (!listingId) return;
    if (archive && !window.confirm("Lưu trữ tin đăng này? Yêu cầu thuê và lịch sử kỳ thuê vẫn được giữ lại.")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action(listingId);
        if (!result.ok) {
          setMessage(result.error ?? "Không thể cập nhật trạng thái tin đăng.");
          return;
        }
        if (archive) router.push("/owner/listings");
        else {
          setMessage(successMessage);
          router.refresh();
        }
      } catch {
        setMessage("Không thể cập nhật trạng thái tin đăng. Hãy thử lại.");
      }
    });
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header className="space-y-2">
        <nav aria-label="Đường dẫn" className="text-sm text-subtle">
          <Link href="/owner/listings" className="hover:text-brand">Tin đăng</Link><span aria-hidden="true"> / </span><span>{initialData.property.name}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{listing ? "Chỉnh sửa tin đăng" : "Tạo tin đăng mới"}</h1>
        <p className="text-sm text-subtle">Thông tin căn/phòng, tiện ích và nội quy được lấy từ bất động sản hiện có.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-deep">{moderationLabels[listing?.moderationStatus ?? "DRAFT"]}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-ink-2">{publicationLabels[listing?.publicationStatus ?? "DRAFT"]}</span>
          {suspended && <span className="rounded-full bg-[#fdf2f1] px-3 py-1 text-sm font-semibold text-danger-ink">Bị đình chỉ bởi quản trị viên</span>}
        </div>
        {listing?.reviewReason && listing.moderationStatus === "REJECTED" && <p className="rounded-xl border border-danger/30 bg-[#fff8f7] p-3 text-sm text-danger-ink">Lý do từ chối: {listing.reviewReason}</p>}
        {listing?.moderationStatus === "PENDING" && listing.submittedContentRevision !== revision && <p role="status" className="rounded-xl border border-[#ead9a1] bg-[#fff9e9] p-3 text-sm text-ink-2">Nội dung đã thay đổi sau khi gửi duyệt. Bản gửi hiện tại đã cũ; quản trị viên cần xem lại phiên bản mới nhất.</p>}
        {suspended && listing?.suspensionReason && <p className="rounded-xl border border-danger/30 bg-[#fff8f7] p-3 text-sm text-danger-ink">Lý do đình chỉ: {listing.suspensionReason}</p>}
      </header>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-ink">Nội dung tin đăng</h2>
        <div className="rounded-xl bg-surface p-4 text-sm text-ink-2">
          <p className="font-semibold">{initialData.property.name}</p>
          <p className="mt-1">{[initialData.property.addressLine, initialData.property.ward, initialData.property.city].filter(Boolean).join(", ") || "Chưa có địa chỉ"}</p>
          {initialData.property.description && <p className="mt-2 line-clamp-3">{initialData.property.description}</p>}
        </div>
        <label className="block space-y-1.5 text-sm font-semibold text-ink-3">
          Tiêu đề tin đăng
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 font-normal text-ink" placeholder="Ví dụ: Studio đầy đủ tiện nghi gần biển Mỹ Khê" />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-ink-3">
          Mô tả tin đăng
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={5} className="w-full rounded-xl border border-line-strong bg-white px-3 py-2 font-normal text-ink" placeholder="Mô tả điểm nổi bật, vị trí và trải nghiệm thuê…" />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold text-ink">Căn/phòng quảng bá</h2>
          <p className="mt-1 text-sm text-subtle">Chọn căn/phòng muốn xuất hiện trên tin. Có thể chỉnh giá và tình trạng trong phần quản lý căn/phòng.</p>
        </div>
        {initialData.units.length === 0 ? <p className="rounded-xl border border-dashed border-line-strong bg-surface p-5 text-sm text-subtle">Bất động sản chưa có căn/phòng.</p> : (
          <ul className="space-y-3">
            {initialData.units.map((unit) => {
              const checked = marketedUnitIds.includes(unit.id);
              return (
                <li key={unit.id} className="rounded-xl border border-line p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={checked} onChange={(event) => setMarketedUnitIds((current) => event.target.checked ? [...current, unit.id] : current.filter((id) => id !== unit.id))} className="mt-1 size-4 accent-brand" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{unit.label}</span>
                      <span className="mt-1 block text-sm text-subtle">{unit.areaM2 ? `${unit.areaM2} m²` : "Thiếu diện tích"} · {unit.advertisedMonthlyRent ? `${new Intl.NumberFormat("vi-VN").format(unit.advertisedMonthlyRent)} ₫/tháng` : "Thiếu giá thuê"} · tối thiểu {unit.minimumRentalMonths} tháng</span>
                      {!unit.hasSelectedPhoto && <span className="mt-1 block text-sm text-danger-ink">Chưa chọn ảnh cho căn/phòng</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <div>
          <h2 className="text-lg font-semibold text-ink">Ảnh bìa</h2>
          <p className="mt-1 text-sm text-subtle">Chọn một ảnh dùng chung đã được bật hiển thị trên tin.</p>
        </div>
        {initialData.photos.length === 0 ? <p className="rounded-xl border border-dashed border-line-strong bg-surface p-5 text-sm text-subtle">Chưa có ảnh dùng chung được chọn. <Link href={`/owner/properties/${initialData.property.id}/media`} className="font-semibold text-brand-deep underline">Quản lý hình ảnh</Link></p> : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {initialData.photos.map((photo) => (
              <li key={photo.id}>
                <button type="button" aria-pressed={coverMediaId === photo.id} onClick={() => setCoverMediaId(photo.id)} className={`w-full overflow-hidden rounded-xl border text-left ${coverMediaId === photo.id ? "border-brand ring-2 ring-brand/30" : "border-line"}`}>
                  <div className="relative aspect-[4/3] bg-surface">{photo.signedUrl ? <Image src={photo.signedUrl} alt={photo.caption || "Ảnh bất động sản"} fill unoptimized className="object-cover" /> : <span className="flex h-full items-center justify-center text-sm text-subtle">Không tải được ảnh</span>}</div>
                  <span className="flex min-h-10 items-center justify-between gap-2 px-3 text-sm"><span className="truncate">{photo.caption || "Ảnh bất động sản"}</span><span className="font-semibold text-brand-deep">{coverMediaId === photo.id ? "Ảnh bìa ✓" : "Chọn làm bìa"}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-ink">Kiểm tra trước khi gửi duyệt</h2>
        {issues.length === 0 ? <p className="rounded-xl bg-success-soft p-4 text-sm font-medium text-success">Thông tin đã đầy đủ để gửi duyệt.</p> : (
          <ul className="space-y-2 text-sm text-danger-ink">{issues.map((issue, index) => <li key={`${issue.field}-${issue.unitLabel ?? ""}-${index}`}>• {issue.message}</li>)}</ul>
        )}
      </section>

      {message && <p role="status" className="rounded-xl border border-line bg-white p-4 text-sm text-ink-2">{message}</p>}

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <Link href="/owner/listings" className={buttonClass({ variant: "secondary" })}>Hủy</Link>
        <div className="flex flex-wrap gap-2">
          {listingId && listing?.publicationStatus === "PUBLISHED" && <button type="button" disabled={isPending} onClick={() => runStateChange(hideListing, "Tin đăng đã được ẩn.")} className={buttonClass({ variant: "secondary" })}>Ẩn tin</button>}
          {listingId && listing?.moderationStatus === "APPROVED" && listing?.publicationStatus !== "PUBLISHED" && !suspended && <button type="button" disabled={isPending} onClick={() => persist("publish")} className={buttonClass()}>Đăng tin</button>}
          {listingId && (listing?.moderationStatus === "DRAFT" || listing?.moderationStatus === "REJECTED") && <button type="button" disabled={isPending} onClick={() => persist("submit")} className={buttonClass()}>Gửi duyệt</button>}
          <button type="button" disabled={isPending} onClick={() => persist()} className={buttonClass({ variant: "secondary" })}>{isPending ? "Đang lưu…" : listing ? "Lưu thay đổi" : "Lưu bản nháp"}</button>
          {listingId && <button type="button" disabled={isPending} onClick={() => runStateChange(archiveListing, "", true)} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-danger-ink hover:bg-[#fff8f7]">Lưu trữ</button>}
        </div>
      </footer>
    </section>
  );
}
