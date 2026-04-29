/**
 * Live CT dashboard embedded in operator-guide.html.
 * All element IDs use prefix lc- (see HTML in #live-ct section).
 */
(function () {
  "use strict";

  var PRE = "lc-";
  function gid(id) {
    return document.getElementById(PRE + id);
  }

  var STORAGE_KEY = "live_ct_dashboard_v1";

  var FIELDS = [
    { id: "I23", label: "Clearwell full (m³)", hint: "Often engineering constant", fb: 100, tag: "" },
    { id: "I24", label: "Pipe volume (m³)", hint: "Clearwell → tower", fb: 23.561944901923447, tag: "" },
    { id: "I25", label: "Tower full (m³)", hint: "Main tank volume @100%", fb: 1000, tag: "" },
    { id: "TADD", label: "Tower extra volume (m³)", hint: "Model add-on", fb: 300, tag: "" },
    { id: "W7", label: "Clearwell level (%)", hint: "SCADA level", fb: 58.38, tag: "" },
    { id: "W16", label: "Clearwell baffling (0–1)", hint: "From study", fb: 0.1, tag: "" },
    { id: "Y7", label: "Clearwell flow #1 (L/s)", hint: "Higher of pair used", fb: 9.97, tag: "" },
    { id: "P11", label: "Clearwell flow #2 (L/s)", hint: "Also pipe & tower compare", fb: 9.97, tag: "" },
    { id: "M13", label: "pH — clearwell / pipe", hint: "", fb: 6.98, tag: "" },
    { id: "M11", label: "Cl₂ — clearwell / pipe (mg/L)", hint: "", fb: 1.06, tag: "" },
    { id: "E11", label: "Temperature (°C)", hint: "", fb: 2.61, tag: "" },
    { id: "J9", label: "Tower baffling (0–1)", hint: "", fb: 0.1, tag: "" },
    { id: "L7", label: "Tower level (%)", hint: "", fb: 81.77, tag: "" },
    { id: "B14", label: "Tower outlet flow (L/s)", hint: "vs P11 max", fb: 3.88, tag: "" },
    { id: "B11", label: "Cl₂ — tower (mg/L)", hint: "", fb: 1.06, tag: "" },
    { id: "E14", label: "pH — tower", hint: "", fb: 6.98, tag: "" },
    { id: "P20", label: "Giardia target", hint: "Permit / SOP", fb: 0.5, tag: "" },
    { id: "P21", label: "Virus target", hint: "Permit / SOP", fb: 2, tag: "" },
  ];

  /** Example tag keys for local JSON API only — not plant addresses; GitHub Pages uses Demo only. */
  var PRESETS = {
    "chalk-river": {
      siteName: "Chalk River WTP",
      apiUrl: "",
      pollMs: 2000,
      dataMode: "api",
      tags: {
        W7: "EXAMPLE_CLEARWELL_LEVEL.Value",
        Y7: "EXAMPLE_FLOW_A.Value",
        P11: "EXAMPLE_FLOW_A.Value",
        M13: "EXAMPLE_PH.Value",
        M11: "EXAMPLE_CL2.Value",
        E11: "EXAMPLE_TEMP.Value",
        L7: "EXAMPLE_TOWER_LEVEL.Value",
        B14: "EXAMPLE_OUTLET_FLOW.Value",
        B11: "EXAMPLE_CL2_TOWER.Value",
        E14: "EXAMPLE_PH_TOWER.Value",
      },
    },
    blank: {
      siteName: "",
      apiUrl: "",
      pollMs: 2000,
      dataMode: "demo",
      tags: {},
    },
  };

  var demoState = {};
  var lastTagPayload = {};
  var pollTimer = null;
  var demoTimer = null;
  var setupDone = false;

  /** True on GitHub Pages — no Tag API, demo only (no network to plant/SCADA). */
  function isPublicStaticHost() {
    var h = (location.hostname || "").toLowerCase();
    return h === "github.io" || h.endsWith(".github.io");
  }

  function applyPublicStaticGuard() {
    if (!isPublicStaticHost()) return;
    var optApi = gid("dataMode").querySelector('option[value="api"]');
    if (optApi) optApi.disabled = true;
    var notice = document.getElementById(PRE + "publicNotice");
    if (notice) notice.hidden = false;
    applyPreset("blank");
    gid("dataMode").value = "demo";
    gid("apiUrl").value = "";
    gid("presetSelect").value = "blank";
  }

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveConfig() {
    var tags = {};
    FIELDS.forEach(function (f) {
      var ti = gid("tag-" + f.id);
      if (ti && ti.value.trim()) tags[f.id] = ti.value.trim();
    });
    var cfg = {
      siteName: gid("siteName").value.trim(),
      apiUrl: gid("apiUrl").value.trim(),
      pollMs: Math.max(500, +gid("pollMs").value || 2000),
      dataMode: gid("dataMode").value,
      tags: tags,
      fallbacks: {},
    };
    FIELDS.forEach(function (f) {
      var fi = gid("fb-" + f.id);
      cfg.fallbacks[f.id] = fi ? fi.value : String(f.fb);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  function applyConfig(cfg) {
    if (!cfg) return;
    if (cfg.siteName != null) gid("siteName").value = cfg.siteName;
    if (cfg.apiUrl != null) gid("apiUrl").value = cfg.apiUrl;
    if (cfg.pollMs != null) gid("pollMs").value = String(cfg.pollMs);
    if (cfg.dataMode != null) gid("dataMode").value = cfg.dataMode;
    FIELDS.forEach(function (f) {
      var ti = gid("tag-" + f.id);
      var fi = gid("fb-" + f.id);
      if (cfg.tags && cfg.tags[f.id] != null && ti) ti.value = cfg.tags[f.id];
      if (cfg.fallbacks && cfg.fallbacks[f.id] != null && fi) fi.value = cfg.fallbacks[f.id];
    });
  }

  function applyPreset(name) {
    if (name === "chalk-river") {
      var p = PRESETS["chalk-river"];
      gid("siteName").value = p.siteName;
      gid("apiUrl").value = p.apiUrl;
      gid("pollMs").value = String(p.pollMs);
      gid("dataMode").value = p.dataMode;
      FIELDS.forEach(function (f) {
        gid("tag-" + f.id).value = p.tags[f.id] || "";
        gid("fb-" + f.id).value = String(f.fb);
      });
    } else if (name === "blank") {
      var b = PRESETS.blank;
      gid("siteName").value = b.siteName;
      gid("apiUrl").value = b.apiUrl;
      gid("pollMs").value = String(b.pollMs);
      gid("dataMode").value = b.dataMode;
      FIELDS.forEach(function (f) {
        gid("tag-" + f.id).value = "";
        gid("fb-" + f.id).value = String(f.fb);
      });
    }
  }

  function buildTable() {
    var tb = gid("mapBody");
    tb.innerHTML = FIELDS.map(function (f) {
      var hintHtml = f.hint ? "<span class=\"lc-hint-inline\">" + f.hint + "</span>" : "";
      return (
        "<tr><td class=\"lc-desc\"><strong>" +
        f.label +
        "</strong>" +
        hintHtml +
        "</td><td><input class=\"lc-tag-path\" type=\"text\" id=\"" +
        PRE +
        "tag-" +
        f.id +
        "\" placeholder=\"e.g. LIT02.Value\" autocomplete=\"off\" /></td><td class=\"lc-live-val stale\" id=\"" +
        PRE +
        "live-" +
        f.id +
        "\">—</td><td><input type=\"number\" step=\"any\" id=\"" +
        PRE +
        "fb-" +
        f.id +
        "\" value=\"" +
        f.fb +
        "\" /></td></tr>"
      );
    }).join("");
  }

  function initDemoState() {
    demoState = {};
    FIELDS.forEach(function (f) {
      demoState[f.id] = +gid("fb-" + f.id).value || f.fb;
    });
  }

  function tickDemo() {
    FIELDS.forEach(function (f) {
      var v = demoState[f.id];
      var amp = f.id === "I23" || f.id === "I25" || f.id === "I24" || f.id === "TADD" ? 0.01 : f.id === "P20" || f.id === "P21" ? 0.002 : 0.04;
      demoState[f.id] = v + (Math.random() - 0.5) * amp;
      if (f.id === "W16" || f.id === "J9") demoState[f.id] = Math.min(1, Math.max(0.05, demoState[f.id]));
      if (f.id === "W7" || f.id === "L7") demoState[f.id] = Math.min(100, Math.max(0, demoState[f.id]));
      if (f.id === "M11" || f.id === "B11") demoState[f.id] = Math.max(0.05, demoState[f.id]);
    });
  }

  function resolveValues() {
    var mode = gid("dataMode").value;
    var out = {};
    var errEl = gid("stErr");
    errEl.hidden = true;

    FIELDS.forEach(function (f) {
      var tagPath = gid("tag-" + f.id).value.trim();
      var fb = +gid("fb-" + f.id).value;
      if (Number.isNaN(fb)) fb = f.fb;

      var liveCell = gid("live-" + f.id);
      var used = fb;
      var src = "fallback";

      if (mode === "demo") {
        used = demoState[f.id] != null ? demoState[f.id] : fb;
        src = "demo";
        liveCell.textContent = fmtNum(used);
        liveCell.className = "lc-live-val";
      } else {
        if (tagPath && Object.prototype.hasOwnProperty.call(lastTagPayload, tagPath)) {
          var raw = lastTagPayload[tagPath];
          var num = typeof raw === "number" ? raw : parseFloat(raw);
          if (Number.isFinite(num)) {
            used = num;
            src = "api";
          }
        }
        if (src === "fallback") {
          liveCell.textContent = tagPath ? "—" : fmtNum(used);
          liveCell.className = "lc-live-val " + (tagPath ? "missing" : "stale");
        } else {
          liveCell.textContent = fmtNum(used);
          liveCell.className = "lc-live-val";
        }
      }

      out[f.id] = used;
    });

    return out;
  }

  function fmtNum(n) {
    if (!Number.isFinite(n)) return "—";
    var a = Math.abs(n);
    if (a >= 100) return n.toFixed(2);
    if (a >= 10) return n.toFixed(2);
    return n.toFixed(3);
  }

  function renderResults(vals) {
    var eng = window.CT_ENGINE && window.CT_ENGINE.runCtFromInputs(vals);
    var tiles = gid("summaryTiles");
    var thead = document.querySelector("#" + PRE + "stepTable thead");
    var tbody = document.querySelector("#" + PRE + "stepTable tbody");

    if (!eng) {
      tiles.innerHTML = "<div class=\"lc-tile\"><h3>Error</h3><div class=\"lc-val\">Load ct-tables.js</div></div>";
      return;
    }

    var okG = Number.isFinite(eng.C27) && eng.C26 >= eng.C27;
    var okV = Number.isFinite(eng.D27) && eng.D26 >= eng.D27;

    tiles.innerHTML =
      '<div class="lc-tile"><h3>Giardia — total</h3><div class="lc-val">' +
      eng.capLogG(eng.C24) +
      '</div></div><div class="lc-tile"><h3>Viruses — total</h3><div class="lc-val">' +
      eng.capLogV(eng.D24) +
      '</div></div><div class="lc-tile"><h3>CT achieved</h3><div class="lc-val">' +
      eng.fmt(eng.C26, 3) +
      '</div></div><div class="lc-tile"><h3>CT needed — Giardia</h3><div class="lc-val ' +
      (okG ? "pass" : "fail") +
      '">' +
      (Number.isFinite(eng.C27) ? eng.fmt(eng.C27, 3) : "—") +
      '</div></div><div class="lc-tile"><h3>CT needed — viruses</h3><div class="lc-val ' +
      (okV ? "pass" : "fail") +
      '">' +
      (Number.isFinite(eng.D27) ? eng.fmt(eng.D27, 3) : "—") +
      "</div></div>";

    thead.innerHTML =
      "<tr><th>Step</th><th>Effective contact (min)</th><th>Cl × contact</th><th>Giardia</th><th>Virus</th></tr>";
    tbody.innerHTML = eng.segs
      .map(function (s, i) {
        return (
          "<tr><td>" +
          eng.names[i] +
          "</td><td>" +
          eng.fmt(s.G, 4) +
          "</td><td>" +
          eng.fmt(s.JG, 3) +
          "</td><td>" +
          eng.fmt(s.Q, 4) +
          "</td><td>" +
          eng.fmt(s.U, 4) +
          "</td></tr>"
        );
      })
      .join("");
  }

  function tick() {
    var mode = gid("dataMode").value;
    gid("stMode").textContent = mode === "demo" ? "Demo simulation" : "Tag API";
    gid("stTime").textContent = new Date().toLocaleTimeString();

    if (mode === "demo") tickDemo();

    var vals = resolveValues();
    renderResults(vals);
  }

  function fetchTags() {
    if (isPublicStaticHost()) return;
    var url = gid("apiUrl").value.trim();
    if (!url) {
      gid("stErr").textContent = "Set Tag API URL or switch to Demo.";
      gid("stErr").hidden = false;
      return;
    }
    fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        lastTagPayload = j && typeof j === "object" ? j : {};
        gid("stErr").hidden = true;
        tick();
      })
      .catch(function (e) {
        gid("stErr").textContent = "API: " + (e.message || String(e));
        gid("stErr").hidden = false;
        tick();
      });
  }

  function restartTimers() {
    if (pollTimer) clearInterval(pollTimer);
    if (demoTimer) clearInterval(demoTimer);
    pollTimer = demoTimer = null;
    var mode = gid("dataMode").value;
    var ms = Math.max(500, +gid("pollMs").value || 2000);
    if (mode === "demo") {
      initDemoState();
      demoTimer = setInterval(tick, Math.min(ms, 1000));
      tick();
    } else {
      tick();
      fetchTags();
      pollTimer = setInterval(fetchTags, ms);
    }
  }

  function deactivateLiveCtPanel() {
    if (pollTimer) clearInterval(pollTimer);
    if (demoTimer) clearInterval(demoTimer);
    pollTimer = demoTimer = null;
  }

  function setupOnce() {
    if (setupDone) return;
    setupDone = true;
    buildTable();
    gid("mapBody").addEventListener("input", function () {
      if (gid("dataMode").value === "demo") initDemoState();
      tick();
    });
    if (isPublicStaticHost()) {
      applyPublicStaticGuard();
    } else {
      var saved = loadConfig();
      if (saved) applyConfig(saved);
      else applyPreset("chalk-river");
    }

    gid("btnSave").addEventListener("click", function () {
      saveConfig();
      gid("presetSelect").value = "custom";
      restartTimers();
    });
    gid("btnApplyPreset").addEventListener("click", function () {
      var v = gid("presetSelect").value;
      if (v !== "custom") applyPreset(v);
      restartTimers();
    });
    gid("dataMode").addEventListener("change", restartTimers);
    gid("pollMs").addEventListener("change", restartTimers);
  }

  window.activateLiveCtPanel = function () {
    setupOnce();
    initDemoState();
    restartTimers();
  };

  window.deactivateLiveCtPanel = deactivateLiveCtPanel;
})();
