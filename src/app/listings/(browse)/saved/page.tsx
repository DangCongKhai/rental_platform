import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { getMyFavourites } from "@/server/favourites";
import { FavouritesProvider } from "@/components/listings/favourite-button";
import { SavedListings } from "@/components/listings/saved-listings";

export default function SavedListingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <main className="flex flex-1">
        <Suspense fallback={<LoadingScreen className="min-h-0 flex-1" />}>
          <SavedListingsContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function SavedListingsContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=%2Flistings%2Fsaved");
  const favourites = await getMyFavourites();
  return (
    <FavouritesProvider
      key={`${user.id}:${favourites.map((row) => row.propertyId).join(",")}`}
      userId={user.id}
      initialIds={favourites.map((row) => row.propertyId)}
    >
      <SavedListings favourites={favourites} />
    </FavouritesProvider>
  );
}
