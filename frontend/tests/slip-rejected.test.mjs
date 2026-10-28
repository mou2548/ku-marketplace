import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const dateStub = {
  formatDate: (d) => String(d),
  formatDateTime: (d) => String(d),
};
const statusStub = { requiresPayment: () => true };
const slipState = loadTs('lib/slip-state.ts');

const { isSlipRejected, describeDeal } = loadTs('lib/deal-progress.ts', {
  '@/lib/appointment': { deriveAppointmentView: () => ({}) },
  '@/lib/date-format': dateStub,
  '@/lib/status': statusStub,
  '@/lib/slip-state': slipState,
});
const { buildDealTimeline } = loadTs('lib/deal-timeline.ts', {
  '@/lib/date-format': dateStub,
  '@/lib/status': statusStub,
});

const BUYER = 1;
const SELLER = 2;

const rejected = (over = {}) => ({
  transaction_id: 7,
  buyer_id: BUYER,
  seller_id: SELLER,
  buyer: { name: 'Buyer' },
  seller: { name: 'Seller' },
  post: { item: { name: 'Calculus' } },
  final_amount: 100,
  status: 'Processing',
  delivery_method: 'Shipping',
  created_at: '2026-10-20T09:00:00.000Z',
  payment_confirmed_by_buyer_at: '2026-10-20T09:10:00.000Z',
  slip_image_url: null,
  payment_confirmed_by_seller_at: null,
  payment_rejection_reason: 'Only 80 baht arrived',
  ...over,
});

test('a processing deal with the upload time but no slip is a rejected slip', () => {
  assert.equal(isSlipRejected(rejected()), true);
  assert.equal(isSlipRejected(rejected({ slip_image_url: 'https://x/slip.png' })), false);
  assert.equal(
    isSlipRejected(rejected({ payment_confirmed_by_seller_at: '2026-10-20T09:20:00.000Z' })),
    false,
  );
  assert.equal(isSlipRejected(rejected({ status: 'Pending' })), false);
});

test('after a rejection the buyer is asked for a new slip and the seller waits', () => {
  const buyer = describeDeal(rejected(), BUYER, []);
  assert.equal(buyer.waitingOn, 'you');
  assert.match(buyer.headline, /rejected your slip/);
  const seller = describeDeal(rejected(), SELLER, []);
  assert.equal(seller.waitingOn, 'them');
  assert.match(seller.headline, /new slip/);
});

test('the timeline carries the seller\'s reason after the slip it rejects', () => {
  const events = buildDealTimeline(rejected(), [], BUYER);
  const kinds = events.map((e) => e.kind);
  assert.ok(kinds.indexOf('slip-rejected') > kinds.indexOf('slip'));
  assert.equal(events.find((e) => e.kind === 'slip-rejected').detail, 'Only 80 baht arrived');
  const resent = buildDealTimeline(rejected({ payment_rejection_reason: null }), [], BUYER);
  assert.ok(!resent.some((e) => e.kind === 'slip-rejected'));
});
