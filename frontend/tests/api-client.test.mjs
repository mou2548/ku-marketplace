import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function client(body) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('lib/api/client.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, process: { env: {} }, Headers, FormData, URLSearchParams, Blob,
    ArrayBuffer, fetch: async () => Response.json(body),
  });
  return exports;
}

test('preserves pagination metadata from the current backend envelope', async () => {
  const body = { success: true, message: 'success', data: [{ id: 1 }], meta: { total: 50, page: 2 } };
  const result = await client(body).apiFetch('/items');
  assert.equal(JSON.stringify(result.data), JSON.stringify(body.data));
  assert.equal(JSON.stringify(result.meta), JSON.stringify(body.meta));
});

test('unwraps ordinary responses and legacy nested responses', async () => {
  for (const body of [
    { success: true, message: 'success', data: { id: 1 } },
    { statusCode: 200, message: 'success', data: { data: { success: true, data: { id: 1 } } } },
  ]) {
    assert.equal((await client(body).apiFetch('/items/1')).id, 1);
  }
});
