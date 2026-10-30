/**
 * Image dimensions from the first bytes of a file, without decoding it.
 *
 * The feed needs each photo's aspect ratio before the page is painted: the
 * card reserves its image box from it, so nothing moves when the photo
 * arrives (CLS budget 0.05). The API stores no width or height for an image,
 * so the server reads them from the file header instead. JPEG, PNG, WebP and
 * GIF cover every upload path (the uploader only accepts images, and
 * Cloudinary re-serves them in the same formats).
 */

export interface ImageSize {
  width: number;
  height: number;
}

/** The feed's range, as Pinterest does: no taller than 2:3, no wider than 4:3. */
export const MIN_RATIO = 2 / 3;
export const MAX_RATIO = 4 / 3;

/** What a card uses when the size is unknown. Matches `PostImage`'s default. */
export const FALLBACK_RATIO = 0.8;

/** Bytes to read. A JPEG's size can sit behind a large EXIF block. */
export const HEADER_BYTES = 64 * 1024;

/** width / height, clamped to the feed's range; the fallback when unknown. */
export function cardRatio(size: ImageSize | null): number {
  if (!size || size.width <= 0 || size.height <= 0) return FALLBACK_RATIO;
  const ratio = size.width / size.height;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

export function readImageSize(bytes: Uint8Array): ImageSize | null {
  return readPng(bytes) ?? readGif(bytes) ?? readWebp(bytes) ?? readJpeg(bytes);
}

function u16be(b: Uint8Array, i: number) {
  return (b[i] << 8) | b[i + 1];
}
function u16le(b: Uint8Array, i: number) {
  return b[i] | (b[i + 1] << 8);
}
function u24le(b: Uint8Array, i: number) {
  return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
}
function u32be(b: Uint8Array, i: number) {
  return ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
}
function ascii(b: Uint8Array, i: number, length: number) {
  return String.fromCharCode(...b.subarray(i, i + length));
}

function readPng(b: Uint8Array): ImageSize | null {
  // Signature, then the IHDR chunk: width and height are its first 8 bytes.
  if (b.length < 24 || b[0] !== 0x89 || ascii(b, 1, 3) !== "PNG") return null;
  if (ascii(b, 12, 4) !== "IHDR") return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

function readGif(b: Uint8Array): ImageSize | null {
  if (b.length < 10 || ascii(b, 0, 3) !== "GIF") return null;
  return { width: u16le(b, 6), height: u16le(b, 8) };
}

function readWebp(b: Uint8Array): ImageSize | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") {
    return null;
  }
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8 ") {
    // Lossy: 14-bit sizes after the frame tag and start code.
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    // Lossless: 14-bit width-1 and height-1 packed after the signature byte.
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    // Extended: 24-bit canvas width-1 and height-1.
    return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  return null;
}

/**
 * Walks the JPEG segments to the first start-of-frame. A phone photo stored
 * sideways says so in EXIF orientation 5-8, and browsers draw it rotated, so
 * the two sides are swapped for those.
 */
function readJpeg(b: Uint8Array): ImageSize | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let rotated = false;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    // Fill bytes and markers without a length.
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = u16be(b, i + 2);
    if (marker === 0xe1 && ascii(b, i + 4, 4) === "Exif") {
      rotated = exifRotated(b, i + 10, Math.min(b.length, i + 2 + length));
    }
    // SOF0-SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      const height = u16be(b, i + 5);
      const width = u16be(b, i + 7);
      return rotated ? { width: height, height: width } : { width, height };
    }
    i += 2 + length;
  }
  return null;
}

/** True when the EXIF orientation tag says the picture is turned 90 degrees. */
function exifRotated(b: Uint8Array, start: number, end: number): boolean {
  if (start + 8 > end) return false;
  const little = ascii(b, start, 2) === "II";
  const u16 = (i: number) => (little ? u16le(b, i) : u16be(b, i));
  const u32 = (i: number) =>
    little ? (u16le(b, i) | (u16le(b, i + 2) << 16)) >>> 0 : u32be(b, i);
  const ifd = start + u32(start + 4);
  if (ifd + 2 > end) return false;
  const entries = u16(ifd);
  for (let n = 0; n < entries; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > end) return false;
    if (u16(entry) === 0x0112) {
      // 5-8 are the turned ones; anything else is unrotated or invalid, and
      // browsers draw an invalid value unrotated.
      const orientation = u16(entry + 8);
      return orientation >= 5 && orientation <= 8;
    }
  }
  return false;
}
