"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { ArrowRight, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { login } from "@/lib/actions/auth";

type AuthMode = "login" | "register";

export default function Home() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [state, formAction, isPending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex h-screen w-full flex-col items-start overflow-hidden bg-[linear-gradient(165deg,#FAFAFA_0%,var(--page-background)_100%)]">
        <div className="flex w-full flex-1 flex-col md:flex-row">
          <div className="relative hidden basis-1/2 flex-col justify-center p-16 text-white md:flex">
            <Image
              src="/images/auth-hero.png"
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative flex flex-col gap-6">
              <h1 className="text-4xl leading-[1.15] font-bold lg:text-5xl">
                <span className="text-primary-dark">
                  ตลาดกลางและคลังสิ่งของ
                  <br />
                  ดิจิทัล
                </span>
                <br />
                เพื่อชาวเกษตรศาสตร์
              </h1>
              <p className="max-w-xl text-xl text-white/80">
                แพลตฟอร์มซื้อขายและแลกเปลี่ยนสินค้าภายในมหาวิทยาลัยที่ปลอดภัยที่สุด
                ตรวจสอบตัวตนผ่านระบบนนทรี พร้อมระบบการจัดการคลังสินค้าดิจิทัลส่วนตัว
              </p>
            </div>
          </div>

          <div className="flex basis-1/2 flex-col items-center justify-center gap-8 bg-white p-16">
            <Image
              src="/images/ku-logo.png"
              alt="Kasetsart University"
              width={150}
              height={177}
              priority
            />

            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value as AuthMode)}
              className="w-full max-w-lg"
            >
              <TabsList className="h-14! w-full overflow-hidden rounded-full bg-surface-muted p-1">
                <TabsTrigger
                  value="login"
                  className="h-full flex-1 rounded-full text-lg data-active:bg-white data-active:shadow-sm"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="h-full flex-1 rounded-full text-lg data-active:bg-white data-active:shadow-sm"
                >
                  Register
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form
              className="flex w-full max-w-lg flex-col gap-6"
              action={mode === "login" ? formAction : undefined}
              onSubmit={mode === "register" ? (event) => event.preventDefault() : undefined}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-base">
                  Username
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#6F7A6F]"
                  />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="admin"
                    className="h-14 border-none bg-surface-muted pl-11 text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-base">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#6F7A6F]"
                  />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="········"
                    className="h-14 border-none bg-surface-muted pl-11 text-base"
                  />
                </div>
              </div>

              {mode === "login" && state?.error && (
                <p className="text-center text-sm text-[#B3455A]">{state.error}</p>
              )}

              {mode === "register" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password" className="text-base">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#6F7A6F]"
                    />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="········"
                      className="h-14 border-none bg-surface-muted pl-11 text-base"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={mode === "login" && isPending}
                className="h-14 w-full rounded-full bg-primary-dark text-lg"
              >
                {mode === "login" && isPending
                  ? "Logging in..."
                  : mode === "login"
                    ? "Login"
                    : "Register"}
                <ArrowRight className="size-5" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                By continuing, you agree to the{" "}
                {/* TODO: link to a real terms page once the legal copy exists. */}
                <span className="font-medium text-primary-dark">
                  KU Marketplace Terms
                </span>
                .
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
