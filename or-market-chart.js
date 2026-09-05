/* ============================================================
   OUTLAW REALTY — MARKET REPORT WIDGET  (v3)
   ------------------------------------------------------------
   Renders a full market report card per city from the live
   Google Sheets pipeline (metrics + by_type tabs):
 
     • Market temperature gauge (months of supply) with an
       auto-generated interpretation sentence
     • Headline stat cards: Homes Sold, Median DOM,
       Months of Supply, Median List Price — each with a
       generated one-line read
     • Trend charts: monthly home sales + median days on market
     • Property type table (last full month, with YoY sales)
 
   USAGE — in Elementor, add an EMPTY Container/Section and set
   Advanced → CSS ID to one of the MOUNT ids below. Load this
   file once per page (HFCM / GTM / script tag):
 
     <script src="https://cdn.jsdelivr.net/gh/jared-outlaw/or-market-insights@main/or-market-chart.js" defer></script>
 
   Price-based components (median SOLD price etc.) are dormant
   until the sheet's MedianPrice column starts filling — the
   widget detects it automatically, nothing to reconfigure.
   ============================================================ */
(function () {
  "use strict";
 
  /* ---------------- CONFIG ---------------- */
 
  var METRICS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2oCT-Js7xcNGImUF19Uxiv5aqDK-OCTpBbhym4DUS1HGmPBJsH451QFdA7VG9HspIQ-qaMMvpPRDo/pub?gid=269797601&single=true&output=csv";
  var BYTYPE_CSV  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2oCT-Js7xcNGImUF19Uxiv5aqDK-OCTpBbhym4DUS1HGmPBJsH451QFdA7VG9HspIQ-qaMMvpPRDo/pub?gid=403990187&single=true&output=csv";
 
  // Brand accent — the ONLY two lines to touch when the gold rebrands.
  // Keep GOLD_RGB as the exact r,g,b of GOLD (used to build translucent fills).
  var GOLD = "#8D4A2D";
  var GOLD_RGB = "141,74,45";
 
  var MOUNTS = [
    { selector: "#or-market-bozeman",     city: "Bozeman" },
    { selector: "#or-market-bigsky",      city: "Big Sky" },
    { selector: "#or-market-belgrade",    city: "Belgrade" },
    { selector: "#or-market-threeforks",  city: "Three Forks" },
    { selector: "#or-market-livingston",  city: "Livingston" }
  ];
 
  var ATTRIBUTION = "DATA PROVIDED BY THE BIG SKY COUNTRY MLS";
 
  var CHARTJS_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
 
  var SUBTYPE_LABELS = {
    SingleFamilyResidence: "Single Family",
    Townhouse: "Townhome",
    Condominium: "Condo"
  };
 
  var MONTH_NAMES = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];
 
  /* ---------------- STYLES ---------------- */
 
  var CSS = "" +
  ".or-mkt{--bg:#161616;--panel:#1E1D1A;--ink:#F5F2EC;--soft:#A7A29A;" +
  "--gold:" + GOLD + ";--goldfill:rgba(" + GOLD_RGB + ",.16);--line:#2A2A2A;" +
  "--green:#7FA65A;--red:#C2603E;" +
  "box-sizing:border-box;max-width:980px;margin:0 auto;background:var(--bg);" +
  "border:1px solid var(--line);border-radius:4px;padding:44px 40px 30px;" +
  "font-family:'Inter','Segoe UI',-apple-system,Arial,sans-serif;color:var(--ink)}" +
  ".or-mkt *{box-sizing:border-box;margin:0;padding:0}" +
  ".or-mkt .hd-eyebrow{text-align:center;font-family:'Oswald','Arial Narrow',sans-serif;" +
  "font-size:.75rem;font-weight:500;letter-spacing:.28em;text-transform:uppercase;" +
  "color:var(--ink);margin-bottom:12px}" +
  ".or-mkt .hd-title{text-align:center;font-family:'Oswald','Arial Narrow',sans-serif;" +
  "font-weight:500;font-size:1.85rem;letter-spacing:.04em;text-transform:uppercase;line-height:1.3;" +
  "color:var(--ink) !important}" +
  ".or-mkt .hd-rule{display:block;width:56px;height:2px;background:var(--gold);margin:18px auto 30px}" +
  /* gauge */
  ".or-mkt .gauge-wrap{display:flex;flex-wrap:wrap;gap:28px;align-items:center;" +
  "background:var(--panel);border-left:3px solid var(--gold);border-radius:2px;" +
  "padding:26px 30px;margin-bottom:34px}" +
  ".or-mkt .gauge-svg{flex:0 0 210px;max-width:210px}" +
  ".or-mkt .gauge-txt{flex:1;min-width:240px}" +
  ".or-mkt .gauge-verdict{font-family:'Oswald','Arial Narrow',sans-serif;font-size:1.35rem;" +
  "letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}" +
  ".or-mkt .gauge-verdict em{color:var(--ink);font-style:normal}" +
  ".or-mkt .gauge-sentence{color:var(--soft);font-size:.97rem;line-height:1.65}" +
  /* stat cards */
  ".or-mkt .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:36px}" +
  ".or-mkt .stat{background:var(--panel);border:1px solid var(--line);border-radius:3px;" +
  "padding:20px 18px;text-align:center}" +
  ".or-mkt .stat .lbl{font-family:'Oswald','Arial Narrow',sans-serif;font-size:.68rem;" +
  "font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--soft);margin-bottom:10px}" +
  ".or-mkt .stat .val{font-family:'Oswald','Arial Narrow',sans-serif;font-size:2rem;" +
  "font-weight:600;color:var(--ink);line-height:1.1}" +
  ".or-mkt .stat .note{margin-top:10px;font-size:.78rem;color:var(--soft);line-height:1.45}" +
  /* charts */
  ".or-mkt .chart-block{margin-bottom:36px}" +
  ".or-mkt .chart-title{font-family:'Oswald','Arial Narrow',sans-serif;font-size:.85rem;" +
  "font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink);margin-bottom:14px}" +
  ".or-mkt .chart-wrap{position:relative;width:100%;height:300px}" +
  /* table */
  ".or-mkt table{width:100%;border-collapse:collapse;font-size:.92rem;margin-bottom:8px}" +
  ".or-mkt th{font-family:'Oswald','Arial Narrow',sans-serif;font-size:.7rem;font-weight:500;" +
  "letter-spacing:.16em;text-transform:uppercase;color:var(--soft);text-align:left;" +
  "padding:10px 12px;border-bottom:1px solid var(--line)}" +
  ".or-mkt td{padding:12px;border-bottom:1px solid var(--line);color:var(--ink)}" +
  ".or-mkt td.up{color:var(--green)}.or-mkt td.down{color:var(--red)}" +
  ".or-mkt .attrib{text-align:center;color:#6E6A63;font-size:.75rem;letter-spacing:.06em;margin-top:24px}" +
  ".or-mkt .loading,.or-mkt .err{text-align:center;color:var(--soft);padding:60px 0;font-size:.9rem;letter-spacing:.06em}" +
  "@media (max-width:760px){.or-mkt{padding:30px 18px 22px}" +
  ".or-mkt .stats{grid-template-columns:repeat(2,1fr)}" +
  ".or-mkt .gauge-wrap{flex-direction:column;text-align:center}" +
  ".or-mkt .gauge-svg{margin:0 auto}.or-mkt .chart-wrap{height:240px}}";
 
  function injectStyles() {
    if (document.getElementById("or-mkt-css")) return;
    var s = document.createElement("style");
    s.id = "or-mkt-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }
 
  /* ---------------- DATA LAYER ---------------- */
 
  var csvCache = {};
  function getCSV(url) {
    if (!csvCache[url]) {
      csvCache[url] = fetch(url, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .then(function (t) { return parseCSV(t); });
    }
    return csvCache[url];
  }
 
  function parseCSV(text) {
    var rows = [], row = [], cur = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
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
    if (!rows.length) return [];
    var header = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      header.forEach(function (h, i) { o[h] = (r[i] || "").trim(); });
      return o;
    });
  }
 
  function num(v) {
    if (v === "" || v === null || v === undefined) return null;
    var n = parseFloat(String(v).replace(/[$,%\s]/g, ""));
    return isFinite(n) ? n : null;
  }
 
  /* ---------------- FORMAT HELPERS ---------------- */
 
  function fmtUSD(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
  function fmtUSDk(v) {
    return v >= 1000000 ? "$" + (Math.round(v / 10000) / 100) + "M"
         : v >= 1000 ? "$" + Math.round(v / 1000) + "K" : "$" + Math.round(v);
  }
  function monthLabel(key) { // "2026-06" -> "Jun 26"
    var p = key.split("-");
    return MONTH_NAMES[Number(p[1]) - 1].slice(0, 3) + " " + p[0].slice(2);
  }
  function monthFull(key) { // "2026-06" -> "June"
    return MONTH_NAMES[Number(key.split("-")[1]) - 1];
  }
 
  /* ---------------- INTERPRETATION ENGINE ---------------- */
 
  function tempOf(ms) {
    if (ms < 4) return "seller's";
    if (ms <= 6) return "balanced";
    return "buyer's";
  }
 
  function gaugeSentence(city, ms, pending, actives, salesTrendPct) {
    var t = tempOf(ms);
    var s = "With " + ms.toFixed(1) + " months of supply, " + city +
      " is currently a " + (t === "balanced" ? "balanced" : t) + " market. ";
    if (t === "seller's") {
      s += "Homes are selling faster than new inventory is arriving, keeping the advantage with sellers.";
    } else if (t === "balanced") {
      s += "Supply and demand are roughly in step, giving neither buyers nor sellers a strong upper hand.";
    } else {
      s += "Inventory is outpacing the current sales pace, giving buyers more selection and more room to negotiate.";
    }
    if (pending !== null && actives !== null && actives > 0) {
      var ratio = pending / actives;
      if (ratio >= 0.5) s += " A high share of listings are already under contract, a sign demand remains active.";
      else if (ratio <= 0.15) s += " Relatively few listings are under contract, suggesting demand is subdued.";
    }
    if (salesTrendPct !== null) {
      if (salesTrendPct >= 15) s += " Sales activity is running ahead of the recent 12-month pace.";
      else if (salesTrendPct <= -15) s += " Sales activity is running below the recent 12-month pace.";
    }
    return s;
  }
 
  /* ---------------- CHART.JS LOADER ---------------- */
 
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
 
  /* ---------------- GAUGE (SVG) ---------------- */
 
  function gaugeSVG(ms) {
    // Semicircle: 0 months (left) .. 10+ months (right).
    var clamped = Math.max(0, Math.min(10, ms));
    var angle = Math.PI * (1 - clamped / 10); // PI..0
    var cx = 105, cy = 100, r = 82;
    var nx = cx + r * 0.82 * Math.cos(angle);
    var ny = cy - r * 0.82 * Math.sin(angle);
    function arc(a0, a1, color) {
      var x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
      return '<path d="M' + x0 + ' ' + y0 + ' A' + r + ' ' + r +
        ' 0 0 1 ' + x1 + ' ' + y1 + '" stroke="' + color +
        '" stroke-width="14" fill="none" stroke-linecap="round"/>';
    }
    // zones: seller's 0-4 (gold), balanced 4-6 (soft), buyer's 6-10 (dim)
    var A = function (m) { return Math.PI * (1 - m / 10); };
    // viewBox extends 18px above the 0 0 210 118 box so the "BALANCED" label
    // has clear room above the arc's peak (peak paint reaches y\u224811 with the
    // 14px stroke) instead of sitting on top of it.
    return '<svg viewBox="0 -18 210 136" xmlns="http://www.w3.org/2000/svg">' +
      arc(A(0), A(3.9), GOLD) +
      arc(A(4.1), A(5.9), "#8A857D") +
      arc(A(6.1), A(10), "#4A463F") +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + nx + '" y2="' + ny +
      '" stroke="#F5F2EC" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#F5F2EC"/>' +
      '<text x="18" y="116" fill="#8A857D" font-size="9" font-family="Inter,Arial">SELLER\u2019S</text>' +
      '<text x="105" y="-6" text-anchor="middle" fill="#8A857D" font-size="9" font-family="Inter,Arial">BALANCED</text>' +
      '<text x="158" y="116" fill="#8A857D" font-size="9" font-family="Inter,Arial">BUYER\u2019S</text>' +
      '</svg>';
  }
 
  /* ---------------- RENDER ---------------- */
 
  var uid = 0;
 
  function render(host, city, metricRows, typeRows) {
    uid++;
    var id = uid;
 
    var rows = metricRows
      .filter(function (r) { return r.City === city; })
      .sort(function (a, b) { return a.Month < b.Month ? -1 : 1; });
 
    if (!rows.length) {
      host.innerHTML = '<div class="or-mkt"><div class="err">Market data for ' +
        city + ' is temporarily unavailable.</div></div>';
      return;
    }
 
    var now = new Date();
    var curKey = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2);
    var curRow = null, i;
    for (i = 0; i < rows.length; i++) if (rows[i].Month === curKey) curRow = rows[i];
    if (!curRow) curRow = rows[rows.length - 1];
 
    // Last FULL month (headline stats) = latest month before current
    var fullRows = rows.filter(function (r) { return r.Month < curKey; });
    var lastFull = fullRows.length ? fullRows[fullRows.length - 1] : curRow;
 
    var ms = num(curRow.MonthsSupply);
    var actives = num(curRow.ActiveListings);
    var pending = num(curRow.PendingSales);
    var listPrice = num(curRow.MedianListPrice);
    var soldLast = num(lastFull.ClosedSales);
    var domLast = num(lastFull.MedianDOM);
 
    // 12-month sales trend for interpretation
    var prior12 = fullRows.slice(-13, -1).map(function (r) { return num(r.ClosedSales); })
      .filter(function (v) { return v !== null; });
    var avg12 = prior12.length
      ? prior12.reduce(function (a, b) { return a + b; }, 0) / prior12.length : null;
    var trendPct = (avg12 && soldLast !== null) ? ((soldLast - avg12) / avg12) * 100 : null;
 
    /* ---- build DOM ---- */
    var card = document.createElement("div");
    card.className = "or-mkt";
 
    var html = '<p class="hd-eyebrow">' + city + ', Montana</p>' +
      '<h2 class="hd-title">Market Report<span class="hd-rule"></span></h2>';
 
    /* gauge */
    if (ms !== null) {
      var verdictWord = tempOf(ms) === "balanced" ? "Balanced Market"
        : tempOf(ms) === "seller's" ? "Seller\u2019s Market" : "Buyer\u2019s Market";
      html += '<div class="gauge-wrap"><div class="gauge-svg">' + gaugeSVG(ms) +
        '</div><div class="gauge-txt"><div class="gauge-verdict">Currently a <em>' +
        verdictWord + '</em></div><p class="gauge-sentence" id="or-gs-' + id + '"></p></div></div>';
    }
 
    /* stat cards */
    html += '<div class="stats">' +
      statCard("Homes Sold (" + monthFull(lastFull.Month) + ")",
        soldLast === null ? "—" : String(soldLast),
        trendPct === null ? "" :
          (Math.abs(trendPct) < 8 ? "In line with the 12-month pace" :
            (trendPct > 0 ? "Up " : "Down ") + Math.abs(Math.round(trendPct)) + "% vs the 12-month pace")) +
      statCard("Median Days on Market",
        domLast === null ? "—" : String(Math.round(domLast)),
        domLast === null ? "" : "Half of " + monthFull(lastFull.Month) +
          "\u2019s sales went under contract within " + Math.round(domLast) + " days") +
      statCard("Months of Supply",
        ms === null ? "—" : ms.toFixed(1),
        actives === null ? "" : actives + " active listings" +
          (pending !== null ? " \u00B7 " + pending + " under contract" : "")) +
      statCard("Median List Price",
        listPrice === null ? "—" : fmtUSDk(listPrice),
        "Median asking price of current active listings") +
      '</div>';
 
    /* chart blocks */
    html += '<div class="chart-block"><div class="chart-title">Homes Sold Per Month</div>' +
      '<div class="chart-wrap"><canvas id="or-c1-' + id + '"></canvas></div></div>' +
      '<div class="chart-block"><div class="chart-title">Median Days on Market</div>' +
      '<div class="chart-wrap"><canvas id="or-c2-' + id + '"></canvas></div></div>';
 
    /* type table */
    var typeData = buildTypeTable(city, typeRows, lastFull.Month);
    if (typeData.length) {
      html += '<div class="chart-title">By Property Type \u2014 ' +
        monthFull(lastFull.Month) + '</div><table><thead><tr>' +
        '<th>Type</th><th>Homes Sold</th><th>Median DOM</th><th>Sales vs Last Year</th>' +
        '</tr></thead><tbody>';
      typeData.forEach(function (t) {
        html += '<tr><td>' + t.label + '</td><td>' + t.sold + '</td><td>' +
          (t.dom === null ? "—" : Math.round(t.dom)) + '</td><td class="' +
          (t.yoy === null ? "" : t.yoy >= 0 ? "up" : "down") + '">' +
          (t.yoy === null ? "—" : (t.yoy >= 0 ? "+" : "") + t.yoy + "%") + '</td></tr>';
      });
      html += '</tbody></table>';
    }
 
    html += '<p class="attrib">' + ATTRIBUTION + '</p>';
    card.innerHTML = html;
    host.innerHTML = "";
    host.appendChild(card);
 
    /* sentence via textContent (safe) */
    if (ms !== null) {
      document.getElementById("or-gs-" + id).textContent =
        gaugeSentence(city, ms, pending, actives, trendPct);
    }
 
    /* charts */
    var last12 = fullRows.slice(-12);
    withChartJs(function () {
      barChart("or-c1-" + id,
        last12.map(function (r) { return monthLabel(r.Month); }),
        last12.map(function (r) { return num(r.ClosedSales); }));
      lineChart("or-c2-" + id,
        last12.map(function (r) { return monthLabel(r.Month); }),
        last12.map(function (r) { return num(r.MedianDOM); }),
        " days");
    });
  }
 
  function statCard(lbl, val, note) {
    return '<div class="stat"><div class="lbl">' + lbl + '</div>' +
      '<div class="val">' + val + '</div>' +
      '<div class="note">' + note + '</div></div>';
  }
 
  function buildTypeTable(city, typeRows, monthKey) {
    if (!typeRows) return [];
    var lastYearKey = (Number(monthKey.slice(0, 4)) - 1) + monthKey.slice(4);
    var out = [];
    Object.keys(SUBTYPE_LABELS).forEach(function (st) {
      var cur = null, prev = null;
      typeRows.forEach(function (r) {
        if (r.City !== city || r.PropertySubType !== st) return;
        if (r.Month === monthKey) cur = r;
        if (r.Month === lastYearKey) prev = r;
      });
      if (!cur) return;
      var sold = num(cur.ClosedSales) || 0;
      var prevSold = prev ? num(prev.ClosedSales) : null;
      out.push({
        label: SUBTYPE_LABELS[st],
        sold: sold,
        dom: num(cur.MedianDOM),
        yoy: (prevSold && prevSold > 0)
          ? Math.round(((sold - prevSold) / prevSold) * 100) : null
      });
    });
    return out;
  }
 
  /* ---------------- CHART BUILDERS ---------------- */
 
  var AXIS = { color: "#8A857D", size: 11 };
 
  function baseOpts(suffix) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#F5F2EC", titleColor: "#0D0D0D",
          bodyColor: "#0D0D0D", padding: 10, displayColors: false,
          callbacks: {
            label: function (c) { return c.parsed.y + (suffix || ""); }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: AXIS.color, font: { size: AXIS.size } },
          grid: { color: "rgba(245,242,236,.06)" },
          border: { display: false }
        },
        x: {
          ticks: { color: AXIS.color, font: { size: AXIS.size },
                   maxRotation: 45, minRotation: 45 },
          grid: { display: false },
          border: { display: false }
        }
      }
    };
  }
 
  function barChart(canvasId, labels, data) {
    new Chart(document.getElementById(canvasId), {
      type: "bar",
      data: { labels: labels, datasets: [{
        data: data,
        backgroundColor: "rgba(" + GOLD_RGB + ",.55)",
        hoverBackgroundColor: GOLD,
        borderRadius: 2
      }]},
      options: baseOpts(" sold")
    });
  }
 
  function lineChart(canvasId, labels, data, suffix) {
    new Chart(document.getElementById(canvasId), {
      type: "line",
      data: { labels: labels, datasets: [{
        data: data,
        borderColor: GOLD,
        borderWidth: 2,
        backgroundColor: "rgba(" + GOLD_RGB + ",.16)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: GOLD,
        pointBorderColor: GOLD,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#F5F2EC",
        spanGaps: true
      }]},
      options: baseOpts(suffix)
    });
  }
 
  /* ---------------- INIT ---------------- */
 
  function initHost(host, city) {
    if (host.getAttribute("data-or-init")) return;
    host.setAttribute("data-or-init", "1");
    host.innerHTML = '<div class="or-mkt"><div class="loading">Loading market data\u2026</div></div>';
 
    Promise.all([
      getCSV(METRICS_CSV),
      getCSV(BYTYPE_CSV).catch(function () { return null; })
    ]).then(function (res) {
      render(host, city, res[0], res[1]);
    }).catch(function (e) {
      console.warn("[or-market] load failed:", e);
      host.innerHTML = '<div class="or-mkt"><div class="err">Market data is temporarily unavailable.</div></div>';
    });
  }
 
  function init() {
    injectStyles();
    MOUNTS.forEach(function (m) {
      var el = document.querySelector(m.selector);
      if (el) initHost(el, m.city);
    });
  }
 
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
