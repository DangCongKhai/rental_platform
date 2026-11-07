import { Suspense } from "react";
import {
  OwnerSidebar,
  OwnerSidebarFallback,
} from "@/components/layout/owner-sidebar";
import { Toaster } from "sonner";

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-canvas">
      <Toaster richColors position="top-right" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <Suspense fallback={<OwnerSidebarFallback />}>
          <OwnerSidebar />
        </Suspense>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-7 sm:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
