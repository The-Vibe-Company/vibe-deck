import { handleStatsRequest } from "../user-stats.mjs";

function readAuthorization(req) {
  const headers = req?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get("authorization") ?? undefined;
  return headers.authorization;
}

export default function handler(req, res) {
  const result = handleStatsRequest({
    method: req?.method,
    authorization: readAuthorization(req),
    env: process.env,
  });
  if (res && typeof res.status === "function") {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (result.allow) res.setHeader("Allow", result.allow);
    res.status(result.status).json(result.body);
    return;
  }
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  if (result.allow) headers.allow = result.allow;
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
