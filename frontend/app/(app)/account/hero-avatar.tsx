"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { AvatarCropDialog } from "@/components/kit/avatar-crop-dialog";
import { useToast } from "@/components/kit/toast";
import { UserAvatar } from "@/components/kit/user-avatar";
import { updateProfile } from "@/lib/actions/account";
import { uploadFile } from "@/lib/actions/uploads";

/**
 * The profile header's photo, with a camera button for the owner. Pick, crop,
 * upload, save, as `AvatarUploader` does on the edit screen; the refresh carries the
 * new photo into the navbar too.
 */
export function HeroAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);

  async function pick(file: File) {
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      await updateProfile({ avatar_url: uploaded });
      setUrl(uploaded);
      toast.success("Profile photo saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="relative inline-flex shrink-0">
      <UserAvatar
        name={name}
        avatarUrl={url}
        size="lg"
        className="border-2 border-on-brand-strong/40 bg-on-brand-strong/10 text-on-brand-strong"
      />
      <button
        type="button"
        aria-label="Change profile photo"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="touch-target absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-surface text-ink-brand shadow-raised disabled:opacity-60"
      >
        <Camera aria-hidden className="size-3.5" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPicked(file);
          event.target.value = "";
        }}
      />
      <AvatarCropDialog
        file={picked}
        onCancel={() => setPicked(null)}
        onConfirm={async (cropped) => {
          await pick(cropped);
          setPicked(null);
        }}
      />
    </span>
  );
}
