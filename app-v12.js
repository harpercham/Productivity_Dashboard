(() => {
  "use strict";

  const STORAGE_KEY = "dsm-productivity-dashboard-v1";

  const DEFAULT_RIG_MODELS = {
    TH01: "DH758-160M",
    TH02: "DH758-135M",
    TH03: "DH758-135M",
    TH04: "DH718-145M",
    GH01: "SPR 718",
    GH02: "SPR 135",
    GH03: "DH658-135M",
    GH04: "SWCH 780-160M",
    GH05: "SPR 718",
    GH06: "DH658-135M",
    GH07: "Unknown",
    GH08: "Unknown",
    GH09: "Unknown",
    TK01: "Unknown",
    TK02: "Unknown",
    TK03: "Unknown",
    TK04: "Unknown",
    TK05: "Unknown",
    TK06: "Unknown",
    TK07: "Unknown"
  };

  const LINE_COLORS = [
    "#2f75b5", "#168c4a", "#d97706", "#8b5cf6", "#dc4c64",
    "#0f8b8d", "#7c5c3b", "#5b6b7a", "#b45309", "#2563eb",
    "#7c3aed", "#15803d", "#be123c", "#0369a1", "#a16207"
  ];

  const state = {
    rows: [],
    filtered: [],
    sourceStats: {},
    workfrontRows: [],
    workfrontStats: {},
    charts: { rig: null, model: null, st: null, subcon: null, trend: null, actualDateRig: null, modelTrend: null, subconTrend: null, subconPerRig: null, progressSCurve: null },
    rigModels: { ...DEFAULT_RIG_MODELS },
    trendRigs: new Set(),
    savedTrendRigs: [],
    actualDateRigs: new Set(),
    savedActualDateRigs: [],
    trendSubcons: new Set(),
    savedTrendSubcons: [],
    subconPerRigSubcons: new Set(),
    savedSubconPerRigSubcons: [],
    trendModels: new Set(),
    savedTrendModels: [],
    linkedRigModels: {}
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    loadBtn: $("#loadBtn"),
    saveConfigBtn: $("#saveConfigBtn"),
    connectionStatus: $("#connectionStatus"),
    sheetTab: $("#sheetTab"),
    sheetRange: $("#sheetRange"),
    rigModelLogicUrl: $("#rigModelLogicUrl"),
    rigModelLogicTab: $("#rigModelLogicTab"),
    rigModelLogicRange: $("#rigModelLogicRange"),
    rigModelLogicFile: $("#rigModelLogicFile"),
    rigModelLogicStatus: $("#rigModelLogicStatus"),
    openModelLogicBtn: $("#openModelLogicBtn"),
    workfrontAllocationUrl: $("#workfrontAllocationUrl"),
    workfrontAllocationTab: $("#workfrontAllocationTab"),
    workfrontAllocationRange: $("#workfrontAllocationRange"),
    workfrontPlanUrl: $("#workfrontPlanUrl"),
    workfrontPlanTab: $("#workfrontPlanTab"),
    workfrontPlanRange: $("#workfrontPlanRange"),
    workfrontPlanFile: $("#workfrontPlanFile"),
    workfrontAllocationFile: $("#workfrontAllocationFile"),
    workfrontAllocationStatus: $("#workfrontAllocationStatus"),
    openWorkfrontAllocationBtn: $("#openWorkfrontAllocationBtn"),
    dateFrom: $("#dateFrom"),
    dateTo: $("#dateTo"),
    subconFilter: $("#subconFilter"),
    rigFilter: $("#rigFilter"),
    modelFilter: $("#modelFilter"),
    stFilter: $("#stFilter"),
    typeFilter: $("#typeFilter"),
    resetFiltersBtn: $("#resetFiltersBtn"),
    exportBtn: $("#exportBtn"),
    rigMetric: $("#rigMetric"),
    modelMetric: $("#modelMetric"),
    stMetric: $("#stMetric"),
    subconMetric: $("#subconMetric"),
    trendMetric: $("#trendMetric"),
    actualDateMetric: $("#actualDateMetric"),
    actualDateRigOptions: $("#actualDateRigOptions"),
    copyWorkingDayRigsBtn: $("#copyWorkingDayRigsBtn"),
    selectAllActualDateRigsBtn: $("#selectAllActualDateRigsBtn"),
    clearActualDateRigsBtn: $("#clearActualDateRigsBtn"),
    modelTrendMetric: $("#modelTrendMetric"),
    subconTrendMetric: $("#subconTrendMetric"),
    subconPerRigMetric: $("#subconPerRigMetric"),
    subconPerRigOptions: $("#subconPerRigOptions"),
    copySubconTrendSelectionBtn: $("#copySubconTrendSelectionBtn"),
    selectAllSubconPerRigBtn: $("#selectAllSubconPerRigBtn"),
    clearSubconPerRigBtn: $("#clearSubconPerRigBtn"),
    trendRigOptions: $("#trendRigOptions"),
    selectAllTrendRigsBtn: $("#selectAllTrendRigsBtn"),
    clearTrendRigsBtn: $("#clearTrendRigsBtn"),
    trendModelOptions: $("#trendModelOptions"),
    selectAllTrendModelsBtn: $("#selectAllTrendModelsBtn"),
    clearTrendModelsBtn: $("#clearTrendModelsBtn"),
    trendSubconOptions: $("#trendSubconOptions"),
    selectAllTrendSubconsBtn: $("#selectAllTrendSubconsBtn"),
    clearTrendSubconsBtn: $("#clearTrendSubconsBtn"),
    rigModelGrid: $("#rigModelGrid"),
    resetModelsBtn: $("#resetModelsBtn"),
    toast: $("#toast"),
    kpiPoints: $("#kpiPoints"),
    kpiRigs: $("#kpiRigs"),
    kpiSts: $("#kpiSts"),
    kpiDays: $("#kpiDays"),
    kpiLg: $("#kpiLg"),
    kpiMg: $("#kpiMg"),
    kpiPtsDay: $("#kpiPtsDay"),
    kpiNetDay: $("#kpiNetDay"),
    rigTableBody: $("#rigTableBody"),
    stTableBody: $("#stTableBody"),
    rigTableCount: $("#rigTableCount"),
    stTableCount: $("#stTableCount"),
    sCurveMetric: $("#sCurveMetric"),
    sCurveMethod: $("#sCurveMethod"),
    sCurveWorkfront: $("#sCurveWorkfront"),
    sCurveSt: $("#sCurveSt"),
    sCurveType: $("#sCurveType"),
    resetSCurveFiltersBtn: $("#resetSCurveFiltersBtn"),
    sCurveTotalScope: $("#sCurveTotalScope"),
    sCurveCompletedScope: $("#sCurveCompletedScope"),
    sCurveProgress: $("#sCurveProgress"),
    sCurveMatchedPoints: $("#sCurveMatchedPoints"),
    sCurveNote: $("#sCurveNote")
  };

  init();

  function init() {
    loadConfig();
    bindEvents();
    setStatus("neutral", "Waiting for data");
  }

  function bindEvents() {
    els.loadBtn.addEventListener("click", loadDashboard);

    els.saveConfigBtn.addEventListener("click", () => {
      collectRigModelInputs();
      saveConfig();
      toast("Dashboard settings saved in this browser.");
    });

    $$(".open-sheet").forEach((button) => button.addEventListener("click", () => {
      const card = button.closest(".source-card");
      const url = card.querySelector(".sheet-url").value.trim();
      if (!url) return toast("Paste the Google Sheet URL first.");
      window.open(url, "_blank", "noopener");
    }));

    els.openModelLogicBtn.addEventListener("click", () => {
      const url = els.rigModelLogicUrl.value.trim();
      if (!url) return toast("Paste the Rig Model Logic Google Sheet URL first.");
      window.open(url, "_blank", "noopener");
    });

    els.openWorkfrontAllocationBtn.addEventListener("click", () => {
      const url = els.workfrontAllocationUrl.value.trim();
      if (!url) return toast("Paste the Workfront Allocation Google Sheet URL first.");
      window.open(url, "_blank", "noopener");
    });

    [els.dateFrom, els.dateTo, els.subconFilter, els.rigFilter, els.modelFilter, els.stFilter, els.typeFilter]
      .forEach((input) => input.addEventListener("change", applyFilters));

    els.rigMetric.addEventListener("change", renderRigChart);
    els.modelMetric.addEventListener("change", renderModelChart);
    els.stMetric.addEventListener("change", renderStChart);
    els.subconMetric.addEventListener("change", renderSubconChart);
    els.trendMetric.addEventListener("change", renderTrendChart);
    els.actualDateMetric.addEventListener("change", renderActualDateRigChart);

    els.copyWorkingDayRigsBtn.addEventListener("click", () => {
      state.actualDateRigs = new Set(
        [...state.trendRigs].filter((rig) => availableRigs().includes(rig))
      );
      syncActualDateRigCheckboxes();
      saveConfig();
      renderActualDateRigChart();
    });

    els.selectAllActualDateRigsBtn.addEventListener("click", () => {
      state.actualDateRigs = new Set(availableRigs());
      syncActualDateRigCheckboxes();
      saveConfig();
      renderActualDateRigChart();
    });

    els.clearActualDateRigsBtn.addEventListener("click", () => {
      state.actualDateRigs.clear();
      syncActualDateRigCheckboxes();
      saveConfig();
      renderActualDateRigChart();
    });
    els.modelTrendMetric.addEventListener("change", renderModelTrendChart);
    els.subconTrendMetric.addEventListener("change", renderSubconTrendChart);

    els.subconPerRigMetric.addEventListener("change", renderSubconPerRigChart);

    els.copySubconTrendSelectionBtn.addEventListener("click", () => {
      state.subconPerRigSubcons = new Set(
        [...state.trendSubcons].filter((subcon) => availableSubcons().includes(subcon))
      );
      syncSubconPerRigCheckboxes();
      saveConfig();
      renderSubconPerRigChart();
    });

    els.selectAllSubconPerRigBtn.addEventListener("click", () => {
      state.subconPerRigSubcons = new Set(availableSubcons());
      syncSubconPerRigCheckboxes();
      saveConfig();
      renderSubconPerRigChart();
    });

    els.clearSubconPerRigBtn.addEventListener("click", () => {
      state.subconPerRigSubcons.clear();
      syncSubconPerRigCheckboxes();
      saveConfig();
      renderSubconPerRigChart();
    });

    els.selectAllTrendRigsBtn.addEventListener("click", () => {
      state.trendRigs = new Set(availableRigs());
      syncTrendRigCheckboxes();
      saveConfig();
      renderTrendChart();
    });

    els.clearTrendRigsBtn.addEventListener("click", () => {
      state.trendRigs.clear();
      syncTrendRigCheckboxes();
      saveConfig();
      renderTrendChart();
    });

    els.selectAllTrendModelsBtn.addEventListener("click", () => {
      state.trendModels = new Set(availableModels());
      syncTrendModelCheckboxes();
      saveConfig();
      renderModelTrendChart();
    });

    els.clearTrendModelsBtn.addEventListener("click", () => {
      state.trendModels.clear();
      syncTrendModelCheckboxes();
      saveConfig();
      renderModelTrendChart();
    });

    els.selectAllTrendSubconsBtn.addEventListener("click", () => {
      state.trendSubcons = new Set(availableSubcons());
      syncTrendSubconCheckboxes();
      saveConfig();
      renderSubconTrendChart();
    });

    els.clearTrendSubconsBtn.addEventListener("click", () => {
      state.trendSubcons.clear();
      syncTrendSubconCheckboxes();
      saveConfig();
      renderSubconTrendChart();
    });

    els.resetModelsBtn.addEventListener("click", () => {
      state.rigModels = { ...DEFAULT_RIG_MODELS };
      renderRigModelEditor();
      saveConfig();
      renderRigChart();
      renderModelChart();
      renderTrendChart();
      renderActualDateRigChart();
      renderModelTrendChart();
      renderTables();
      refreshRigFilterLabels();
      toast("Known rig models restored.");
    });

    els.sCurveMetric.addEventListener("change", renderProgressSCurve);
    els.sCurveMethod.addEventListener("change", renderProgressSCurve);
    [els.sCurveWorkfront, els.sCurveSt, els.sCurveType]
      .forEach((select) => select.addEventListener("change", renderProgressSCurve));

    els.resetSCurveFiltersBtn.addEventListener("click", () => {
      els.sCurveWorkfront.value = "";
      els.sCurveSt.value = "";
      els.sCurveType.value = "";
      renderProgressSCurve();
    });

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

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sources,
      sheetTab: els.sheetTab.value.trim(),
      sheetRange: els.sheetRange.value.trim(),
      rigModelLogicUrl: els.rigModelLogicUrl.value.trim(),
      rigModelLogicTab: els.rigModelLogicTab.value.trim(),
      rigModelLogicRange: els.rigModelLogicRange.value.trim(),
      workfrontAllocationUrl: els.workfrontAllocationUrl.value.trim(),
      workfrontAllocationTab: els.workfrontAllocationTab.value.trim(),
      workfrontAllocationRange: els.workfrontAllocationRange.value.trim(),
      workfrontPlanUrl: els.workfrontPlanUrl.value.trim(),
      workfrontPlanTab: els.workfrontPlanTab.value.trim(),
      workfrontPlanRange: els.workfrontPlanRange.value.trim(),
      rigModels: state.rigModels,
      trendRigs: [...state.trendRigs],
      actualDateRigs: [...state.actualDateRigs],
      trendModels: [...state.trendModels],
      trendSubcons: [...state.trendSubcons],
      subconPerRigSubcons: [...state.subconPerRigSubcons]
    }));
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
      if (saved.rigModelLogicUrl) els.rigModelLogicUrl.value = saved.rigModelLogicUrl;
      if (saved.rigModelLogicTab) els.rigModelLogicTab.value = saved.rigModelLogicTab;
      if (saved.rigModelLogicRange) els.rigModelLogicRange.value = saved.rigModelLogicRange;
      if (saved.workfrontAllocationUrl) els.workfrontAllocationUrl.value = saved.workfrontAllocationUrl;
      if (saved.workfrontAllocationTab) els.workfrontAllocationTab.value = saved.workfrontAllocationTab;
      if (saved.workfrontAllocationRange) els.workfrontAllocationRange.value = saved.workfrontAllocationRange;
      if (saved.workfrontPlanUrl) els.workfrontPlanUrl.value = saved.workfrontPlanUrl;
      if (saved.workfrontPlanTab) els.workfrontPlanTab.value = saved.workfrontPlanTab;
      if (saved.workfrontPlanRange) els.workfrontPlanRange.value = saved.workfrontPlanRange;

      state.rigModels = {
        ...DEFAULT_RIG_MODELS,
        ...(saved.rigModels || {})
      };
      state.savedTrendRigs = Array.isArray(saved.trendRigs) ? saved.trendRigs : [];
      state.savedActualDateRigs = Array.isArray(saved.actualDateRigs) ? saved.actualDateRigs : [];
      state.savedTrendModels = Array.isArray(saved.trendModels) ? saved.trendModels : [];
      state.savedTrendSubcons = Array.isArray(saved.trendSubcons) ? saved.trendSubcons : [];
      state.savedSubconPerRigSubcons = Array.isArray(saved.subconPerRigSubcons)
        ? saved.subconPerRigSubcons
        : [];
    } catch (error) {
      console.warn("Could not load saved configuration:", error);
    }
  }

  async function loadDashboard() {
    collectRigModelInputs();
    saveConfig();
    setStatus("loading", "Loading subcontractor data…");
    els.loadBtn.disabled = true;

    try {
      const tasks = $$(".source-card")
        .filter((card) => card.querySelector(".source-enabled").checked)
        .map(loadSource);

      if (!tasks.length) throw new Error("Enable at least one subcontractor source.");

      const results = await Promise.allSettled(tasks);
      state.rows = results
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value);

      const failures = results.filter((result) => result.status === "rejected");

      if (!state.rows.length) {
        throw new Error(failures[0]?.reason?.message || "No completed-point data was loaded.");
      }

      applyModelsFoundInData();
      state.linkedRigModels = await loadRigModelLogic();
      Object.assign(state.rigModels, state.linkedRigModels);
      state.workfrontRows = await loadWorkfrontAllocation();
      populateFilters();
      populateSCurveFilters();
      renderRigModelEditor();
      renderTrendRigOptions();
      renderActualDateRigOptions();
      renderTrendModelOptions();
      renderTrendSubconOptions();
      renderSubconPerRigOptions();
      applyFilters();

      const stats = Object.values(state.sourceStats);
      const fetchedRows = stats.reduce((sum, item) => sum + (item.fetchedRows || 0), 0);
      const skippedRows = stats.reduce((sum, item) => sum + (item.skippedRows || 0), 0);
      const pageCount = stats.reduce((sum, item) => sum + (item.pages || 0), 0);

      setStatus(
        failures.length ? "loading" : "success",
        failures.length
          ? `Fetched ${fetchedRows.toLocaleString()} sheet rows across ${pageCount} page(s); loaded ${state.rows.length.toLocaleString()} completed rows; ${failures.length} source(s) failed.`
          : `Fetched ${fetchedRows.toLocaleString()} sheet rows across ${pageCount} page(s); loaded ${state.rows.length.toLocaleString()} completed rows${skippedRows ? `; ${skippedRows.toLocaleString()} incomplete/invalid rows excluded` : ""}.`
      );
    } catch (error) {
      console.error(error);
      setStatus("error", error.message || "Unable to load data.");
      toast(error.message || "Unable to load data.");
    } finally {
      els.loadBtn.disabled = false;
    }
  }

  async function loadSource(card) {
    const source = card.dataset.source;
    const resultEl = card.querySelector(".source-result");
    const file = card.querySelector(".csv-file").files[0];
    const url = card.querySelector(".sheet-url").value.trim();

    resultEl.className = "source-result";
    resultEl.textContent = "Loading…";

    try {
      let rows = [];
      let stats = {
        fetchedRows: 0,
        completedRows: 0,
        skippedRows: 0,
        pages: 0
      };

      if (file) {
        const text = await file.text();
        const parsed = parseSourceCsv(text, source);
        rows = parsed.rows;
        stats = {
          fetchedRows: parsed.fetchedRows,
          completedRows: parsed.rows.length,
          skippedRows: parsed.skippedRows,
          pages: 1
        };
      } else {
        if (!url) throw new Error(`${source}: add a Google Sheet URL or CSV file.`);

        const paged = await fetchGoogleSheetPages({
          url,
          source,
          sheetName: els.sheetTab.value.trim(),
          range: els.sheetRange.value.trim(),
          resultEl
        });

        rows = paged.rows;
        stats = paged.stats;
      }

      state.sourceStats[source] = stats;

      resultEl.className = "source-result ok";
      resultEl.title = "The first number is every non-empty sheet row checked. The second number is the valid completed rows used by the dashboard.";
      resultEl.textContent =
        `${stats.fetchedRows.toLocaleString()} sheet rows checked · ` +
        `${stats.completedRows.toLocaleString()} valid completed rows loaded` +
        (stats.skippedRows ? ` · ${stats.skippedRows.toLocaleString()} incomplete/invalid rows excluded` : "");

      return rows;
    } catch (error) {
      delete state.sourceStats[source];
      resultEl.className = "source-result fail";
      resultEl.textContent = error.message;
      throw error;
    }
  }

  async function fetchGoogleSheetPages({
    url,
    source,
    sheetName,
    range,
    resultEl
  }) {
    const PAGE_SIZE = 5000;
    const MAX_PAGES = 30;
    const allRows = [];
    let fetchedRows = 0;
    let skippedRows = 0;
    let pages = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const offset = page * PAGE_SIZE;
      const query = `select * limit ${PAGE_SIZE} offset ${offset}`;

      resultEl.textContent =
        `Fetching page ${page + 1}… ` +
        `${fetchedRows.toLocaleString()} rows checked`;

      const response = await fetch(
        buildSheetCsvUrl(
          url,
          sheetName || "Daily Point Update",
          range || "A3:AE",
          query
        ),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`${source}: Google Sheet returned ${response.status}.`);
      }

      const text = await response.text();

      if (/<!doctype html|<html/i.test(text)) {
        throw new Error(`${source}: sheet is not publicly readable.`);
      }

      const parsed = parseSourceCsv(text, source);

      allRows.push(...parsed.rows);
      fetchedRows += parsed.fetchedRows;
      skippedRows += parsed.skippedRows;
      pages += 1;

      if (parsed.fetchedRows < PAGE_SIZE) break;

      if (page === MAX_PAGES - 1) {
        throw new Error(
          `${source}: reached the safety limit of ${(PAGE_SIZE * MAX_PAGES).toLocaleString()} rows. ` +
          `Increase MAX_PAGES in app.js if the sheet is larger.`
        );
      }
    }

    const uniqueRows = deduplicateLoadedRows(allRows);

    return {
      rows: uniqueRows,
      stats: {
        fetchedRows,
        completedRows: uniqueRows.length,
        skippedRows,
        pages
      }
    };
  }

  function deduplicateLoadedRows(rows) {
    const map = new Map();

    for (const row of rows) {
      const key = [
        row.source,
        row.dateKey,
        row.rig,
        row.st,
        normalizePoint(row.pointRef)
      ].join("|");

      if (!map.has(key)) map.set(key, row);
    }

    return [...map.values()];
  }

  async function loadRigModelLogic() {
    const file = els.rigModelLogicFile.files[0];
    const url = els.rigModelLogicUrl.value.trim();

    if (!file && !url) {
      setLogicStatus("neutral", "Using saved/default rig models. Add a link or CSV to load Rig Model Logic.");
      return {};
    }

    setLogicStatus("loading", "Loading Rig Model Logic…");

    try {
      let text;

      if (file) {
        text = await file.text();
      } else {
        const response = await fetch(
          buildSheetCsvUrl(
            url,
            els.rigModelLogicTab.value.trim() || "Rig Model Logic",
            els.rigModelLogicRange.value.trim() || "A1:B100"
          ),
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`Rig Model Logic returned ${response.status}.`);
        }

        text = await response.text();

        if (/<!doctype html|<html/i.test(text)) {
          throw new Error("Rig Model Logic sheet is not publicly readable.");
        }
      }

      const mapping = parseRigModelLogicCsv(text);
      const count = Object.keys(mapping).length;

      if (!count) {
        throw new Error("No rig-to-model mappings were found.");
      }

      setLogicStatus("success", `Loaded ${count} rig model mapping${count === 1 ? "" : "s"}.`);
      return mapping;
    } catch (error) {
      console.warn("Rig Model Logic load failed:", error);
      setLogicStatus("error", `${error.message} Using saved/default models.`);
      return {};
    }
  }

  function parseRigModelLogicCsv(text) {
    const matrix = parseCsv(text).filter((row) =>
      row.some((value) => String(value || "").trim())
    );

    if (!matrix.length) return {};

    let headerIndex = -1;
    let rigIndex = -1;
    let modelIndex = -1;

    for (let rowIndex = 0; rowIndex < Math.min(12, matrix.length); rowIndex += 1) {
      const header = matrix[rowIndex].map(normalizeHeader);

      rigIndex = header.findIndex((value) =>
        ["RIG", "RIGNAME", "RIGGROUP", "RIGRIGGROUP", "RIGID"].includes(value)
      );

      modelIndex = header.findIndex((value) =>
        ["MODEL", "RIGMODEL", "MACHINEMODEL", "RIGMACHINEMODEL"].includes(value)
      );

      if (rigIndex >= 0 && modelIndex >= 0) {
        headerIndex = rowIndex;
        break;
      }
    }

    if (headerIndex < 0) {
      headerIndex = -1;
      rigIndex = 0;
      modelIndex = 1;
    }

    const mapping = {};

    for (const row of matrix.slice(headerIndex + 1)) {
      const rig = normalizeRig(cell(row, rigIndex));
      const model = cell(row, modelIndex);

      if (!rig || !model) continue;
      mapping[rig] = model;
    }

    return mapping;
  }

  function setLogicStatus(type, message) {
    els.rigModelLogicStatus.className = `logic-status ${type}`;
    els.rigModelLogicStatus.textContent = message;
  }

  async function loadWorkfrontAllocation() {
    const file = els.workfrontAllocationFile.files[0];
    const url = els.workfrontAllocationUrl.value.trim();
    const planFile = els.workfrontPlanFile?.files?.[0];
    const planUrl = (els.workfrontPlanUrl?.value.trim() || url);

    if (!file && !url) {
      setWorkfrontStatus("neutral", "No Workfront Allocation source configured.");
      state.workfrontStats = {};
      return [];
    }

    setWorkfrontStatus("loading", "Loading Workfront Allocation…");

    try {
      let rows = [];
      let fetchedRows = 0;
      let skippedRows = 0;
      let pages = 0;
      let planRows = [];
      let planCount = 0;

      if (file) {
        const parsed = parseWorkfrontAllocationCsv(await file.text());
        rows = parsed.rows;
        fetchedRows = parsed.fetchedRows;
        skippedRows = parsed.skippedRows;
        pages = 1;
      } else {
        const paged = await fetchWorkfrontAllocationPages({
          url,
          sheetName: els.workfrontAllocationTab.value.trim() || "Sheet8",
          range: els.workfrontAllocationRange.value.trim() || "A1:M"
        });
        rows = paged.rows;
        fetchedRows = paged.fetchedRows;
        skippedRows = paged.skippedRows;
        pages = paged.pages;
      }

      // Separate planned-finish tab: one date per Workfront.
      // If no separate source is provided, the allocation sheet can still contain Planned Finish Date directly.
      if (planFile) {
        planRows = parseWorkfrontPlanCsv(await planFile.text()).rows;
      } else if (planUrl && (els.workfrontPlanTab?.value.trim() || /gid=\d+/.test(planUrl))) {
        const response = await fetch(
          buildSheetCsvUrl(
            planUrl,
            els.workfrontPlanTab.value.trim(),
            els.workfrontPlanRange.value.trim() || "A1:Z"
          ),
          { cache: "no-store" }
        );
        if (!response.ok) throw new Error(`Workfront Plan returned ${response.status}.`);
        const text = await response.text();
        if (/<!doctype html|<html/i.test(text)) {
          throw new Error("Workfront Plan sheet is not publicly readable.");
        }
        planRows = parseWorkfrontPlanCsv(text).rows;
      }

      if (planRows.length) {
        planCount = applyWorkfrontPlanDates(rows, planRows);
      }

      state.workfrontStats = {
        fetchedRows,
        loadedRows: rows.length,
        skippedRows,
        pages,
        plannedWorkfronts: planRows.length,
        plannedRowsApplied: planCount
      };

      setWorkfrontStatus(
        "success",
        `${fetchedRows.toLocaleString()} allocation rows checked · ` +
        `${rows.length.toLocaleString()} points loaded` +
        (planRows.length ? ` · ${planRows.length.toLocaleString()} planned workfront dates read` : "") +
        (planCount ? ` · ${planCount.toLocaleString()} points linked to plan` : "") +
        (skippedRows ? ` · ${skippedRows.toLocaleString()} rows skipped` : "")
      );

      return rows;
    } catch (error) {
      console.warn("Workfront Allocation load failed:", error);
      state.workfrontStats = {};
      setWorkfrontStatus("error", `${error.message} S-curve unavailable.`);
      return [];
    }
  }

  async function fetchWorkfrontAllocationPages({ url, sheetName, range }) {
    const PAGE_SIZE = 5000;
    const MAX_PAGES = 30;
    const allRows = [];
    let fetchedRows = 0;
    let skippedRows = 0;
    let pages = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const offset = page * PAGE_SIZE;
      const query = `select * limit ${PAGE_SIZE} offset ${offset}`;

      setWorkfrontStatus(
        "loading",
        `Fetching allocation page ${page + 1}… ${fetchedRows.toLocaleString()} rows checked`
      );

      const response = await fetch(
        buildSheetCsvUrl(url, sheetName, range, query),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Workfront Allocation returned ${response.status}.`);
      }

      const text = await response.text();

      if (/<!doctype html|<html/i.test(text)) {
        throw new Error("Workfront Allocation sheet is not publicly readable.");
      }

      const parsed = parseWorkfrontAllocationCsv(text);
      allRows.push(...parsed.rows);
      fetchedRows += parsed.fetchedRows;
      skippedRows += parsed.skippedRows;
      pages += 1;

      if (parsed.fetchedRows < PAGE_SIZE) break;

      if (page === MAX_PAGES - 1) {
        throw new Error(
          `Workfront Allocation exceeded ${(PAGE_SIZE * MAX_PAGES).toLocaleString()} rows.`
        );
      }
    }

    const map = new Map();

    for (const row of allRows) {
      const key = `${row.st}|${normalizePoint(row.pointRef)}`;
      if (!map.has(key)) map.set(key, row);
    }

    return {
      rows: [...map.values()],
      fetchedRows,
      skippedRows,
      pages
    };
  }

  function parseWorkfrontAllocationCsv(text) {
    const matrix = parseCsv(text);

    if (!matrix.length) {
      return { rows: [], fetchedRows: 0, skippedRows: 0 };
    }

    let headerRowIndex = -1;
    let idx = null;

    for (let i = 0; i < Math.min(20, matrix.length); i += 1) {
      const headers = matrix[i].map(normalizeHeader);
      const candidate = buildWorkfrontHeaderIndex(headers);

      if (
        candidate.pointRef >= 0 &&
        candidate.st >= 0 &&
        candidate.workfront >= 0
      ) {
        headerRowIndex = i;
        idx = candidate;
        break;
      }
    }

    if (headerRowIndex < 0 || !idx) {
      throw new Error(
        "Workfront Allocation headers not found. Expected Point No, ST and Workfront."
      );
    }

    const rawRows = matrix
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((value) => String(value || "").trim()));

    const rows = [];
    const plannedByWorkfront = new Map();
    let skippedRows = 0;

    for (const raw of rawRows) {
      const pointRef = cell(raw, idx.pointRef);
      const st = normalizeSt(cell(raw, idx.st));
      const workfront = cell(raw, idx.workfront);

      if (!pointRef || !st || !workfront) {
        skippedRows += 1;
        continue;
      }

      const mg1Top = numericOrNull(cell(raw, idx.mg1Top));
      const mg1Toe = numericOrNull(cell(raw, idx.mg1Toe));
      const mg2Top = numericOrNull(cell(raw, idx.mg2Top));
      const mg2Toe = numericOrNull(cell(raw, idx.mg2Toe));
      const lg1Top = numericOrNull(cell(raw, idx.lg1Top));
      const lg1Toe = numericOrNull(cell(raw, idx.lg1Toe));
      const lg2Top = numericOrNull(cell(raw, idx.lg2Top));
      const lg2Toe = numericOrNull(cell(raw, idx.lg2Toe));

      const mgLength =
        levelPairLength(mg1Top, mg1Toe) +
        levelPairLength(mg2Top, mg2Toe);

      const lgLength =
        levelPairLength(lg1Top, lg1Toe) +
        levelPairLength(lg2Top, lg2Toe);

      const plannedText = idx.plannedDate >= 0
        ? cell(raw, idx.plannedDate)
        : "";

      const plannedDate = plannedText
        ? parseDate(plannedText)
        : null;
      const plannedDateKey = plannedDate ? isoDate(plannedDate) : "";
      const groupKey = `${st}|${workfront}`;

      if (plannedDateKey) {
        const existingDate = plannedByWorkfront.get(groupKey);
        if (!existingDate || plannedDateKey > existingDate) {
          plannedByWorkfront.set(groupKey, plannedDateKey);
        }
      }

      rows.push({
        pointRef,
        pointKey: normalizePoint(pointRef),
        st,
        workfront,
        type: cell(raw, idx.type) || "Unspecified",
        mgLength: round(mgLength),
        lgLength: round(lgLength),
        totalLength: round(mgLength + lgLength),
        plannedDateKey
      });
    }

    for (const row of rows) {
      if (!row.plannedDateKey) {
        row.plannedDateKey = plannedByWorkfront.get(`${row.st}|${row.workfront}`) || "";
      }
    }

    return {
      rows,
      fetchedRows: rawRows.length,
      skippedRows
    };
  }

  function parseWorkfrontPlanCsv(text) {
    const matrix = parseCsv(text);
    if (!matrix.length) return { rows: [], fetchedRows: 0, skippedRows: 0 };

    let headerRowIndex = -1;
    let idx = null;

    for (let i = 0; i < Math.min(20, matrix.length); i += 1) {
      const headers = matrix[i].map(normalizeHeader);
      const candidate = buildWorkfrontPlanHeaderIndex(headers);
      if (candidate.workfront >= 0 && candidate.plannedDate >= 0) {
        headerRowIndex = i;
        idx = candidate;
        break;
      }
    }

    if (headerRowIndex < 0 || !idx) {
      throw new Error("Workfront Plan headers not found. Expected Workfront and Planned Finish Date.");
    }

    const rawRows = matrix
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((value) => String(value || "").trim()));

    const rows = [];
    let skippedRows = 0;

    for (const raw of rawRows) {
      const workfront = cell(raw, idx.workfront);
      const dateText = cell(raw, idx.plannedDate);
      const plannedDate = parseDate(dateText);
      if (!workfront || !plannedDate) {
        skippedRows += 1;
        continue;
      }
      rows.push({
        st: idx.st >= 0 ? normalizeSt(cell(raw, idx.st)) : "",
        workfront,
        plannedDateKey: isoDate(plannedDate)
      });
    }

    return { rows, fetchedRows: rawRows.length, skippedRows };
  }

  function buildWorkfrontPlanHeaderIndex(headers) {
    const find = (...names) => {
      for (const name of names) {
        const index = headers.indexOf(name);
        if (index >= 0) return index;
      }
      return -1;
    };

    return {
      st: find("ST", "STZONE"),
      workfront: find("WORKFRONT", "WORKFRONTZONE", "WORKFRONTAREA", "WORKFRONTID", "ZONE"),
      plannedDate: find(
        "PLANNEDFINISHDATE",
        "PLANNEDCOMPLETIONDATE",
        "PLANNEDCOMPLETEDDATE",
        "TARGETFINISHDATE",
        "TARGETCOMPLETIONDATE",
        "TARGETCOMPLETEDDATE",
        "BASELINEFINISHDATE",
        "BASELINECOMPLETIONDATE",
        "BASELINEDATE",
        "PLANNEDDATE",
        "TARGETDATE"
      )
    };
  }

  function applyWorkfrontPlanDates(rows, planRows) {
    const byStWorkfront = new Map();
    const byWorkfront = new Map();

    for (const plan of planRows) {
      const wfKey = normalizeHeader(plan.workfront);
      if (!wfKey || !plan.plannedDateKey) continue;
      if (plan.st) byStWorkfront.set(`${plan.st}|${wfKey}`, plan.plannedDateKey);
      byWorkfront.set(wfKey, plan.plannedDateKey);
    }

    let applied = 0;
    for (const row of rows) {
      const wfKey = normalizeHeader(row.workfront);
      const planned = byStWorkfront.get(`${row.st}|${wfKey}`) || byWorkfront.get(wfKey) || "";
      if (planned) {
        row.plannedDateKey = planned;
        applied += 1;
      }
    }
    return applied;
  }

  function buildWorkfrontHeaderIndex(headers) {
    const find = (...names) => {
      for (const name of names) {
        const index = headers.indexOf(name);
        if (index >= 0) return index;
      }
      return -1;
    };

    return {
      pointRef: find("POINTNO", "POINTNUMBER", "POINTREF", "POINTREFERENCE"),
      mg1Top: find("MG1TOP"),
      mg1Toe: find("MG1TOE"),
      mg2Top: find("MG2TOP"),
      mg2Toe: find("MG2TOE"),
      lg1Top: find("LG1TOP"),
      lg1Toe: find("LG1TOE"),
      lg2Top: find("LG2TOP"),
      lg2Toe: find("LG2TOE"),
      type: find("TYPE", "DSMTYPE"),
      st: find("ST", "STZONE"),
      workfront: find("WORKFRONT", "WORKFRONTZONE", "WORKFRONTAREA", "WORKFRONTID", "ZONE"),
      plannedDate: find(
        "PLANNEDFINISHDATE",
        "PLANNEDCOMPLETIONDATE",
        "PLANNEDCOMPLETEDDATE",
        "TARGETFINISHDATE",
        "TARGETCOMPLETIONDATE",
        "TARGETCOMPLETEDDATE",
        "BASELINEFINISHDATE",
        "BASELINECOMPLETIONDATE",
        "BASELINEDATE",
        "PLANNEDDATE",
        "TARGETDATE"
      )
    };
  }

  function numericOrNull(value) {
    const text = String(value || "").replace(/,/g, "").trim();
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function levelPairLength(top, toe) {
    if (top === null || toe === null) return 0;
    return Math.abs(top - toe);
  }

  function setWorkfrontStatus(type, message) {
    els.workfrontAllocationStatus.className = `logic-status ${type}`;
    els.workfrontAllocationStatus.textContent = message;
  }

  function buildSheetCsvUrl(input, sheetName, range, query = "") {
    const idMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = idMatch?.[1] || (/^[a-zA-Z0-9-_]{20,}$/.test(input) ? input : "");

    if (!id) throw new Error("Invalid Google Sheet URL.");

    const gidMatch = input.match(/[?&]gid=(\d+)/);
    const params = new URLSearchParams({
      tqx: "out:csv",
      range: range || "A3:AE",
      headers: "1"
    });

    if (sheetName) {
      params.set("sheet", sheetName);
    } else if (gidMatch) {
      params.set("gid", gidMatch[1]);
    } else {
      params.set("sheet", "Daily Point Update");
    }

    if (query) params.set("tq", query);

    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?${params}`;
  }

  function parseSourceCsv(text, source) {
    const matrix = parseCsv(text);

    if (!matrix.length) {
      return { rows: [], fetchedRows: 0, skippedRows: 0 };
    }

    const headerRowIndex = findHeaderRow(matrix);
    const header = matrix[headerRowIndex] || [];
    const idx = buildHeaderIndex(header.map(normalizeHeader));

    if (idx.date < 0 || idx.rig < 0 || idx.st < 0 || idx.pointRef < 0) {
      throw new Error(
        `${source}: required headers were not found. ` +
        `Expected Date, Rig, ST and Point Ref in the selected range.`
      );
    }

    const rawRows = matrix
      .slice(headerRowIndex + 1)
      .filter((row) => row.some((value) => String(value || "").trim()));

    const rows = [];
    let skippedRows = 0;

    for (const raw of rawRows) {
      const dateText = cell(raw, idx.date);
      const pointRef = cell(raw, idx.pointRef);
      const designZone = cell(raw, idx.designZone);

      if (!dateText || !pointRef) {
        skippedRows += 1;
        continue;
      }

      if (
        /^INVALID/i.test(designZone) ||
        normalizeHeader(designZone) === "CHECKMAPPING"
      ) {
        skippedRows += 1;
        continue;
      }

      const date = parseDate(dateText);

      if (!date) {
        skippedRows += 1;
        continue;
      }

      rows.push({
        source,
        date,
        dateKey: isoDate(date),
        subcon: cell(raw, idx.subcon) || source,
        rig: cell(raw, idx.rig) || "Unassigned",
        rigModel: cell(raw, idx.rigModel),
        type: cell(raw, idx.type) || "Unspecified",
        st: normalizeSt(cell(raw, idx.st)) || "Unspecified",
        designZone,
        pointRef,
        lgNet: number(cell(raw, idx.lgNet)),
        mgNet: number(cell(raw, idx.mgNet))
      });
    }

    return {
      rows,
      fetchedRows: rawRows.length,
      skippedRows
    };
  }

  function findHeaderRow(matrix) {
    for (let i = 0; i < Math.min(15, matrix.length); i += 1) {
      const row = matrix[i].map(normalizeHeader);

      if (
        row.includes("DATE") &&
        row.some((value) => value === "RIG" || value.includes("RIGGROUP")) &&
        row.some((value) => value === "ST" || value === "STZONE") &&
        row.some((value) => value.includes("POINTREF"))
      ) return i;
    }

    return 0;
  }

  function buildHeaderIndex(headers) {
    const find = (...names) => {
      for (const name of names) {
        const index = headers.indexOf(name);
        if (index >= 0) return index;
      }
      return -1;
    };

    return {
      date: find("DATE"),
      subcon: find("SUBCON", "SUBCONTRACTOR"),
      rig: find("RIG", "RIGRIGGROUP", "RIGGROUP"),
      rigModel: find("RIGMODEL", "MODEL", "RIGMACHINEMODEL"),
      type: find("TYPE", "DSMTYPE"),
      st: find("ST", "STZONE"),
      designZone: find("DESIGNZONE"),
      pointRef: find("POINTREF", "POINTREFERENCE"),
      lgNet: find("LGM3DAYNET", "LGNETM3", "LGNET"),
      mgNet: find("MGM3DAYNET", "MGNETM3", "MGNET")
    };
  }

  function applyModelsFoundInData() {
    for (const row of state.rows) {
      const rig = normalizeRig(row.rig);
      if (row.rigModel) state.rigModels[rig] = row.rigModel;
      if (!state.rigModels[rig]) state.rigModels[rig] = "Unknown";
    }
  }

  function populateFilters() {
    fillSelect(els.subconFilter, unique(state.rows.map((row) => row.subcon)));
    fillRigSelect(els.rigFilter, availableRigs());
    fillSelect(els.modelFilter, availableModels());
    fillSelect(els.stFilter, unique(state.rows.map((row) => row.st)));
    fillSelect(els.typeFilter, unique(state.rows.map((row) => row.type)));

    const dates = state.rows.map((row) => row.dateKey).sort();
    els.dateFrom.value = dates[0] || "";
    els.dateTo.value = dates.at(-1) || "";
  }

  function populateSCurveFilters() {
    fillSelect(
      els.sCurveWorkfront,
      unique(state.workfrontRows.map((row) => row.workfront)),
      "All workfronts"
    );
    fillSelect(
      els.sCurveSt,
      unique(state.workfrontRows.map((row) => row.st)),
      "All STs"
    );
    fillSelect(
      els.sCurveType,
      unique(state.workfrontRows.map((row) => row.type)),
      "All types"
    );
  }

  function fillSelect(select, values, allLabel = "All") {
    const current = select.value;

    select.innerHTML =
      `<option value="">${escapeHtml(allLabel)}</option>` +
      values
        .sort(naturalCompare)
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
        .join("");

    if (values.includes(current)) select.value = current;
  }

  function fillRigSelect(select, rigs) {
    const current = select.value;

    select.innerHTML =
      '<option value="">All</option>' +
      rigs
        .sort(naturalCompare)
        .map((rig) => `<option value="${escapeHtml(rig)}">${escapeHtml(rigDisplayName(rig))}</option>`)
        .join("");

    if (rigs.includes(current)) select.value = current;
  }

  function refreshRigFilterLabels() {
    if (!state.rows.length) return;
    fillRigSelect(els.rigFilter, availableRigs());
    fillSelect(els.modelFilter, availableModels());
    renderTrendRigOptions();
    renderActualDateRigOptions();
    renderTrendModelOptions();
  }

  function renderRigModelEditor() {
    const rigs = availableRigs();

    if (!rigs.length) {
      els.rigModelGrid.innerHTML = '<div class="empty-card">Load subcontractor data to list the rigs.</div>';
      return;
    }

    els.rigModelGrid.innerHTML = rigs
      .sort(naturalCompare)
      .map((rig) => `
        <label class="model-entry">
          <span>${escapeHtml(rig)}</span>
          <input
            type="text"
            data-rig-model="${escapeHtml(rig)}"
            value="${escapeHtml(getRigModel(rig))}"
            placeholder="Enter rig model"
          />
        </label>
      `)
      .join("");

    $$("[data-rig-model]").forEach((input) => {
      input.addEventListener("change", () => {
        const rig = input.dataset.rigModel;
        state.rigModels[rig] = input.value.trim() || "Unknown";
        saveConfig();
        refreshRigFilterLabels();
        renderRigChart();
        renderModelChart();
        renderTrendChart();
        renderActualDateRigChart();
        renderModelTrendChart();
        renderTables();
      });
    });
  }

  function collectRigModelInputs() {
    $$("[data-rig-model]").forEach((input) => {
      state.rigModels[input.dataset.rigModel] = input.value.trim() || "Unknown";
    });
  }

  function renderTrendRigOptions() {
    const rigs = availableRigs();

    if (!rigs.length) {
      els.trendRigOptions.innerHTML = '<span class="muted-note">Load data to select rigs.</span>';
      state.trendRigs.clear();
      return;
    }

    if (!state.trendRigs.size) {
      const saved = state.savedTrendRigs.filter((rig) => rigs.includes(rig));
      state.trendRigs = new Set(saved.length ? saved : rigs);
      state.savedTrendRigs = [];
    } else {
      state.trendRigs = new Set([...state.trendRigs].filter((rig) => rigs.includes(rig)));
    }

    els.trendRigOptions.innerHTML = rigs
      .sort(naturalCompare)
      .map((rig) => `
        <label class="trend-rig-chip">
          <input type="checkbox" data-trend-rig="${escapeHtml(rig)}" ${state.trendRigs.has(rig) ? "checked" : ""} />
          <span>
            <strong>${escapeHtml(rig)}</strong>
            <small>${escapeHtml(getRigModel(rig))}</small>
          </span>
        </label>
      `)
      .join("");

    $$("[data-trend-rig]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const rig = checkbox.dataset.trendRig;
        if (checkbox.checked) state.trendRigs.add(rig);
        else state.trendRigs.delete(rig);
        saveConfig();
        renderTrendChart();
      });
    });
  }

  function syncTrendRigCheckboxes() {
    $$("[data-trend-rig]").forEach((checkbox) => {
      checkbox.checked = state.trendRigs.has(checkbox.dataset.trendRig);
    });
  }

  function renderActualDateRigOptions() {
    const rigs = availableRigs();

    if (!rigs.length) {
      els.actualDateRigOptions.innerHTML = '<span class="muted-note">Load data to select rigs.</span>';
      state.actualDateRigs.clear();
      return;
    }

    if (!state.actualDateRigs.size) {
      const saved = state.savedActualDateRigs.filter((rig) => rigs.includes(rig));
      state.actualDateRigs = new Set(
        saved.length
          ? saved
          : (state.trendRigs.size ? [...state.trendRigs] : rigs)
      );
      state.savedActualDateRigs = [];
    } else {
      state.actualDateRigs = new Set(
        [...state.actualDateRigs].filter((rig) => rigs.includes(rig))
      );
    }

    els.actualDateRigOptions.innerHTML = rigs
      .sort(naturalCompare)
      .map((rig) => `
        <label class="trend-rig-chip">
          <input type="checkbox" data-actual-date-rig="${escapeHtml(rig)}" ${state.actualDateRigs.has(rig) ? "checked" : ""} />
          <span>
            <strong>${escapeHtml(rig)}</strong>
            <small>${escapeHtml(getRigModel(rig))}</small>
          </span>
        </label>
      `)
      .join("");

    $$("[data-actual-date-rig]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const rig = checkbox.dataset.actualDateRig;
        if (checkbox.checked) state.actualDateRigs.add(rig);
        else state.actualDateRigs.delete(rig);
        saveConfig();
        renderActualDateRigChart();
      });
    });
  }

  function syncActualDateRigCheckboxes() {
    $$("[data-actual-date-rig]").forEach((checkbox) => {
      checkbox.checked = state.actualDateRigs.has(checkbox.dataset.actualDateRig);
    });
  }

  function renderTrendModelOptions() {
    const models = availableModels();

    if (!models.length) {
      els.trendModelOptions.innerHTML = '<span class="muted-note">Load model logic and subcontractor data to select models.</span>';
      state.trendModels.clear();
      return;
    }

    if (!state.trendModels.size) {
      const saved = state.savedTrendModels.filter((model) => models.includes(model));
      state.trendModels = new Set(saved.length ? saved : models);
      state.savedTrendModels = [];
    } else {
      state.trendModels = new Set(
        [...state.trendModels].filter((model) => models.includes(model))
      );
    }

    els.trendModelOptions.innerHTML = models
      .sort(naturalCompare)
      .map((model) => {
        const rigs = availableRigs().filter((rig) => getRigModel(rig) === model);
        return `
          <label class="trend-rig-chip model-chip">
            <input type="checkbox" data-trend-model="${escapeHtml(model)}" ${state.trendModels.has(model) ? "checked" : ""} />
            <span>
              <strong>${escapeHtml(model)}</strong>
              <small>${rigs.length} rig${rigs.length === 1 ? "" : "s"}: ${escapeHtml(rigs.join(", "))}</small>
            </span>
          </label>
        `;
      })
      .join("");

    $$("[data-trend-model]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const model = checkbox.dataset.trendModel;
        if (checkbox.checked) state.trendModels.add(model);
        else state.trendModels.delete(model);
        saveConfig();
        renderModelTrendChart();
      });
    });
  }

  function syncTrendModelCheckboxes() {
    $$("[data-trend-model]").forEach((checkbox) => {
      checkbox.checked = state.trendModels.has(checkbox.dataset.trendModel);
    });
  }

  function renderTrendSubconOptions() {
    const subcons = availableSubcons();

    if (!subcons.length) {
      els.trendSubconOptions.innerHTML = '<span class="muted-note">Load data to select subcontractors.</span>';
      state.trendSubcons.clear();
      return;
    }

    if (!state.trendSubcons.size) {
      const saved = state.savedTrendSubcons.filter((subcon) => subcons.includes(subcon));
      state.trendSubcons = new Set(saved.length ? saved : subcons);
      state.savedTrendSubcons = [];
    } else {
      state.trendSubcons = new Set(
        [...state.trendSubcons].filter((subcon) => subcons.includes(subcon))
      );
    }

    els.trendSubconOptions.innerHTML = subcons
      .sort(naturalCompare)
      .map((subcon) => `
        <label class="trend-rig-chip subcon-chip">
          <input type="checkbox" data-trend-subcon="${escapeHtml(subcon)}" ${state.trendSubcons.has(subcon) ? "checked" : ""} />
          <span>
            <strong>${escapeHtml(subcon)}</strong>
            <small>${formatInt(state.rows.filter((row) => row.subcon === subcon).length)} loaded rows</small>
          </span>
        </label>
      `)
      .join("");

    $$("[data-trend-subcon]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const subcon = checkbox.dataset.trendSubcon;
        if (checkbox.checked) state.trendSubcons.add(subcon);
        else state.trendSubcons.delete(subcon);
        saveConfig();
        renderSubconTrendChart();
      });
    });
  }

  function syncTrendSubconCheckboxes() {
    $$("[data-trend-subcon]").forEach((checkbox) => {
      checkbox.checked = state.trendSubcons.has(checkbox.dataset.trendSubcon);
    });
  }

  function renderSubconPerRigOptions() {
    const subcons = availableSubcons();

    if (!subcons.length) {
      els.subconPerRigOptions.innerHTML = '<span class="muted-note">Load data to select subcontractors.</span>';
      state.subconPerRigSubcons.clear();
      return;
    }

    if (!state.subconPerRigSubcons.size) {
      const saved = state.savedSubconPerRigSubcons.filter((subcon) => subcons.includes(subcon));
      state.subconPerRigSubcons = new Set(
        saved.length
          ? saved
          : (state.trendSubcons.size ? [...state.trendSubcons] : subcons)
      );
      state.savedSubconPerRigSubcons = [];
    } else {
      state.subconPerRigSubcons = new Set(
        [...state.subconPerRigSubcons].filter((subcon) => subcons.includes(subcon))
      );
    }

    els.subconPerRigOptions.innerHTML = subcons
      .sort(naturalCompare)
      .map((subcon) => {
        const rigs = unique(
          state.rows
            .filter((row) => row.subcon === subcon)
            .map((row) => row.rig)
        ).sort(naturalCompare);

        return `
          <label class="trend-rig-chip subcon-chip">
            <input type="checkbox" data-subcon-per-rig="${escapeHtml(subcon)}" ${state.subconPerRigSubcons.has(subcon) ? "checked" : ""} />
            <span>
              <strong>${escapeHtml(subcon)}</strong>
              <small>${rigs.length} rig${rigs.length === 1 ? "" : "s"}: ${escapeHtml(rigs.join(", "))}</small>
            </span>
          </label>
        `;
      })
      .join("");

    $$("[data-subcon-per-rig]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const subcon = checkbox.dataset.subconPerRig;
        if (checkbox.checked) state.subconPerRigSubcons.add(subcon);
        else state.subconPerRigSubcons.delete(subcon);
        saveConfig();
        renderSubconPerRigChart();
      });
    });
  }

  function syncSubconPerRigCheckboxes() {
    $$("[data-subcon-per-rig]").forEach((checkbox) => {
      checkbox.checked = state.subconPerRigSubcons.has(checkbox.dataset.subconPerRig);
    });
  }

  function availableSubcons() {
    return unique(state.rows.map((row) => row.subcon));
  }

  function availableModels() {
    return unique(
      availableRigs()
        .map((rig) => getRigModel(rig))
        .filter((model) => model && model !== "Unknown")
    );
  }

  function availableRigs() {
    return unique(state.rows.map((row) => row.rig));
  }

  function getRigModel(rig) {
    const key = normalizeRig(rig);
    return state.rigModels[key] || state.rigModels[rig] || "Unknown";
  }

  function rigDisplayName(rig) {
    return `${rig} · ${getRigModel(rig)}`;
  }

  function applyFilters() {
    const from = els.dateFrom.value;
    const to = els.dateTo.value;
    const subcon = els.subconFilter.value;
    const rig = els.rigFilter.value;
    const model = els.modelFilter.value;
    const st = els.stFilter.value;
    const type = els.typeFilter.value;

    state.filtered = state.rows.filter((row) =>
      (!from || row.dateKey >= from) &&
      (!to || row.dateKey <= to) &&
      (!subcon || row.subcon === subcon) &&
      (!rig || row.rig === rig) &&
      (!model || getRigModel(row.rig) === model) &&
      (!st || row.st === st) &&
      (!type || row.type === type)
    );

    renderDashboard();
  }

  function resetFilters() {
    els.subconFilter.value = "";
    els.rigFilter.value = "";
    els.modelFilter.value = "";
    els.stFilter.value = "";
    els.typeFilter.value = "";

    if (state.rows.length) {
      const dates = state.rows.map((row) => row.dateKey).sort();
      els.dateFrom.value = dates[0] || "";
      els.dateTo.value = dates.at(-1) || "";
    } else {
      els.dateFrom.value = "";
      els.dateTo.value = "";
    }

    applyFilters();
  }

  function renderDashboard() {
    const uniqueRows = uniquePointRows(state.filtered);
    const days = unique(uniqueRows.map((row) => row.dateKey)).length;
    const lgNet = sum(state.filtered, "lgNet");
    const mgNet = sum(state.filtered, "mgNet");

    els.kpiPoints.textContent = formatInt(uniqueRows.length);
    els.kpiRigs.textContent = formatInt(unique(uniqueRows.map((row) => row.rig)).length);
    els.kpiSts.textContent = formatInt(unique(uniqueRows.map((row) => row.st)).length);
    els.kpiDays.textContent = formatInt(days);
    els.kpiLg.textContent = `${format2(lgNet)} m³`;
    els.kpiMg.textContent = `${format2(mgNet)} m³`;
    els.kpiPtsDay.textContent = format2(days ? uniqueRows.length / days : 0);
    els.kpiNetDay.textContent = `${format2(days ? (lgNet + mgNet) / days : 0)} m³`;

    renderRigChart();
    renderModelChart();
    renderStChart();
    renderSubconChart();
    renderTrendChart();
    renderActualDateRigChart();
    renderModelTrendChart();
    renderSubconTrendChart();
    renderSubconPerRigChart();
    renderProgressSCurve();
    renderTables();
  }

  function renderRigChart() {
    renderBarChart(
      "rig",
      $("#rigChart"),
      aggregateBy(state.filtered, "rig"),
      els.rigMetric.value,
      true
    );
  }

  function renderModelChart() {
    renderBarChart(
      "model",
      $("#modelChart"),
      aggregateByRigModel(state.filtered),
      els.modelMetric.value,
      false
    );
  }

  function renderStChart() {
    renderBarChart(
      "st",
      $("#stChart"),
      aggregateBy(state.filtered, "st"),
      els.stMetric.value,
      false
    );
  }

  function renderSubconChart() {
    renderBarChart(
      "subcon",
      $("#subconChart"),
      aggregateBy(state.filtered, "subcon"),
      els.subconMetric.value,
      false
    );
  }

  function renderBarChart(key, canvas, rows, metric, showRigModel) {
    const labelMap = {
      points: "Completed points",
      pointsPerDay: "Points/day",
      lgNet: "LG net m³",
      mgNet: "MG net m³",
      netPerDay: "Net m³/day"
    };

    const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);

    if (state.charts[key]) state.charts[key].destroy();

    state.charts[key] = new Chart(canvas, {
      type: "bar",
      data: {
        labels: sorted.map((row) => showRigModel ? rigDisplayName(row.name) : row.name),
        datasets: [{
          label: labelMap[metric],
          data: sorted.map((row) => round(row[metric])),
          borderWidth: 0,
          borderRadius: 6,
          backgroundColor: metric === "mgNet"
            ? "rgba(217,119,6,.78)"
            : "rgba(47,117,181,.78)"
        }]
      },
      options: {
        maintainAspectRatio: false,
        indexAxis: sorted.length > 7 ? "y" : "x",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const row = sorted[context.dataIndex];
                const details = [
                  `Points: ${formatInt(row.points)}`,
                  `Days: ${formatInt(row.days)}`,
                  `LG net: ${format2(row.lgNet)} m³`,
                  `MG net: ${format2(row.mgNet)} m³`
                ];
                if (showRigModel) details.unshift(`Model: ${getRigModel(row.name)}`);
                return details;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "rgba(102,117,139,.12)" }
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(102,117,139,.12)" }
          }
        }
      }
    });
  }

  function renderTrendChart() {
    const selectedRigs = [...state.trendRigs]
      .filter((rig) => availableRigs().includes(rig))
      .sort(naturalCompare);

    const metric = els.trendMetric.value;
    const metricConfig = {
      points: { label: "Completed points/day", axis: "Completed points" },
      lgNet: { label: "LG net m³/day", axis: "LG net volume (m³)" },
      mgNet: { label: "MG net m³/day", axis: "MG net volume (m³)" },
      totalNet: { label: "Total net m³/day", axis: "Total net volume (m³)" }
    }[metric];

    const comparison = buildWorkingDayComparison(state.filtered, selectedRigs, metric);

    if (state.charts.trend) state.charts.trend.destroy();

    state.charts.trend = new Chart($("#trendChart"), {
      type: "line",
      data: {
        labels: comparison.labels,
        datasets: comparison.series.map((series, index) => ({
          label: `${series.rig} · ${series.model}`,
          data: series.values,
          actualDates: series.actualDates,
          borderColor: LINE_COLORS[index % LINE_COLORS.length],
          backgroundColor: LINE_COLORS[index % LINE_COLORS.length],
          borderWidth: 2.3,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: false
        }))
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          title: {
            display: true,
            text: selectedRigs.length
              ? `${metricConfig.label} · ${selectedRigs.length} rig${selectedRigs.length === 1 ? "" : "s"} compared`
              : "Select at least one rig",
            align: "start",
            color: "#66758b",
            font: { size: 12, weight: "600" },
            padding: { bottom: 10 }
          },
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 9, padding: 14 }
          },
          tooltip: {
            callbacks: {
              title: (items) => items.length ? comparison.labels[items[0].dataIndex] : "",
              afterLabel: (context) => {
                const date = context.dataset.actualDates?.[context.dataIndex];
                return date ? `Actual date: ${prettyFullDate(date)}` : "";
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Working day (each rig's active-day sequence)"
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metricConfig.axis
            },
            grid: { color: "rgba(102,117,139,.12)" }
          }
        }
      }
    });
  }


  function renderActualDateRigChart() {
    const selectedRigs = [...state.actualDateRigs]
      .filter((rig) => availableRigs().includes(rig))
      .sort(naturalCompare);

    const metric = els.actualDateMetric.value;
    const metricConfig = {
      points: { label: "Completed points/day", axis: "Completed points" },
      lgNet: { label: "LG net m³/day", axis: "LG net volume (m³)" },
      mgNet: { label: "MG net m³/day", axis: "MG net volume (m³)" },
      totalNet: { label: "Total net m³/day", axis: "Total net volume (m³)" }
    }[metric];

    const comparison = buildActualDateRigComparison(
      state.filtered,
      selectedRigs,
      metric
    );

    if (state.charts.actualDateRig) {
      state.charts.actualDateRig.destroy();
    }

    state.charts.actualDateRig = new Chart($("#actualDateRigChart"), {
      type: "line",
      data: {
        labels: comparison.dateKeys.map(prettyFullDate),
        datasets: comparison.series.map((series, index) => ({
          label: `${series.rig} · ${series.model}`,
          data: series.values,
          dateKeys: comparison.dateKeys,
          borderColor: LINE_COLORS[index % LINE_COLORS.length],
          backgroundColor: LINE_COLORS[index % LINE_COLORS.length],
          borderWidth: 2.3,
          tension: 0.15,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: false
        }))
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          title: {
            display: true,
            text: selectedRigs.length
              ? `${metricConfig.label} by actual date · ${selectedRigs.length} rig${selectedRigs.length === 1 ? "" : "s"} compared`
              : "Select at least one rig in this chart",
            align: "start",
            color: "#66758b",
            font: { size: 12, weight: "600" },
            padding: { bottom: 10 }
          },
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 9, padding: 14 }
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                if (!items.length) return "";
                const dateKey = comparison.dateKeys[items[0].dataIndex];
                return prettyFullDate(dateKey);
              },
              afterLabel: (context) => {
                const value = context.raw;
                return value === null
                  ? "No work recorded"
                  : `Rig model: ${context.dataset.label.split(" · ").slice(1).join(" · ")}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Actual date"
            },
            grid: { display: false },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 24,
              maxRotation: 55,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metricConfig.axis
            },
            grid: { color: "rgba(102,117,139,.12)" }
          }
        }
      }
    });
  }


  function renderModelTrendChart() {
    const selectedModels = [...state.trendModels]
      .filter((model) => availableModels().includes(model))
      .sort(naturalCompare);

    const metric = els.modelTrendMetric.value;
    const metricConfig = {
      points: { label: "Completed points/day", axis: "Completed points" },
      lgNet: { label: "LG net m³/day", axis: "LG net volume (m³)" },
      mgNet: { label: "MG net m³/day", axis: "MG net volume (m³)" },
      totalNet: { label: "Total net m³/day", axis: "Total net volume (m³)" }
    }[metric];

    const comparison = buildModelWorkingDayComparison(
      state.filtered,
      selectedModels,
      metric
    );

    if (state.charts.modelTrend) state.charts.modelTrend.destroy();

    state.charts.modelTrend = new Chart($("#modelTrendChart"), {
      type: "line",
      data: {
        labels: comparison.labels,
        datasets: comparison.series.map((series, index) => ({
          label: series.model,
          data: series.values,
          actualDates: series.actualDates,
          activeRigs: series.activeRigs,
          rigNames: series.rigNames,
          borderColor: LINE_COLORS[index % LINE_COLORS.length],
          backgroundColor: LINE_COLORS[index % LINE_COLORS.length],
          borderWidth: 2.5,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: false
        }))
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          title: {
            display: true,
            text: selectedModels.length
              ? `${metricConfig.label} · ${selectedModels.length} model${selectedModels.length === 1 ? "" : "s"} compared`
              : "Select at least one rig model",
            align: "start",
            color: "#66758b",
            font: { size: 12, weight: "600" },
            padding: { bottom: 10 }
          },
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 9, padding: 16 }
          },
          tooltip: {
            callbacks: {
              title: (items) => items.length ? comparison.labels[items[0].dataIndex] : "",
              afterLabel: (context) => {
                const date = context.dataset.actualDates?.[context.dataIndex];
                const activeRigs = context.dataset.activeRigs?.[context.dataIndex] || 0;
                const rigNames = context.dataset.rigNames?.[context.dataIndex] || [];
                return [
                  date ? `Actual date: ${prettyFullDate(date)}` : "",
                  `Active rigs: ${formatInt(activeRigs)}`,
                  rigNames.length ? `Rigs: ${rigNames.join(", ")}` : ""
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Working day (each model group's active-day sequence)"
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metricConfig.axis
            },
            grid: { color: "rgba(102,117,139,.12)" }
          }
        }
      }
    });
  }

  function renderSubconTrendChart() {
    const selectedSubcons = [...state.trendSubcons]
      .filter((subcon) => availableSubcons().includes(subcon))
      .sort(naturalCompare);

    const metric = els.subconTrendMetric.value;
    const metricConfig = {
      points: { label: "Completed points/day", axis: "Completed points" },
      lgNet: { label: "LG net m³/day", axis: "LG net volume (m³)" },
      mgNet: { label: "MG net m³/day", axis: "MG net volume (m³)" },
      totalNet: { label: "Total net m³/day", axis: "Total net volume (m³)" }
    }[metric];

    const comparison = buildSubconWorkingDayComparison(
      state.filtered,
      selectedSubcons,
      metric
    );

    if (state.charts.subconTrend) state.charts.subconTrend.destroy();

    state.charts.subconTrend = new Chart($("#subconTrendChart"), {
      type: "line",
      data: {
        labels: comparison.labels,
        datasets: comparison.series.map((series, index) => ({
          label: series.subcon,
          data: series.values,
          actualDates: series.actualDates,
          activeRigs: series.activeRigs,
          borderColor: LINE_COLORS[index % LINE_COLORS.length],
          backgroundColor: LINE_COLORS[index % LINE_COLORS.length],
          borderWidth: 2.5,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: false
        }))
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          title: {
            display: true,
            text: selectedSubcons.length
              ? `${metricConfig.label} · ${selectedSubcons.length} subcontractor${selectedSubcons.length === 1 ? "" : "s"} compared`
              : "Select at least one subcontractor",
            align: "start",
            color: "#66758b",
            font: { size: 12, weight: "600" },
            padding: { bottom: 10 }
          },
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 9, padding: 16 }
          },
          tooltip: {
            callbacks: {
              title: (items) => items.length ? comparison.labels[items[0].dataIndex] : "",
              afterLabel: (context) => {
                const date = context.dataset.actualDates?.[context.dataIndex];
                const rigs = context.dataset.activeRigs?.[context.dataIndex] || 0;
                return [
                  date ? `Actual date: ${prettyFullDate(date)}` : "",
                  `Active rigs: ${formatInt(rigs)}`
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Working day (each subcontractor's active-day sequence)"
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metricConfig.axis
            },
            grid: { color: "rgba(102,117,139,.12)" }
          }
        }
      }
    });
  }

  function renderSubconPerRigChart() {
    const selectedSubcons = [...state.subconPerRigSubcons]
      .filter((subcon) => availableSubcons().includes(subcon))
      .sort(naturalCompare);

    const metric = els.subconPerRigMetric.value;
    const metricConfig = {
      points: {
        label: "Completed points/rig/day",
        axis: "Completed points per active rig"
      },
      lgNet: {
        label: "LG net m³/rig/day",
        axis: "LG net volume per active rig (m³)"
      },
      mgNet: {
        label: "MG net m³/rig/day",
        axis: "MG net volume per active rig (m³)"
      },
      totalNet: {
        label: "Total net m³/rig/day",
        axis: "Total net volume per active rig (m³)"
      }
    }[metric];

    const comparison = buildSubconPerRigComparison(
      state.filtered,
      selectedSubcons,
      metric
    );

    if (state.charts.subconPerRig) {
      state.charts.subconPerRig.destroy();
    }

    state.charts.subconPerRig = new Chart($("#subconPerRigChart"), {
      type: "line",
      data: {
        labels: comparison.labels,
        datasets: comparison.series.map((series, index) => ({
          label: series.subcon,
          data: series.values,
          totalValues: series.totalValues,
          actualDates: series.actualDates,
          activeRigs: series.activeRigs,
          rigNames: series.rigNames,
          borderColor: LINE_COLORS[index % LINE_COLORS.length],
          backgroundColor: LINE_COLORS[index % LINE_COLORS.length],
          borderWidth: 2.5,
          tension: 0.2,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          spanGaps: false
        }))
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          title: {
            display: true,
            text: selectedSubcons.length
              ? `${metricConfig.label} · ${selectedSubcons.length} subcontractor${selectedSubcons.length === 1 ? "" : "s"} compared`
              : "Select at least one subcontractor",
            align: "start",
            color: "#66758b",
            font: { size: 12, weight: "600" },
            padding: { bottom: 10 }
          },
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 9, padding: 16 }
          },
          tooltip: {
            callbacks: {
              title: (items) =>
                items.length ? comparison.labels[items[0].dataIndex] : "",
              afterLabel: (context) => {
                const index = context.dataIndex;
                const date = context.dataset.actualDates?.[index];
                const rigs = context.dataset.activeRigs?.[index] || 0;
                const rigNames = context.dataset.rigNames?.[index] || [];
                const total = context.dataset.totalValues?.[index] || 0;

                return [
                  date ? `Actual date: ${prettyFullDate(date)}` : "",
                  `Active rigs: ${formatInt(rigs)}`,
                  rigNames.length ? `Rigs: ${rigNames.join(", ")}` : "",
                  `Total before division: ${format2(total)}`
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Working day (each subcontractor's active-day sequence)"
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: metricConfig.axis
            },
            grid: { color: "rgba(102,117,139,.12)" }
          }
        }
      }
    });
  }

  function renderProgressSCurve() {
    if (!state.workfrontRows.length) {
      clearProgressSCurve("Workfront Allocation data is not loaded.");
      return;
    }

    const metric = els.sCurveMetric.value;
    const method = els.sCurveMethod.value || "standard";
    const workfront = els.sCurveWorkfront.value;
    const st = els.sCurveSt.value;
    const type = els.sCurveType.value;

    const allocation = state.workfrontRows.filter((row) =>
      (!workfront || row.workfront === workfront) &&
      (!st || row.st === st) &&
      (!type || row.type === type)
    );

    if (!allocation.length) {
      clearProgressSCurve("No allocated points match the selected S-curve filters.");
      return;
    }

    const result = buildProgressSCurveData(allocation, metric, method);

    els.sCurveTotalScope.textContent = formatScopeValue(result.totalScope, metric);
    els.sCurveCompletedScope.textContent = formatScopeValue(result.completedScope, metric);
    els.sCurveProgress.textContent = `${format2(result.progressPercent)}%`;
    els.sCurveMatchedPoints.textContent =
      `${formatInt(result.matchedPoints)} / ${formatInt(result.totalPoints)}`;

    if (state.charts.progressSCurve) {
      state.charts.progressSCurve.destroy();
    }

    const datasets = [{
      label: "Actual progress",
      data: result.actualPercent,
      completedValues: result.actualCompletedValues,
      borderColor: "#2f75b5",
      backgroundColor: "rgba(47,117,181,.14)",
      borderWidth: 3,
      tension: 0.28,
      fill: true,
      pointRadius: 2.5,
      pointHoverRadius: 5
    }];

    if (result.plannedPercent.some((value) => value !== null)) {
      datasets.push({
        label: result.plannedLabel,
        data: result.plannedPercent,
        completedValues: result.plannedCompletedValues,
        borderColor: "#d97706",
        backgroundColor: "rgba(217,119,6,.08)",
        borderWidth: 2.5,
        borderDash: [7, 5],
        tension: 0.2,
        fill: false,
        pointRadius: 2
      });
    }

    state.charts.progressSCurve = new Chart($("#progressSCurveChart"), {
      type: "line",
      data: {
        labels: result.dateKeys.map(prettyFullDate),
        datasets
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          title: {
            display: true,
            text:
              `${result.metricLabel} · ${formatInt(result.totalPoints)} allocated points · ` +
              `${format2(result.progressPercent)}% complete`,
            align: "start",
            color: "#66758b",
            font: { size: 12, weight: "600" },
            padding: { bottom: 10 }
          },
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 9, padding: 16 }
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                if (!items.length) return "";
                return prettyFullDate(result.dateKeys[items[0].dataIndex]);
              },
              afterLabel: (context) => {
                const value = context.dataset.completedValues?.[context.dataIndex] || 0;
                return [
                  `Completed: ${formatScopeValue(value, metric)}`,
                  `Total scope: ${formatScopeValue(result.totalScope, metric)}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: "Date" },
            grid: { display: false },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 24,
              maxRotation: 55,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            suggestedMax: 100,
            max: 100,
            title: { display: true, text: "Cumulative progress (%)" },
            ticks: { callback: (value) => `${value}%` },
            grid: { color: "rgba(102,117,139,.12)" }
          }
        }
      }
    });

    const plannedCount = allocation.filter((row) => row.plannedDateKey).length;
    els.sCurveNote.textContent = plannedCount
      ? `${plannedCount.toLocaleString()} allocated points include a Planned Finish Date / target date. Target method: ${result.plannedLabel}.`
      : "Actual cumulative progress is shown. Add a planned-finish tab with Workfront + Planned Finish Date to display a planned baseline.";
  }

  function clearProgressSCurve(message) {
    els.sCurveTotalScope.textContent = "0";
    els.sCurveCompletedScope.textContent = "0";
    els.sCurveProgress.textContent = "0.00%";
    els.sCurveMatchedPoints.textContent = "0 / 0";
    els.sCurveNote.textContent = message;

    if (state.charts.progressSCurve) {
      state.charts.progressSCurve.destroy();
      state.charts.progressSCurve = null;
    }
  }

  function buildProgressSCurveData(allocation, metric, method = "standard") {
    const actualRows = getSCurveActualRows();
    const completionByExactKey = new Map();
    const completionByPoint = new Map();

    for (const row of actualRows) {
      const exactKey = `${row.st}|${normalizePoint(row.pointRef)}`;
      const pointKey = normalizePoint(row.pointRef);

      const existingExact = completionByExactKey.get(exactKey);
      if (!existingExact || row.dateKey < existingExact) {
        completionByExactKey.set(exactKey, row.dateKey);
      }

      const existingPoint = completionByPoint.get(pointKey);
      if (!existingPoint || row.dateKey < existingPoint) {
        completionByPoint.set(pointKey, row.dateKey);
      }
    }

    const weightedRows = allocation.map((row) => {
      const exactKey = `${row.st}|${row.pointKey}`;
      const completionDateKey =
        completionByExactKey.get(exactKey) ||
        completionByPoint.get(row.pointKey) ||
        "";

      return {
        ...row,
        weight: progressWeight(row, metric),
        completionDateKey
      };
    });

    const totalScope = weightedRows.reduce(
      (sum, row) => sum + row.weight,
      0
    );

    const dateTo = els.dateTo.value;
    const completedRows = weightedRows.filter((row) =>
      row.completionDateKey &&
      (!dateTo || row.completionDateKey <= dateTo)
    );

    const completedScope = completedRows.reduce(
      (sum, row) => sum + row.weight,
      0
    );

    const actualDateKeys = completedRows.map((row) => row.completionDateKey);
    const historicalProfile = buildHistoricalProductivityProfile(weightedRows);
    const plannedWorkfronts = buildPlannedWorkfrontBaseline(weightedRows, method, historicalProfile);
    const plannedDateKeys = plannedWorkfronts
      .flatMap((item) => [item.startDateKey, item.finishDateKey])
      .filter(Boolean);

    let firstDate = [
      ...actualDateKeys,
      ...plannedDateKeys
    ].sort()[0] || "";

    let lastDate = [
      ...actualDateKeys,
      ...plannedDateKeys
    ].sort().at(-1) || "";

    const dateFrom = els.dateFrom.value;

    if (dateFrom) firstDate = dateFrom;
    if (dateTo) lastDate = dateTo;

    if (!firstDate || !lastDate) {
      const today = isoDate(new Date());
      firstDate = firstDate || today;
      lastDate = lastDate || today;
    }

    if (lastDate < firstDate) {
      [firstDate, lastDate] = [lastDate, firstDate];
    }

    const dateKeys = dateRangeKeys(firstDate, lastDate);
    const actualPercent = [];
    const actualCompletedValues = [];
    const plannedPercent = [];
    const plannedCompletedValues = [];

    for (const dateKey of dateKeys) {
      const actualCompleted = weightedRows
        .filter((row) =>
          row.completionDateKey &&
          row.completionDateKey <= dateKey &&
          (!dateTo || row.completionDateKey <= dateTo)
        )
        .reduce((sum, row) => sum + row.weight, 0);

      const plannedCompleted = plannedWorkfronts
        .reduce((sum, item) =>
          sum + plannedWorkfrontValueOnDate(item, dateKey),
          0
        );

      actualCompletedValues.push(round(actualCompleted));
      plannedCompletedValues.push(round(plannedCompleted));

      actualPercent.push(
        totalScope ? round((actualCompleted / totalScope) * 100) : 0
      );

      plannedPercent.push(
        plannedWorkfronts.length && totalScope
          ? round((plannedCompleted / totalScope) * 100)
          : null
      );
    }

    return {
      dateKeys,
      actualPercent,
      plannedPercent,
      actualCompletedValues,
      plannedCompletedValues,
      totalScope: round(totalScope),
      completedScope: round(completedScope),
      progressPercent: totalScope
        ? round((completedScope / totalScope) * 100)
        : 0,
      matchedPoints: completedRows.length,
      totalPoints: weightedRows.length,
      metricLabel: progressMetricLabel(metric),
      plannedLabel: method === "historical" ? "Historical Productivity target" : "Standard S-Curve target"
    };
  }

  function buildPlannedWorkfrontBaseline(weightedRows, method = "standard", historicalProfile = null) {
    const groups = new Map();

    for (const row of weightedRows) {
      if (!row.plannedDateKey) continue;
      const key = `${row.st}|${row.workfront}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          st: row.st,
          workfront: row.workfront,
          finishDateKey: row.plannedDateKey,
          startDateKey: "",
          weight: 0,
          method,
          historicalProfile
        });
      }

      const group = groups.get(key);
      group.weight += row.weight;

      if (row.plannedDateKey > group.finishDateKey) {
        group.finishDateKey = row.plannedDateKey;
      }

      if (row.completionDateKey && (!group.startDateKey || row.completionDateKey < group.startDateKey)) {
        group.startDateKey = row.completionDateKey;
      }
    }

    return [...groups.values()]
      .filter((group) => group.startDateKey && group.finishDateKey && group.weight > 0)
      .map((group) => ({
        ...group,
        method,
        historicalProfile,
        weight: round(group.weight)
      }));
  }

  function plannedWorkfrontValueOnDate(item, dateKey) {
    if (!item.startDateKey || !item.finishDateKey || dateKey < item.startDateKey) return 0;
    if (dateKey >= item.finishDateKey) return item.weight;

    const totalDays = daysBetween(item.startDateKey, item.finishDateKey);
    if (totalDays <= 0) return item.weight;

    const elapsedDays = Math.max(0, daysBetween(item.startDateKey, dateKey));
    const ratio = Math.max(0, Math.min(1, elapsedDays / totalDays));

    if (item.method === "historical" && item.historicalProfile?.length) {
      return item.weight * historicalCurveRatio(item.historicalProfile, ratio);
    }

    return item.weight * standardSCurveRatio(ratio);
  }

  function standardSCurveRatio(ratio) {
    const t = Math.max(0, Math.min(1, ratio));
    return (3 * t * t) - (2 * t * t * t);
  }

  function historicalCurveRatio(profile, ratio) {
    if (!profile?.length) return standardSCurveRatio(ratio);
    const t = Math.max(0, Math.min(1, ratio));
    const index = Math.min(profile.length - 1, Math.floor(t * (profile.length - 1)));
    return Math.max(0, Math.min(1, profile[index]));
  }

  function buildHistoricalProductivityProfile(weightedRows) {
    const completedRows = weightedRows
      .filter((row) => row.completionDateKey && row.weight > 0)
      .sort((a, b) => a.completionDateKey.localeCompare(b.completionDateKey));

    if (completedRows.length < 5) return null;

    const byDate = new Map();
    for (const row of completedRows) {
      byDate.set(row.completionDateKey, (byDate.get(row.completionDateKey) || 0) + row.weight);
    }

    const keys = [...byDate.keys()].sort();
    if (keys.length < 3) return null;

    const total = [...byDate.values()].reduce((sum, value) => sum + value, 0);
    if (!total) return null;

    let cumulative = 0;
    return keys.map((key) => {
      cumulative += byDate.get(key) || 0;
      return cumulative / total;
    });
  }

  function daysBetween(startKey, endKey) {
    const start = parseDate(startKey);
    const end = parseDate(endKey);
    if (!start || !end) return 0;

    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endUtc - startUtc) / 86400000);
  }

  function getSCurveActualRows() {
    const subcon = els.subconFilter.value;
    const rig = els.rigFilter.value;
    const model = els.modelFilter.value;

    return state.rows.filter((row) =>
      (!subcon || row.subcon === subcon) &&
      (!rig || row.rig === rig) &&
      (!model || getRigModel(row.rig) === model)
    );
  }

  function progressWeight(row, metric) {
    if (metric === "lgLength") return row.lgLength;
    if (metric === "mgLength") return row.mgLength;
    if (metric === "totalLength") return row.totalLength;
    return 1;
  }

  function progressMetricLabel(metric) {
    if (metric === "lgLength") return "LG design treatment length";
    if (metric === "mgLength") return "MG design treatment length";
    if (metric === "totalLength") return "Total design treatment length";
    return "Allocated points";
  }

  function formatScopeValue(value, metric) {
    return metric === "points"
      ? `${formatInt(value)} points`
      : `${format2(value)} m`;
  }

  function dateRangeKeys(startKey, endKey) {
    const start = parseDate(startKey);
    const end = parseDate(endKey);

    if (!start || !end) return [];

    const keys = [];
    const cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );

    const finalDate = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );

    while (cursor <= finalDate) {
      keys.push(isoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return keys;
  }

  function buildActualDateRigComparison(rows, rigs, metric) {
    const dateKeys = unique(
      rows
        .filter((row) => rigs.includes(row.rig))
        .map((row) => row.dateKey)
    ).sort();

    const series = rigs.map((rig) => {
      const daily = aggregateBy(
        rows.filter((row) => row.rig === rig),
        "dateKey"
      );

      const dailyMap = new Map(
        daily.map((day) => {
          let value;
          if (metric === "points") value = day.points;
          else if (metric === "lgNet") value = round(day.lgNet);
          else if (metric === "mgNet") value = round(day.mgNet);
          else value = round(day.lgNet + day.mgNet);

          return [day.name, value];
        })
      );

      return {
        rig,
        model: getRigModel(rig),
        values: dateKeys.map((dateKey) =>
          dailyMap.has(dateKey) ? dailyMap.get(dateKey) : null
        )
      };
    });

    return { dateKeys, series };
  }

  function buildWorkingDayComparison(rows, rigs, metric) {
    const series = [];
    let maxDays = 0;

    for (const rig of rigs) {
      const rigRows = rows.filter((row) => row.rig === rig);
      const daily = aggregateBy(rigRows, "dateKey")
        .sort((a, b) => a.name.localeCompare(b.name));

      const values = daily.map((day) => {
        if (metric === "points") return day.points;
        if (metric === "lgNet") return round(day.lgNet);
        if (metric === "mgNet") return round(day.mgNet);
        return round(day.lgNet + day.mgNet);
      });

      maxDays = Math.max(maxDays, values.length);

      series.push({
        rig,
        model: getRigModel(rig),
        values,
        actualDates: daily.map((day) => day.name)
      });
    }

    return {
      labels: Array.from({ length: maxDays }, (_, index) => `Working Day ${index + 1}`),
      series
    };
  }

  function aggregateByRigModel(rows) {
    const mapped = rows.map((row) => ({
      ...row,
      modelGroup: getRigModel(row.rig)
    }));

    return aggregateBy(mapped, "modelGroup");
  }

  function buildModelWorkingDayComparison(rows, models, metric) {
    const series = [];
    let maxDays = 0;

    for (const model of models) {
      const modelRows = rows.filter((row) => getRigModel(row.rig) === model);
      const daily = aggregateBy(modelRows, "dateKey")
        .sort((a, b) => a.name.localeCompare(b.name));

      const values = daily.map((day) => {
        if (metric === "points") return day.points;
        if (metric === "lgNet") return round(day.lgNet);
        if (metric === "mgNet") return round(day.mgNet);
        return round(day.lgNet + day.mgNet);
      });

      const rigNames = daily.map((day) =>
        unique(
          modelRows
            .filter((row) => row.dateKey === day.name)
            .map((row) => row.rig)
        ).sort(naturalCompare)
      );

      maxDays = Math.max(maxDays, values.length);

      series.push({
        model,
        values,
        rigNames,
        activeRigs: rigNames.map((rigs) => rigs.length),
        actualDates: daily.map((day) => day.name)
      });
    }

    return {
      labels: Array.from({ length: maxDays }, (_, index) => `Working Day ${index + 1}`),
      series
    };
  }

  function buildSubconPerRigComparison(rows, subcons, metric) {
    const series = [];
    let maxDays = 0;

    for (const subcon of subcons) {
      const subconRows = rows.filter((row) => row.subcon === subcon);
      const daily = aggregateBy(subconRows, "dateKey")
        .sort((a, b) => a.name.localeCompare(b.name));

      const rigNames = daily.map((day) =>
        unique(
          subconRows
            .filter((row) => row.dateKey === day.name)
            .map((row) => row.rig)
        ).sort(naturalCompare)
      );

      const activeRigs = rigNames.map((rigs) => rigs.length);

      const totalValues = daily.map((day) => {
        if (metric === "points") return day.points;
        if (metric === "lgNet") return round(day.lgNet);
        if (metric === "mgNet") return round(day.mgNet);
        return round(day.lgNet + day.mgNet);
      });

      const values = totalValues.map((total, index) =>
        activeRigs[index] ? round(total / activeRigs[index]) : null
      );

      maxDays = Math.max(maxDays, values.length);

      series.push({
        subcon,
        values,
        totalValues,
        activeRigs,
        rigNames,
        actualDates: daily.map((day) => day.name)
      });
    }

    return {
      labels: Array.from(
        { length: maxDays },
        (_, index) => `Working Day ${index + 1}`
      ),
      series
    };
  }

  function buildSubconWorkingDayComparison(rows, subcons, metric) {
    const series = [];
    let maxDays = 0;

    for (const subcon of subcons) {
      const subconRows = rows.filter((row) => row.subcon === subcon);
      const daily = aggregateBy(subconRows, "dateKey")
        .sort((a, b) => a.name.localeCompare(b.name));

      const values = daily.map((day) => {
        if (metric === "points") return day.points;
        if (metric === "lgNet") return round(day.lgNet);
        if (metric === "mgNet") return round(day.mgNet);
        return round(day.lgNet + day.mgNet);
      });

      const activeRigs = daily.map((day) =>
        unique(
          subconRows
            .filter((row) => row.dateKey === day.name)
            .map((row) => row.rig)
        ).length
      );

      maxDays = Math.max(maxDays, values.length);

      series.push({
        subcon,
        values,
        activeRigs,
        actualDates: daily.map((day) => day.name)
      });
    }

    return {
      labels: Array.from({ length: maxDays }, (_, index) => `Working Day ${index + 1}`),
      series
    };
  }

  function renderTables() {
    const rigs = aggregateBy(state.filtered, "rig")
      .sort((a, b) => b.pointsPerDay - a.pointsPerDay);

    const sts = aggregateBy(state.filtered, "st")
      .sort((a, b) => b.points - a.points);

    els.rigTableCount.textContent = `${rigs.length} rig${rigs.length === 1 ? "" : "s"}`;
    els.stTableCount.textContent = `${sts.length} ST${sts.length === 1 ? "" : "s"}`;

    els.rigTableBody.innerHTML = rigs.length
      ? rigs.map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(getRigModel(row.name))}</td>
          <td>${escapeHtml(row.subcons.join(", "))}</td>
          <td>${formatInt(row.points)}</td>
          <td>${formatInt(row.days)}</td>
          <td>${format2(row.pointsPerDay)}</td>
          <td>${format2(row.lgNet)}</td>
          <td>${format2(row.mgNet)}</td>
          <td>${format2(row.netPerDay)}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="9" class="empty">No matching data.</td></tr>';

    els.stTableBody.innerHTML = sts.length
      ? sts.map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${formatInt(row.points)}</td>
          <td>${formatInt(row.days)}</td>
          <td>${format2(row.pointsPerDay)}</td>
          <td>${format2(row.lgNet)}</td>
          <td>${format2(row.mgNet)}</td>
          <td>${format2(row.netPerDay)}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="7" class="empty">No matching data.</td></tr>';
  }

  function aggregateBy(rows, key) {
    const groups = new Map();

    for (const row of rows) {
      const name = row[key] || "Unspecified";

      if (!groups.has(name)) {
        groups.set(name, {
          name,
          rawRows: [],
          subcons: new Set()
        });
      }

      const group = groups.get(name);
      group.rawRows.push(row);
      group.subcons.add(row.subcon);
    }

    return [...groups.values()].map((group) => {
      const points = uniquePointRows(group.rawRows).length;
      const days = unique(group.rawRows.map((row) => row.dateKey)).length;
      const lgNet = sum(group.rawRows, "lgNet");
      const mgNet = sum(group.rawRows, "mgNet");

      return {
        name: group.name,
        points,
        days,
        pointsPerDay: days ? points / days : 0,
        lgNet,
        mgNet,
        netPerDay: days ? (lgNet + mgNet) / days : 0,
        subcons: [...group.subcons].sort()
      };
    });
  }

  function uniquePointRows(rows) {
    const map = new Map();

    for (const row of rows) {
      const key = `${row.source}|${row.st}|${normalizePoint(row.pointRef)}`;
      if (!map.has(key)) map.set(key, row);
    }

    return [...map.values()];
  }

  function exportFilteredCsv() {
    if (!state.filtered.length) return toast("No filtered rows to export.");

    const headers = [
      "Date", "Subcon", "Rig", "Rig Model", "Type", "ST",
      "Design Zone", "Point Ref", "LG Net", "MG Net"
    ];

    const body = state.filtered.map((row) => [
      row.dateKey,
      row.subcon,
      row.rig,
      getRigModel(row.rig),
      row.type,
      row.st,
      row.designZone,
      row.pointRef,
      row.lgNet,
      row.mgNet
    ]);

    const csv = [headers, ...body]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = `DSM_Productivity_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (quoted) {
        if (char === '"' && text[i + 1] === '"') {
          value += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          value += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        row.push(value);
        value = "";
      } else if (char === "\n") {
        row.push(value.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }

    if (value.length || row.length) {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
    }

    return rows;
  }

  function parseDate(value) {
    const text = String(value || "").trim();
    if (!text) return null;

    // ISO-style date: YYYY-MM-DD or YYYY/MM/DD.
    let match = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\D|$)/);
    if (match) return validDate(+match[1], +match[2], +match[3]);

    // Singapore-style date: DD/MM/YYYY or DD/MM/YY.
    // Match four-digit years first. The previous pattern matched "2026"
    // as "20", which caused the tooltip to display 2020.
    match = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4}|\d{2})(?:\D|$)/);

    if (match) {
      let day = +match[1];
      let month = +match[2];
      let year = +match[3];

      if (year < 100) year += 2000;

      // Prefer DD/MM/YYYY. Swap only when the second number cannot be a month.
      if (day <= 12 && month > 12) [day, month] = [month, day];

      return validDate(year, month, day);
    }

    // Text dates such as "11 Jun 2026".
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function validDate(year, month, day) {
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) ? date : null;
  }

  function isoDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function prettyFullDate(value) {
    const date = parseDate(value);

    return date
      ? date.toLocaleDateString("en-SG", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      : value;
  }

  function normalizeHeader(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function normalizePoint(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function normalizeRig(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function normalizeSt(value) {
    const match = String(value || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .match(/ST[-_]?(\d+)/);

    return match
      ? `ST${match[1]}`
      : String(value || "").trim().toUpperCase();
  }

  function cell(row, index) {
    return index >= 0 ? String(row[index] ?? "").trim() : "";
  }

  function number(value) {
    const parsed = Number(String(value || "").replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function sum(rows, key) {
    return rows.reduce(
      (total, row) => total + (Number(row[key]) || 0),
      0
    );
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function naturalCompare(a, b) {
    return String(a).localeCompare(
      String(b),
      undefined,
      { numeric: true, sensitivity: "base" }
    );
  }

  function round(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function formatInt(value) {
    return Math.round(Number(value) || 0).toLocaleString("en-SG");
  }

  function format2(value) {
    return (Number(value) || 0).toLocaleString("en-SG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(type, message) {
    els.connectionStatus.className = `status ${type}`;
    els.connectionStatus.textContent = message;
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove("show"), 3000);
  }
})();
