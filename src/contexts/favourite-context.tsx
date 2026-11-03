"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

type ToastTone = "success" | "error";

type FavouriteState = {
  userId: string | null;
  savedPropertyIds: string[];
  setPropertySaved: (propertyId: string, saved: boolean) => void;
  showToast: (message: string, tone: ToastTone) => void;
};

const FavouriteContext = createContext<FavouriteState | null>(null);

export function useFavourites() {
  return useContext(FavouriteContext);
}

/** Saved property ids for every heart under the root layout. */
export function FavouritesProvider({
  userId,
  savedPropertyIds,
  children,
}: {
  userId: string | null;
  savedPropertyIds: string[];
  children: ReactNode;
}) {
  const [propertyIds, setPropertyIds] = useState(savedPropertyIds);
  const [signedInUserId, setSignedInUserId] = useState(userId);
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; tone: ToastTone }>
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
        setPropertyIds([]);
        setSignedInUserId(null);
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [userId, router]);
  function showToast(message: string, tone: ToastTone) {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }
  return (
    <FavouriteContext.Provider
      value={{
        userId: signedInUserId,
        savedPropertyIds: propertyIds,
        setPropertySaved: (propertyId, saved) =>
          setPropertyIds((current) =>
            saved
              ? [...new Set([...current, propertyId])]
              : current.filter((id) => id !== propertyId),
          ),
        showToast,
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
