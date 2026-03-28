/**
 * Mock tag API for developing live-ct.html before OPC is wired.
 * Run: node server/live-tags.mjs
 * GET http://127.0.0.1:8787/api/tags → JSON { "LIT02.Value": number, ... }
 * CORS: * (dev only)
 */
import http from "http";

const state = {
  "LIT02.Value": 58.38,
  "LIT03.Value": 81.77,
  "FIT102.Value": 9.97,
  "FIT106.Value": 3.88,
  "FRC01.Value": 1.06,
  "PH03.Value": 6.98,
  "TEM01.Value": 2.61,
};

function nudge() {
  for (const k of Object.keys(state)) {
    const v = state[k];
    const delta = (Math.random() - 0.5) * 0.08;
    state[k] = Math.max(0.01, v + delta * (k.includes("LIT") ? 0.5 : k.includes("PH") ? 0.02 : 0.15));
  }
}

setInterval(nudge, 1500);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url.startsWith("/api/tags")) {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(state));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Mock tag server — GET /api/tags\n");
});

const PORT = Number(process.env.PORT) || 8787;
server.listen(PORT, "127.0.0.1", () => {
  console.log("live-tags mock listening on http://127.0.0.1:" + PORT + "/api/tags");
});
