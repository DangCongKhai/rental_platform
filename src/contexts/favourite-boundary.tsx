import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyFavouriteIds } from "@/server/favourites";
import { FavouritesProvider } from "./favourite-context";

export function FavouriteBoundaryFallback({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FavouritesProvider userId={null} savedPropertyIds={[]}>
      {children}
    </FavouritesProvider>
  );
}

export async function FavouriteBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const savedPropertyIds = user ? await getMyFavouriteIds() : [];
  return (
    <FavouritesProvider
      key={`${user?.id ?? "guest"}:${savedPropertyIds.join(",")}`}
      userId={user?.id ?? null}
      savedPropertyIds={savedPropertyIds}
    >
      {children}
    </FavouritesProvider>
  );
}
