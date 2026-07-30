import { NotificationFeed } from "@/components/notification-feed";
import { SiteHeader } from "@/components/site-header";

export default function NotificationsPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#FAF8FF]">
      <SiteHeader />

      <main className="flex flex-1 justify-center px-6 py-12">
        <div className="flex w-full max-w-[848px] flex-col gap-4">
          <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.32px] text-foreground">
            การแจ้งเตือน (Notifications)
          </h1>

          <NotificationFeed />
        </div>
      </main>
    </div>
  );
}
