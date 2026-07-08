/* ============================================================
   OUTLAW REALTY — MARKET REPORT CHART WIDGET (v2)
   Self-contained: injects its own CSS + markup, loads Chart.js,
   fetches CSV data, renders the card.

   MODE A (preferred — firewall-proof, zero HTML in WordPress):
     1. In Elementor, add an EMPTY Container/Section and set
        Advanced → CSS ID to a value from MOUNTS below
        (e.g. "or-market-bozeman").
     2. Load this script via Google Tag Manager (Custom HTML tag)
        or any script tag. The card builds itself into that ID.
     All config (CSV URL, headings, copy) lives in MOUNTS below —
     nothing is ever saved through WordPress.

   MODE B (if HTML widgets are allowed): place
     <div class="or-market-chart" data-csv="..." data-eyebrow="..."
          data-heading="..." data-sub="..." data-overview="..."
          data-label="..."></div>
   and load this script. Both modes can coexist.
   ============================================================ */
(function () {
  "use strict";

  var CHARTJS_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";

  /* ==========================================================
     MOUNTS — Mode A configuration. Add one entry per card.
     "selector" matches the CSS ID you set on the Elementor
     container. Edit copy/CSV here, commit to GitHub, done.
  ========================================================== */
  var MOUNTS = [
    {
      selector: "#or-market-bozeman",
      csv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2oCT-Js7xcNGImUF19Uxiv5aqDK-OCTpBbhym4DUS1HGmPBJsH451QFdA7VG9HspIQ-qaMMvpPRDo/pub?gid=0&single=true&output=csv",
      eyebrow: "Bozeman, Montana",
      heading: "How much do homes cost?",
      sub: "This median sold price includes single-family homes, condos, and townhomes and is based on monthly data.",
      overview: "There has been downward pressure on prices this year, but sales at higher price points continue to keep the median sales price steady.",
      label: "Bozeman"
    }
    /* Future cities:
    ,{
      selector: "#or-market-bigsky",
      csv: "PUBLISHED_CSV_URL_FOR_BIG_SKY_TAB",
      eyebrow: "Big Sky, Montana",
      heading: "How much do homes cost?",
      sub: "...",
      overview: "...",
      label: "Big Sky"
    }
    */
  ];

  /* ---------- Styles (injected once) ---------- */
  var CSS = "" +
    ".or-market-card{--or-card-bg:#161616;--or-panel-bg:#1E1D1A;--or-ink:#F5F2EC;" +
    "--or-ink-soft:#A7A29A;--or-accent:#C99A46;--or-accent-fill:rgba(201,154,70,.16);" +
    "--or-line:#2A2A2A;box-sizing:border-box;max-width:760px;margin:0 auto;" +
    "background:var(--or-card-bg);border:1px solid var(--or-line);border-radius:4px;" +
    "padding:44px 36px 28px;font-family:'Inter','Segoe UI',-apple-system,Arial,sans-serif;" +
    "color:var(--or-ink)}" +
    ".or-market-card *{box-sizing:border-box;margin:0;padding:0}" +
    ".or-eyebrow{text-align:center;font-family:'Oswald','Arial Narrow',sans-serif;" +
    "font-size:.75rem;font-weight:500;letter-spacing:.28em;text-transform:uppercase;" +
    "color:var(--or-accent);margin-bottom:12px}" +
    ".or-heading{text-align:center;font-family:'Oswald','Arial Narrow',sans-serif;" +
    "font-weight:500;font-size:1.7rem;letter-spacing:.04em;text-transform:uppercase;" +
    "line-height:1.3;color:var(--or-ink)}" +
    ".or-rule{display:block;width:56px;height:2px;background:var(--or-accent);" +
    "margin:18px auto 26px}" +
    ".or-sub{text-align:center;color:var(--or-ink-soft);font-size:.92rem;" +
    "max-width:520px;margin:0 auto 30px;line-height:1.6}" +
    ".or-scorecard{text-align:center;margin-bottom:8px}" +
    ".or-big{font-family:'Oswald','Arial Narrow',sans-serif;font-size:3.4rem;" +
    "font-weight:600;letter-spacing:.02em;color:var(--or-ink);min-height:1.2em}" +
    ".or-yoy{margin-top:8px;font-size:.75rem;font-weight:700;letter-spacing:.18em;" +
    "text-transform:uppercase;color:var(--or-accent);min-height:1em}" +
    ".or-overview{background:var(--or-panel-bg);border-left:3px solid var(--or-accent);" +
    "border-radius:2px;padding:22px 26px;margin:28px 0 32px}" +
    ".or-overview h3{font-family:'Oswald','Arial Narrow',sans-serif;font-size:.8rem;" +
    "font-weight:500;letter-spacing:.22em;text-transform:uppercase;" +
    "color:var(--or-accent);margin-bottom:8px}" +
    ".or-overview p{color:var(--or-ink-soft);font-size:.95rem;line-height:1.6}" +
    ".or-chart-wrap{position:relative;width:100%;height:390px}" +
    ".or-loading{position:absolute;inset:0;display:flex;align-items:center;" +
    "justify-content:center;color:#6E6A63;font-size:.85rem;letter-spacing:.08em}" +
    ".or-attribution{text-align:center;color:#6E6A63;font-size:.75rem;" +
    "letter-spacing:.06em;margin-top:20px}" +
    "@media (max-width:560px){.or-market-card{padding:30px 18px 22px}" +
    ".or-big{font-size:2.5rem}.or-chart-wrap{height:300px}}";

  function injectStyles() {
    if (document.getElementById("or-market-chart-css")) return;
    var s = document.createElement("style");
    s.id = "or-market-chart-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- Chart.js loader (loads once) ---------- */
  function withChartJs(cb) {
    if (window.Chart) { cb(); return; }
    var existing = document.querySelector("script[data-or-chartjs]");
    if (existing) { existing.addEventListener("load", cb); return; }
    var s = document.createElement("script");
    s.src = CHARTJS_SRC;
    s.setAttribute("data-or-chartjs", "1");
    s.onload = cb;
    document.head.appendChild(s);
  }

  /* ---------- CSV fetch + parse ---------- */
  function parseCSV(text) {
    var rows = [], row = [], cur = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
        row = []; cur = "";
        if (ch === "\r" && text[i + 1] === "\n") i++;
      } else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function getData(url, cb) {
    fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        var data = [];
        for (var i = 1; i < rows.length; i++) { // skip header row
          var label = (rows[i][0] || "").trim();
          var price = parseFloat(String(rows[i][1]).replace(/[$,\s]/g, ""));
          if (label && isFinite(price)) data.push([label, price]);
        }
        cb(data.length ? data : null);
      })
      .catch(function (err) {
        console.warn("[or-market-chart] data fetch failed:", err);
        cb(null);
      });
  }

  /* ---------- Card markup ---------- */
  var uid = 0;
  function buildCard(host) {
    uid++;
    var d = host.dataset;
    var eyebrow = d.eyebrow || "";
    var heading = d.heading || "How much do homes cost?";
    var sub = d.sub || "";
    var overview = d.overview || "";

    var card = document.createElement("div");
    card.className = "or-market-card";
    card.innerHTML =
      (eyebrow ? '<p class="or-eyebrow"></p>' : "") +
      '<h2 class="or-heading"><span class="or-heading-text"></span>' +
      '<span class="or-rule"></span></h2>' +
      (sub ? '<p class="or-sub"></p>' : "") +
      '<div class="or-scorecard">' +
      '<div class="or-big" id="or-big-' + uid + '">&nbsp;</div>' +
      '<div class="or-yoy" id="or-yoy-' + uid + '">&nbsp;</div></div>' +
      (overview
        ? '<div class="or-overview"><h3>Overview</h3><p class="or-overview-text"></p></div>'
        : "") +
      '<div class="or-chart-wrap"><canvas id="or-canvas-' + uid + '"></canvas>' +
      '<div class="or-loading" id="or-loading-' + uid + '">Loading market data\u2026</div></div>' +
      '<p class="or-attribution">DATA PROVIDED BY THE BIG SKY COUNTRY MLS</p>';

    /* Text set via textContent (not innerHTML) so quotes/ampersands are safe */
    if (eyebrow) card.querySelector(".or-eyebrow").textContent = eyebrow;
    card.querySelector(".or-heading-text").textContent = heading;
    if (sub) card.querySelector(".or-sub").textContent = sub;
    if (overview) card.querySelector(".or-overview-text").textContent = overview;

    host.appendChild(card);
    return uid;
  }

  /* ---------- Render ---------- */
  function fmtUSD(v) { return "$" + Math.round(v).toLocaleString("en-US"); }

  function draw(id, host, monthlyData) {
    var loading = document.getElementById("or-loading-" + id);
    if (loading) loading.style.display = "none";

    var labels = monthlyData.map(function (d) { return d[0]; });
    var prices = monthlyData.map(function (d) { return d[1]; });

    var card = host.querySelector(".or-market-card");
    var cs = getComputedStyle(card);
    var accent = cs.getPropertyValue("--or-accent").trim();
    var accentFill = cs.getPropertyValue("--or-accent-fill").trim();
    var seriesLabel = host.dataset.label || "Median";

    var yMin = Math.floor(Math.min.apply(null, prices) / 50000) * 50000;

    new Chart(document.getElementById("or-canvas-" + id), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: seriesLabel,
          data: prices,
          borderColor: accent,
          borderWidth: 2,
          backgroundColor: accentFill,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: accent,
          pointBorderColor: accent,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#F5F2EC"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#F5F2EC",
            titleColor: "#0D0D0D",
            bodyColor: "#0D0D0D",
            titleFont: { weight: "600" },
            padding: 10,
            displayColors: false,
            callbacks: {
              label: function (c) {
                return c.dataset.label + ": " + fmtUSD(c.parsed.y);
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function (v) {
                return v >= 1000 ? "$" + (v / 1000) + "K" : "$" + v;
              },
              color: "#8A857D",
              font: { size: 12 }
            },
            min: yMin,
            grid: { color: "rgba(245,242,236,.06)" },
            border: { display: false }
          },
          x: {
            ticks: {
              color: "#8A857D",
              font: { size: 11 },
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 20,
              callback: function (val, i) {
                return i % 4 === 0 ? this.getLabelForValue(val) : "";
              }
            },
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });

    /* Scorecard derived from the same data */
    var latest = prices[prices.length - 1];
    document.getElementById("or-big-" + id).textContent = fmtUSD(latest);
    if (prices.length >= 13) {
      var prevYr = prices[prices.length - 13];
      var yoy = ((latest - prevYr) / prevYr * 100).toFixed(2);
      document.getElementById("or-yoy-" + id).textContent =
        "(" + (yoy >= 0 ? "+" : "") + yoy + "%) Year Over Year";
    }
  }

  function initHost(host) {
    if (host.getAttribute("data-or-initialized")) return;
    host.setAttribute("data-or-initialized", "1");

    var csvUrl = host.dataset.csv;
    if (!csvUrl) {
      console.warn("[or-market-chart] missing data-csv attribute", host);
      return;
    }
    var id = buildCard(host);
    getData(csvUrl, function (data) {
      if (!data) {
        var loading = document.getElementById("or-loading-" + id);
        if (loading) loading.textContent = "Market data is temporarily unavailable.";
        return;
      }
      withChartJs(function () { draw(id, host, data); });
    });
  }

  function init() {
    injectStyles();

    /* Mode A: config-driven mounts onto Elementor containers by CSS ID */
    for (var m = 0; m < MOUNTS.length; m++) {
      var cfg = MOUNTS[m];
      var el = document.querySelector(cfg.selector);
      if (!el) continue; // container not on this page — skip silently
      if (!el.dataset.csv) {
        el.dataset.csv = cfg.csv || "";
        if (cfg.eyebrow) el.dataset.eyebrow = cfg.eyebrow;
        if (cfg.heading) el.dataset.heading = cfg.heading;
        if (cfg.sub) el.dataset.sub = cfg.sub;
        if (cfg.overview) el.dataset.overview = cfg.overview;
        if (cfg.label) el.dataset.label = cfg.label;
      }
      initHost(el);
    }

    /* Mode B: data-attribute placeholder divs */
    var hosts = document.querySelectorAll(".or-market-chart");
    for (var i = 0; i < hosts.length; i++) initHost(hosts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();