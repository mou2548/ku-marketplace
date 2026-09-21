import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

test('cancellation answers match the backend enum', async () => {
  const calls = [];
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('lib/api/transactions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => name === './client'
      ? { apiFetch: async (path, init) => { calls.push({ path, init }); } }
      : { authHeader: async () => ({ Authorization: 'Bearer test' }) },
  });
  await exports.respondToCancellation(7, 'accept');
  await exports.respondToCancellation(7, 'reject');
  assert.equal(calls[0].init.body.response, 'Approved');
  assert.equal(calls[1].init.body.response, 'Rejected');
  assert.equal(calls[0].path, '/transactions/7/cancel-request/respond');
});
