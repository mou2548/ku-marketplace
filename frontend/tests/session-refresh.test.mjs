import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { NextRequest, NextResponse } from 'next/server.js';

function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => deps[id], Buffer, Date, process, AbortSignal });
  return exports;
}
const cookieModule = load('lib/session-cookies.ts', {});
const jwt = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
const expires = Math.floor(Date.now() / 1000) + 604800;
const tokens = { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: 'rotated', sessionExpiresAt: expires };
class ApiError extends Error { constructor(status) { super('API error'); this.status = status; } }
function proxy(fetch) {
  return load('proxy.ts', {
    'next/server': { NextRequest, NextResponse },
    './lib/api/client': { apiFetch: fetch, ApiError },
    './lib/session-cookies': cookieModule,
  }).proxy;
}
function request(access = jwt(1), method = 'GET') {
  return new NextRequest('http://localhost:3000/inventory/new', { method, headers: { cookie: `session=${access}; ku-refresh=original`, ...(method === 'POST' ? { 'next-action': 'test-action' } : {}) } });
}

test('page and Server Action requests receive refreshed cookies in the same request', async () => {
  for (const method of ['GET', 'POST']) {
    let calls = 0;
    const result = await proxy(async (path, init) => {
      calls++;
      assert.equal(path, '/auth/refresh');
      assert.equal(init.body.refreshToken, 'original');
      return tokens;
    })(request(jwt(1), method));
    assert.equal(calls, 1);
    assert.equal(result.cookies.get('session').value, tokens.accessToken);
    assert.equal(result.cookies.get('ku-refresh').value, 'rotated');
    assert.match(result.headers.get('x-middleware-request-cookie'), /ku-refresh=rotated/);
    assert.ok(result.headers.get('x-middleware-request-cookie').includes(tokens.accessToken));
    assert.ok(result.cookies.get('ku-refresh').httpOnly);
    assert.equal(result.cookies.get('ku-refresh').expires.getTime(), expires * 1000);
  }
});

test('fresh access and anonymous requests do not call refresh', async () => {
  const handle = proxy(() => { throw new Error('Unexpected refresh'); });
  await handle(request(tokens.accessToken));
  await handle(new NextRequest('http://localhost:3000/feed'));
});

test('missing access cookie recovers using the refresh cookie after sleeping', async () => {
  const req = new NextRequest('http://localhost:3000/chat/1', { headers: { cookie: 'ku-refresh=original' } });
  const result = await proxy(async () => tokens)(req);
  assert.equal(result.cookies.get('session').value, tokens.accessToken);
});

test('invalid refresh clears credentials for the downstream action and browser', async () => {
  const result = await proxy(async () => { throw new ApiError(401); })(request());
  assert.equal(result.cookies.get('session').value, '');
  assert.equal(result.cookies.get('ku-refresh').value, '');
  assert.ok(!result.headers.get('x-middleware-request-cookie')?.includes('original'));
});

test('network and service errors preserve credentials and never forward the mutation', async () => {
  for (const error of [new Error('network'), new ApiError(503)]) {
    const result = await proxy(async () => { throw error; })(request(jwt(1), 'POST'));
    assert.equal(result.status, 503);
    assert.equal(result.headers.get('set-cookie'), null);
    assert.equal(result.headers.get('x-middleware-next'), null);
  }
});

test('login session cookies have independent lifetimes and clear together', async () => {
  const values = new Map();
  const store = { set: (name, value, options) => values.set(name, { value, ...options }), delete: (name) => values.delete(name) };
  const session = load('lib/api/session.ts', { 'next/headers': { cookies: async () => store }, '../session-cookies': cookieModule });
  await session.setSession(tokens.accessToken, tokens);
  assert.ok(values.get('session').maxAge <= 900);
  assert.equal(values.get('ku-refresh').expires.getTime(), expires * 1000);
  assert.ok(values.get('session').httpOnly && values.get('ku-refresh').httpOnly);
  await session.clearSession();
  assert.equal(values.size, 0);
});
