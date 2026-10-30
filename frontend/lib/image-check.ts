/**
 * Whether a picked file really is a picture (audit B04).
 *
 * `file.type` comes from the file name, so a text file renamed `.png` passes a
 * MIME check and then previews as a broken slip or is sent to the API. Asking
 * the browser to decode it is the only check that looks at the bytes.
 *
 * `decode` is injectable so the rule can be tested outside a browser; it
 * resolves when the bytes decode and rejects otherwise.
 */
export type ImageDecoder = (file: Blob) => Promise<void>;

/** Decodes with `createImageBitmap` where it exists, else an `<img>` load. */
export const browserDecode: ImageDecoder = async (file) => {
  // `createImageBitmap` refuses an SVG blob, so an SVG is checked by loading it
  // into an `<img>` instead.
  if (file.type !== "image/svg+xml" && typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Not an image"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

export async function isDecodableImage(
  file: Blob,
  decode: ImageDecoder = browserDecode,
): Promise<boolean> {
  if (!file.type.startsWith("image/") || file.size === 0) return false;
  try {
    await decode(file);
    return true;
  } catch {
    return false;
  }
}
