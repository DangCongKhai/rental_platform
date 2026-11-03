import { Suspense } from "react";
import {
  AccountSidebar,
  AccountSidebarFallback,
} from "@/components/account/account-sidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="flex flex-1 flex-col lg:flex-row">
        <Suspense fallback={<AccountSidebarFallback />}>
          <AccountSidebar />
        </Suspense>
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
