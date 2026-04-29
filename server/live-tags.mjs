/**
 * LOCAL DEVELOPMENT ONLY — bind to 127.0.0.1; do not expose to the internet.
 * Optional mock JSON for Live CT “Tag API” mode when running the site from localhost.
 * Run: node server/live-tags.mjs
 */
import http from "http";

const state = {
  "EXAMPLE_CLEARWELL_LEVEL.Value": 58.38,
  "EXAMPLE_TOWER_LEVEL.Value": 81.77,
  "EXAMPLE_FLOW_A.Value": 9.97,
  "EXAMPLE_OUTLET_FLOW.Value": 3.88,
  "EXAMPLE_CL2.Value": 1.06,
  "EXAMPLE_CL2_TOWER.Value": 1.06,
  "EXAMPLE_PH.Value": 6.98,
  "EXAMPLE_PH_TOWER.Value": 6.98,
  "EXAMPLE_TEMP.Value": 2.61,
};

function nudge() {
  for (const k of Object.keys(state)) {
    const v = state[k];
    const delta = (Math.random() - 0.5) * 0.08;
    const level = k.includes("LEVEL");
    const ph = k.includes("PH");
    state[k] = Math.max(0.01, v + delta * (level ? 0.5 : ph ? 0.02 : 0.15));
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
