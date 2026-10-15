import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

import {
  DEFAULT_POSTHOG_KEY,
  POSTHOG_HOST,
  createPostHogOptions,
  posthogBootstrapScript,
  resolvePostHogKey,
} from "./posthog-config.mjs";
import posthogBootstrap from "./api/posthog-bootstrap.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const analyticsSource = readFileSync(new URL("./analytics.js", import.meta.url), "utf8");
const landing = readFileSync(new URL("./index.html", import.meta.url), "utf8");

function loadAnalytics() {
  const context = {};
  vm.runInNewContext(analyticsSource, context, { filename: "site/analytics.js" });
  return context.VibeDeckAnalytics;
}

function fakeWindow(location) {
  const inserted = [];
  const scripts = [{ parentNode: { insertBefore(node) { inserted.push(node); } } }];
  return {
    inserted,
    windowRef: {
      location,
      document: {
        createElement() {
          return {};
        },
        getElementsByTagName() {
          return scripts;
        },
        head: { appendChild(node) { inserted.push(node); } },
      },
    },
  };
}

function mockRes() {
  return {
    headers: {},
    statusCode: 0,
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("resolves the public PostHog key from the environment, then the project default", () => {
  const analytics = loadAnalytics();
  assert.equal(resolvePostHogKey({}), DEFAULT_POSTHOG_KEY);
  assert.equal(analytics.resolvePostHogKey({}), DEFAULT_POSTHOG_KEY);
  assert.equal(resolvePostHogKey({ POSTHOG_KEY: "  phc_fromenv123  " }), "phc_fromenv123");
  assert.equal(analytics.resolvePostHogKey({ POSTHOG_KEY: "  phc_fromenv123  " }), "phc_fromenv123");
  assert.equal(
    resolvePostHogKey({ NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_nexttoken123" }),
    "phc_nexttoken123",
  );
  assert.equal(resolvePostHogKey({ VITE_POSTHOG_KEY: "phc_vitekey123" }), "phc_vitekey123");
  assert.equal(
    resolvePostHogKey({ POSTHOG_KEY: "phc_primary123", VITE_POSTHOG_KEY: "phc_secondary123" }),
    "phc_primary123",
  );
  assert.equal(resolvePostHogKey({ POSTHOG_KEY: "not-a-key" }), DEFAULT_POSTHOG_KEY);
  assert.equal(analytics.resolvePostHogKey({ POSTHOG_KEY: "" }), DEFAULT_POSTHOG_KEY);
});

test("pageview init uses the US ingest host and does not identify visitors", () => {
  const analytics = loadAnalytics();
  assert.deepEqual(JSON.parse(JSON.stringify(analytics.postHogInitOptions())), createPostHogOptions());
  assert.equal(createPostHogOptions().api_host, POSTHOG_HOST);
  assert.equal(createPostHogOptions().capture_pageview, true);
  assert.equal(analytics.assetUrl(POSTHOG_HOST), "https://us-assets.i.posthog.com/static/array.js");

  const { windowRef, inserted } = fakeWindow({ protocol: "https:", hostname: "vibedeck.thevibecompany.co" });
  windowRef.__VIBEDECK_ENV__ = { POSTHOG_KEY: "phc_override123" };
  assert.equal(analytics.install(windowRef), true);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].src, "https://us-assets.i.posthog.com/static/array.js");
  assert.equal(inserted[0].async, true);
  assert.equal(inserted[0].crossOrigin, "anonymous");
  assert.equal(windowRef.posthog._i.length, 1);
  assert.equal(windowRef.posthog._i[0][0], "phc_override123");
  assert.equal(windowRef.posthog._i[0][1].capture_pageview, true);
  assert.equal(windowRef.posthog._i[0][1].api_host, "https://us.i.posthog.com");
  assert.equal(windowRef.posthog._i[0][1].disable_session_recording, true);
  assert.equal(windowRef.posthog._i[0][1].disable_surveys, true);
  assert.equal(windowRef.posthog.length, 0);
  assert.equal(analytics.install(windowRef), false);
});

test("does not capture pageviews from a local preview", () => {
  const analytics = loadAnalytics();
  for (const location of [
    { protocol: "file:", hostname: "" },
    { protocol: "http:", hostname: "localhost" },
    { protocol: "http:", hostname: "127.0.0.1" },
    { protocol: "http:", hostname: "::1" },
  ]) {
    const { windowRef, inserted } = fakeWindow(location);
    assert.equal(analytics.shouldCapture(windowRef), false);
    assert.equal(analytics.install(windowRef), false);
    assert.equal(inserted.length, 0);
    assert.equal(windowRef.posthog, undefined);
  }
});

test("bootstrap script publishes only the public key", () => {
  const script = posthogBootstrapScript({
    POSTHOG_KEY: "phc_bootstrap123",
    STATS_TOKEN: "super-secret",
  });
  assert.equal(script, 'window.__VIBEDECK_ENV__={"POSTHOG_KEY":"phc_bootstrap123"};');
  assert.equal(script.includes("super-secret"), false);
  assert.equal(posthogBootstrapScript({}).includes(DEFAULT_POSTHOG_KEY), true);

  const previous = process.env.POSTHOG_KEY;
  process.env.POSTHOG_KEY = "phc_bootstrap123";
  try {
    const res = mockRes();
    posthogBootstrap({ method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers["Content-Type"], /application\/javascript/);
    assert.equal(res.body, 'window.__VIBEDECK_ENV__={"POSTHOG_KEY":"phc_bootstrap123"};');
    assert.equal(String(res.body).includes("super-secret"), false);

    const rejected = mockRes();
    posthogBootstrap({ method: "POST" }, rejected);
    assert.equal(rejected.statusCode, 405);
    assert.equal(rejected.headers.Allow, "GET, HEAD");
  } finally {
    if (previous === undefined) delete process.env.POSTHOG_KEY;
    else process.env.POSTHOG_KEY = previous;
  }
});

test("landing page loads PostHog before the download resolver", () => {
  const head = landing.slice(0, landing.indexOf("</head>"));
  const bootstrapAt = head.indexOf('<script src="/api/posthog-bootstrap"></script>');
  const analyticsAt = head.indexOf('<script src="./analytics.js"></script>');
  assert.ok(bootstrapAt !== -1 && analyticsAt !== -1);
  assert.ok(bootstrapAt < analyticsAt);
  assert.match(landing, /<script src="\.\/downloads\.js"><\/script>/);
});

test("desktop app entry points stay free of PostHog", () => {
  const files = ["index.html", "electron/main.mjs", "electron/preload.cjs"];
  function walk(dir) {
    for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(relative);
      else if (/\.(tsx?|css)$/.test(entry.name)) files.push(relative);
    }
  }
  walk("src");
  for (const relative of files) {
    const source = readFileSync(path.join(root, relative), "utf8");
    assert.doesNotMatch(source, /posthog/i, relative);
  }
  assert.match(readFileSync(path.join(root, "index.html"), "utf8"), /connect-src 'self'/);
});
