import { Suspense } from "react";
import { connection } from "next/server";
import { LoadingScreen } from "@/components/loading-screen";
import { SiteFooter } from "@/components/layout/site-footer";
import { ListingDetailScreen } from "@/features/discovery/listing-detail-screen";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyProfile } from "@/server/profile";
import { getMyFavouriteIds } from "@/server/favourites";
import { FavouritesProvider } from "@/components/listings/favourite-button";

export const instant = false;

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <main className="flex-1">
        <Suspense fallback={<LoadingScreen />}>
          <ListingDetailContent params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function ListingDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();
  const user = await getCurrentUser();
  const profile = user ? await getMyProfile() : undefined;
  const ids = user ? await getMyFavouriteIds() : [];
  return (
    <FavouritesProvider
      key={`${user?.id ?? "guest"}:${ids.join(",")}`}
      userId={user?.id ?? null}
      initialIds={ids}
    >
      <ListingDetailScreen
        id={id}
        profile={profile}
        isSignedIn={user != null}
      />
    </FavouritesProvider>
  );
}
