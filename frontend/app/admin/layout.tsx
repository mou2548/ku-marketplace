import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";

const ADMIN_LINKS = [
  { href: "/admin/reports", label: "คิวรายงาน" },
  { href: "/admin/appeals", label: "คำอุทธรณ์" },
  { href: "/admin/memberships", label: "อนุมัติสมาชิก" },
];

/**
 * Admin area (§7). Everything under here is gated on the session cookie set at
 * login, checked server-side so no admin data is ever sent to a non-admin
 * client.
 *
 * TODO: replace the single "admin" session value with real role checks — §7.4
 * needs at least two distinct admin identities, since an appeal must be judged
 * by someone other than the admin who ruled first.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await cookies()).get("session")?.value;

  if (session !== "admin") redirect("/");

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border/30 bg-white/90 px-6 py-4 backdrop-blur-md">
        <Link href="/admin/reports" className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary-dark" />
          <span className="text-base font-bold text-primary-dark">
            Admin Console
          </span>
        </Link>

        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/marketplace"
          className="ml-auto text-sm text-muted-foreground hover:text-foreground"
        >
          กลับหน้าผู้ใช้
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-6 px-6 py-8">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
