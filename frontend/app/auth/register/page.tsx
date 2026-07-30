"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthMode = "login" | "register";

export default function AuthRegisterPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div
        className="flex w-full max-w-[1280px] flex-col items-start overflow-hidden rounded-2xl shadow-xl md:h-[709px]"
        style={{
          background:
            "linear-gradient(165deg, #FAFAFA 0%, #F0FDF4 100%), #FFF",
        }}
      >
        <div className="flex w-full flex-1 flex-col md:flex-row">
          <div className="relative hidden basis-1/2 flex-col justify-end p-10 text-white md:flex">
            <Image
              src="/images/auth-hero.png"
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative flex flex-col gap-4">
              <h1 className="text-3xl leading-tight font-bold">
                <span style={{ color: "#1D6D41" }}>
                  ตลาดกลางและคลังสิ่งของ
                  <br />
                  ดิจิทัล
                </span>
                <br />
                เพื่อชาวเกษตรศาสตร์
              </h1>
              <p className="max-w-md text-sm text-white/80">
                แพลตฟอร์มซื้อขายและแลกเปลี่ยนสินค้าภายในมหาวิทยาลัยที่ปลอดภัยที่สุด
                ตรวจสอบตัวตนผ่านระบบนนทรี พร้อมระบบการจัดการคลังสินค้าดิจิทัลส่วนตัว
              </p>
            </div>
          </div>

          <div className="flex basis-1/2 flex-col items-center justify-center gap-6 bg-white p-10">
            <Image
              src="/images/ku-logo.png"
              alt="Kasetsart University"
              width={110}
              height={130}
              priority
            />

            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value as AuthMode)}
              className="w-full max-w-sm"
            >
              <TabsList className="h-11 w-full overflow-hidden rounded-full bg-[#F1F5F9] p-1">
                <TabsTrigger
                  value="login"
                  className="h-full flex-1 rounded-full data-active:bg-white data-active:shadow-sm"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="h-full flex-1 rounded-full data-active:bg-white data-active:shadow-sm"
                >
                  Register
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form
              className="flex w-full max-w-sm flex-col gap-4"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">University Email</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                    style={{ color: "#6F7A6F" }}
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="student.name@ku.th"
                    className="h-11 border-none bg-[#F1F5F9] pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                    style={{ color: "#6F7A6F" }}
                  />
                  <Input
                    id="password"
                    type="password"
                    placeholder="········"
                    className="h-11 border-none bg-[#F1F5F9] pl-9"
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                      style={{ color: "#6F7A6F" }}
                    />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="········"
                      className="h-11 border-none bg-[#F1F5F9] pl-9"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-full"
                style={{ backgroundColor: "#1D6D41" }}
              >
                {mode === "login" ? "Login" : "Register"}
                <ArrowRight className="size-4" />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By continuing, you agree to the{" "}
                <a
                  href="#"
                  className="underline underline-offset-2"
                  style={{ color: "#1D6D41" }}
                >
                  KU Marketplace Terms
                </a>
                .
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
