import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const slipSource = fs.readFileSync('components/kit/slip.tsx', 'utf8');
const slipFile = ts.createSourceFile('slip.tsx', slipSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const viewerSource = fs.readFileSync('components/kit/photo-viewer.tsx', 'utf8');
const viewerFile = ts.createSourceFile('photo-viewer.tsx', viewerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const roomSource = fs.readFileSync('app/(app)/chat/[roomId]/room-screen.tsx', 'utf8');
const roomFile = ts.createSourceFile('room-screen.tsx', roomSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function findFunction(file, name) {
  let found;
  (function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  })(file);
  return found;
}

function compile(file, name) {
  const declaration = findFunction(file, name);
  assert.ok(declaration, `${name} not found`);
  return ts.transpileModule(declaration.getText(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
}

/** Runs the uploader's two handlers against stubbed state, nothing mounted. */
function uploader({ pending = null, busy = false, onUpload = async () => {} } = {}) {
  const calls = { uploads: [], errors: [], sent: [], pending: [] };
  const context = {
    MAX_BYTES: 5 * 1024 * 1024,
    pending,
    busy,
    onUpload: async (file) => {
      calls.uploads.push(file);
      return onUpload(file);
    },
    t: (key) => key,
    setError: (value) => calls.errors.push(value),
    setSent: (value) => calls.sent.push(value),
    setBusy: () => {},
    setPending: (value) => calls.pending.push(value),
    URL: { createObjectURL: (file) => `blob:${file.name}` },
  };
  vm.createContext(context);
  vm.runInContext(`${compile(slipFile, 'handleFile')}\n${compile(slipFile, 'send')}`, context);
  return { calls, context };
}

const slip = { name: 'slip.png', type: 'image/png', size: 200 * 1024 };

test('choosing a file only previews it — the upload waits for a deliberate send', () => {
  // `onUpload` is in the vm context, so a handler that still fired it on pick
  // would show up here as a recorded upload rather than a silent pass.
  const { calls, context } = uploader();
  context.handleFile(slip);

  assert.deepEqual(calls.uploads, []);
  // Objects built inside the vm have that realm's prototype, so compare fields.
  assert.equal(calls.pending.length, 1);
  assert.equal(calls.pending[0].file, slip);
  assert.equal(calls.pending[0].url, 'blob:slip.png');
});

test('a preview URL is an object URL, which next/image cannot render', () => {
  // The bug this file exists for: `<Image src={blobUrl}>` never painted,
  // because next/image rejects any src that is not a rooted path or http(s)
  // and its optimizer cannot fetch bytes that live in the browser.
  const image = findFunction(slipFile, 'SlipImage');
  assert.ok(image, 'SlipImage not found');
  const body = image.getText(slipFile);
  const plainImg = body.indexOf('<img');
  const nextImage = body.indexOf('<Image');
  assert.ok(plainImg > -1 && nextImage > -1, 'both image paths must exist');
  assert.ok(body.includes('blob:'), 'the blob: case must be branched on');
  assert.ok(plainImg < nextImage, 'the blob: branch must return before next/image');
});

test('a non-image or an oversized file is refused before anything is previewed', () => {
  for (const file of [
    { name: 'notes.pdf', type: 'application/pdf', size: 1024 },
    { name: 'huge.png', type: 'image/png', size: 6 * 1024 * 1024 },
  ]) {
    const { calls, context } = uploader();
    context.handleFile(file);
    assert.deepEqual(calls.pending, []);
    assert.equal(calls.errors.at(-1)?.startsWith('slip.error'), true);
  }
});

test('sending uploads the previewed file exactly once', async () => {
  const { calls, context } = uploader({ pending: { file: slip, url: 'blob:slip.png' } });
  await context.send();

  assert.deepEqual(calls.uploads, [slip]);
  assert.equal(calls.sent.at(-1), true);
});

test('a failed upload keeps the preview so the sender can retry without re-picking', async () => {
  const pending = { file: slip, url: 'blob:slip.png' };
  const { calls, context } = uploader({
    pending,
    onUpload: async () => { throw new Error('network'); },
  });
  await context.send();

  assert.ok(!calls.sent.includes(true), 'the file never reached the server');
  assert.equal(calls.errors.at(-1), 'slip.errorUploadFailed');
  assert.deepEqual(calls.pending, [], 'the preview must not be cleared');
  assert.equal(context.pending, pending);
});

test('send is inert while an upload is already in flight', async () => {
  const { calls, context } = uploader({ pending: { file: slip, url: 'blob:slip.png' }, busy: true });
  await context.send();
  assert.deepEqual(calls.uploads, []);
});

test('every slip uploader is handed the persisted slip, not just the upload handler', () => {
  // Without these the card re-renders empty after a refresh: the blob URL is
  // gone and the only copy of the slip lives on the server.
  const seen = [];
  (function visit(node) {
    const opening = ts.isJsxSelfClosingElement(node) ? node
      : ts.isJsxElement(node) ? node.openingElement : undefined;
    if (opening && opening.tagName.getText(roomFile) === 'SlipUploader') {
      seen.push(opening.attributes.properties.map((p) => p.name?.getText(roomFile)));
    }
    ts.forEachChild(node, visit);
  })(roomFile);

  assert.ok(seen.length >= 3, `expected every uploader, found ${seen.length}`);
  for (const attributes of seen) {
    for (const required of ['slipUrl', 'isUploaded', 'uploadedAt', 'onUpload']) {
      assert.ok(attributes.includes(required), `SlipUploader is missing ${required}`);
    }
  }
});

test('the slip stays readable to both parties after the turn that produced it', () => {
  // The action cards sit behind `if (!isYourTurn) return null` and a switch on
  // the current prompt, so they cannot be the permanent home for a receipt.
  const details = findFunction(roomFile, 'DealDetails');
  assert.ok(details, 'DealDetails not found');
  const body = details.getText(roomFile);

  assert.ok(body.includes('<SlipViewer'), 'DealDetails must render the slip');
  assert.ok(body.includes('transaction.slip_image_url'), 'from the persisted URL');
  assert.ok(body.includes('transaction.refund_slip_url'), 'refunds too');
  assert.ok(!body.includes('isYourTurn'), 'and never gate it on whose turn it is');
  assert.ok(!/transaction\.status ===[^;]*SlipViewer/s.test(body), 'nor on status');
});

test('English copy includes every slip label', () => {
  const copy = fs.readFileSync('lib/copy.ts', 'utf8');
  const used = new Set([...slipSource.matchAll(/t\("slip\.(\w+)"\)/g)].map((m) => m[1]));
  for (const key of ['uploadedAt', 'uploadedByBuyerAt']) used.add(key);
  for (const key of used) assert.ok(copy.includes(`"slip.${key}":`), `missing copy slip.${key}`);
});

/** Runs room-screen's slip upload against stubbed actions, nothing mounted. */
function room({ chatFails = false } = {}) {
  const calls = { posted: [], appended: [] };
  const transaction = { transaction_id: 7 };
  const context = {
    transaction,
    submitPaymentSlip: async () => ({ ...transaction, slip_image_url: 'https://cdn/slip.png' }),
    submitRefundSlip: async () => ({ ...transaction, refund_slip_url: 'https://cdn/refund.png' }),
    sendChatMessage: async (id, input) => {
      if (chatFails) throw new Error('chat is down');
      calls.posted.push([id, input]);
      return { message_id: 1, ...input };
    },
    setMessages: (update) => calls.appended.push(update([])),
  };
  vm.createContext(context);
  vm.runInContext(compile(roomFile, 'uploadSlip'), context);
  return { calls, context };
}

test('a sent slip lands in the conversation, not only in the deal panel', async () => {
  const { calls, context } = room();
  await context.uploadSlip('payment', {});

  // Objects built inside the vm carry that realm's prototype; compare fields.
  assert.equal(calls.posted.length, 1);
  assert.equal(calls.posted[0][0], 7, 'posted to this transaction');
  assert.deepEqual([...calls.posted[0][1].image_urls], ['https://cdn/slip.png']);
  assert.equal(calls.appended.at(-1)?.at(-1)?.image_urls?.[0], 'https://cdn/slip.png');
});

test('a refund slip posts its own URL, not the payment one', async () => {
  const { calls, context } = room();
  await context.uploadSlip('refund', {});
  assert.deepEqual([...calls.posted.at(-1)[1].image_urls], ['https://cdn/refund.png']);
});

test('a chat outage never turns a payment that went through into a failure', async () => {
  const { context } = room({ chatFails: true });
  const updated = await context.uploadSlip('payment', {});
  assert.equal(updated.slip_image_url, 'https://cdn/slip.png');
});

test('the slip no longer escapes to a browser tab', () => {
  // The whole point of the full-screen viewer: on a phone a new tab leaves the
  // app, and the conversation and the scroll position go with it.
  assert.ok(!slipSource.includes('target="_blank"'), 'no new-tab escape in the slip card');
  assert.ok(!viewerSource.includes('target="_blank"'), 'nor in the viewer');
});

test('the viewer carries the gestures a phone already has', () => {
  for (const handler of ['onPointerDown', 'onPointerMove', 'onPointerUp', 'onPointerCancel']) {
    assert.ok(viewerSource.includes(handler), `missing ${handler}`);
  }
  // touch-action: none, or the browser claims the touch and no pointermove
  // ever reaches the pinch handler.
  assert.ok(/touchAction:\s*"none"/.test(viewerSource), 'the stage must claim the touch');
  assert.ok(viewerSource.includes('DISMISS_AT'), 'swipe down to dismiss');
});

test('every gesture has a keyboard path beside it', () => {
  // CLAUDE.md section 6. Pinch and drag are unreachable without this.
  const keys = findFunction(viewerFile, 'onKeyDown');
  assert.ok(keys, 'onKeyDown not found');
  const body = keys.getText(viewerFile);
  for (const key of ['"+"', '"-"', '"0"', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    assert.ok(body.includes(key), `no keyboard path for ${key}`);
  }
});

test('zoom stays inside its bounds', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(
    `const MIN_SCALE = 1, MAX_SCALE = 5;\n${compile(viewerFile, 'clampScale')}`,
    context,
  );
  assert.equal(context.clampScale(0.2), 1);
  assert.equal(context.clampScale(2.5), 2.5);
  assert.equal(context.clampScale(40), 5);
});

test('a receipt bubble is only the slip itself, never a photo that mentions it', () => {
  // The guard in the thread: one image, no more, and a URL the transaction
  // actually holds. Otherwise anyone could dress an attachment up as evidence.
  const chat = fs.readFileSync('components/kit/chat-thread.tsx', 'utf8');
  assert.ok(chat.includes('m.image_urls?.length === 1'), 'single-image guard');
  assert.ok(chat.includes('receipts?.get('), 'matched against the deal\'s own slips');
});
