import { Suspense } from "react";
import {
  OwnerSidebar,
  OwnerSidebarFallback,
} from "@/components/layout/owner-sidebar";

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Suspense fallback={<OwnerSidebarFallback />}>
          <OwnerSidebar />
        </Suspense>
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
