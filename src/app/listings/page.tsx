import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { ListingsBrowser } from "@/features/discovery/listings-browser";

export default function ListingsPage() {
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<LoadingScreen />}>
          <ListingsBrowser />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
