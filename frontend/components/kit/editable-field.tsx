"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Lock, Pencil, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { TextInput } from "./field";

/**
 * One line of a profile, readable until you ask to change it.
 *
 * A separate edit screen makes you leave the page, load a form, change one
 * field and come back. On a wide screen there is room to do it in place, so a
 * pencil turns the line into an input and Enter puts it back. On a phone the
 * account screen still links out — a modal keyboard over a full-width form is
 * the better shape there, and the two form factors are allowed to differ.
 *
 * Locked rows render in the same list rather than in a separate "read-only"
 * block: the English name and the KU email are part of the profile a student
 * reads, and hiding them elsewhere would make the identity look incomplete.
 * They carry a lock and a reason instead of a pencil (CLAUDE.md §6 — say why,
 * do not just grey it out).
 */
export interface EditableFieldProps {
  label: string;
  value: string;
  /** Shown when `value` is empty, e.g. "Not set". */
  placeholder?: string;
  onSave?: (next: string) => void | Promise<void>;
  /** Renders a lock and a reason instead of a pencil. */
  isLocked?: boolean;
  lockedReason?: string;
  /** Filters keystrokes, e.g. digits only for a phone number. */
  sanitise?: (raw: string) => string;
  inputMode?: "text" | "tel" | "numeric";
}

export function EditableField({
  label,
  value,
  placeholder = "Not set",
  onSave,
  isLocked = false,
  lockedReason,
  sanitise,
  inputMode = "text",
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const wantsFocus = useRef(false);

  /**
   * The pencil is unmounted while the row is open, so focusing it from inside
   * `cancel`/`commit` hit a null ref and focus fell to the body — leaving a
   * keyboard user at the top of the document after every edit. Ask for focus,
   * then take it once the button is back on the page (CLAUDE.md §6).
   */
  useEffect(() => {
    if (editing || !wantsFocus.current) return;
    wantsFocus.current = false;
    pencilRef.current?.focus();
  }, [editing]);

  function cancel() {
    setDraft(value);
    wantsFocus.current = true;
    setEditing(false);
  }

  async function commit() {
    if (draft === value) return cancel();
    setBusy(true);
    await onSave?.(draft);
    setBusy(false);
    wantsFocus.current = true;
    setEditing(false);
  }

  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-line py-3 last:border-0">
      <span className="w-40 shrink-0 text-caption text-ink-muted">
        {label}
      </span>

      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void commit();
          }}
        >
          <TextInput
            autoFocus
            aria-label={label}
            value={draft}
            onChange={(v) => setDraft(sanitise ? sanitise(v) : v)}
            inputMode={inputMode}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            size="icon-sm"
            pill
            isLoading={busy}
            aria-label={`Save ${label}`}
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            pill
            onPress={cancel}
            aria-label={`Cancel editing ${label}`}
          >
            <X className="size-4" />
          </Button>
        </form>
      ) : (
        <>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-body",
              value ? "font-medium" : "text-ink-muted",
            )}
          >
            {value || placeholder}
          </span>

          {isLocked ? (
            <span
              title={lockedReason}
              className="flex shrink-0 items-center gap-1.5 text-meta text-ink-muted"
            >
              <Lock aria-hidden className="size-3.5" />
              <span className="hidden sm:inline">{lockedReason}</span>
            </span>
          ) : (
            <Button
              ref={pencilRef}
              type="button"
              variant="ghost"
              size="icon-sm"
              pill
              onPress={() => {
                // Seeded on open rather than synced by an effect: the parent
                // only changes `value` as the result of a save, which already
                // closes the row, so there is nothing to keep in step while
                // the row is shut.
                setDraft(value);
                setEditing(true);
              }}
              aria-label={`Edit ${label}`}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
