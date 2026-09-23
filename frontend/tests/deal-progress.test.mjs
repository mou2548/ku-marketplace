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

const { describeDeal } = load('lib/deal-progress.ts', {
  '@/lib/appointment': load('lib/appointment.ts'),
  '@/lib/date-format': load('lib/date-format.ts'),
  '@/lib/status': load('lib/status.ts'),
});

const BUYER = 1;
const SELLER = 2;
const tx = (overrides = {}) => ({
  transaction_id: 9,
  buyer_id: BUYER,
  seller_id: SELLER,
  buyer: { user_id: BUYER, name: 'Bea' },
  seller: { user_id: SELLER, name: 'Sam' },
  offer_id: null,
  status: 'Pending',
  delivery_method: 'Meetup',
  ...overrides,
});
const card = (overrides = {}) => ({
  appointment_id: 1,
  transaction_id: 9,
  proposed_by: BUYER,
  date: '2026-10-02',
  time: '14:00:00',
  location: 'Central Library',
  status: 'Pending',
  deleted_at: null,
  created_at: '2026-09-20T10:00:00Z',
  ...overrides,
});

test('an unpaid sale waits on the buyer to transfer and upload the slip', () => {
  const buyer = describeDeal(tx(), BUYER, []);
  assert.equal(buyer.waitingOn, 'you');
  assert.match(buyer.headline, /upload the slip/);
  assert.equal(buyer.facts[0].label, 'Not paid yet');
  const seller = describeDeal(tx(), SELLER, []);
  assert.equal(seller.waitingOn, 'them');
  assert.equal(seller.headline, 'Waiting for Bea to pay');
});

test('an uploaded slip waits on the seller and shows when it was sent', () => {
  const p = describeDeal(tx({ status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-18T03:00:00Z' }), SELLER, []);
  assert.equal(p.waitingOn, 'you');
  assert.match(p.facts[0].label, /^Slip sent 18 Sept? 2026 · not confirmed yet$/);
});

test('shipping moves from not shipped to tracking number to delivered', () => {
  const paid = { status: 'Processing', delivery_method: 'Shipping', payment_confirmed_by_buyer_at: '2026-09-18', payment_confirmed_by_seller_at: '2026-09-18' };
  const unshipped = describeDeal(tx(paid), SELLER, []);
  assert.equal(unshipped.waitingOn, 'you');
  assert.equal(unshipped.facts[1].label, 'Not shipped yet');
  const shipped = describeDeal(tx({ ...paid, tracking_number: 'TH123', estimated_delivery_date: '2026-09-25' }), BUYER, []);
  assert.equal(shipped.waitingOn, 'you');
  assert.match(shipped.facts[1].label, /^Shipped · TH123 · due 25 Sept? 2026$/);
});

test('a meetup reports no time, a pending proposal, then the agreed time and place', () => {
  const paid = { status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-18', payment_confirmed_by_seller_at: '2026-09-18' };
  const none = describeDeal(tx(paid), SELLER, []);
  assert.equal(none.waitingOn, 'both');
  assert.equal(none.facts[1].label, 'No meetup time agreed yet');

  const proposedByBuyer = [card()];
  assert.equal(describeDeal(tx(paid), BUYER, proposedByBuyer).waitingOn, 'them');
  assert.equal(describeDeal(tx(paid), SELLER, proposedByBuyer).waitingOn, 'you');

  const agreed = describeDeal(tx(paid), BUYER, [card({ status: 'Confirmed' })]);
  assert.match(agreed.facts[1].label, /^Meetup Fri 2 Oct, 14:00 · Central Library$/);
  assert.match(agreed.headline, /scan the seller's QR/);
});

test('a rejected or superseded card never counts as the current meetup', () => {
  const paid = { status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-18', payment_confirmed_by_seller_at: '2026-09-18' };
  const cards = [card({ status: 'Confirmed', deleted_at: '2026-09-21T00:00:00Z' }), card({ appointment_id: 2, status: 'Rejected', deleted_at: '2026-09-21T00:00:00Z' })];
  assert.equal(describeDeal(tx(paid), BUYER, cards).facts[1].label, 'No meetup time agreed yet');
});

test('unknown appointment cards are never shown as "no meetup agreed"', () => {
  const paid = { status: 'Processing', payment_confirmed_by_buyer_at: '2026-09-18', payment_confirmed_by_seller_at: '2026-09-18' };
  const p = describeDeal(tx(paid), BUYER, undefined);
  assert.equal(p.facts.length, 1);
  assert.equal(p.waitingOn, null);
});

test('a cash-free trade skips payment entirely', () => {
  const p = describeDeal(tx({ offer_id: 4, additional_money: 0 }), BUYER, []);
  assert.equal(p.facts.length, 1);
  assert.equal(p.facts[0].kind, 'meetup');
});

test('open reports and pending cancellation requests lock the deal', () => {
  const reported = describeDeal(tx({ status: 'Processing', active_report_id: 3, payment_confirmed_by_buyer_at: '2026-09-18' }), BUYER, []);
  assert.equal(reported.waitingOn, null);
  assert.match(reported.headline, /admin review/);

  const request = { status: 'Processing', cancellation_response: 'Pending', cancellation_requested_by: BUYER, cancellation_requested_at: '2026-09-19' };
  assert.equal(describeDeal(tx(request), BUYER, []).waitingOn, 'them');
  assert.equal(describeDeal(tx(request), SELLER, []).waitingOn, 'you');
  assert.match(describeDeal(tx({ ...request, status: 'Completed' }), SELLER, []).headline, /return/);
});

test('a return tracks the refund slip and the item separately', () => {
  const base = {
    status: 'Pending Refund',
    payment_confirmed_by_buyer_at: '2026-09-10',
    item_received_confirmed_by_buyer_at: '2026-09-12',
    cancellation_requested_by: BUYER,
    cancellation_requested_at: '2026-09-15T00:00:00Z',
  };
  const oldHandover = card({ status: 'Confirmed', created_at: '2026-09-11T00:00:00Z' });
  const seller = describeDeal(tx(base), SELLER, [oldHandover]);
  assert.equal(seller.facts[0].label, 'Refund not sent yet');
  // The handover card from before the request does not count for the return.
  assert.equal(seller.facts[1].label, 'No return meetup time agreed yet');
  assert.equal(seller.waitingOn, 'you');

  const slipSent = describeDeal(tx({ ...base, refund_slip_url: 'x', refund_submitted_at: '2026-09-16', item_return_confirmed_at: '2026-09-17' }), BUYER, []);
  assert.match(slipSent.headline, /confirm the refund/);
  assert.match(slipSent.facts[1].label, /^Item returned/);
});

test('finished deals show one line and wait on nobody', () => {
  const done = describeDeal(tx({ status: 'Completed', item_received_confirmed_by_buyer_at: '2026-09-12T05:00:00Z' }), BUYER, []);
  assert.match(done.headline, /^Completed 12 Sept? 2026$/);
  assert.equal(done.waitingOn, null);
  assert.equal(describeDeal(tx({ status: 'Cancelled', cancellation_requested_by: SELLER }), BUYER, []).headline, 'Cancelled by Sam');
  assert.equal(describeDeal(tx({ status: 'Refunded' }), BUYER, []).waitingOn, null);
});
