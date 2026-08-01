"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Check,
  CloudUpload,
  Eye,
  Gem,
  Headset,
  Infinity as InfinityIcon,
  Lock,
  Star,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

type Feature = {
  icon: typeof Check;
  text: string;
  included: boolean;
};

type Tier = {
  label: string;
  name: string;
  price: number;
  features: Feature[];
  cta: string;
  highlighted?: boolean;
  disabled?: boolean;
};

const TIERS: Tier[] = [
  {
    label: "STUDENT",
    name: "Free",
    price: 0,
    features: [
      { icon: Check, text: "โพสต์ได้ 3 ชิ้น/เดือน", included: true },
      { icon: XCircle, text: "No Verified Badge", included: false },
      { icon: Zap, text: "Standard Listing", included: false },
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    label: "ACTIVE",
    name: "Silver",
    price: 29,
    features: [
      { icon: Check, text: "โพสต์ได้ 10 ชิ้น/เดือน", included: true },
      { icon: Award, text: "Silver Badge ยืนยันตัวตน", included: true },
      { icon: Headset, text: "Standard Support", included: true },
    ],
    cta: "Select Silver",
  },
  {
    label: "SERIOUS",
    name: "Gold",
    price: 49,
    features: [
      { icon: Check, text: "โพสต์ได้ 25 ชิ้น/เดือน", included: true },
      { icon: Award, text: "Gold Badge ยืนยันตัวตน", included: true },
      { icon: TrendingUp, text: "Priority Listing Boost", included: true },
      { icon: Eye, text: "แสดงเหนือระดับ Free/Silver", included: true },
    ],
    cta: "Select Gold",
    highlighted: true,
  },
  {
    label: "ENTERPRISE",
    name: "Diamond",
    price: 89,
    features: [
      { icon: InfinityIcon, text: "โพสต์ได้ไม่จำกัด (Unlimited)", included: true },
      { icon: Gem, text: "Diamond Special Badge", included: true },
      { icon: Eye, text: "แสดงอยู่บนสุดเสมอ", included: true },
      { icon: Star, text: "Exclusive VIP Support", included: true },
    ],
    cta: "Select Diamond",
  },
];

export default function PremiumPage() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="min-h-screen bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-8 px-8 pt-[127px] pb-12">
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold text-primary-dark">
            Upgrade to Premium
          </h1>
          <p className="text-sm text-muted-foreground">
            ยกระดับประสบการณ์การซื้อขายในมหาวิทยาลัยด้วยสิทธิพิเศษที่เหนือกว่า
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-4">
          {TIERS.map((tier) => (
            <div key={tier.name} className="relative">
              {tier.highlighted && (
                <Badge className="absolute top-0 left-1/2 z-10 h-auto -translate-x-1/2 -translate-y-1/2 bg-primary-dark px-3 py-1 text-xs font-semibold text-white">
                  POPULAR
                </Badge>
              )}
              <Card
                className={cn(
                  "flex-col gap-4 rounded-2xl p-6 ring-0",
                  tier.highlighted ? "border-2 border-primary-dark" : "border-border"
                )}
              >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {tier.label}
                </span>
                <span className="text-lg font-bold">{tier.name}</span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-muted-foreground">บาท/เดือน</span>
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {tier.features.map((feature) => (
                  <li
                    key={feature.text}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      feature.included ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <feature.icon
                      className={cn(
                        "size-4 shrink-0",
                        feature.included ? "text-primary-dark" : "text-border"
                      )}
                    />
                    {feature.text}
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.highlighted ? "default" : "outline"}
                disabled={tier.disabled}
                className={cn("w-full", tier.highlighted && "bg-primary-dark")}
              >
                {tier.cta}
              </Button>
              </Card>
            </div>
          ))}
        </div>

        <Card className="grid w-full grid-cols-1 gap-8 rounded-3xl p-8 shadow-elevated ring-0 md:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <h2 className="font-semibold">Scan to Upgrade</h2>
            <p className="text-sm text-muted-foreground">
              Use your mobile banking app to scan and pay instantly via
              PromptPay.
            </p>
            <div className="flex items-center justify-center rounded-xl border bg-surface-muted p-4">
              <Image
                src="/images/promptpay-qr.svg"
                alt="PromptPay QR code"
                width={160}
                height={160}
              />
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
              <Lock className="size-3.5" />
              Secure encrypted transaction
            </span>
          </div>

          <div className="flex flex-col items-start gap-4">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              STEP 2: UPLOAD PROOF
            </span>

            <label className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
              <input
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <CloudUpload className="size-6 text-primary-dark" />
              <span className="text-sm font-semibold text-primary-dark">
                {file ? file.name : "Attach Transfer Slip"}
              </span>
              {!file && (
                <span className="text-xs text-muted-foreground">
                  PNG, JPG or PDF up to 5MB
                </span>
              )}
            </label>

            <Button className="w-full bg-primary-dark" disabled={!file}>
              I&apos;ve Paid, Verify Upgrade →
            </Button>

            <Link
              href="/account"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
