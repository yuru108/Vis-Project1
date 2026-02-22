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

function init() {
  loadData()
    .then(([geoData, countryData]) => {
      const averagedData = MapView.calculateCountryAverages(countryData);

      const mapMetricSelect = document.getElementById("map-metric-select");
      const scatterMetricSelect = document.getElementById("scatter-metric-select");

      const scatterMetric = METRICS[DEFAULTS.scatterMetric];
      scatterMetricSelect.value = scatterMetric.key;

      const mapMetric = METRICS[DEFAULTS.mapMetric];
      mapMetricSelect.value = mapMetric.key;

      const mapHandle = MapView.initMap(geoData, averagedData, mapMetric.key, mapMetric.label, {
        mapSelector: "#map",
        tooltipSelector: "#tooltip",
        width: 1100,
        height: 620,
        onCountrySelect: (iso3, name) => {
          selectedIso3 = iso3;
          selectedName = name;
          renderViews();
        },
      });

      function renderViews() {
        if (selectedIso3) {
          const countryRows = countryData.filter((d) => d.iso3 === selectedIso3);
          ScatterView.drawScatter(
            countryRows.filter((d) => d[scatterMetricSelect.value] !== null && d.homicide_rate !== null),
            {
              metricKey: scatterMetricSelect.value,
              metricLabel: METRICS[scatterMetricSelect.value].label,
            }
          );
          LineChartView.drawLineChart(countryRows, { countryName: selectedName });
          mapHandle.setSelected(selectedIso3);
        } else {
          ScatterView.drawScatter(
            averagedData.filter((d) => d[scatterMetricSelect.value] !== null && d.homicide_rate !== null),
            {
              metricKey: scatterMetricSelect.value,
              metricLabel: METRICS[scatterMetricSelect.value].label,
            }
          );
          LineChartView.drawLineChart(countryData);
          mapHandle.setSelected(null);
        }
      }

      renderViews();

      mapMetricSelect.addEventListener("change", (event) => {
        const selected = METRICS[event.target.value];
        if (!selected) return;
        mapHandle.updateMetric(selected.key, selected.label, averagedData);
      });

      scatterMetricSelect.addEventListener("change", () => {
        renderViews();
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
