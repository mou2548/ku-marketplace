import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadTs } from './load-ts.mjs';

const require = createRequire(import.meta.url);
const dates = require('@internationalized/date');
const { CalendarDate, CalendarDateTime } = dates;
const { keepWithinBounds, hasTime } = loadTs('lib/date-bounds.ts', {
  '@internationalized/date': dates,
});

const dt = (d, h, m) => new CalendarDateTime(2026, 10, d, h, m);
const show = (v) => `${v.day}/${v.month} ${v.hour}:${String(v.minute).padStart(2, '0')}`;

test('a pick on the minimum day with an earlier time moves to the minimum time', () => {
  const min = dt(31, 18, 0);
  // The field held 16:47; the calendar kept it when the 31st was clicked.
  assert.equal(show(keepWithinBounds(dt(31, 16, 47), min)), '31/10 18:00');
});

test('a time already allowed, or another day, is left alone', () => {
  const min = dt(31, 18, 0);
  assert.equal(show(keepWithinBounds(dt(31, 19, 5), min)), '31/10 19:05');
  assert.equal(show(keepWithinBounds(dt(1, 8, 0), min)), '1/10 8:00');
  // A later day in the next month is not "the same day" either.
  const next = new CalendarDateTime(2026, 11, 1, 0, 0);
  assert.equal(keepWithinBounds(next, min), next);
});

test('the maximum works the same way from above', () => {
  const max = dt(31, 9, 0);
  assert.equal(show(keepWithinBounds(dt(31, 20, 30), null, max)), '31/10 9:00');
  assert.equal(show(keepWithinBounds(dt(31, 8, 0), null, max)), '31/10 8:00');
});

test('a date with no time of day is returned as it is', () => {
  const day = new CalendarDate(2026, 10, 31);
  assert.equal(keepWithinBounds(day, new CalendarDate(2026, 10, 31)), day);
  assert.equal(hasTime(day), false);
  assert.equal(hasTime(dt(1, 1, 1)), true);
});

test('no bounds means no change', () => {
  const v = dt(31, 1, 1);
  assert.equal(keepWithinBounds(v), v);
});
