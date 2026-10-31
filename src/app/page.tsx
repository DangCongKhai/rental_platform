import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { FavouritesProvider } from "@/components/listings/favourite-button";
import { HomePage } from "@/components/home/home-page";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyFavouriteIds } from "@/server/favourites";

export default function Home() {
  return (
    <div data-home className="relative flex min-h-svh flex-col bg-[#f0f4f7]">
      <main className="flex-1">
        <Suspense
          fallback={
            <FavouritesProvider userId={null} initialIds={[]}>
              <HomePage />
            </FavouritesProvider>
          }
        >
          <HomeFavourites />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function HomeFavourites() {
  const user = await getCurrentUser();
  const ids = user ? await getMyFavouriteIds() : [];
  return (
    <FavouritesProvider
      key={`${user?.id ?? "guest"}:${ids.join(",")}`}
      userId={user?.id ?? null}
      initialIds={ids}
    >
      <HomePage />
    </FavouritesProvider>
  );
}
