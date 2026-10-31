import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { ListingsBrowser } from "@/features/discovery/listings-browser";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyFavouriteIds } from "@/server/favourites";
import { FavouritesProvider } from "@/components/listings/favourite-button";

export default function ListingsPage() {
  return (
    <Suspense fallback={<LoadingScreen className="min-h-0 flex-1" />}>
      <ListingsContent />
    </Suspense>
  );
}

async function ListingsContent() {
  const user = await getCurrentUser();
  const ids = user ? await getMyFavouriteIds() : [];
  return (
    <FavouritesProvider
      key={`${user?.id ?? "guest"}:${ids.join(",")}`}
      userId={user?.id ?? null}
      initialIds={ids}
    >
      <ListingsBrowser />
    </FavouritesProvider>
  );
}
