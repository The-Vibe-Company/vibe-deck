import { posthogBootstrapScript } from "../posthog-config.mjs";

export default function handler(req, res) {
  const method = req?.method;
  if (method !== "GET" && method !== "HEAD") {
    if (res && typeof res.status === "function") {
      res.setHeader("Allow", "GET, HEAD");
      res.setHeader("Cache-Control", "no-store");
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { allow: "GET, HEAD", "cache-control": "no-store", "content-type": "application/json; charset=utf-8" },
    });
  }
  const body = posthogBootstrapScript(process.env);
  if (res && typeof res.status === "function") {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200);
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.send(body);
    return;
  }
  return new Response(method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
