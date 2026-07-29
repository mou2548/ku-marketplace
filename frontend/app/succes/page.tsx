import { Check, Star, ThumbsUp, MessageSquare, Clock, Award, ArrowLeft } from "lucide-react";

const praiseTags = [
  { label: "Great communication", icon: MessageSquare, selected: false },
  { label: "On-time meetup", icon: Clock, selected: true },
  { label: "Item as described", icon: ThumbsUp, selected: false },
  { label: "Fair & friendly", icon: Award, selected: false },
];

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-ku-surface px-8 py-12">
      <div className="flex w-full max-w-[448px] flex-col items-center">
        {/* Success animation & message */}
        <div className="flex flex-col items-center pb-12">
          <div className="grid size-24 place-items-center rounded-full bg-ku-green-accent shadow-[0_8px_30px_rgba(0,75,36,0.3)]">
            <Check className="size-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="mt-4 text-center font-kanit text-5xl font-bold tracking-[-0.96px] text-ku-green-accent">
            Success!
          </h1>
          <p className="mt-1 text-center font-prompt text-lg text-ku-muted">
            การแลกเปลี่ยนเสร็จสมบูรณ์แล้ว
          </p>
        </div>

        {/* Review bento card */}
        <div className="flex w-full flex-col gap-6 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          {/* Trade header */}
          <div className="flex items-center gap-4 border-b border-[#BFC9BD] pb-4">
            <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[#BFC9BD] bg-ku-periwinkle">
              <span className="font-kanit text-sm font-semibold text-ku-green-dark">NT</span>
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="font-kanit text-xl font-semibold text-ku-ink">
                Review Nutthapong T.
              </h3>
              <span className="font-prompt text-sm font-medium tracking-[0.14px] text-ku-muted">
                For: iPad Pro 11&quot; M2 (Pencil included)
              </span>
            </div>
          </div>

          {/* Star rating */}
          <div className="flex flex-col items-center gap-2 py-1">
            <span className="font-prompt text-sm font-medium uppercase tracking-[0.7px] text-ku-muted">
              Rate your experience
            </span>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-8 fill-[#D99E31] text-[#D99E31]" />
              ))}
            </div>
          </div>

          {/* Praise tag pills */}
          <div className="flex flex-col gap-2">
            <span className="font-prompt text-xs font-medium text-ku-muted">
              What went well?
            </span>
            <div className="flex flex-wrap gap-2">
              {praiseTags.map((tag) => (
                <span
                  key={tag.label}
                  className={`flex items-center gap-1 rounded-full border px-3 py-2 font-prompt text-sm font-medium tracking-[0.14px] ${
                    tag.selected
                      ? "border-[#7C5800] bg-[#FDF3D8] text-[#271900]"
                      : "border-[#BFC9BD] bg-ku-periwinkle text-ku-ink"
                  }`}
                >
                  <tag.icon className="size-3.5" />
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          {/* Comment textarea */}
          <textarea
            placeholder="Add optional comments..."
            className="h-24 w-full resize-none rounded-xl border border-[#BFC9BD] bg-ku-lilac p-3 font-prompt text-base text-ku-ink outline-none placeholder:text-[rgba(63,73,64,0.5)]"
          />

          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            <button className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[#6F7A6F] font-prompt text-sm font-medium tracking-[0.14px] text-ku-ink hover:bg-ku-lilac">
              Skip
            </button>
            <button className="flex h-12 flex-1 items-center justify-center rounded-xl bg-ku-green-accent font-prompt text-sm font-medium tracking-[0.14px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:brightness-95">
              Submit Review
            </button>
          </div>
        </div>

        {/* Back to home */}
        <button className="mt-8 flex items-center gap-1 font-prompt text-sm font-medium tracking-[0.14px] text-ku-muted hover:text-ku-green">
          <ArrowLeft className="size-3.5" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
