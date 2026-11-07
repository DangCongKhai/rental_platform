import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { LoadingScreen } from "@/components/loading-screen";
import { RentalRequestScreen } from "@/components/listings/rental-request-screen";
import { listingDetailJson } from "@/server/listings/public-api";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyProfile } from "@/server/profile";
export const instant = false;
export default function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <main className="flex-1 px-4">
        <Suspense fallback={<LoadingScreen />}>
          <Content params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await listingDetailJson(id);
  if (!listing) notFound();
  const user = await getCurrentUser();
  const profile = user ? await getMyProfile() : undefined;
  return <RentalRequestScreen listing={listing.data} profile={profile} />;
}
