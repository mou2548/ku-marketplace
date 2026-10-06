"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { AvatarCropDialog } from "@/components/kit/avatar-crop-dialog";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { uploadFile } from "@/lib/actions/uploads";
import { updateProfile } from "@/lib/actions/account";

/**
 * `TrustBadge` (`size="lg"`) with a camera-icon overlay that lets the account
 * owner replace their photo in place — pick, upload, save, done. Same
 * upload-then-save pairing `item-form.tsx` uses for item photos, just for one
 * image instead of a grid.
 */
export function AvatarUploader({
  name,
  isVerified,
  faculty,
  year,
  avatarUrl,
}: {
  name: string;
  isVerified?: boolean;
  faculty?: string | null;
  year?: number | null;
  avatarUrl?: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl ?? null);
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
    <span className="relative inline-flex w-fit">
      <TrustBadge size="lg" name={name} isVerified={isVerified} faculty={faculty} year={year} avatarUrl={url} />

      <button
        type="button"
        aria-label="Change profile photo"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="touch-target absolute top-9 left-11 grid size-7 place-items-center rounded-pill bg-surface-inverse/80 text-white disabled:opacity-60"
      >
        <Camera aria-hidden className="size-3.5" />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setPicked(file);
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
