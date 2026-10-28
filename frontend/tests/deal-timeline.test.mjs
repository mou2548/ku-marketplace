import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { buildDealTimeline } = loadTs('lib/deal-timeline.ts', {
  '@/lib/date-format': {
    formatDate: (d) => String(d),
    formatDateTime: (d) => String(d),
  },
  '@/lib/format-price': loadTs('lib/format-price.ts'),
  '@/lib/status': { requiresPayment: () => true },
});

const BUYER = 1;
const SELLER = 2;
const at = (hhmm) => `2026-10-20T${hhmm}:00.000Z`;

const tx = (over = {}) => ({
  transaction_id: 7,
  buyer_id: BUYER,
  seller_id: SELLER,
  buyer: { name: 'Buyer' },
  seller: { name: 'Seller' },
  post: { item: { name: 'Calculus' } },
  final_amount: 100,
  status: 'Processing',
  delivery_method: 'Meetup',
  created_at: at('09:00'),
  payment_confirmed_by_buyer_at: at('09:10'),
  payment_confirmed_by_seller_at: at('09:20'),
  ...over,
});

const card = (over = {}) => ({
  appointment_id: 1,
  proposed_by: SELLER,
  date: '2026-10-25',
  time: '13:00:00',
  location: 'Library',
  status: 'Confirmed',
  created_at: at('09:30'),
  ...over,
});

test('a confirmed meetup sits at the time it was answered, not at the end', () => {
  const events = buildDealTimeline(
    tx(),
    [card({ responded_at: at('09:40') })],
    BUYER,
  );
  const confirmed = events.find((e) => e.kind === 'meetup-confirmed');
  assert.equal(confirmed.placeAt, Date.parse(at('09:40')));
  assert.ok(Number.isFinite(confirmed.placeAt));
});

test('every event of a finished cancellation carries its own time', () => {
  const events = buildDealTimeline(
    tx({
      status: 'Refunded',
      tracking_number: 'TH123',
      shipped_at: at('10:00'),
      item_received_confirmed_by_buyer_at: at('11:00'),
      cancellation_requested_by: BUYER,
      cancellation_requested_at: at('12:00'),
      cancellation_response: 'Approved',
      cancellation_responded_at: at('12:30'),
      refund_submitted_at: at('13:00'),
      refund_confirmed_by_buyer: true,
      refund_confirmed_at: at('13:30'),
      item_return_confirmed_at: at('14:00'),
    }),
    [],
    BUYER,
  );
  for (const e of events) {
    assert.ok(Number.isFinite(e.placeAt), `${e.id} has no real time`);
  }
  const order = [...events.map((e) => e.kind)];
  assert.deepEqual(order, [
    'started',
    'slip',
    'paid',
    'shipped',
    'received',
    'cancel-requested',
    'cancel-answered',
    'refund-slip',
    'refund-received',
    'item-returned',
    'closed',
  ]);
  const closed = events.at(-1);
  assert.equal(closed.placeAt, Date.parse(at('14:00')));
});

test('a card answered before the backend recorded it still follows its proposal', () => {
  // Not the latest step (the handover came after), so it stays behind its
  // proposal instead of floating to the end of the chat.
  const events = buildDealTimeline(
    tx({ item_received_confirmed_by_buyer_at: at('10:00') }),
    [card()],
    BUYER,
  );
  const proposed = events.find((e) => e.kind === 'meetup-proposed');
  const confirmed = events.find((e) => e.kind === 'meetup-confirmed');
  assert.equal(confirmed.placeAt, proposed.placeAt);
  assert.ok(events.indexOf(confirmed) > events.indexOf(proposed));
});

test('an answered request to an admin is dated by the report', () => {
  const events = buildDealTimeline(
    tx({ active_report_id: 3, active_report_created_at: at('15:00') }),
    [],
    BUYER,
  );
  const review = events.find((e) => e.kind === 'review');
  assert.equal(review.placeAt, Date.parse(at('15:00')));
});
