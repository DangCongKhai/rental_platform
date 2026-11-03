import { Suspense } from "react";
import {
  DiscoverySidebar,
  DiscoverySidebarFallback,
} from "@/features/discovery/discovery-sidebar";

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 top-[75px] bottom-0 flex overflow-hidden bg-[#f0f4f7]">
      <Suspense fallback={<DiscoverySidebarFallback />}>
        <DiscoverySidebar />
      </Suspense>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
