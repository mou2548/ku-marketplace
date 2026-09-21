import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/status.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports });

test('uploaded payment must be reviewed before shipping or meetup handover', () => {
  for (const delivery_method of ['Meetup', 'Shipping']) {
    const prompt = exports.resolveTransactionActor({ status: 'Processing', delivery_method, payment_confirmed_by_buyer_at: '2026-09-09' }, 'seller');
    assert.equal(prompt.actor, 'seller');
    assert.equal(prompt.action, 'review-slip');
  }
});

test('confirmed payment advances to shipping or scanning, while a free trade skips payment', () => {
  assert.equal(exports.resolveTransactionActor({ status: 'Processing', delivery_method: 'Shipping', payment_confirmed_by_seller_at: '2026-09-09' }, 'seller').action, 'enter-tracking');
  assert.equal(exports.resolveTransactionActor({ status: 'Pending', delivery_method: 'Meetup', offer_id: 1, additional_money: 0 }, 'buyer').action, 'scan-qr');
});
