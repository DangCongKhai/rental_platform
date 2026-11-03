import { Suspense } from "react";
import { AccountSidebarFallback } from "@/components/account/account-sidebar";
import { TenantNav } from "@/components/tenant/tenant-nav";
export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="flex flex-1">
        <Suspense fallback={<AccountSidebarFallback />}>
          <TenantNav />
        </Suspense>
        <main className="min-w-0 flex-1 px-4 pt-7 pb-24 sm:px-10 lg:pb-14">
          {children}
        </main>
      </div>
    </div>
  );
}
