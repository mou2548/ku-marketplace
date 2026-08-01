import Link from "next/link";
import { Compass } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary-light">
          <Compass className="size-8 text-primary-dark" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-primary-dark">Page not found</h1>
          <p className="text-base text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
        </div>
        <Link href="/marketplace" className={cn(buttonVariants(), "h-12 px-8 text-base")}>
          Back to Marketplace
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
