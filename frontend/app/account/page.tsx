import Link from "next/link";
import { BadgeCheck, Bell, Camera, ChevronRight, ShieldCheck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

const STATS = [
  { label: "TOTAL PURCHASES", value: 12 },
  { label: "TOTAL SALES", value: 5 },
  { label: "COMPLETED SWAPS", value: 8 },
];

const SETTINGS_LINKS = [
  {
    icon: Bell,
    title: "Notifications",
    subtitle: "Manage your alerts and emails",
    href: "#",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    subtitle: "Password and 2FA settings",
    href: "#",
  },
];

export default function AccountPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(0deg, #FAF8FF 0%, #FAF8FF 100%), #FFF",
      }}
    >
      <SiteHeader active="/account" />

      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-start px-6 pt-20 pb-[258px]">
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                  <User className="size-9 text-muted-foreground" />
                </div>
                <span
                  className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: "#1D6D41" }}
                >
                  <Camera className="size-3.5" />
                </span>
              </div>
              <div>
                <p className="font-semibold">Mike R.</p>
                <p className="text-sm text-muted-foreground">mike.r@ku.edu</p>
              </div>
              <Button variant="outline" className="w-full">
                Edit Profile
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Membership Status
              </span>
              <span
                className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: "#DCEFE3", color: "#1D6D41" }}
              >
                <BadgeCheck className="size-4" />
                Verified KU Student Pro
              </span>
            </div>

            <div
              className="flex flex-col gap-3 rounded-2xl p-6 text-white"
              style={{ backgroundColor: "#1D6D41" }}
            >
              <p className="font-semibold">Premium Benefits</p>
              <p className="text-sm text-white/85">
                Get zero transaction fees and priority support with Premium.
              </p>
              <Button
                className="w-full bg-white hover:bg-white/90"
                style={{ color: "#1D6D41" }}
              >
                Upgrade to Premium
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold">Activity Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: "#F2F3FF" }}
                  >
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-2 font-semibold">Account Settings</h2>
              <div className="flex flex-col">
                {SETTINGS_LINKS.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted/50"
                  >
                    <item.icon className="size-5" style={{ color: "#1D6D41" }} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
