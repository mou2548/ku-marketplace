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

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
    <div className="min-h-screen" style={{ backgroundColor: "#FAF8FF" }}>
      <SiteHeader active="/account" />

      <main className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-8 px-8 pt-[127px] pb-12">
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold" style={{ color: "#1D6D41" }}>
            Upgrade to Premium
          </h1>
          <p className="text-sm text-muted-foreground">
            ยกระดับประสบการณ์การซื้อขายในมหาวิทยาลัยด้วยสิทธิพิเศษที่เหนือกว่า
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col gap-4 rounded-2xl border bg-white p-6"
              style={
                tier.highlighted
                  ? { borderColor: "#1D6D41", borderWidth: 2 }
                  : undefined
              }
            >
              {tier.highlighted && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: "#1D6D41" }}
                >
                  POPULAR
                </span>
              )}

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
                    className="flex items-center gap-2 text-sm"
                    style={{ color: feature.included ? "#191C1E" : "#3F4940" }}
                  >
                    <feature.icon
                      className="size-4 shrink-0"
                      style={{
                        color: feature.included ? "#1D6D41" : "#BFC9BD",
                      }}
                    />
                    {feature.text}
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.highlighted ? "default" : "outline"}
                disabled={tier.disabled}
                className="w-full"
                style={tier.highlighted ? { backgroundColor: "#1D6D41" } : undefined}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="grid w-full grid-cols-1 gap-8 rounded-2xl bg-white p-8 shadow-sm md:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <h2 className="font-semibold">Scan to Upgrade</h2>
            <p className="text-sm text-muted-foreground">
              Use your mobile banking app to scan and pay instantly via
              PromptPay.
            </p>
            <div
              className="flex items-center justify-center rounded-xl border p-4"
              style={{ backgroundColor: "#F2F3FF" }}
            >
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
              <CloudUpload className="size-6" style={{ color: "#1D6D41" }} />
              <span className="text-sm font-semibold" style={{ color: "#1D6D41" }}>
                {file ? file.name : "Attach Transfer Slip"}
              </span>
              {!file && (
                <span className="text-xs text-muted-foreground">
                  PNG, JPG or PDF up to 5MB
                </span>
              )}
            </label>

            <Button
              className="w-full"
              disabled={!file}
              style={{ backgroundColor: "#1D6D41" }}
            >
              I&apos;ve Paid, Verify Upgrade →
            </Button>

            <Link
              href="/account"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
