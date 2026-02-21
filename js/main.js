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
      const metricSelect = document.getElementById("metric-select");

      const scatterMetric = METRICS[DEFAULTS.scatterMetric];
      ScatterView.drawScatter(
        averagedData.filter((d) => d[scatterMetric.key] !== null && d.homicide_rate !== null),
        {
          metricKey: scatterMetric.key,
          metricLabel: scatterMetric.label,
        }
      );

      const mapMetric = METRICS[DEFAULTS.mapMetric];
      metricSelect.value = mapMetric.key;

      const mapHandle = MapView.initMap(geoData, averagedData, mapMetric.key, mapMetric.label, {
        mapSelector: "#map",
        tooltipSelector: "#tooltip",
        width: 1100,
        height: 620,
      });

      metricSelect.addEventListener("change", (event) => {
        const selected = METRICS[event.target.value];
        if (!selected) return;
        mapHandle.updateMetric(selected.key, selected.label, averagedData);
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

window.App = {
  init,
  setDataSources,
  setMapMetric: (metricKey) => {
    const select = document.getElementById("metric-select");
    if (select) select.value = metricKey;
    init();
  },
  reload: init,
};

init();
