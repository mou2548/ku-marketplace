import { NotificationFeed } from "@/components/notification-feed";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotificationsPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 justify-center px-6 py-12">
        <div className="flex w-full max-w-[848px] flex-col gap-4">
          <PageHeader title="การแจ้งเตือน (Notifications)" />

          <NotificationFeed />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
