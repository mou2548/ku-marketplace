import Link from "next/link";
import { BadgeCheck, Bell, Camera, ChevronRight, ShieldCheck } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const STATS = [
  { label: "TOTAL PURCHASES", value: 12 },
  { label: "TOTAL SALES", value: 5 },
  { label: "COMPLETED SWAPS", value: 8 },
];

// TODO: build a real security-settings route; until it exists it's marked
// "Coming soon" rather than rendered as a link that goes nowhere.
const SETTINGS_LINKS = [
  {
    icon: Bell,
    title: "Notifications",
    subtitle: "Manage your alerts and emails",
    href: "/notifications",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    subtitle: "Password and 2FA settings",
    href: null,
  },
];

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-6 py-8">
        <PageHeader title="Account" subtitle="Manage your profile, activity, and settings." />

        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Card className="flex-col items-center gap-3 rounded-3xl p-6 text-center shadow-elevated ring-0">
              <Avatar className="size-20">
                <AvatarImage src="" alt="Mike R." />
                <AvatarFallback className="bg-primary-light text-2xl font-semibold text-primary-dark">
                  M
                </AvatarFallback>
                <AvatarBadge className="size-6 bg-primary-dark text-white">
                  <Camera className="size-3.5" />
                </AvatarBadge>
              </Avatar>
              <div>
                <p className="font-semibold">Mike R.</p>
                <p className="text-sm text-muted-foreground">mike.r@ku.edu</p>
              </div>
              <Button variant="outline" className="w-full">
                Edit Profile
              </Button>
            </Card>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Membership Status
              </span>
              <Badge className="h-auto w-fit gap-1.5 bg-primary-light px-3 py-1.5 text-sm text-primary-dark">
                <BadgeCheck className="size-4" />
                Verified KU Student Pro
              </Badge>
            </div>

            <Card className="flex-col gap-3 rounded-3xl bg-primary-dark p-6 text-white ring-0">
              <p className="font-semibold">Premium Benefits</p>
              <p className="text-sm text-white/85">
                Get zero transaction fees and priority support with Premium.
              </p>
              <Button className="w-full bg-white text-primary-dark hover:bg-white/90">
                Upgrade to Premium
              </Button>
            </Card>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card className="rounded-3xl p-6 shadow-elevated ring-0">
              <h2 className="mb-4 font-semibold">Activity Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                {STATS.map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-surface-muted p-4">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-3xl p-6 shadow-elevated ring-0">
              <h2 className="mb-2 font-semibold">Account Settings</h2>
              <div className="flex flex-col">
                {SETTINGS_LINKS.map((item) => {
                  const body = (
                    <>
                      <item.icon className="size-5 text-primary-dark" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{item.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      </span>
                      {item.href ? (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      ) : (
                        <Badge
                          variant="outline"
                          className="h-auto px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          Coming soon
                        </Badge>
                      )}
                    </>
                  );

                  return item.href ? (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted/50"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      key={item.title}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 opacity-70"
                    >
                      {body}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
