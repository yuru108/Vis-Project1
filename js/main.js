const DATA_SOURCES = {
  topoJsonUrl: "data/world.topo.json",
  dataCsvUrl: "data/data.csv",
};

const METRICS = {
  gdp_pc: { label: "GDP", key: "gdp_pc" },
  gini: { label: "Gini", key: "gini" },
  homicide_rate: { label: "Homicide rate", key: "homicide_rate" },
};

const DEFAULTS = {
  mapMetric: "homicide_rate",
  scatterMetric: "gdp_pc",
};

let selectedIso3 = null;
let selectedName = null;
let cachedCountryData = null;
let cachedAveragedData = null;
let mapHandle = null;
let globalDomains = null;
let currentYear = null;
let yearList = [];

function setDataSources(nextSources) {
  Object.assign(DATA_SOURCES, nextSources);
}

const parseRow = (d) => ({
  country: d.country,
  iso3: d.iso3,
  year: +d.year,
  region: d.region,
  gdp_pc: +d.gdp_pc,
  gini: d.gini === "" ? null : +d.gini,
  homicide_rate: +d.homicide_rate,
});

function loadData() {
  return Promise.all([
    d3.json(DATA_SOURCES.topoJsonUrl),
    d3.csv(DATA_SOURCES.dataCsvUrl, parseRow),
  ]);
}

function computeGlobalDomains(rows) {
  const domains = {};
  Object.keys(METRICS).forEach((key) => {
    const vals = rows.map((d) => d[key]).filter((v) => Number.isFinite(v));
    if (key === "gdp_pc") {
      const positive = vals.filter((v) => v > 0);
      domains[key] = d3.extent(positive);
    } else {
      domains[key] = d3.extent(vals);
    }
  });
  const homicideVals = rows.map((d) => d.homicide_rate).filter((v) => Number.isFinite(v));
  domains.homicide_rate = d3.extent(homicideVals);
  return domains;
}

function updateSelectionNote() {
  const note = document.getElementById("selection-note");
  if (!note) return;

  const yearLabel = Number.isFinite(currentYear) ? currentYear : "Average";
  
  if (selectedIso3 && selectedName) {
    note.innerHTML = `
      <h2 style="margin: 0; font-size: 24px; color: var(--accent-color);">${selectedName}</h2>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: var(--text-secondary);">Year: ${yearLabel}</p>
    `;
  } else {
    note.innerHTML = `
      <h2 style="margin: 0; font-size: 24px; color: var(--accent-color);">Global Average</h2>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: var(--text-secondary);">Year: ${yearLabel}</p>
    `;
  }
}

function drawScatterForSelection(metricKey) {
  const metric = METRICS[metricKey];
  if (!metric) return;

  const xDomain = globalDomains ? globalDomains[metric.key] : null;
  const yDomain = globalDomains ? globalDomains.homicide_rate : null;

  if (cachedCountryData) {
    ScatterView.drawScatter(
      cachedCountryData.filter((d) => d[metric.key] !== null && d.homicide_rate !== null),
      {
        metricKey: metric.key,
        metricLabel: metric.label,
        xDomain,
        yDomain,
        highlightIso3: selectedIso3,
        filterIso3: selectedIso3,
        filterYear: Number.isFinite(currentYear) ? currentYear : null,
      }
    );
  }
}

function drawLineForSelection() {
  if (!cachedCountryData) return;
  if (selectedIso3) {
    const countryRows = cachedCountryData.filter((d) => d.iso3 === selectedIso3);
    LineChartView.drawLineChart(countryRows, {
      countryName: selectedName,
      selectedYear: currentYear,
      onYearSelect: setCurrentYear,
    });
  } else {
    LineChartView.drawLineChart(cachedCountryData, {
      selectedYear: currentYear,
      onYearSelect: setCurrentYear,
    });
  }
}

function getMapDomain(metricKey) {
  if (!globalDomains) return null;
  return globalDomains[metricKey] || null;
}

function setCurrentYear(year) {
  let nextYear = null;
  if (year === null || typeof year === "undefined") {
    nextYear = null;
  } else if (Number.isFinite(year)) {
    nextYear = year;
  } else if (Number.isFinite(+year)) {
    nextYear = +year;
  }
  if (nextYear === currentYear) return;
  currentYear = nextYear;
  updateSelectionNote();
  drawScatterForSelection(document.getElementById("scatter-metric-select").value);
  const mapMetricSelect = document.getElementById("map-metric-select");
  const selected = METRICS[mapMetricSelect.value];
  const yearData = Number.isFinite(currentYear)
    ? cachedCountryData.filter((d) => d.year === currentYear)
    : cachedAveragedData;
  const fixedDomain = getMapDomain(selected.key);
  mapHandle.updateMetric(selected.key, selected.label, yearData, fixedDomain);
  drawLineForSelection();
}

function init() {
  loadData()
    .then(([geoData, countryData]) => {
      cachedCountryData = countryData;
      cachedAveragedData = MapView.calculateCountryAverages(countryData);
      globalDomains = computeGlobalDomains(countryData);
      yearList = Array.from(new Set(countryData.map((d) => d.year))).sort(d3.ascending);
      currentYear = null;

      const mapMetricSelect = document.getElementById("map-metric-select");
      const scatterMetricSelect = document.getElementById("scatter-metric-select");

      const scatterMetric = METRICS[DEFAULTS.scatterMetric];
      scatterMetricSelect.value = scatterMetric.key;

      const mapMetric = METRICS[DEFAULTS.mapMetric];
      mapMetricSelect.value = mapMetric.key;

      const initialYearData = cachedAveragedData;

      mapHandle = MapView.initMap(geoData, initialYearData, mapMetric.key, mapMetric.label, {
        mapSelector: "#map",
        tooltipSelector: "#tooltip",
        width: 1100,
        height: 620,
        fixedDomain: getMapDomain(mapMetric.key),
        onCountrySelect: (iso3, name) => {
          selectedIso3 = iso3;
          selectedName = name;
          updateSelectionNote();
          drawScatterForSelection(scatterMetricSelect.value);
          drawLineForSelection();
          mapHandle.setSelected(selectedIso3);
        },
      });

      updateSelectionNote();
      drawScatterForSelection(scatterMetricSelect.value);
      drawLineForSelection();

      mapMetricSelect.addEventListener("change", (event) => {
        const selected = METRICS[event.target.value];
        if (!selected) return;
        const yearData = Number.isFinite(currentYear)
          ? cachedCountryData.filter((d) => d.year === currentYear)
          : cachedAveragedData;
        const fixedDomain = getMapDomain(selected.key);
        mapHandle.updateMetric(selected.key, selected.label, yearData, fixedDomain);
      });

      scatterMetricSelect.addEventListener("change", () => {
        drawScatterForSelection(scatterMetricSelect.value);
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

window.App = {
  init,
  setDataSources,
  reload: init,
};

init();
