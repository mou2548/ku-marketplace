// Run after the production build. The API fixture is isolated from real accounts.
// Set PLAYWRIGHT_MODULE to an installed Playwright module if it is not on node's path.
import http from "node:http";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "playwright"
);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const screenshots = process.env.SELLER_SCREENSHOT_DIR ?? resolve(
  root,
  "frontend/docs/verification-evidence/sellers",
);
fs.mkdirSync(screenshots, { recursive: true });
let following = false,
  failFollow = false,
  failState = false;
const profile = () => ({
  user_id: 42,
  name: "Somchai Marketplace",
  is_verified: true,
  member_since: "2025-01-10T00:00:00Z",
  active_listing_count: 26,
  follower_count: following ? 1 : 0,
});
const user = {
  userId: 12,
  email: "buyer@ku.th",
  firstNameEn: "Buyer",
  lastNameEn: "Test",
  firstNameTh: "ผู้ซื้อ",
  lastNameTh: "ทดสอบ",
  phoneNumber: null,
  status: "Active",
  isAdmin: false,
  emailVerifiedAt: "2025-01-01",
  createdAt: "2025-01-01",
};
const jwt = (id) =>
  `e30.${Buffer.from(JSON.stringify({ userId: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
const posts = Array.from({ length: 26 }, (_, i) => ({
  post_id: `post_${i + 1}`,
  item_id: i + 1,
  post_type: i % 3 === 0 ? "TradeOnly" : "SellOnly",
  item_name: `Textbook ${i + 1}`,
  description: null,
  price: 120 + i,
  quantity_total: 1,
  quantity_available: 1,
  quantity_remaining: 1,
  status: "active",
  created_at: "2026-01-01",
  item: {
    item_id: i + 1,
    owner_id: 42,
    name: `Textbook ${i + 1}`,
    category: "Books",
    condition: ["New", "Very Good", "Good", "Acceptable", "Poor"][i % 5],
    description: null,
    status: "Listed",
    images: [],
  },
  seller: { user_id: 42, name: profile().name, isVerified: true },
}));
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;
  let data,
    meta,
    status = 200;
  if (p === "/sellers/42") data = profile();
  else if (p === "/sellers/42/posts") {
    let rows = url.searchParams.get("q") === "missing" ? [] : posts;
    if (url.searchParams.get("type") === "sell")
      rows = rows.filter((p) => p.post_type === "SellOnly");
    const page = Number(url.searchParams.get("page") || 1),
      limit = Number(url.searchParams.get("limit") || 24);
    data = rows.slice((page - 1) * limit, page * limit);
    meta = {
      page,
      limit,
      total: rows.length,
      totalPages: Math.ceil(rows.length / limit),
    };
  } else if (p.startsWith("/sellers/")) {
    status = 404;
    data = null;
  } else if (p === "/users/me/following/42") {
    if (req.method === "PUT") {
      if (failFollow) status = 503;
      else following = true;
    }
    if (req.method === "DELETE") {
      following = false;
      status = 204;
    }
    if (req.method === "GET" && failState) status = 503;
    data = {
      seller_id: 42,
      is_following: following,
      follower_count: following ? 1 : 0,
    };
  } else if (p === "/users/me/following") {
    data = following ? [{ seller_id: 42, profile: profile() }] : [];
    meta = {
      page: 1,
      limit: 24,
      total: data.length,
      totalPages: data.length ? 1 : 0,
    };
  } else if (p === "/users/me") data = user;
  else if (p === "/auth/login")
    data = {
      accessToken: jwt(12),
      refreshToken: "test-refresh",
      sessionExpiresAt: Math.floor(Date.now() / 1000) + 86400,
      user,
    };
  else if (p === "/transactions" || p === "/posts")
    data = p === "/posts" ? posts : [];
  else if (p.startsWith("/posts/")) data = posts[0];
  else if (p === "/reports" && req.method === "POST") data = { report_id: 1 };
  else {
    data = [];
  }
  res.writeHead(status, { "content-type": "application/json" });
  res.end(
    status === 204
      ? ""
      : JSON.stringify({
          success: status < 400,
          message: status < 400 ? "success" : "Test failure",
          data,
          ...(meta ? { meta } : {}),
        }),
  );
});
(async () => {
  let browser, next, activePage;
  await new Promise((resolve) => server.listen(4109, "127.0.0.1", resolve));
  let logs = "";
  try {
    next = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", "4108"],
      {
        cwd: `${root}/frontend`,
        env: { ...process.env, API_URL: "http://127.0.0.1:4109" },
      },
    );
    next.stdout.on("data", (c) => (logs += c));
    next.stderr.on("data", (c) => (logs += c));
    for (let i = 0; i < 100; i++) {
      if (next.exitCode !== null)
        throw new Error("Isolated Next server exited: " + logs);
      try {
        if ((await fetch("http://localhost:4108/login")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const context = await browser.newContext();
    await context.addCookies([
      { name: "ku-locale", value: "en", url: "http://localhost:4108" },
    ]);
    const page = await context.newPage();
    activePage = page;
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    for (const browserLocale of ["en", "th"])
      for (const theme of ["light", "dark"])
        for (const width of [360, 768, 1280]) {
          await context.addCookies([
            {
              name: "ku-locale",
              value: browserLocale,
              url: "http://localhost:4108",
            },
          ]);
          await page.setViewportSize({ width, height: 900 });
          await page.goto("http://localhost:4108/sellers/42");
          await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
            localStorage.setItem("ku-theme", theme);
          }, theme);
          await page
            .getByRole("heading", { name: "Somchai Marketplace", exact: true })
            .waitFor();
          assert.equal(await page.locator("html").getAttribute("lang"), "en");
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            true,
            `${browserLocale}/${theme}/${width} overflow`,
          );
          if (browserLocale === "en" && width !== 768)
            await page.screenshot({
              path: `${screenshots}/seller-${theme}-${width}.png`,
              fullPage: true,
            });
        }
    await context.addCookies([
      { name: "ku-locale", value: "en", url: "http://localhost:4108" },
    ]);
    await page.goto("http://localhost:4108/feed");
    if (process.env.SELLER_VISUAL_ONLY === "1") {
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        for (const width of [360, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          for (const [index, grade] of [
            "New",
            "Very good",
            "Good",
            "Acceptable",
            "Worn",
          ].entries()) {
            await page
              .locator("article")
              .nth(index)
              .getByText(grade, { exact: true })
              .waitFor();
          }
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await page.screenshot({
            path: `${screenshots}/feed-conditions-${theme}-${width}.png`,
            fullPage: true,
          });
        }
      }
      assert.deepEqual(errors, []);
      console.log(
        "PASS: visual-only check; 12 seller layouts and all five feed condition grades at mobile/desktop in light/dark. Auth/follow actions not run in this mode.",
      );
      return;
    }
    const firstCard = page.locator("article").first();
    const sellerLink = firstCard.getByRole("link", {
      name: "Open Somchai Marketplace's seller profile",
      exact: true,
    });
    assert.equal(await firstCard.locator("a").count(), 2);
    assert.equal(await page.locator("article a a").count(), 0);
    assert.ok((await sellerLink.boundingBox()).height >= 44);
    await sellerLink.click();
    await page.waitForURL("**/sellers/42");
    await page.goto("http://localhost:4108/feed");
    await page
      .locator("article")
      .first()
      .getByRole("link", {
        name: "Open Somchai Marketplace's seller profile",
        exact: true,
      })
      .locator('[aria-hidden="true"]')
      .first()
      .click();
    await page.waitForURL("**/sellers/42");
    await page.goto("http://localhost:4108/feed");
    const productLink = page.locator("article").first().locator('a[href^="/market/"]');
    const productPath = await productLink.getAttribute("href");
    assert.ok(productPath);
    await productLink.click();
    await page.waitForURL(`**${productPath}`);
    await page.goto("http://localhost:4108/sellers/42");
    await page.getByRole("link", { name: "Follow", exact: true }).click();
    await page.waitForURL("**/login?returnTo=*");
    assert.equal(
      await page.locator("input[name=returnTo]").inputValue(),
      "/sellers/42",
    );
    await page.locator("input[name=email]").fill("buyer@ku.th");
    await page.locator("input[name=password]").fill("test-password");
    await page.locator("form").first().locator("button[type=submit]").click();
    await page.waitForURL("**/sellers/42");
    // Let the login navigation finish replacing the initial server tree before keyboard focus.
    await page.waitForLoadState("networkidle");
    const followControl = page.getByRole("button", {
      name: "Follow",
      exact: true,
    });
    assert.equal(
      await followControl.evaluate(
        (button) =>
          getComputedStyle(button.parentElement.parentElement).backgroundColor,
      ),
      "rgba(0, 0, 0, 0)",
    );
    await page
      .locator("header")
      .filter({
        has: page.getByRole("heading", {
          name: "Somchai Marketplace",
          exact: true,
        }),
      })
      .screenshot({ path: `${screenshots}/profile-follow-button.png` });

    await page
      .getByRole("button", { name: "Follow", exact: true })
      .press("Enter");
    await page
      .getByRole("button", { name: "Following", exact: true })
      .waitFor();
    assert.equal(following, true);
    assert.equal(
      await page.getByText("1 follower", { exact: true }).count(),
      1,
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Following", exact: true })
      .waitFor();
    await page.goto("http://localhost:4108/account/following");
    await page.getByRole("button", { name: "Unfollow", exact: true }).click();
    await page
      .getByRole("heading", { name: "No followed sellers on this page" })
      .waitFor();
    assert.equal(following, false);
    await page.goto("http://localhost:4108/sellers/42");
    failFollow = true;
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Could not update" })
      .waitFor();
    assert.equal(following, false);
    failFollow = false;
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await page
      .getByRole("button", { name: "Following", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Report seller" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByLabel("Search this seller").fill("missing");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await page.getByRole("heading", { name: "No matching listings" }).waitFor();
    await page
      .getByRole("link", { name: "Clear filters", exact: true })
      .first()
      .click();
    await page.waitForURL("**/sellers/42");
    assert.equal(await page.getByLabel("Search this seller").inputValue(), "");
    await page.getByRole("link", { name: "Next", exact: true }).first().click();
    await page.waitForURL("**page=2");
    assert.equal(await page.locator("article").count(), 2);
    await page
      .getByLabel("Sort by price", { exact: true })
      .selectOption("price_asc");
    await page.waitForURL(
      (url) =>
        url.searchParams.get("sort") === "price_asc" &&
        !url.searchParams.has("page"),
    );
    await page
      .getByRole("navigation", { name: "Category", exact: true })
      .getByRole("link", { name: "Books", exact: true })
      .click();
    await page.waitForURL(
      (url) =>
        url.searchParams.get("category") === "Books" &&
        url.searchParams.get("sort") === "price_asc",
    );
    await page
      .getByRole("navigation", { name: "Listing type", exact: true })
      .getByRole("link", { name: "For sale", exact: true })
      .click();
    await page.waitForURL(
      (url) =>
        url.searchParams.get("type") === "sell" &&
        url.searchParams.get("category") === "Books",
    );
    await page.getByRole("link", { name: "Newest first", exact: true }).click();
    await page.waitForURL(
      (url) =>
        url.searchParams.get("sort") === "latest" &&
        url.searchParams.get("type") === "sell",
    );

    failState = true;
    await page.goto("http://localhost:4108/sellers/42");
    await page.getByText("Could not load your follow status.").waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Follow", exact: true }).count(),
      0,
    );
    failState = false;
    await context.addCookies([
      { name: "session", value: jwt(42), url: "http://localhost:4108" },
    ]);
    await page.goto("http://localhost:4108/sellers/42");
    await page
      .getByRole("link", { name: "Edit profile", exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Follow", exact: true }).count(),
      0,
    );
    await page.goto("http://localhost:4108/sellers/999");
    await page.getByRole("heading", { name: "Seller unavailable" }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: feed seller-name/avatar navigation and independent product links; follow-button appearance; 12 responsive/legacy-cookie/theme profiles; login return; persisted follow; directory/unfollow; mutation failure/retry; report dialog; filters/reset; pagination; unknown follow state; owner; unavailable seller; no browser exceptions.",
    );
  } catch (err) {
    console.error("Fixture following state:", following);
    await activePage?.screenshot({ path: `${screenshots}/failure.png` });
    console.error(logs.slice(-4000));
    throw err;
  } finally {
    await browser?.close();
    next?.kill("SIGTERM");
    await new Promise((r) => server.close(r));
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
