import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function load(path, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, Intl, Date, require: (name) => dependencies[name] });
  return exports;
}

const { buildDealTimeline } = load('lib/deal-timeline.ts', {
  '@/lib/date-format': load('lib/date-format.ts'),
  '@/lib/status': load('lib/status.ts'),
});

const BUYER = 1;
const SELLER = 2;
const tx = (overrides = {}) => ({
  transaction_id: 9, buyer_id: BUYER, seller_id: SELLER,
  buyer: { user_id: BUYER, name: 'Bea' }, seller: { user_id: SELLER, name: 'Sam' },
  offer_id: null, status: 'Pending', delivery_method: 'Meetup', final_amount: 150,
  created_at: '2026-09-10T00:00:00Z', post: { item: { name: 'Physics I' } },
  ...overrides,
});
const card = (overrides = {}) => ({
  appointment_id: 1, transaction_id: 9, proposed_by: SELLER, date: '2026-09-15', time: '12:00:00',
  location: 'Library', status: 'Pending', deleted_at: null, created_at: '2026-09-12T00:00:00Z', ...overrides,
});
const kinds = (events) => Array.from(events, (e) => e.kind);

test('a new deal has only its start card', () => {
  const events = buildDealTimeline(tx(), [], BUYER);
  assert.deepEqual(kinds(events), ['started']);
  assert.equal(events[0].detail, 'Physics I · ฿150');
});

test('dated steps sit at their own time, in order', () => {
  const events = buildDealTimeline(tx({
    status: 'Processing',
    payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z',
    payment_confirmed_by_seller_at: '2026-09-11T02:00:00Z',
  }), [card()], BUYER);
  assert.deepEqual(kinds(events), ['started', 'slip', 'paid', 'meetup-proposed']);
  assert.equal(events[1].title, 'You sent the payment slip');
  assert.equal(events[2].title, 'Sam confirmed the payment');
});

test('an undated latest step goes to the end, an undated earlier one follows its step', () => {
  const confirmed = card({ status: 'Confirmed' });
  const latest = buildDealTimeline(tx({ status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', payment_confirmed_by_seller_at: '2026-09-11T01:00:00Z' }), [confirmed], BUYER);
  assert.equal(latest.at(-1).kind, 'meetup-confirmed');
  assert.equal(latest.at(-1).placeAt, Infinity);
  assert.equal(latest.at(-1).at, undefined);

  const later = buildDealTimeline(tx({ status: 'Completed', payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', payment_confirmed_by_seller_at: '2026-09-11T01:00:00Z', item_received_confirmed_by_buyer_at: '2026-09-15T05:00:00Z' }), [confirmed], BUYER);
  const i = later.findIndex((e) => e.kind === 'meetup-confirmed');
  assert.equal(later[i].placeAt, Date.parse(confirmed.created_at));
  assert.equal(later[i + 1].kind, 'received');
});

test('nothing is placed above the deal start, even with bad stamps', () => {
  const events = buildDealTimeline(tx({ status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-01T00:00:00Z' }), [], BUYER);
  assert.equal(events[0].kind, 'started');
  assert.ok(events.every((e) => e.placeAt >= Date.parse('2026-09-10T00:00:00Z')));
});

test('a rejected or replaced proposal is shown as not accepted', () => {
  const events = buildDealTimeline(tx({ status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z' }), [card({ status: 'Rejected', deleted_at: '2026-09-12T03:00:00Z' })], BUYER);
  assert.equal(events.at(-1).kind, 'meetup-closed');
});

test('cancellations: on the spot, answered, and escalated', () => {
  const spot = buildDealTimeline(tx({ status: 'Cancelled', cancellation_requested_by: BUYER, cancellation_requested_at: '2026-09-11T00:00:00Z', cancellation_response: 'Approved' }), [], SELLER);
  assert.equal(spot.at(-1).title, 'Bea cancelled the deal');
  const rejected = buildDealTimeline(tx({ status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', cancellation_requested_by: BUYER, cancellation_requested_at: '2026-09-12T00:00:00Z', cancellation_response: 'Rejected', active_report_id: 4 }), [], SELLER);
  assert.deepEqual(kinds(rejected).slice(-2), ['cancel-requested', 'cancel-answered']);
  const timedOut = buildDealTimeline(tx({ status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', active_report_id: 5 }), [], SELLER);
  assert.equal(timedOut.at(-1).kind, 'review');
});

test('a return lists the refund and the item coming back', () => {
  const events = buildDealTimeline(tx({
    status: 'Refunded',
    payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', payment_confirmed_by_seller_at: '2026-09-11T01:00:00Z',
    item_received_confirmed_by_buyer_at: '2026-09-13T00:00:00Z',
    cancellation_requested_by: BUYER, cancellation_requested_at: '2026-09-14T00:00:00Z', cancellation_response: 'Approved',
    refund_submitted_at: '2026-09-15T00:00:00Z', refund_confirmed_by_buyer: true, item_return_confirmed_at: '2026-09-16T00:00:00Z',
  }), [], BUYER);
  assert.deepEqual(kinds(events).slice(-6), ['cancel-requested', 'cancel-answered', 'refund-slip', 'refund-received', 'item-returned', 'closed']);
  assert.equal(events.find((e) => e.kind === 'cancel-requested').title, 'You asked for a return');
});

test('every completed step carries its detail', () => {
  const events = buildDealTimeline(tx({
    status: 'Completed',
    payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', payment_confirmed_by_seller_at: '2026-09-11T01:00:00Z',
    item_received_confirmed_by_buyer_at: '2026-09-15T05:00:00Z',
  }), [card({ status: 'Confirmed' })], BUYER);
  const by = (kind) => events.find((e) => e.kind === kind);
  assert.equal(by('paid').detail, '฿150 received');
  assert.equal(by('received').detail, 'At Library');
  const shipped = buildDealTimeline(tx({ status: 'Completed', delivery_method: 'Shipping', payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', payment_confirmed_by_seller_at: '2026-09-11T01:00:00Z', tracking_number: 'TH1', item_received_confirmed_by_buyer_at: '2026-09-15T05:00:00Z' }), [], BUYER);
  assert.equal(shipped.find((e) => e.kind === 'received').detail, 'TH1');
});

test('an answered request names who answered it', () => {
  const events = buildDealTimeline(tx({ status: 'Pending Refund', payment_confirmed_by_buyer_at: '2026-09-11T00:00:00Z', cancellation_requested_by: BUYER, cancellation_requested_at: '2026-09-12T00:00:00Z', cancellation_response: 'Approved' }), [], BUYER);
  const answered = events.find((e) => e.kind === 'cancel-answered');
  assert.equal(answered.title, 'Sam accepted the cancellation');
  assert.equal(answered.detail, 'Refund next');
});
