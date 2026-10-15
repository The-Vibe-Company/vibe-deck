import { createHash, timingSafeEqual } from "node:crypto";

const MAX_SECRET_LENGTH = 4096;

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function bearerMatches(authorization, token) {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_SECRET_LENGTH) return false;
  if (typeof authorization !== "string" || authorization.length === 0 || authorization.length > MAX_SECRET_LENGTH) {
    return false;
  }
  return timingSafeEqual(digest(authorization), digest(`Bearer ${token}`));
}

export function emptyUserStats() {
  return {
    total_users: null,
    new_users_1d: null,
    new_users_7d: null,
    active_users_1d: null,
    active_users_7d: null,
  };
}

export function handleStatsRequest({ method, authorization, env = {} }) {
  if (method !== "GET") {
    return {
      status: 405,
      allow: "GET",
      body: { error: "method_not_allowed" },
    };
  }
  if (!bearerMatches(authorization, env.STATS_TOKEN)) {
    return { status: 401, body: { error: "unauthorized" } };
  }
  return { status: 200, body: emptyUserStats() };
}
