import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { ListingDetailScreen } from "@/features/discovery/listing-detail-screen";
import { getCurrentUser } from "@/lib/auth/current-user";

export const instant = false;

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<LoadingScreen />}>
          <ListingDetailScreen id={id} isSignedIn={user != null} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
