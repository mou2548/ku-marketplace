import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const slipState = loadTs('lib/slip-state.ts');
const status = loadTs('lib/status.ts', { '@/lib/slip-state': slipState });
const { deadlineFor } = loadTs('lib/inbox.ts', {
  '@/lib/slip-state': slipState,
  '@/lib/status': status,
});
const { describeDeal } = loadTs('lib/deal-progress.ts', {
  '@/lib/appointment': { deriveAppointmentView: () => ({}) },
  '@/lib/date-format': { formatDate: String, formatDateTime: String },
  '@/lib/status': status,
  '@/lib/slip-state': slipState,
});

const BUYER = 1;
const SELLER = 2;
const HOUR = 3600000;

const rejected = (over = {}) => ({
  transaction_id: 7,
  buyer_id: BUYER,
  seller_id: SELLER,
  buyer: { name: 'Buyer' },
  seller: { name: 'Seller' },
  post: { item: { name: 'Calculus' } },
  final_amount: 100,
  status: 'Processing',
  delivery_method: 'Meetup',
  offer_id: null,
  created_at: '2026-10-20T09:00:00.000Z',
  payment_confirmed_by_buyer_at: '2026-10-20T09:10:00.000Z',
  slip_image_url: null,
  payment_confirmed_by_seller_at: null,
  refund_slip_url: null,
  refund_submitted_at: null,
  refund_confirmed_by_buyer: false,
  ...over,
});

const refunded = (over = {}) =>
  rejected({
    refund_slip_url: 'https://x/refund.png',
    refund_submitted_at: '2026-10-21T10:00:00.000Z',
    ...over,
  });

test('a rejected slip with no refund yet is the buyer\'s turn to send a new slip', () => {
  const prompt = status.resolveTransactionActor(rejected(), 'buyer');
  assert.equal(prompt.actor, 'buyer');
  assert.equal(prompt.action, 'upload-slip');
});

test('once the seller sends a refund slip, the buyer confirms it instead of re-uploading', () => {
  const buyer = status.resolveTransactionActor(refunded(), 'buyer');
  assert.equal(buyer.action, 'confirm-refund');
  assert.equal(buyer.labelKey, 'prompt.confirm-refund.you');
  const seller = status.resolveTransactionActor(refunded(), 'seller');
  assert.equal(seller.actor, 'buyer');
  assert.equal(seller.labelKey, 'prompt.confirm-refund.them');
});

test('a refund slip on a Pending Refund deal hands the turn to the buyer', () => {
  const tx = refunded({ status: 'Pending Refund', payment_confirmed_by_seller_at: '2026-10-20T10:00:00.000Z' });
  assert.equal(status.resolveTransactionActor(tx, 'buyer').action, 'confirm-refund');
  const owed = { ...tx, refund_slip_url: null, refund_submitted_at: null };
  assert.equal(status.resolveTransactionActor(owed, 'seller').action, 'refund-slip');
});

test('the refund clock after a rejected slip is 24 hours from the refund slip', () => {
  const deadline = deadlineFor(refunded());
  assert.equal(deadline.kind, 'refund-confirmation');
  assert.equal(deadline.expiresAt, Date.parse('2026-10-21T10:00:00.000Z') + 24 * HOUR);
  assert.equal(deadlineFor(rejected()), undefined);
});

test('a pending cancellation carries 72 hours, a pending return 24', () => {
  const at = '2026-10-22T08:00:00.000Z';
  const cancel = deadlineFor(rejected({ cancellation_response: 'Pending', cancellation_requested_at: at }));
  assert.equal(cancel.kind, 'cancel-response');
  assert.equal(cancel.expiresAt, Date.parse(at) + 72 * HOUR);
  const ret = deadlineFor(rejected({ status: 'Completed', cancellation_response: 'Pending', cancellation_requested_at: at }));
  assert.equal(ret.kind, 'return-response');
  assert.equal(ret.expiresAt, Date.parse(at) + 24 * HOUR);
});

test('the deal headline asks the buyer to confirm the refund', () => {
  const buyer = describeDeal(refunded(), BUYER, []);
  assert.equal(buyer.waitingOn, 'you');
  assert.match(buyer.headline, /confirm it reached you/);
  const seller = describeDeal(refunded(), SELLER, []);
  assert.equal(seller.waitingOn, 'them');
  assert.match(seller.headline, /confirm the refund/);
});
