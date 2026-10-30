import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { packColumns } = loadTs('lib/masonry.ts');
const pack = (heights, columns) => JSON.parse(JSON.stringify(packColumns(heights, columns)));

test('equal heights deal in turn, so the first row is items 0..n-1', () => {
  assert.deepEqual(pack([1, 1, 1, 1, 1, 1, 1], 3), [[0, 3, 6], [1, 4], [2, 5]]);
});

test('each item goes to the shortest column, ties to the left', () => {
  // After the first row the middle column is shortest, then the first.
  assert.deepEqual(pack([300, 100, 200, 50, 50], 3), [[0], [1, 3, 4], [2]]);
  assert.deepEqual(pack([100, 100, 50], 2), [[0, 2], [1]]);
});

test('packing is prefix-stable', () => {
  const heights = [320, 410, 280, 390, 300, 450, 270, 360, 330, 400, 290, 380];
  const full = pack(heights, 4);
  for (let k = 1; k <= heights.length; k++) {
    const prefix = pack(heights.slice(0, k), 4);
    assert.deepEqual(prefix, full.map((column) => column.filter((index) => index < k)));
  }
});

test('columns end closer together than round-robin', () => {
  const heights = [500, 100, 100, 500, 100, 100, 500, 100, 100];
  const spread = (stacks) => {
    const sums = stacks.map((column) => column.reduce((sum, i) => sum + heights[i], 0));
    return Math.max(...sums) - Math.min(...sums);
  };
  const roundRobin = [0, 1, 2].map((c) => heights.map((_, i) => i).filter((i) => i % 3 === c));
  assert.ok(spread(pack(heights, 3)) < spread(roundRobin));
});

test('more columns than items leaves the extra columns empty', () => {
  assert.deepEqual(pack([10, 20], 4), [[0], [1], [], []]);
  assert.deepEqual(pack([], 2), [[], []]);
});
