/**
 * Layout audit — does the content actually reach the edge of its container?
 *
 * Written because a hand-rolled version of this check reported `/account` as
 * 98% wide when the visible content stopped at 1150px of a 1600px window with
 * 450px of grey after it. That probe took the **rightmost element in the DOM**,
 * and something invisible reached the edge, so the number said "fine" while the
 * screenshot said otherwise.
 *
 * The fix is to measure the widest *painted surface* — a card, a panel, a
 * section — and ignore anything that is not one. That is what a person sees as
 * "the content", and a full-bleed or absolutely positioned element is not it.
 *
 * Usage (with the dev server already running):
 *   node --experimental-websocket scripts/layout-audit.mjs
 *   node --experimental-websocket scripts/layout-audit.mjs --widths 1280,1920
 *   node --experimental-websocket scripts/layout-audit.mjs --only /account
 *
 * `--experimental-websocket` is needed on Node 20; the global WebSocket this
 * uses to speak CDP is unflagged from Node 22 on.
 */
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const BASE = process.env.AUDIT_BASE ?? "http://localhost:3000";
const PORT = 9600;

/** Below this share of the container, the content has left a visible dead band. */
const RIGHT_GAP_THRESHOLD = 0.85;

const ROUTES = [
  "/", "/market/1",
  "/inventory", "/inventory/1", "/inventory/1/list", "/inventory/new",
  "/offers", "/offers/1", "/offers/new?post=1",
  "/history", "/history/6", "/history/6/report",
  "/giveaway", "/giveaway/1", "/giveaway/3/manage",
  "/account", "/account/edit", "/account/membership",
  "/account/appeals", "/account/appeals/new", "/account/delete",
  "/notifications", "/post",
  "/admin/reports", "/admin/appeals", "/admin/memberships",
];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const widths = arg("widths", "1280,1600,1920").split(",").map(Number);
const only = arg("only", null);
const routes = only ? ROUTES.filter((r) => r.startsWith(only)) : ROUTES;

/**
 * Runs in the page. Returns the extent of the widest and lowest *surface*, not
 * of any element — that distinction is the whole point of this script.
 */
const PROBE = `(() => {
  const main = document.getElementById("main");
  if (!main) return JSON.stringify({ skip: "no #main" });

  // What a person reads as "the content": the painted boxes.
  const surfaces = [...main.querySelectorAll(
    'article, section, ul, ol, table, [class*="rounded-card"], [class*="rounded-panel"]'
  )].filter((el) => {
    const s = getComputedStyle(el);
    if (s.position === "fixed" || s.display === "none" || s.visibility === "hidden") return false;
    const b = el.getBoundingClientRect();
    // Ignore slivers and anything wider than the viewport (full-bleed chrome).
    return b.width > 40 && b.height > 24 && b.width <= innerWidth + 1;
  });
  if (!surfaces.length) return JSON.stringify({ skip: "no surfaces" });

  const boxes = surfaces.map((el) => el.getBoundingClientRect());
  const right = Math.max(...boxes.map((b) => b.right));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  const mainBox = main.getBoundingClientRect();

  return JSON.stringify({
    // Against the container's own right edge, so page padding is not counted
    // as a gap.
    rightPct: right / mainBox.right,
    bottomPct: bottom / innerHeight,
    gapPx: Math.round(mainBox.right - right),
  });
})()`;

const chrome = spawn(
  `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);
await wait(2500);

const { webSocketDebuggerUrl } = await (
  await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
).json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
  if (x.id && pending.has(x.id)) {
    pending.get(x.id)(x.result);
    pending.delete(x.id);
  }
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");

const findings = [];
for (const width of widths) {
  console.log(`\n── ${width}px ${"─".repeat(52)}`);
  for (const route of routes) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url: BASE + route });
    await wait(1400);

    const { result } = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: PROBE,
    });
    if (!result || result.value === undefined) {
      console.log(`  ${route.padEnd(26)} EVAL FAILED`);
      continue;
    }
    const m = JSON.parse(result.value);
    if (m.skip) {
      console.log(`  ${route.padEnd(26)} skipped (${m.skip})`);
      continue;
    }

    const right = Math.round(m.rightPct * 100);
    const bottom = Math.round(m.bottomPct * 100);
    const gap = m.rightPct < RIGHT_GAP_THRESHOLD;
    if (gap) findings.push(`${route} @${width}: content stops at ${right}% (${m.gapPx}px of dead width)`);

    console.log(
      `  ${route.padEnd(26)} width ${String(right).padStart(3)}%  height ${String(bottom).padStart(4)}%` +
        (gap ? `  <-- RIGHT GAP, ${m.gapPx}px` : ""),
    );
  }
}

console.log(`\n${"═".repeat(64)}`);
if (findings.length) {
  console.log(`RIGHT GAP on ${findings.length}:`);
  for (const f of findings) console.log(`  ${f}`);
} else {
  console.log("No right gaps. Now go and look at the screenshots.");
}

ws.close();
chrome.kill();
process.exit(findings.length ? 1 : 0);
