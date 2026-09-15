import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function action(token = 'test-token') {
  const exports = {};
  const calls = [];
  const result = { transaction_id: 'transaction_123', delivery_method: 'Shipping' };
  const deps = {
    '@/lib/api/session': { getAccessToken: async () => token, getCurrentUserId: async () => 4 },
    '@/lib/api/posts': { buyPost: async (...args) => { calls.push(args); return result; } },
  };
  const source = ts.transpileModule(fs.readFileSync('lib/actions/posts.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => deps[name] });
  return { buy: exports.buyPostAction, calls, result };
}

test('purchase uses the session identity and preserves the real returned transaction ID', async () => {
  const a = action();
  assert.equal(await a.buy(42, { delivery_method: 'Shipping', quantity: 1, buyer_id: 99 }), a.result);
  assert.equal(a.calls[0][0], 42);
  assert.equal(a.calls[0][1].buyer_id, 4);
  assert.equal(a.calls[0][1].delivery_method, 'Shipping');
  assert.equal(a.calls[0][2].token, 'test-token');
});
test('signed-out purchase does not invoke the backend mutation', async () => {
  const b = action(null);
  await assert.rejects(b.buy(42, { delivery_method: 'Meetup' }), /Not signed in/);
  assert.equal(b.calls.length, 0);
});
