import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { isDecodableImage } = loadTs('lib/image-check.ts');

const file = (type, size = 10) => ({ type, size });
const decodes = async () => {};
const fails = async () => {
  throw new Error('not an image');
};

test('a file is accepted only when its bytes decode', async () => {
  assert.equal(await isDecodableImage(file('image/png'), decodes), true);
  // A text file renamed .png: the type says image, the bytes do not.
  assert.equal(await isDecodableImage(file('image/png'), fails), false);
});

test('non-image types and empty files are refused without decoding', async () => {
  let called = false;
  const spy = async () => {
    called = true;
  };
  assert.equal(await isDecodableImage(file('text/plain'), spy), false);
  assert.equal(await isDecodableImage(file('image/jpeg', 0), spy), false);
  assert.equal(called, false);
});
