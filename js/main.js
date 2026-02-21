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
      
      const mapMetricSelect = document.getElementById("map-metric-select");
      const scatterMetricSelect = document.getElementById("scatter-metric-select");

      // Initialize Scatter Plot
      const scatterMetric = METRICS[DEFAULTS.scatterMetric];
      scatterMetricSelect.value = scatterMetric.key;
      ScatterView.drawScatter(
        averagedData.filter((d) => d[scatterMetric.key] !== null && d.homicide_rate !== null),
        {
          metricKey: scatterMetric.key,
          metricLabel: scatterMetric.label,
        }
      );

      // Initialize Map
      const mapMetric = METRICS[DEFAULTS.mapMetric];
      mapMetricSelect.value = mapMetric.key;
      const mapHandle = MapView.initMap(geoData, averagedData, mapMetric.key, mapMetric.label, {
        mapSelector: "#map",
        tooltipSelector: "#tooltip",
        width: 1100,
        height: 620,
      });

      // Event Listeners
      mapMetricSelect.addEventListener("change", (event) => {
        const selected = METRICS[event.target.value];
        if (!selected) return;
        mapHandle.updateMetric(selected.key, selected.label, averagedData);
      });

      scatterMetricSelect.addEventListener("change", (event) => {
        const selected = METRICS[event.target.value];
        if (!selected) return;
        ScatterView.drawScatter(
          averagedData.filter((d) => d[selected.key] !== null && d.homicide_rate !== null),
          {
            metricKey: selected.key,
            metricLabel: selected.label,
          }
        );
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
    const select = document.getElementById("map-metric-select");
    if (select) select.value = metricKey;
    init();
  },
  setScatterMetric: (metricKey) => {
    const select = document.getElementById("scatter-metric-select");
    if (select) select.value = metricKey;
    init();
  },
  reload: init,
};

init();
