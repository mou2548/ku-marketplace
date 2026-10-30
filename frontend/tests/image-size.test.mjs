import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { readImageSize, cardRatio, MIN_RATIO, MAX_RATIO, FALLBACK_RATIO } =
  loadTs('lib/image-size.ts');

const plain = (value) => JSON.parse(JSON.stringify(value));
const bytes = (...parts) =>
  Uint8Array.from(parts.flatMap((part) => (typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : [...part])));
const be16 = (n) => [(n >> 8) & 0xff, n & 0xff];
const be32 = (n) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const le16 = (n) => [n & 0xff, (n >> 8) & 0xff];
const le24 = (n) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];

test('PNG reads the IHDR size', () => {
  const png = bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], be32(13), 'IHDR', be32(1200), be32(800));
  assert.deepEqual(plain(readImageSize(png)), { width: 1200, height: 800 });
});

test('GIF reads the logical screen size', () => {
  const gif = bytes('GIF89a', le16(320), le16(480));
  assert.deepEqual(plain(readImageSize(gif)), { width: 320, height: 480 });
});

test('WebP reads lossy, lossless and extended headers', () => {
  const head = (chunk) => bytes('RIFF', [0, 0, 0, 0], 'WEBP', chunk, [0, 0, 0, 0]);
  const lossy = bytes(head('VP8 '), [0, 0, 0, 0x9d, 0x01, 0x2a], le16(640), le16(960), [0, 0]);
  assert.deepEqual(plain(readImageSize(lossy)), { width: 640, height: 960 });

  const w = 799, h = 599; // stored minus one
  const bits = w | (h << 14);
  const lossless = bytes(head('VP8L'), [0x2f], [bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff], [0, 0, 0, 0, 0]);
  assert.deepEqual(plain(readImageSize(lossless)), { width: 800, height: 600 });

  const extended = bytes(head('VP8X'), [0, 0, 0, 0], le24(1999), le24(2999));
  assert.deepEqual(plain(readImageSize(extended)), { width: 2000, height: 3000 });
});

/** SOI, optional APP1 EXIF with an orientation tag, SOF0. */
function jpeg({ width, height, orientation }) {
  const parts = [[0xff, 0xd8]];
  if (orientation) {
    // Big-endian TIFF, IFD at offset 8 with one entry: 0x0112 SHORT 1 value.
    const tiff = ['MM', be16(42), be32(8), be16(1), be16(0x0112), be16(3), be32(1), be16(orientation), [0, 0], be32(0)];
    const body = bytes('Exif', [0, 0], ...tiff);
    parts.push([0xff, 0xe1], be16(body.length + 2), [...body]);
  }
  parts.push([0xff, 0xdb], be16(4), [0, 0]); // a quantisation table before the frame
  parts.push([0xff, 0xc0], be16(17), [8], be16(height), be16(width), [3], new Array(9).fill(0));
  return bytes(...parts);
}

test('JPEG reads the frame size past other segments', () => {
  assert.deepEqual(plain(readImageSize(jpeg({ width: 600, height: 900 }))), { width: 600, height: 900 });
});

test('JPEG swaps the sides for EXIF orientations 5-8', () => {
  assert.deepEqual(plain(readImageSize(jpeg({ width: 4032, height: 3024, orientation: 6 }))), { width: 3024, height: 4032 });
  assert.deepEqual(plain(readImageSize(jpeg({ width: 4032, height: 3024, orientation: 1 }))), { width: 4032, height: 3024 });
  // An invalid value is ignored, as browsers do.
  assert.deepEqual(plain(readImageSize(jpeg({ width: 4032, height: 3024, orientation: 9 }))), { width: 4032, height: 3024 });
});

test('unknown or cut-off bytes give null', () => {
  assert.equal(readImageSize(bytes('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(readImageSize(bytes([0xff, 0xd8, 0xff])), null);
  assert.equal(readImageSize(new Uint8Array(0)), null);
});

test('card ratio is clamped to 2:3..4:3 and falls back to 4:5', () => {
  assert.equal(cardRatio({ width: 1000, height: 1000 }), 1);
  assert.equal(cardRatio({ width: 300, height: 1000 }), MIN_RATIO);
  assert.equal(cardRatio({ width: 2000, height: 500 }), MAX_RATIO);
  assert.equal(cardRatio(null), FALLBACK_RATIO);
  assert.equal(cardRatio({ width: 0, height: 10 }), FALLBACK_RATIO);
});
