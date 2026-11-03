import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { NotificationList } from "@/components/account/notification-list";
import { getMyNotifications } from "@/server/notifications/inbox-read";

export default function NotificationsPage() {
  return (
    <section className="max-w-[1100px]">
      <h1 className="mb-5 text-[28px] leading-9 font-bold tracking-[-0.56px]">
        Thông báo
      </h1>
      <Suspense
        fallback={
          <LoadingScreen
            message="Đang tải thông báo..."
            className="min-h-80 w-full"
          />
        }
      >
        <NotificationsContent />
      </Suspense>
    </section>
  );
}
async function NotificationsContent() {
  return <NotificationList notifications={await getMyNotifications()} />;
}
