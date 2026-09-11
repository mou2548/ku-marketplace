import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = ts.transpileModule(fs.readFileSync('lib/actions/auth.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

for (const scenario of [
  { email: 'admin1@ku.th', isAdmin: true, status: 'Active', destination: '/admin/reports' },
  { email: 'admin2@ku.th', isAdmin: true, status: 'Active', destination: '/admin/reports' },
  { email: 'user1@ku.th', isAdmin: false, status: 'Active', destination: '/feed' },
  { email: 'admin1@ku.th', isAdmin: false, status: 'Active', destination: '/feed' },
  { email: 'admin1@ku.th', isAdmin: true, status: 'Suspended', destination: '/account/appeals' },
  { email: 'admin2@ku.th', isAdmin: true, status: 'Banned', destination: '/account/appeals' },
]) {
  test(`login ${scenario.email}, admin=${scenario.isAdmin}, ${scenario.status} redirects to ${scenario.destination}`, async () => {
    const exports = {};
    const events = [];
    const redirectSignal = new Error('redirect');
    const deps = {
      'next/navigation': { redirect: (path) => { events.push(['redirect', path]); throw redirectSignal; } },
      '@/lib/api/auth': {
        login: async (email, password) => {
          assert.equal(email, scenario.email);
          assert.equal(password, 'test-password');
          return { accessToken: 'test-token', user: scenario };
        },
      },
      '@/lib/api/client': { ApiError: class extends Error {} },
      '@/lib/api/session': { setSession: async (token) => { events.push(['session', token]); } },
    };
    vm.runInNewContext(source, { exports, require: (name) => deps[name] });
    const form = new FormData();
    form.set('email', scenario.email);
    form.set('password', 'test-password');
    await assert.rejects(exports.login(undefined, form), (error) => error === redirectSignal);
    assert.deepEqual(events, [['session', 'test-token'], ['redirect', scenario.destination]]);
  });
}
