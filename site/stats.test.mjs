import assert from "node:assert/strict";
import test from "node:test";

import statsHandler from "./api/stats.mjs";
import { emptyUserStats, handleStatsRequest } from "./user-stats.mjs";

const TOKEN = "stats-token-test";

function request(method, authorization, env = { STATS_TOKEN: TOKEN }) {
  return handleStatsRequest({ method, authorization, env });
}

function mockRes() {
  return {
    headers: {},
    statusCode: 0,
    body: undefined,
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
  };
}

test("GET /api/stats returns empty user counts only to the bearer token", () => {
  const allowed = request("GET", `Bearer ${TOKEN}`);
  assert.equal(allowed.status, 200);
  assert.deepEqual(allowed.body, emptyUserStats());
  assert.deepEqual(allowed.body, {
    total_users: null,
    new_users_1d: null,
    new_users_7d: null,
    active_users_1d: null,
    active_users_7d: null,
  });

  assert.equal(request("GET", undefined).status, 401);
  assert.equal(request("GET", "Bearer wrong-token").status, 401);
  assert.equal(request("GET", `Bearer ${TOKEN}`, { STATS_TOKEN: "" }).status, 401);
  assert.equal(request("GET", `Bearer ${TOKEN}`, {}).status, 401);
  assert.deepEqual(request("GET", "Bearer wrong-token").body, { error: "unauthorized" });
  assert.equal(request("GET", `bearer ${TOKEN}`).status, 401);
  assert.equal(request("POST", `Bearer ${TOKEN}`).status, 405);
  assert.equal(request("PUT", `Bearer ${TOKEN}`).allow, "GET");
  assert.equal(request("DELETE", `Bearer ${TOKEN}`).status, 405);
});

test("stats handler writes the authorized JSON and stores nothing", async () => {
  const previous = process.env.STATS_TOKEN;
  process.env.STATS_TOKEN = TOKEN;
  try {
    const res = mockRes();
    statsHandler({ method: "GET", headers: { authorization: `Bearer ${TOKEN}` } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["Cache-Control"], "no-store");
    assert.deepEqual(res.body, emptyUserStats());

    const denied = mockRes();
    statsHandler({ method: "POST", headers: { authorization: `Bearer ${TOKEN}` } }, denied);
    assert.equal(denied.statusCode, 405);
    assert.equal(denied.headers.Allow, "GET");

    const response = await statsHandler(new Request("https://vibedeck.thevibecompany.co/api/stats", {
      headers: { authorization: `Bearer ${TOKEN}` },
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), emptyUserStats());
  } finally {
    if (previous === undefined) delete process.env.STATS_TOKEN;
    else process.env.STATS_TOKEN = previous;
  }
});
