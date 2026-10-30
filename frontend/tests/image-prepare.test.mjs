import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { needsConversion, prepareImageForUpload } = loadTs('lib/image-prepare.ts', {}, { File, Blob });

const named = (name, type) => ({ name, type, size: 10, lastModified: 1 });
const png = async () => new Blob(['png-bytes']);

test('only GIF and SVG are converted', () => {
  assert.equal(needsConversion(named('a.gif', 'image/gif')), true);
  assert.equal(needsConversion(named('a.svg', 'image/svg+xml')), true);
  for (const [name, type] of [
    ['a.jpg', 'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.png', 'image/png'],
    ['a.webp', 'image/webp'],
  ]) {
    assert.equal(needsConversion(named(name, type)), false, name);
  }
});

test('an SVG with no type is still recognised by its name', () => {
  assert.equal(needsConversion(named('logo.SVG', '')), true);
  assert.equal(needsConversion(named('anim.Gif', '')), true);
  assert.equal(needsConversion(named('photo.png', '')), false);
});

test('a JPG, PNG or WEBP is sent untouched', async () => {
  const file = new File(['x'], 'slip.jpg', { type: 'image/jpeg' });
  let called = false;
  const spy = async () => {
    called = true;
    return new Blob();
  };
  assert.equal(await prepareImageForUpload(file, spy), file);
  assert.equal(called, false);
});

test('a GIF or SVG comes back as a PNG with the same name', async () => {
  const gif = new File(['x'], 'receipt.final.gif', { type: 'image/gif', lastModified: 5 });
  const out = await prepareImageForUpload(gif, png);
  assert.equal(out.type, 'image/png');
  assert.equal(out.name, 'receipt.final.png');
  assert.equal(out.lastModified, 5);

  const svg = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' });
  let sawSvg;
  const out2 = await prepareImageForUpload(svg, async (_f, isSvg) => {
    sawSvg = isSvg;
    return new Blob(['p']);
  });
  assert.equal(out2.name, 'icon.png');
  assert.equal(sawSvg, true);
});

test('a picture that cannot be drawn fails instead of sending the original', async () => {
  const bad = new File(['x'], 'broken.gif', { type: 'image/gif' });
  await assert.rejects(
    prepareImageForUpload(bad, async () => {
      throw new Error('Not an image');
    }),
  );
});
