"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { removePhoto, replacePhoto, updateGallery, uploadPhoto } from "../../media-actions";

type MediaItem = {
  id: string;
  unitId: string | null;
  caption: string | null;
  sortOrder: number;
  isSelectedForListing: boolean;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string | null;
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
  const [uploadUnitId, setUploadUnitId] = useState("");
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const [coverMediaId, setCoverMediaId] = useState(initialCoverMediaId);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const dragId = useRef<string | null>(null);

  function moveMedia(sourceId: string, targetId: string) {
    setMedia((current) => {
      const from = current.findIndex((item) => item.id === sourceId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((entry, index) => ({ ...entry, sortOrder: index }));
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
          if (uploadUnitId) formData.set("unitId", uploadUnitId);
          const result = await uploadPhoto(propertyId, formData);
          if (!result.ok || !result.data) {
            failure = result.ok ? "Không nhận được ảnh vừa tải lên." : result.error;
            break;
          }
          uploaded.push(result.data);
          if (!uploadUnitId && !coverMediaId) setCoverMediaId(result.data.id);
        }
      } catch {
        failure = "Không thể tải ảnh lên. Hãy kiểm tra kết nối rồi thử lại.";
      }
      if (uploaded.length > 0) {
        setMedia((current) => [...current, ...uploaded].map((item, index) => ({ ...item, sortOrder: index })));
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
          items: media.map((item, index) => ({
            id: item.id,
            caption: item.caption,
            sortOrder: index,
            isSelectedForListing: item.isSelectedForListing,
          })),
          coverMediaId,
        });
        setMessage(result.ok
          ? { kind: "success", text: "Thư viện ảnh đã được lưu." }
          : { kind: "error", text: result.error });
      } catch {
        setMessage({ kind: "error", text: "Không thể lưu thư viện ảnh. Hãy thử lại." });
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
        setMedia((current) => current.filter((entry) => entry.id !== item.id).map((entry, index) => ({ ...entry, sortOrder: index })));
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Tải ảnh lên</h2>
            <p className="mt-1 text-sm text-subtle">JPEG, PNG hoặc WebP · tối đa 10 MB mỗi ảnh · tối đa 40 ảnh mỗi bất động sản.</p>
          </div>
          <div className="relative block min-w-56 space-y-1.5 text-sm font-semibold text-ink-3">
            <span>Ảnh thuộc về</span>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={scopePickerOpen}
              aria-controls="photo-scope-options"
              onClick={() => setScopePickerOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setScopePickerOpen(false);
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setScopePickerOpen(true);
                }
              }}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line-strong bg-white py-2 pl-3 pr-4 text-left font-normal text-ink shadow-sm transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              <span className="truncate">{uploadUnitId ? units.find((unit) => unit.id === uploadUnitId)?.label ?? "Chọn căn/phòng" : "Bất động sản / khu vực chung"}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`size-4 shrink-0 text-subtle transition-transform ${scopePickerOpen ? "rotate-180" : ""}`}>
                <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {scopePickerOpen && (
              <ul id="photo-scope-options" role="listbox" aria-label="Phạm vi ảnh" className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-lg">
                {[
                  { id: "", label: "Bất động sản / khu vực chung" },
                  ...units.map((unit) => ({ id: unit.id, label: unit.label })),
                ].map((option) => {
                  const selected = uploadUnitId === option.id;
                  return (
                    <li key={option.id || "property"} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setUploadUnitId(option.id);
                          setScopePickerOpen(false);
                        }}
                        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left font-medium transition-colors ${selected ? "bg-brand-soft text-brand-deep" : "text-ink-2 hover:bg-canvas"}`}
                      >
                        <span className="truncate">{option.label}</span>
                        {selected && <span aria-hidden="true" className="text-brand">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-hover has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            {isPending ? "Đang xử lý…" : "Chọn ảnh tải lên"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isPending}
              className="sr-only"
              onChange={(event) => {
                uploadFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Thư viện ảnh</h2>
            <p className="mt-1 text-sm text-subtle">Kéo ảnh để đổi thứ tự, hoặc dùng nút lên/xuống. Nội dung chỉ xuất hiện trên tin khi được chọn.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-deep">{media.length} ảnh</span>
            <button type="button" onClick={saveGallery} disabled={isPending || media.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
              {isPending ? "Đang lưu…" : "Lưu thư viện"}
            </button>
          </div>
        </div>

        {media.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
            <p className="font-semibold text-ink">Chưa có ảnh nào</p>
            <p className="mt-1 text-sm text-subtle">Tải ảnh bất động sản hoặc căn/phòng lên để bắt đầu thư viện.</p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((item, index) => {
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
                        <button type="button" aria-label={`Đưa ảnh ${index + 1} lên trước`} disabled={index === 0 || isPending} onClick={() => moveMedia(item.id, media[index - 1]!.id)} className="size-9 rounded-lg border border-line text-brand-deep disabled:opacity-40">↑</button>
                        <button type="button" aria-label={`Đưa ảnh ${index + 1} xuống sau`} disabled={index === media.length - 1 || isPending} onClick={() => moveMedia(item.id, media[index + 1]!.id)} className="size-9 rounded-lg border border-line text-brand-deep disabled:opacity-40">↓</button>
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

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`fixed bottom-5 right-5 z-50 max-w-md rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-card ${message.kind === "error" ? "border-danger/30 text-danger-ink" : "border-success/30 text-success"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
