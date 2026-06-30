(() => {
  "use strict";

  const STORAGE_KEY = "dsm-productivity-dashboard-v1";
  const state = { rows: [], filtered: [], charts: { rig: null, st: null, trend: null } };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    loadBtn: $("#loadBtn"), saveConfigBtn: $("#saveConfigBtn"), connectionStatus: $("#connectionStatus"),
    sheetTab: $("#sheetTab"), sheetRange: $("#sheetRange"), dateFrom: $("#dateFrom"), dateTo: $("#dateTo"),
    subconFilter: $("#subconFilter"), rigFilter: $("#rigFilter"), stFilter: $("#stFilter"), typeFilter: $("#typeFilter"),
    resetFiltersBtn: $("#resetFiltersBtn"), exportBtn: $("#exportBtn"), rigMetric: $("#rigMetric"), stMetric: $("#stMetric"), trendRigFilter: $("#trendRigFilter"), toast: $("#toast"),
    kpiPoints: $("#kpiPoints"), kpiRigs: $("#kpiRigs"), kpiSts: $("#kpiSts"), kpiDays: $("#kpiDays"),
    kpiLg: $("#kpiLg"), kpiMg: $("#kpiMg"), kpiPtsDay: $("#kpiPtsDay"), kpiNetDay: $("#kpiNetDay"),
    rigTableBody: $("#rigTableBody"), stTableBody: $("#stTableBody"), rigTableCount: $("#rigTableCount"), stTableCount: $("#stTableCount")
  };

  init();

  function init() {
    loadConfig();
    bindEvents();
    setStatus("neutral", "Waiting for data");
  }

  function bindEvents() {
    els.loadBtn.addEventListener("click", loadDashboard);
    els.saveConfigBtn.addEventListener("click", () => { saveConfig(); toast("Google Sheet links saved in this browser."); });
    $$(".open-sheet").forEach((button) => button.addEventListener("click", () => {
      const card = button.closest(".source-card");
      const url = card.querySelector(".sheet-url").value.trim();
      if (!url) return toast("Paste the Google Sheet URL first.");
      window.open(url, "_blank", "noopener");
    }));
    [els.dateFrom, els.dateTo, els.subconFilter, els.rigFilter, els.stFilter, els.typeFilter]
      .forEach((input) => input.addEventListener("change", applyFilters));
    els.rigMetric.addEventListener("change", renderRigChart);
    els.stMetric.addEventListener("change", renderStChart);
    els.trendRigFilter.addEventListener("change", renderTrendChart);
    els.resetFiltersBtn.addEventListener("click", resetFilters);
    els.exportBtn.addEventListener("click", exportFilteredCsv);
  }

  function saveConfig() {
    const sources = {};
    $$(".source-card").forEach((card) => {
      sources[card.dataset.source] = {
        enabled: card.querySelector(".source-enabled").checked,
        url: card.querySelector(".sheet-url").value.trim()
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sources, sheetTab: els.sheetTab.value.trim(), sheetRange: els.sheetRange.value.trim() }));
  }

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      for (const [source, config] of Object.entries(saved.sources || {})) {
        const card = document.querySelector(`.source-card[data-source="${source}"]`);
        if (!card) continue;
        card.querySelector(".source-enabled").checked = config.enabled !== false;
        card.querySelector(".sheet-url").value = config.url || "";
      }
      if (saved.sheetTab) els.sheetTab.value = saved.sheetTab;
      if (saved.sheetRange) els.sheetRange.value = saved.sheetRange;
    } catch (error) { console.warn("Could not load saved configuration:", error); }
  }

  async function loadDashboard() {
    saveConfig();
    setStatus("loading", "Loading subcontractor data…");
    els.loadBtn.disabled = true;
    try {
      const tasks = $$(".source-card").filter((card) => card.querySelector(".source-enabled").checked).map(loadSource);
      if (!tasks.length) throw new Error("Enable at least one subcontractor source.");
      const results = await Promise.allSettled(tasks);
      state.rows = results.filter((result) => result.status === "fulfilled").flatMap((result) => result.value);
      const failures = results.filter((result) => result.status === "rejected");
      if (!state.rows.length) throw new Error(failures[0]?.reason?.message || "No completed-point data was loaded.");
      populateFilters();
      applyFilters();
      setStatus(failures.length ? "loading" : "success", failures.length
        ? `Loaded ${state.rows.length.toLocaleString()} completed rows; ${failures.length} source(s) failed.`
        : `Loaded ${state.rows.length.toLocaleString()} completed rows.`);
    } catch (error) {
      console.error(error); setStatus("error", error.message || "Unable to load data."); toast(error.message || "Unable to load data.");
    } finally { els.loadBtn.disabled = false; }
  }

  async function loadSource(card) {
    const source = card.dataset.source;
    const resultEl = card.querySelector(".source-result");
    const file = card.querySelector(".csv-file").files[0];
    const url = card.querySelector(".sheet-url").value.trim();
    resultEl.className = "source-result"; resultEl.textContent = "Loading…";
    try {
      let text;
      if (file) text = await file.text();
      else {
        if (!url) throw new Error(`${source}: add a Google Sheet URL or CSV file.`);
        const response = await fetch(buildSheetCsvUrl(url, els.sheetTab.value.trim(), els.sheetRange.value.trim()), { cache: "no-store" });
        if (!response.ok) throw new Error(`${source}: Google Sheet returned ${response.status}.`);
        text = await response.text();
        if (/<!doctype html|<html/i.test(text)) throw new Error(`${source}: sheet is not publicly readable.`);
      }
      const rows = parseSourceCsv(text, source);
      resultEl.className = "source-result ok"; resultEl.textContent = `${rows.length.toLocaleString()} completed rows`;
      return rows;
    } catch (error) {
      resultEl.className = "source-result fail"; resultEl.textContent = error.message; throw error;
    }
  }

  function buildSheetCsvUrl(input, sheetName, range) {
    const idMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = idMatch?.[1] || (/^[a-zA-Z0-9-_]{20,}$/.test(input) ? input : "");
    if (!id) throw new Error("Invalid Google Sheet URL.");
    const params = new URLSearchParams({ tqx: "out:csv", sheet: sheetName || "Daily Point Update", range: range || "A3:AE", headers: "1" });
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?${params}`;
  }

  function parseSourceCsv(text, source) {
    const matrix = parseCsv(text); if (!matrix.length) return [];
    const headerRowIndex = findHeaderRow(matrix);
    const idx = buildHeaderIndex(matrix[headerRowIndex].map(normalizeHeader));
    const rows = [];
    for (const raw of matrix.slice(headerRowIndex + 1)) {
      const dateText = cell(raw, idx.date), pointRef = cell(raw, idx.pointRef);
      if (!dateText || !pointRef) continue;
      const designZone = cell(raw, idx.designZone);
      if (/^INVALID/i.test(designZone) || normalizeHeader(designZone) === "CHECKMAPPING") continue;
      const date = parseDate(dateText); if (!date) continue;
      rows.push({
        source, date, dateKey: isoDate(date), subcon: cell(raw, idx.subcon) || source,
        rig: cell(raw, idx.rig) || "Unassigned", type: cell(raw, idx.type) || "Unspecified",
        st: normalizeSt(cell(raw, idx.st)) || "Unspecified", designZone, pointRef,
        lgNet: number(cell(raw, idx.lgNet)), mgNet: number(cell(raw, idx.mgNet))
      });
    }
    return rows;
  }

  function findHeaderRow(matrix) {
    for (let i = 0; i < Math.min(15, matrix.length); i += 1) {
      const row = matrix[i].map(normalizeHeader);
      if (row.includes("DATE") && row.some((v) => v === "RIG" || v.includes("RIGGROUP")) && row.some((v) => v === "ST" || v === "STZONE") && row.some((v) => v.includes("POINTREF"))) return i;
    }
    return 0;
  }

  function buildHeaderIndex(headers) {
    const find = (...names) => { for (const name of names) { const i = headers.indexOf(name); if (i >= 0) return i; } return -1; };
    return {
      date: find("DATE"), subcon: find("SUBCON", "SUBCONTRACTOR"), rig: find("RIG", "RIGRIGGROUP", "RIGGROUP"),
      type: find("TYPE", "DSMTYPE"), st: find("ST", "STZONE"), designZone: find("DESIGNZONE"),
      pointRef: find("POINTREF", "POINTREFERENCE"), lgNet: find("LGM3DAYNET", "LGNETM3", "LGNET"), mgNet: find("MGM3DAYNET", "MGNETM3", "MGNET")
    };
  }

  function populateFilters() {
    fillSelect(els.subconFilter, unique(state.rows.map((r) => r.subcon)));
    fillSelect(els.rigFilter, unique(state.rows.map((r) => r.rig)));
    fillSelect(els.stFilter, unique(state.rows.map((r) => r.st)));
    fillSelect(els.typeFilter, unique(state.rows.map((r) => r.type)));
    fillSelect(els.trendRigFilter, unique(state.rows.map((r) => r.rig)), "All rigs");
    const dates = state.rows.map((r) => r.dateKey).sort();
    els.dateFrom.value = dates[0] || ""; els.dateTo.value = dates.at(-1) || "";
  }

  function fillSelect(select, values, allLabel = "All") {
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` + values.sort(naturalCompare).map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    if (values.includes(current)) select.value = current;
  }

  function applyFilters() {
    const from = els.dateFrom.value, to = els.dateTo.value, subcon = els.subconFilter.value, rig = els.rigFilter.value, st = els.stFilter.value, type = els.typeFilter.value;
    state.filtered = state.rows.filter((r) => (!from || r.dateKey >= from) && (!to || r.dateKey <= to) && (!subcon || r.subcon === subcon) && (!rig || r.rig === rig) && (!st || r.st === st) && (!type || r.type === type));
    renderDashboard();
  }

  function resetFilters() {
    els.subconFilter.value = els.rigFilter.value = els.stFilter.value = els.typeFilter.value = els.trendRigFilter.value = "";
    if (state.rows.length) { const dates = state.rows.map((r) => r.dateKey).sort(); els.dateFrom.value = dates[0] || ""; els.dateTo.value = dates.at(-1) || ""; }
    else { els.dateFrom.value = els.dateTo.value = ""; }
    applyFilters();
  }

  function renderDashboard() {
    const uniqueRows = uniquePointRows(state.filtered), days = unique(uniqueRows.map((r) => r.dateKey)).length;
    const lgNet = sum(state.filtered, "lgNet"), mgNet = sum(state.filtered, "mgNet");
    els.kpiPoints.textContent = formatInt(uniqueRows.length); els.kpiRigs.textContent = formatInt(unique(uniqueRows.map((r) => r.rig)).length);
    els.kpiSts.textContent = formatInt(unique(uniqueRows.map((r) => r.st)).length); els.kpiDays.textContent = formatInt(days);
    els.kpiLg.textContent = `${format2(lgNet)} m³`; els.kpiMg.textContent = `${format2(mgNet)} m³`;
    els.kpiPtsDay.textContent = format2(days ? uniqueRows.length / days : 0); els.kpiNetDay.textContent = `${format2(days ? (lgNet + mgNet) / days : 0)} m³`;
    renderRigChart(); renderStChart(); renderTrendChart(); renderTables();
  }

  function renderRigChart() { renderBarChart("rig", $("#rigChart"), aggregateBy(state.filtered, "rig"), els.rigMetric.value); }
  function renderStChart() { renderBarChart("st", $("#stChart"), aggregateBy(state.filtered, "st"), els.stMetric.value); }

  function renderBarChart(key, canvas, rows, metric) {
    const labelMap = { points: "Completed points", pointsPerDay: "Points/day", lgNet: "LG net m³", mgNet: "MG net m³", netPerDay: "Net m³/day" };
    const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);
    if (state.charts[key]) state.charts[key].destroy();
    state.charts[key] = new Chart(canvas, {
      type: "bar",
      data: { labels: sorted.map((r) => r.name), datasets: [{ label: labelMap[metric], data: sorted.map((r) => round(r[metric])), borderWidth: 0, borderRadius: 6, backgroundColor: metric === "mgNet" ? "rgba(217,119,6,.78)" : "rgba(47,117,181,.78)" }] },
      options: {
        maintainAspectRatio: false, indexAxis: sorted.length > 7 ? "y" : "x",
        plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => { const r = sorted[c.dataIndex]; return [`Points: ${formatInt(r.points)}`, `Days: ${formatInt(r.days)}`, `LG net: ${format2(r.lgNet)} m³`, `MG net: ${format2(r.mgNet)} m³`]; } } } },
        scales: { x: { beginAtZero: true, grid: { color: "rgba(102,117,139,.12)" } }, y: { beginAtZero: true, grid: { color: "rgba(102,117,139,.12)" } } }
      }
    });
  }

  function renderTrendChart() {
    const selectedRig = els.trendRigFilter.value;
    const trendRows = selectedRig ? state.filtered.filter((r) => r.rig === selectedRig) : state.filtered;
    const data = aggregateBy(trendRows, "dateKey").sort((a, b) => a.name.localeCompare(b.name));
    if (state.charts.trend) state.charts.trend.destroy();
    state.charts.trend = new Chart($("#trendChart"), {
      type: "line",
      data: { labels: data.map((r) => prettyDate(r.name)), datasets: [
        { label: "Completed points", data: data.map((r) => r.points), yAxisID: "points", borderColor: "#2f75b5", backgroundColor: "rgba(47,117,181,.14)", tension: .22, fill: true, pointRadius: 3 },
        { label: "LG net m³", data: data.map((r) => round(r.lgNet)), yAxisID: "volume", borderColor: "#168c4a", tension: .22, pointRadius: 2 },
        { label: "MG net m³", data: data.map((r) => round(r.mgNet)), yAxisID: "volume", borderColor: "#d97706", tension: .22, pointRadius: 2 }
      ] },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          title: { display: true, text: `Rig: ${selectedRig || "All rigs"}`, align: "start", color: "#66758b", font: { size: 12, weight: "600" }, padding: { bottom: 10 } },
          legend: { position: "bottom" }
        },
        scales: {
          x: { grid: { display: false } },
          points: { beginAtZero: true, position: "left", title: { display: true, text: "Points" } },
          volume: { beginAtZero: true, position: "right", title: { display: true, text: "Net volume (m³)" }, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  function renderTables() {
    const rigs = aggregateBy(state.filtered, "rig").sort((a, b) => b.pointsPerDay - a.pointsPerDay);
    const sts = aggregateBy(state.filtered, "st").sort((a, b) => b.points - a.points);
    els.rigTableCount.textContent = `${rigs.length} rig${rigs.length === 1 ? "" : "s"}`; els.stTableCount.textContent = `${sts.length} ST${sts.length === 1 ? "" : "s"}`;
    els.rigTableBody.innerHTML = rigs.length ? rigs.map((r) => `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.subcons.join(", "))}</td><td>${formatInt(r.points)}</td><td>${formatInt(r.days)}</td><td>${format2(r.pointsPerDay)}</td><td>${format2(r.lgNet)}</td><td>${format2(r.mgNet)}</td><td>${format2(r.netPerDay)}</td></tr>`).join("") : '<tr><td colspan="8" class="empty">No matching data.</td></tr>';
    els.stTableBody.innerHTML = sts.length ? sts.map((r) => `<tr><td>${escapeHtml(r.name)}</td><td>${formatInt(r.points)}</td><td>${formatInt(r.days)}</td><td>${format2(r.pointsPerDay)}</td><td>${format2(r.lgNet)}</td><td>${format2(r.mgNet)}</td><td>${format2(r.netPerDay)}</td></tr>`).join("") : '<tr><td colspan="7" class="empty">No matching data.</td></tr>';
  }

  function aggregateBy(rows, key) {
    const groups = new Map();
    for (const row of rows) { const name = row[key] || "Unspecified"; if (!groups.has(name)) groups.set(name, { name, rawRows: [], subcons: new Set() }); const g = groups.get(name); g.rawRows.push(row); g.subcons.add(row.subcon); }
    return [...groups.values()].map((g) => {
      const points = uniquePointRows(g.rawRows).length, days = unique(g.rawRows.map((r) => r.dateKey)).length, lgNet = sum(g.rawRows, "lgNet"), mgNet = sum(g.rawRows, "mgNet");
      return { name: g.name, points, days, pointsPerDay: days ? points / days : 0, lgNet, mgNet, netPerDay: days ? (lgNet + mgNet) / days : 0, subcons: [...g.subcons].sort() };
    });
  }

  function uniquePointRows(rows) {
    const map = new Map();
    for (const row of rows) { const key = `${row.source}|${row.st}|${normalizePoint(row.pointRef)}`; if (!map.has(key)) map.set(key, row); }
    return [...map.values()];
  }

  function exportFilteredCsv() {
    if (!state.filtered.length) return toast("No filtered rows to export.");
    const headers = ["Date","Subcon","Rig","Type","ST","Design Zone","Point Ref","LG Net","MG Net"];
    const body = state.filtered.map((r) => [r.dateKey,r.subcon,r.rig,r.type,r.st,r.designZone,r.pointRef,r.lgNet,r.mgNet]);
    const csv = [headers, ...body].map((row) => row.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `DSM_Productivity_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function parseCsv(text) {
    const rows = []; let row = [], value = "", quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) { if (char === '"' && text[i+1] === '"') { value += '"'; i += 1; } else if (char === '"') quoted = false; else value += char; }
      else if (char === '"') quoted = true; else if (char === ',') { row.push(value); value = ""; } else if (char === '\n') { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; } else value += char;
    }
    if (value.length || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
    return rows;
  }

  function parseDate(value) {
    const text = String(value || "").trim(); if (!text) return null;
    let m = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/); if (m) return validDate(+m[1],+m[2],+m[3]);
    m = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2}|\d{4})/);
    if (m) { let day=+m[1], month=+m[2], year=+m[3]; if (year<100) year+=2000; if (day<=12 && month>12) [day,month]=[month,day]; return validDate(year,month,day); }
    const d = new Date(text); return Number.isNaN(d.getTime()) ? null : d;
  }
  function validDate(y,m,d){const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d?x:null}
  function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
  function prettyDate(v){const d=parseDate(v);return d?d.toLocaleDateString("en-SG",{day:"2-digit",month:"short"}):v}
  function normalizeHeader(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}
  function normalizePoint(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}
  function normalizeSt(v){const m=String(v||"").toUpperCase().replace(/\s+/g,"").match(/ST[-_]?(\d+)/);return m?`ST${m[1]}`:String(v||"").trim().toUpperCase()}
  function cell(row,i){return i>=0?String(row[i]??"").trim():""}
  function number(v){const n=Number(String(v||"").replace(/,/g,"").trim());return Number.isFinite(n)?n:0}
  function sum(rows,key){return rows.reduce((t,r)=>t+(Number(r[key])||0),0)}
  function unique(values){return [...new Set(values.filter(Boolean))]}
  function naturalCompare(a,b){return String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:"base"})}
  function round(v){return Math.round((Number(v)||0)*100)/100}
  function formatInt(v){return Math.round(Number(v)||0).toLocaleString("en-SG")}
  function format2(v){return (Number(v)||0).toLocaleString("en-SG",{minimumFractionDigits:2,maximumFractionDigits:2})}
  function csvEscape(v){const t=String(v??"");return /[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}
  function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
  function setStatus(type,message){els.connectionStatus.className=`status ${type}`;els.connectionStatus.textContent=message}
  function toast(message){els.toast.textContent=message;els.toast.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>els.toast.classList.remove("show"),3000)}
})();
