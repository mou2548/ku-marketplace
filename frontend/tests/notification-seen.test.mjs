import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const seen = loadTs('lib/notification-seen.ts');
// Arrays built inside the module's own context are not the test's Array, so
// strict deepEqual needs them copied across first.
const plain = (list) => [...list];

const note = (over = {}) => ({
  notification_id: 5000010,
  kind: 'giveaway',
  title: 'Ready to collect: GG',
  body: 'Your place is confirmed.',
  href: '/giveaway/8/ticket/11',
  created_at: '2026-10-30T18:00:00.000Z',
  read: false,
  ...over,
});

test('a key changes when the title or the date changes, so a new step is new again', () => {
  const a = seen.feedKey(note());
  assert.equal(a, seen.feedKey(note()));
  assert.notEqual(a, seen.feedKey(note({ title: 'Not selected: GG' })));
  assert.notEqual(a, seen.feedKey(note({ created_at: '2026-10-31T01:00:00.000Z' })));
  assert.match(a, /^\d+:[a-z0-9]+$/);
});

test('unread items and giveaway outcomes want attention; read ones do not', () => {
  const feed = seen.toFeed([
    note({ notification_id: 1, read: false }),
    note({ notification_id: 2, read: true }),
    note({ notification_id: 3, read: true, event: 'giveaway-not-selected' }),
  ]);
  assert.deepEqual(feed.map((f) => f.attention), [true, false, true]);
});

test('the dot counts only attention items that were not seen', () => {
  const feed = seen.toFeed([note({ notification_id: 1 }), note({ notification_id: 2 })]);
  assert.equal(seen.unseenCount(feed, []), 2);
  assert.equal(seen.unseenCount(feed, [feed[0].key]), 1);
  assert.equal(seen.unseenCount(feed, seen.attentionKeys(feed)), 0);
});

test('a pop-up is for a giveaway outcome that is neither seen nor announced', () => {
  const feed = seen.toFeed([
    note({ notification_id: 1, event: 'giveaway-selected' }),
    note({ notification_id: 2, event: 'giveaway-expired' }),
    // A new trade offer only gets the dot, never a pop-up.
    note({ notification_id: 3, kind: 'offer' }),
  ]);
  const keys = (list) => list.map((f) => f.key);
  assert.deepEqual(keys(seen.popupCandidates(feed, [], [])), [feed[0].key, feed[1].key]);
  assert.deepEqual(keys(seen.popupCandidates(feed, [feed[0].key], [])), [feed[1].key]);
  assert.deepEqual(keys(seen.popupCandidates(feed, [], [feed[1].key])), [feed[0].key]);
});

test('the cookie round-trips, ignores junk, and forgets keys that are gone', () => {
  const keys = ['5000010:abc1', '12:z9'];
  assert.deepEqual(plain(seen.parseSeen(seen.serializeSeen(keys))), keys);
  assert.deepEqual(plain(seen.parseSeen('%E0%A4%A')), []);
  assert.deepEqual(
    plain(seen.parseSeen(encodeURIComponent('x,y:1,5000010:abc1'))),
    ['5000010:abc1'],
  );
  assert.deepEqual(plain(seen.parseSeen('')), []);
  assert.deepEqual(plain(seen.pruneSeen(keys, ['12:z9'])), ['12:z9']);
});

test('the cookie keeps only the newest keys', () => {
  const many = Array.from({ length: 300 }, (_, i) => `${i}:a`);
  const stored = seen.parseSeen(seen.serializeSeen(many));
  assert.equal(stored.length, 120);
  assert.equal(stored.at(-1), '299:a');
});
