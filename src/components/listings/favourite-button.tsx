"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFavourites } from "@/contexts/favourite-context";
import { removeFavourite, saveFavourite } from "@/server/favourites";

export function FavouriteButton({
  propertyId,
  className = "",
  onRemoved,
}: {
  propertyId: string;
  className?: string;
  onRemoved?: () => void;
}) {
  const favourites = useFavourites();
  const saved = favourites?.savedPropertyIds.includes(propertyId) ?? false;
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  async function toggle() {
    if (!favourites?.userId) {
      setLoginOpen(true);
      return;
    }
    if (pending) return;
    setPending(true);
    favourites.setPropertySaved(propertyId, !saved);
    try {
      const result = await (saved
        ? removeFavourite(propertyId)
        : saveFavourite(propertyId));
      if (!result.ok) throw new Error();
      favourites.showToast(
        saved ? "Đã bỏ khỏi yêu thích." : "Đã lưu vào Yêu thích.",
        "success",
      );
      if (saved) onRemoved?.();
    } catch {
      favourites.setPropertySaved(propertyId, saved);
      favourites.showToast("Không lưu được. Thử lại.", "error");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        aria-label={saved ? "Bỏ khỏi yêu thích" : "Lưu tin"}
        aria-pressed={saved}
        disabled={pending}
        onClick={toggle}
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#091216] shadow-md transition-colors duration-200 hover:cursor-pointer hover:bg-slate-100 disabled:opacity-70 ${className}`}
      >
        <Image
          src={
            saved
              ? "/images/listings/favourite-saved.svg"
              : "/images/listings/favourite-empty.svg"
          }
          width={20}
          height={20}
          alt=""
        />
      </button>
      <FavouriteLoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        returnPath={`${pathname}${search ? `?${search}` : ""}`}
      />
    </>
  );
}

function FavouriteLoginDialog({
  open,
  onClose,
  returnPath,
}: {
  open: boolean;
  onClose: () => void;
  returnPath: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="favourite-login-title"
      onCancel={onClose}
      className="fixed inset-0 m-auto w-[440px] max-w-[calc(100vw-32px)] rounded-[15px] bg-white p-7 shadow-float backdrop:bg-black/60"
    >
      <h2
        id="favourite-login-title"
        className="text-[22px] font-bold leading-[30px] text-ink"
      >
        Đăng nhập để lưu tin
      </h2>
      <p className="mt-4 text-sm leading-5 text-subtle">
        Tạo tài khoản hoặc đăng nhập để lưu các tin đăng bạn thích và xem lại
        bất cứ lúc nào.
      </p>
      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-[15px] border border-line px-5 font-semibold text-brand"
        >
          Để sau
        </button>
        <Link
          href={`/auth/login?next=${encodeURIComponent(returnPath)}`}
          className="inline-flex min-h-11 items-center rounded-[15px] bg-brand px-5 font-semibold text-white"
        >
          Đăng nhập
        </Link>
      </div>
    </dialog>
  );
}
