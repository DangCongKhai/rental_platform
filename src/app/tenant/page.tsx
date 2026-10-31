import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { TenantHome } from "@/components/tenant/tenant-home";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyNotifications } from "@/server/notifications/inbox-read";
import {
  getMyRecentRequests,
  getMyRentalRequests,
  getMyTenancies,
} from "@/server/requests/my-requests";

export default function TenantPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải trang của bạn..."
          className="min-h-80 w-full"
        />
      }
    >
      <TenantHomeContent />
    </Suspense>
  );
}

async function TenantHomeContent() {
  const user = await getCurrentUser();
  const [openRequests, requests, tenancies, notifications] = await Promise.all([
    getMyRentalRequests(),
    getMyRecentRequests(),
    getMyTenancies(),
    getMyNotifications({ audience: "TENANT" }),
  ]);
  return (
    <TenantHome
      name={user?.name ?? "bạn"}
      requests={requests}
      openRequestCount={openRequests.total}
      tenancies={tenancies}
      notifications={notifications}
    />
  );
}
