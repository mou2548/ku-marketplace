import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source = ts.transpileModule(fs.readFileSync('lib/actions/following.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function action({token = 'session-token', status} = {}) {
  const calls = [], paths = [], exports = {};
  class ApiError extends Error { constructor(status) { super('Request failed'); this.status = status; } }
  const deps = {
    'next/cache': { revalidatePath: path => paths.push(path) },
    '@/lib/api/session': { getAccessToken: async () => token },
    '@/lib/api/client': { ApiError, apiFetch: async (...args) => { calls.push(args); if (status) throw new ApiError(status); } },
  };
  vm.runInNewContext(source, {exports, require: name => deps[name]});
  return {run:exports.setFollowing,calls,paths};
}
test('follow and unfollow send desired state with session identity without blocking completion on page rendering', async () => {
  for (const desired of [true,false]) {
    const {run,calls,paths} = action();
    assert.equal((await run(42,desired)).error,undefined);
    assert.equal(calls[0][0],'/users/me/following/42');
    assert.equal(calls[0][1].method,desired?'PUT':'DELETE');
    assert.equal(calls[0][1].token,'session-token');
    assert.deepEqual(paths,[]);
  }
});
test('invalid input and anonymous sessions never mutate', async () => {
  const anonymous=action({token:null});
  assert.equal((await anonymous.run(42,true)).error,'login');
  assert.equal(anonymous.calls.length,0);
  const invalid=action();
  assert.equal((await invalid.run(-1,true)).error,'failed');
  assert.equal((await invalid.run(42,'toggle')).error,'failed');
  assert.equal(invalid.calls.length,0);
});
test('failed mutations return errors without pretending to update server state', async () => {
  for (const [status,expected] of [[401,'login'],[403,'unavailable'],[404,'unavailable'],[503,'failed']]) {
    const {run,paths}=action({status});
    assert.equal((await run(42,true)).error,expected);
    assert.deepEqual(paths,[]);
  }
});
