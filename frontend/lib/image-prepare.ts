/**
 * Picture types a person may pick. The upload endpoint takes JPEG, PNG and WEBP
 * only (`POST /uploads/image`), so GIF and SVG are turned into a PNG in the
 * browser before they are sent; the API sees an ordinary PNG.
 */
export const ACCEPTED_IMAGE_TYPES =
  "image/jpeg,image/png,image/gif,image/svg+xml,image/webp";

/** The wording for an upload hint, in the same order as the list above. */
export const ACCEPTED_IMAGE_LABEL = "JPG, PNG, GIF, SVG or WebP";

/** Types the API refuses and so are converted. */
const CONVERTED_TYPES = new Set(["image/gif", "image/svg+xml"]);

/** A GIF or SVG over this is refused without being converted. */
export const MAX_BEFORE_CONVERT_BYTES = 20 * 1024 * 1024;

/** An SVG with no size of its own is drawn at least this wide, in px. */
const SVG_MIN_SIDE = 1024;
/** The longest side a converted picture keeps, so a huge GIF cannot make a huge PNG. */
const MAX_SIDE = 2048;

type Named = Blob & { name?: string };

/** `file.type` can be empty for an SVG on some systems, so the name counts too. */
function typeOf(file: Named): string {
  if (file.type) return file.type;
  const name = (file.name ?? "").toLowerCase();
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".gif")) return "image/gif";
  return "";
}

export function needsConversion(file: Named): boolean {
  return CONVERTED_TYPES.has(typeOf(file));
}

/** Turns picture bytes into PNG bytes; injectable so the rule runs outside a browser. */
export type Rasterizer = (file: Blob, isSvg: boolean) => Promise<Blob>;

/**
 * Draws the picture onto a canvas and reads it back as PNG. Loading an SVG
 * through `<img>` never runs its scripts. An animated GIF keeps the frame the
 * browser shows first.
 */
export const browserRasterize: Rasterizer = async (file, isSvg) => {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Not an image"));
      el.src = url;
    });

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (!width || !height) {
      // An SVG with only a viewBox reports no size; give it a square to fit.
      width = SVG_MIN_SIDE;
      height = SVG_MIN_SIDE;
    } else if (isSvg && Math.max(width, height) < SVG_MIN_SIDE) {
      // Vector art is sharp at any size, so draw it large enough to read.
      const grow = SVG_MIN_SIDE / Math.max(width, height);
      width = Math.round(width * grow);
      height = Math.round(height * grow);
    }
    const shrink = Math.min(1, MAX_SIDE / Math.max(width, height));
    width = Math.max(1, Math.round(width * shrink));
    height = Math.max(1, Math.round(height * shrink));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("Could not convert the image");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * The file to send: the same file, unless the API would refuse its type, in
 * which case a PNG of it. Throws when the picture cannot be read.
 */
export async function prepareImageForUpload(
  file: File,
  rasterize: Rasterizer = browserRasterize,
): Promise<File> {
  if (!needsConversion(file)) return file;
  const png = await rasterize(file, typeOf(file) === "image/svg+xml");
  const base = file.name.replace(/\.[^./\\]+$/, "") || "image";
  return new File([png], `${base}.png`, {
    type: "image/png",
    lastModified: file.lastModified,
  });
}
