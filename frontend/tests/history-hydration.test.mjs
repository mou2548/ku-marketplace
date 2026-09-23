import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const transaction = {
  transaction_id: 1, post_id: 1, buyer_id: 4, seller_id: 3,
  created_at: '2026-09-10T18:00:00Z', status: 'Pending', final_amount: 0,
  seller: { name: 'Seller' }, buyer: { name: 'Buyer' },
  post: { item: { name: 'Test item', images: [] } },
};
const Stub = ({ children }) => jsx.jsx('div', { children: typeof children === 'function' ? null : children });
const presentation = new Proxy({}, { get: () => ({ labelKey: 'pending' }) });

function load(file, dependencies, DateClass = Date) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Date: DateClass,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'next/link') return { default: Stub };
      if (name.startsWith('@/components/') || name === 'lucide-react') return new Proxy({}, { get: () => Stub });
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return exports;
}

function history(DateClass) {
  return load('app/(app)/history/history-list.tsx', {
    '@/lib/copy': { getCopy: () => (key) => key },
    '@/lib/status-text': { useStatusText: () => ({ of: () => ({ label: 'Pending' }), key: (key) => key }) },
    '@/lib/inbox': { deadlineFor: () => null },
    '@/lib/status': {
      TRANSACTION_STATUS: presentation, TICKET_STATUS: presentation,
      resolveTransactionActor: () => ({ actor: 'seller', labelKey: 'waiting' }),
    },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  }, DateClass).HistoryList;
}

async function pageProps() {
  const page = load('app/(app)/history/page.tsx', {
    'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/lib/date-format': load('lib/date-format.ts', {}),
    '@/lib/api/session': { getCurrentUserId: async () => 4 },
    '@/lib/api/transactions': { getTransactions: async () => [transaction] },
    '@/lib/api/giveaways': { getGiveaways: async () => [] },
    './history-list': { HistoryList: Stub },
  });
  return (await page.default()).props;
}

test('history reuses server date text even when the browser would abbreviate September differently', async () => {
  const props = await pageProps();
  const label = props.transactions[0].created_date_label;
  // Bangkok is already the following day. `lib/date-format.ts` spells the
  // month out from a fixed table rather than asking `Intl` for its name, so
  // this is byte-identical everywhere regardless of the CLDR data a given
  // Node/browser version ships (en-GB's abbreviated September in particular
  // has shipped as both "Sep" and "Sept" across versions).
  assert.equal(label, "11 Sep 2026");
  class BrowserDate extends Date {
    toLocaleDateString() { throw new Error('Browser date formatting must not run during hydration'); }
  }
  const serverHTML = renderToStaticMarkup(React.createElement(history(Date), props));
  const browserHTML = renderToStaticMarkup(React.createElement(history(BrowserDate), JSON.parse(JSON.stringify(props))));
  assert.equal(browserHTML, serverHTML);
  assert.ok(browserHTML.includes(label));
});

test('history uses Gregorian day-first dates in the marketplace timezone', async () => {
  const props = await pageProps();
  const label = props.transactions[0].created_date_label;
  assert.equal(label, "11 Sep 2026");
  assert.ok(renderToStaticMarkup(React.createElement(history(Date), props)).includes(label));
});
