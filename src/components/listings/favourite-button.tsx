"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { removeFavourite, saveFavourite } from "@/server/favourites";

const FavouriteContext = createContext<{
  userId: string | null;
  ids: string[];
  setSaved: (id: string, saved: boolean) => void;
  report: (message: string, tone: "theme" | "error") => void;
} | null>(null);

/** Request props only; no persistent browser cache. Remount for every account. */
export function FavouritesProvider({
  userId,
  initialIds,
  children,
}: {
  userId: string | null;
  initialIds: string[];
  children: ReactNode;
}) {
  const [ids, setIds] = useState(initialIds);
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; tone: "theme" | "error" }>
  >([]);
  const router = useRouter();
  useEffect(() => {
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_OUT" ||
        (session?.user.id && session.user.id !== userId)
      ) {
        setIds([]);
        setCurrentUserId(null);
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [userId, router]);
  function report(message: string, tone: "theme" | "error") {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }
  return (
    <FavouriteContext.Provider
      value={{
        userId: currentUserId,
        ids,
        setSaved: (id, saved) =>
          setIds((current) =>
            saved
              ? [...new Set([...current, id])]
              : current.filter((value) => value !== id),
          ),
        report,
      }}
    >
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(100vw-2rem,320px)] flex-col gap-2">
        {toasts.map((toast) => (
          <p
            key={toast.id}
            role="alert"
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm text-white shadow-float ${toast.tone === "error" ? "bg-danger" : "bg-brand"}`}
          >
            {toast.message}
          </p>
        ))}
      </div>
    </FavouriteContext.Provider>
  );
}

export function FavouriteButton({
  propertyId,
  className = "",
  onRemoved,
}: {
  propertyId: string;
  className?: string;
  onRemoved?: () => void;
}) {
  const context = useContext(FavouriteContext);
  const saved = context?.ids.includes(propertyId) ?? false;
  const [prompt, setPrompt] = useState(false);
  const [pending, setPending] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (prompt) dialog.current?.showModal();
  }, [prompt]);
  async function toggle() {
    if (!context?.userId) {
      setPrompt(true);
      return;
    }
    if (pending) return;
    setPending(true);
    context.setSaved(propertyId, !saved);
    try {
      const result = await (saved
        ? removeFavourite(propertyId)
        : saveFavourite(propertyId));
      if (!result.ok) throw new Error();
      context.report(
        saved ? "Đã bỏ khỏi yêu thích." : "Đã lưu vào Yêu thích.",
        "theme",
      );
      if (saved) onRemoved?.();
    } catch {
      context.setSaved(propertyId, saved);
      context.report("Không lưu được. Thử lại.", "error");
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
      {prompt && (
        <dialog
          ref={dialog}
          aria-labelledby="favourite-login-title"
          onCancel={() => setPrompt(false)}
          className="fixed inset-0 m-auto w-[440px] max-w-[calc(100vw-32px)] rounded-[15px] bg-white p-7 shadow-float backdrop:bg-black/60"
        >
          <h2
            id="favourite-login-title"
            className="text-[22px] font-bold leading-[30px] text-ink"
          >
            Đăng nhập để lưu tin
          </h2>
          <p className="mt-4 text-sm leading-5 text-subtle">
            Tạo tài khoản hoặc đăng nhập để lưu các tin đăng bạn thích và xem
            lại bất cứ lúc nào.
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPrompt(false)}
              className="min-h-11 rounded-[15px] border border-line px-5 font-semibold text-brand"
            >
              Để sau
            </button>
            <Link
              href={`/auth/login?next=${encodeURIComponent(`${pathname}${search ? `?${search}` : ""}`)}`}
              className="inline-flex min-h-11 items-center rounded-[15px] bg-brand px-5 font-semibold text-white"
            >
              Đăng nhập
            </Link>
          </div>
        </dialog>
      )}
    </>
  );
}
