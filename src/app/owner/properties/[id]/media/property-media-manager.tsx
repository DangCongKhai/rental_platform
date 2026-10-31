"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { removePhoto, replacePhoto, setAllSharedPhotosForUnit, setSharedPhotoForUnit, updateGallery, uploadPhoto } from "../../media-actions";

type MediaItem = {
  id: string;
  unitId: string | null;
  caption: string | null;
  sortOrder: number;
  isSelectedForListing: boolean;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string | null;
  assignedUnitIds: string[];
};

type UnitOption = { id: string; label: string };

export function PropertyMediaManager({
  propertyId,
  units,
  initialMedia,
  initialCoverMediaId,
}: {
  propertyId: string;
  units: UnitOption[];
  initialMedia: MediaItem[];
  initialCoverMediaId: string | null;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [galleryScope, setGalleryScope] = useState<"property" | "unit">("property");
  const [activeUnitId, setActiveUnitId] = useState(units[0]?.id ?? "");
  const [coverMediaId, setCoverMediaId] = useState(initialCoverMediaId);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const dragId = useRef<string | null>(null);

  const visibleMedia = media.filter((item) =>
    galleryScope === "property" ? item.unitId === null : item.unitId === activeUnitId,
  );
  const sharedMedia = media.filter((item) => item.unitId === null);
  const allSharedPhotosIncluded = sharedMedia.length > 0 && sharedMedia.every((item) => item.assignedUnitIds.includes(activeUnitId));

  function moveMedia(sourceId: string, targetId: string) {
    setMedia((current) => {
      const scopeItems = current.filter((item) =>
        galleryScope === "property" ? item.unitId === null : item.unitId === activeUnitId,
      );
      const from = scopeItems.findIndex((item) => item.id === sourceId);
      const to = scopeItems.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...scopeItems];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      const reordered = new Map(next.map((entry, index) => [entry.id, index]));
      return current.map((entry) => reordered.has(entry.id) ? { ...entry, sortOrder: reordered.get(entry.id)! } : entry);
    });
  }

  function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const uploaded: MediaItem[] = [];
      let failure: string | null = null;
      try {
        for (const file of files) {
          const formData = new FormData();
          formData.set("file", file);
          if (galleryScope === "unit" && activeUnitId) formData.set("unitId", activeUnitId);
          const result = await uploadPhoto(propertyId, formData);
          if (!result.ok || !result.data) {
            failure = result.ok ? "Không nhận được ảnh vừa tải lên." : result.error;
            break;
          }
          uploaded.push(result.data);
          if (galleryScope === "property" && !coverMediaId) setCoverMediaId(result.data.id);
        }
      } catch {
        failure = "Không thể tải ảnh lên. Hãy kiểm tra kết nối rồi thử lại.";
      }
      if (uploaded.length > 0) {
        setMedia((current) => [...current, ...uploaded]);
        setMessage(failure
          ? { kind: "error", text: `Đã tải ${uploaded.length} ảnh; ảnh tiếp theo gặp lỗi: ${failure}` }
          : { kind: "success", text: `Đã tải lên ${uploaded.length} ảnh.` });
      } else if (failure) {
        setMessage({ kind: "error", text: failure });
      }
    });
  }

  function saveGallery() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateGallery(propertyId, {
          items: visibleMedia.map((item, index) => ({
            id: item.id,
            caption: item.caption,
            sortOrder: index,
            isSelectedForListing: item.isSelectedForListing,
          })),
          ...(galleryScope === "property" ? { coverMediaId } : {}),
        }, galleryScope === "unit" ? activeUnitId : undefined);
        setMessage(result.ok
          ? { kind: "success", text: "Thư viện ảnh đã được lưu." }
          : { kind: "error", text: result.error });
      } catch {
        setMessage({ kind: "error", text: "Không thể lưu thư viện ảnh. Hãy thử lại." });
      }
    });
  }

  function toggleSharedPhoto(item: MediaItem) {
    if (!activeUnitId || isPending) return;
    const included = item.assignedUnitIds.includes(activeUnitId);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await setSharedPhotoForUnit(propertyId, activeUnitId, item.id, !included);
        if (!result.ok) {
          setMessage({ kind: "error", text: result.error });
          return;
        }
        setMedia((current) => current.map((entry) => entry.id === item.id
          ? {
              ...entry,
              assignedUnitIds: result.data?.included
                ? [...new Set([...entry.assignedUnitIds, activeUnitId])]
                : entry.assignedUnitIds.filter((id) => id !== activeUnitId),
            }
          : entry));
        setMessage({ kind: "success", text: result.data?.included ? "Đã thêm ảnh dùng chung vào căn/phòng." : "Đã gỡ ảnh khỏi căn/phòng này." });
      } catch {
        setMessage({ kind: "error", text: "Không thể cập nhật ảnh dùng chung. Hãy thử lại." });
      }
    });
  }

  function toggleAllSharedPhotos() {
    if (!activeUnitId || isPending || sharedMedia.length === 0) return;
    const included = !allSharedPhotosIncluded;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await setAllSharedPhotosForUnit(propertyId, activeUnitId, included);
        if (!result.ok || !result.data) {
          setMessage({ kind: "error", text: result.ok ? "Không thể cập nhật ảnh dùng chung." : result.error });
          return;
        }
        const mediaIds = new Set(result.data.mediaIds);
        setMedia((current) => current.map((item) => {
          if (!mediaIds.has(item.id)) return item;
          const assignedUnitIds = item.assignedUnitIds.filter((id) => id !== activeUnitId);
          return { ...item, assignedUnitIds: included ? [...assignedUnitIds, activeUnitId] : assignedUnitIds };
        }));
        setMessage({ kind: "success", text: included ? "Đã chọn tất cả ảnh dùng chung cho căn/phòng." : "Đã bỏ chọn tất cả ảnh dùng chung của căn/phòng." });
      } catch {
        setMessage({ kind: "error", text: "Không thể cập nhật ảnh dùng chung. Hãy thử lại." });
      }
    });
  }

  function deleteMedia(item: MediaItem) {
    const confirmed = window.confirm(`Lưu trữ ảnh${item.caption ? ` “${item.caption}”` : " này"}? Tệp ảnh sẽ được giữ lại.`);
    if (!confirmed) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await removePhoto(propertyId, item.id);
        if (!result.ok) {
          setMessage({ kind: "error", text: result.error });
          return;
        }
        setMedia((current) => current.filter((entry) => entry.id !== item.id));
        if (coverMediaId === item.id) setCoverMediaId(null);
        setMessage({ kind: "success", text: "Ảnh đã được gỡ khỏi thư viện." });
      } catch {
        setMessage({ kind: "error", text: "Không thể gỡ ảnh. Hãy thử lại." });
      }
    });
  }

  function replaceMedia(item: MediaItem, file: File | undefined) {
    if (!file) return;
    setMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        const result = await replacePhoto(propertyId, item.id, formData);
        if (!result.ok || !result.data) {
          setMessage({ kind: "error", text: result.ok ? "Không nhận được ảnh thay thế." : result.error });
          return;
        }
        setMedia((current) => current.map((entry) => entry.id === item.id ? { ...result.data!, sortOrder: item.sortOrder } : entry));
        if (coverMediaId === item.id) setCoverMediaId(result.data.id);
        setMessage({ kind: "success", text: "Ảnh đã được thay bằng tệp mới." });
      } catch {
        setMessage({ kind: "error", text: "Không thể thay ảnh. Ảnh cũ vẫn được giữ nguyên." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Quản lý ảnh</h2>
            <p className="mt-1 text-sm text-subtle">Ảnh dùng chung chỉ lưu một bản. Bạn có thể thêm ảnh đó vào nhiều căn/phòng.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Thư viện ảnh">
            <button type="button" aria-pressed={galleryScope === "property"} onClick={() => setGalleryScope("property")} className={`min-h-10 rounded-lg border px-4 text-sm font-semibold ${galleryScope === "property" ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-ink-2 hover:bg-canvas"}`}>
              Ảnh bất động sản
            </button>
            {units.length > 0 && (
              <button type="button" aria-pressed={galleryScope === "unit"} onClick={() => setGalleryScope("unit")} className={`min-h-10 rounded-lg border px-4 text-sm font-semibold ${galleryScope === "unit" ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-ink-2 hover:bg-canvas"}`}>
                Ảnh căn/phòng
              </button>
            )}
          </div>
        </div>

        {galleryScope === "unit" && units.length > 0 && (
          <label className="mt-5 block max-w-md space-y-1.5 text-sm font-semibold text-ink-3">
            Chọn căn/phòng
            <select value={activeUnitId} onChange={(event) => setActiveUnitId(event.target.value)} className="min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-sm font-normal">
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
            </select>
          </label>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-4">
          <p className="text-sm text-subtle">JPEG, PNG hoặc WebP · tối đa 10 MB mỗi ảnh · tối đa 40 ảnh mỗi bất động sản.</p>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-hover has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            {isPending ? "Đang xử lý…" : galleryScope === "unit" ? "Tải ảnh riêng lên căn này" : "Tải ảnh dùng chung lên"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isPending || (galleryScope === "unit" && !activeUnitId)}
              className="sr-only"
              onChange={(event) => {
                uploadFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>

      {galleryScope === "unit" && activeUnitId && (
        <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink">Ảnh dùng chung từ bất động sản</h2>
              <p className="mt-1 text-sm text-subtle">Chọn ảnh sẽ xuất hiện trong thư viện của {units.find((unit) => unit.id === activeUnitId)?.label}. Ảnh được dùng lại trực tiếp, không tải lên bản sao.</p>
            </div>
            {sharedMedia.length > 0 && (
              <button type="button" disabled={isPending} onClick={toggleAllSharedPhotos} className="min-h-10 shrink-0 rounded-lg border border-line-strong px-4 text-sm font-semibold text-brand-deep hover:bg-brand-soft disabled:opacity-60">
                {allSharedPhotosIncluded ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            )}
          </div>
          {sharedMedia.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-line-strong bg-surface p-6 text-sm text-subtle">Chưa có ảnh dùng chung. Hãy thêm ảnh trong mục “Ảnh bất động sản”.</p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {sharedMedia.map((item) => {
                const included = item.assignedUnitIds.includes(activeUnitId);
                return (
                  <li key={item.id} className="overflow-hidden rounded-xl border border-line bg-white">
                    <div className="relative aspect-[4/3] bg-surface">
                      {item.signedUrl ? <Image src={item.signedUrl} alt={item.caption || "Ảnh dùng chung"} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-subtle">Không tải được ảnh</div>}
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3">
                      <span className="min-w-0 truncate text-sm text-ink-2">{item.caption || "Ảnh dùng chung"}</span>
                      <button type="button" aria-pressed={included} disabled={isPending} onClick={() => toggleSharedPhoto(item)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60 ${included ? "border-brand bg-brand-soft text-brand-deep" : "border-line-strong text-ink-2 hover:bg-canvas"}`}>
                        {included ? "Đã thêm ✓" : "Thêm vào căn"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">{galleryScope === "property" ? "Thư viện ảnh bất động sản" : `Ảnh riêng của ${units.find((unit) => unit.id === activeUnitId)?.label ?? "căn/phòng"}`}</h2>
            <p className="mt-1 text-sm text-subtle">Kéo ảnh để đổi thứ tự, hoặc dùng nút lên/xuống. Nội dung chỉ xuất hiện trên tin khi được chọn.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-deep">{visibleMedia.length} ảnh</span>
            <button type="button" onClick={saveGallery} disabled={isPending || visibleMedia.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
              {isPending ? "Đang lưu…" : "Lưu thư viện"}
            </button>
          </div>
        </div>

        {visibleMedia.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
            <p className="font-semibold text-ink">{galleryScope === "property" ? "Chưa có ảnh bất động sản" : "Chưa có ảnh riêng của căn/phòng này"}</p>
            <p className="mt-1 text-sm text-subtle">{galleryScope === "property" ? "Tải ảnh dùng chung lên để có thể thêm chúng vào thư viện của các căn/phòng." : "Tải ảnh riêng lên hoặc thêm ảnh dùng chung ở mục phía trên."}</p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleMedia.map((item, index) => {
              const unitLabel = units.find((unit) => unit.id === item.unitId)?.label;
              const isCover = coverMediaId === item.id;
              return (
                <li
                  key={item.id}
                  draggable={!isPending}
                  onDragStart={(event) => {
                    dragId.current = item.id;
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragId.current) moveMedia(dragId.current, item.id);
                    dragId.current = null;
                  }}
                  className="overflow-hidden rounded-xl border border-line bg-white"
                >
                  <div className="relative aspect-[4/3] bg-surface">
                    {item.signedUrl ? (
                      <Image src={item.signedUrl} alt={item.caption || `Ảnh ${index + 1}`} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-5 text-center text-sm text-subtle">Không tải được ảnh xem trước. Hãy tải lại trang.</div>
                    )}
                    {isCover && <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">Ảnh bìa</span>}
                    {!item.isSelectedForListing && <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-white">Đang ẩn</span>}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-subtle">
                      <span>{unitLabel ? `Căn/phòng ${unitLabel}` : "Bất động sản / khu vực chung"}</span>
                      <span>{(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                    <label className="block space-y-1 text-sm font-medium text-ink-3">
                      Chú thích
                      <input
                        value={item.caption ?? ""}
                        maxLength={240}
                        onChange={(event) => setMedia((current) => current.map((entry) => entry.id === item.id ? { ...entry, caption: event.target.value || null } : entry))}
                        className="min-h-10 w-full rounded-lg border border-line-strong px-3"
                        placeholder="Mô tả ngắn cho ảnh"
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
                      <label className="inline-flex min-h-9 items-center gap-2 text-sm text-ink-2">
                        <input
                          type="checkbox"
                          checked={item.isSelectedForListing}
                          onChange={(event) => setMedia((current) => current.map((entry) => entry.id === item.id ? { ...entry, isSelectedForListing: event.target.checked } : entry))}
                          className="size-4 accent-brand"
                        />
                        Hiển thị trên tin
                      </label>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label={`Đưa ảnh ${index + 1} lên trước`} disabled={index === 0 || isPending} onClick={() => moveMedia(item.id, visibleMedia[index - 1]!.id)} className="size-9 rounded-lg border border-line text-brand-deep disabled:opacity-40">↑</button>
                        <button type="button" aria-label={`Đưa ảnh ${index + 1} xuống sau`} disabled={index === visibleMedia.length - 1 || isPending} onClick={() => moveMedia(item.id, visibleMedia[index + 1]!.id)} className="size-9 rounded-lg border border-line text-brand-deep disabled:opacity-40">↓</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button type="button" disabled={Boolean(item.unitId) || !item.isSelectedForListing || isPending} onClick={() => setCoverMediaId(item.id)} className="text-sm font-semibold text-brand-deep underline disabled:cursor-not-allowed disabled:opacity-40">
                        {isCover ? "Ảnh bìa hiện tại" : "Đặt làm ảnh bìa"}
                      </button>
                      <div className="flex items-center gap-3 text-sm font-semibold">
                        <label className="cursor-pointer text-brand-deep hover:underline">
                          Thay ảnh
                          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isPending} className="sr-only" onChange={(event) => { replaceMedia(item, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                        </label>
                        <button type="button" disabled={isPending} onClick={() => deleteMedia(item)} className="text-danger-ink hover:underline">Gỡ ảnh</button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {units.length > 0 && (
        <section className="space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-bold text-ink">Ảnh hiện có theo căn/phòng</h2>
            <p className="mt-1 text-sm text-subtle">Tổng hợp ảnh dùng chung đã chọn cho từng căn/phòng và ảnh tải riêng lên.</p>
          </div>
          <div className="space-y-5">
            {units.map((unit) => {
              const unitPhotos = media.filter((item) =>
                item.unitId === unit.id || (item.unitId === null && item.assignedUnitIds.includes(unit.id)),
              );
              return (
                <section key={unit.id} className="rounded-xl bg-surface p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">{unit.label}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-sm text-subtle">{unitPhotos.length} ảnh</span>
                  </div>
                  {unitPhotos.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line-strong bg-white p-4 text-sm text-subtle">Chưa có ảnh cho căn/phòng này.</p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {unitPhotos.map((item) => (
                        <li key={item.id} className="overflow-hidden rounded-xl border border-line bg-white">
                          <div className="relative aspect-[4/3] bg-surface">
                            {item.signedUrl ? <Image src={item.signedUrl} alt={item.caption || `Ảnh ${unit.label}`} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-subtle">Không tải được ảnh</div>}
                          </div>
                          <div className="flex items-center justify-between gap-2 p-3">
                            <span className="min-w-0 truncate text-sm text-ink-2">{item.caption || "Chưa có chú thích"}</span>
                            <span className="shrink-0 rounded-full bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-deep">{item.unitId === null ? "Dùng chung" : "Ảnh riêng"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      )}

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`fixed bottom-5 right-5 z-50 max-w-md rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-card ${message.kind === "error" ? "border-danger/30 text-danger-ink" : "border-success/30 text-success"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
