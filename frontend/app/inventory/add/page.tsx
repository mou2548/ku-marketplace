"use client";

import { useState } from "react";
import { BookOpen, ImageIcon, ImagePlus, Table as TableIcon } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// TODO: replace with the real signed-in user's recent inventory items from the API
const RECENT_ITEMS = [
  { name: "Calculus Textbook", icon: BookOpen },
  { name: "Drafting Table", icon: TableIcon },
];

export default function AddItemPage() {
  const [title, setTitle] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-8 p-6 lg:grid-cols-12 lg:p-10">
        <Card className="flex-col gap-6 rounded-2xl p-6 shadow-card ring-0 lg:col-span-5 lg:p-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">List New Item</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Add details about your item.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-xs font-semibold">Photos</Label>

            <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary-light bg-primary-light/20 p-8 text-center transition-colors hover:bg-primary-light/40">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) =>
                  setPhotos(Array.from(event.target.files ?? []).slice(0, 10))
                }
              />
              <ImagePlus className="mb-2 size-8 stroke-[1.75] text-primary-dark" />
              <span className="text-sm font-bold text-primary-dark">
                {photos.length > 0
                  ? `${photos.length} photo${photos.length > 1 ? "s" : ""} selected`
                  : "Add Photos"}
              </span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                Up to 10 photos
              </span>
            </label>

            <Button
              variant="outline"
              className="mt-1 h-auto gap-2 rounded-xl border-primary-dark py-2.5 text-xs font-semibold text-primary-dark hover:bg-primary-dark/5"
            >
              <ImageIcon className="size-4" />
              Select from My Inventory
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-[#F6F8F7] p-4">
            <span className="text-xs font-semibold text-muted-foreground">
              Recent Inventory Items
            </span>

            <div className="grid grid-cols-2 gap-3">
              {RECENT_ITEMS.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setTitle(item.name)}
                  className="group flex flex-col gap-1.5 text-left"
                >
                  <div className="flex h-28 items-center justify-center rounded-xl bg-primary-light/40 text-primary-dark/60 transition-colors group-hover:bg-primary-light/70">
                    <item.icon className="size-6" />
                  </div>
                  <span className="truncate text-[11px] font-medium text-foreground">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title" className="text-xs font-medium">
              Title
            </Label>
            <Input
              id="title"
              placeholder="What are you selling?"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-xl border-border"
            />
          </div>

          <Button className="mt-2 h-12 w-full rounded-full bg-primary-dark text-sm font-semibold shadow-card hover:bg-primary-dark/90">
            Post Listing
          </Button>
        </Card>

        <div className="flex flex-col items-center justify-start pt-2 lg:col-span-7 lg:pt-6">
          <div className="flex w-full max-w-md flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">Listing Preview</h2>

            <Card className="flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-card ring-0">
              <div className="flex aspect-[4/3.8] w-full items-center justify-center bg-[#E8F1F3] text-[#B0C7CC]">
                <ImageIcon className="size-16 stroke-[1.25]" />
              </div>

              <div className="flex flex-col gap-2.5 p-5">
                <div className="h-4 w-3/5 animate-pulse rounded-md bg-[#E8F1F3]" />
                <div className="h-3 w-1/5 animate-pulse rounded-md bg-[#E8F1F3]" />
                <div className="mb-2 h-3 w-2/5 animate-pulse rounded-md bg-[#E8F1F3]" />
                <div className="flex items-center gap-2 pt-1">
                  <div className="size-6 animate-pulse rounded-full bg-[#E8F1F3]" />
                  <div className="h-3 w-16 animate-pulse rounded-md bg-[#E8F1F3]" />
                </div>
              </div>
            </Card>

            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              This is a preview of how your listing will appear to others.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
