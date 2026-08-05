"use client";

import { useState } from "react";
import { Clock, MessageCircle, Star, ThumbsUp, UserCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// TODO: replace with the real completed-trade + reviewee data from the API
const REVIEW_TARGET = {
  name: "Nutthapong T.",
  itemName: 'iPad Pro 11" M2 (Pencil included)',
};

const TAGS = [
  { id: "as-described", label: "ของตรงปก (As Described)", icon: ThumbsUp },
  { id: "punctual", label: "ตรงเวลา (Punctual)", icon: Clock },
  { id: "friendly", label: "พูดจาดี (Friendly)", icon: MessageCircle },
  { id: "helpful", label: "ช่วยเหลือดี (Helpful)", icon: UserCheck },
];

export function TradeReviewCard() {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["punctual"]);

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-3xl bg-white p-6 shadow-elevated">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-11">
            <AvatarImage src="" alt={REVIEW_TARGET.name} />
            <AvatarFallback>{REVIEW_TARGET.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-base font-bold text-foreground">
              Review {REVIEW_TARGET.name}
            </span>
            <span className="text-sm text-muted-foreground">
              For: {REVIEW_TARGET.itemName}
            </span>
          </div>
        </div>
        <div className="h-px w-full bg-border/20" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-semibold tracking-[1.2px] text-muted-foreground uppercase">
          Rate Your Experience
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              onClick={() => setRating(value)}
              className="p-0.5"
            >
              <Star
                className={cn(
                  "size-7",
                  value <= rating
                    ? "fill-[#FBBF24] text-[#FBBF24]"
                    : "fill-transparent text-border"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm text-foreground">What went well?</span>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const Icon = tag.icon;
            const selected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground",
                  selected
                    ? "border-[#FBBF24] bg-warning-bg"
                    : "border-transparent bg-surface-muted hover:bg-surface-muted/70"
                )}
              >
                <Icon className="size-3.5" />
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      <Textarea
        placeholder="Add optional comments..."
        className="min-h-[80px] resize-none bg-surface-muted"
      />

      <div className="flex gap-4">
        <Button variant="outline" className="h-11 flex-1 text-sm font-medium">
          Skip
        </Button>
        <Button className="h-11 flex-1 text-sm font-medium">
          Submit Review
        </Button>
      </div>
    </div>
  );
}
