import { GiveawayRequestTabs } from "@/components/giveaway-request-tabs";
import { SiteHeader } from "@/components/site-header";

export default function GiveawayManagerPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#F4F6F8]">
      <SiteHeader active="/giveaway" />

      <main className="flex flex-1 justify-center px-6 py-8">
        <div className="flex w-full max-w-[1200px] flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.32px] text-foreground">
              My Giveaway Requests (รายการที่ลงทะเบียนรับ)
            </h1>
            <p className="text-lg text-muted-foreground">
              Track your registration status for free items from the
              community.
            </p>
          </div>

          <GiveawayRequestTabs />
        </div>
      </main>
    </div>
  );
}
