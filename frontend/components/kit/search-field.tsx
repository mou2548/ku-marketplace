"use client";

import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

/** Search input shared by the feed and conversation list. */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-pill bg-surface-sunken shadow-sunken",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand",
        className,
      )}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="h-12 w-full appearance-none rounded-pill bg-transparent pr-12 pl-11 text-body text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <Button
          variant="ghost"
          size="icon-sm"
          pill
          aria-label="Clear search"
          onPress={() => onChange("")}
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
        >
          <X aria-hidden className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
