import { GiveawayRequestTabs } from "@/components/giveaway-request-tabs";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function GiveawayManagerPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 justify-center px-6 py-8">
        <div className="flex w-full max-w-[1200px] flex-col gap-8">
          <PageHeader
            title="My Giveaway Requests (รายการที่ลงทะเบียนรับ)"
            subtitle="Track your registration status for free items from the community."
          />

          <GiveawayRequestTabs />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
