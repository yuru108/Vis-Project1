const scatterSvg = d3.select("#scatter");
const tooltipPadding = 10;

const parseRow = (d) => ({
  country: d.country,
  iso3: d.iso3,
  year: +d.year,
  region: d.region,
  gdp_pc: +d.gdp_pc,
  homicide_rate: +d.homicide_rate,
});

function getSize(svg) {
  return {
    width: +svg.attr("width"),
    height: +svg.attr("height"),
  };
}

function drawScatter(data) {
  const { width, height } = getSize(scatterSvg);
  const margin = { top: 20, right: 20, bottom: 50, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  scatterSvg.selectAll("*").remove();

  const g = scatterSvg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.gdp_pc))
    .nice()
    .range([0, innerW]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.homicide_rate))
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("transform", `translate(0, ${innerH})`)
    .call(d3.axisBottom(x));

  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .text("GDP per capita");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Homicide rate per 100,000");

  g.append("g")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.gdp_pc))
    .attr("cy", (d) => y(d.homicide_rate))
    .attr("r", 2)
    .attr("fill", "#1f77b4")
    .attr("opacity", 0.5);
}

class ChoroplethMap {
  constructor(config, geoData) {
    this.config = {
      parentElement: config.parentElement,
      tooltipElement: config.tooltipElement,
      width: config.width || 1100,
      height: config.height || 620,
      tooltipPadding: config.tooltipPadding || 10,
    };

    this.geoData = geoData;
    this.svg = d3.select(this.config.parentElement);
    this.tooltip = d3.select(this.config.tooltipElement);

    this.projection = d3.geoMercator();
    this.geoPath = d3.geoPath().projection(this.projection);

    const countries = topojson.feature(this.geoData, this.geoData.objects.world);
    this.projection.fitSize([this.config.width, this.config.height], countries);

    this.chart = this.svg.append("g");
  }

  update() {
    const countries = topojson.feature(this.geoData, this.geoData.objects.world);

    const values = this.geoData.objects.world.geometries
      .map((d) => d.properties.homicide_rate)
      .filter((d) => Number.isFinite(d));

    const extent = d3.extent(values);
    const domain =
      Number.isFinite(extent[0]) && Number.isFinite(extent[1])
        ? extent[0] === extent[1]
          ? [extent[0], extent[0] + 1]
          : extent
        : [0, 1];

    const colorScale = d3
      .scaleLinear()
      .range(["#cfe2f2", "#0d306b"])
      .domain(domain)
      .interpolate(d3.interpolateHcl);

    const countryPath = this.chart
      .selectAll(".country")
      .data(countries.features)
      .join("path")
      .attr("class", "country")
      .attr("d", this.geoPath)
      .attr("stroke", "#555")
      .attr("stroke-width", 0.4)
      .attr("fill", (d) => {
        const value = d.properties.homicide_rate;
        if (Number.isFinite(value)) {
          return colorScale(value);
        }
        return "url(#lightstripe)";
      });

    countryPath
      .on("mousemove", (event, d) => {
        const rate = Number.isFinite(d.properties.homicide_rate)
          ? `${d.properties.homicide_rate.toFixed(2)}`
          : "No data available";

        this.tooltip
          .style("display", "block")
          .style("left", `${event.pageX + this.config.tooltipPadding}px`)
          .style("top", `${event.pageY + this.config.tooltipPadding}px`)
          .html(`
            <div><strong>${d.properties.name}</strong></div>
            <div>${rate}</div>
          `);
      })
      .on("mouseleave", () => {
        this.tooltip.style("display", "none");
      });
  }
}

function attachHomicideValues(geoData, countryData, selectedYear) {
  const homicideByIso3 = new Map();

  countryData
    .filter((d) => d.year === selectedYear && Number.isFinite(d.homicide_rate))
    .forEach((d) => {
      homicideByIso3.set(d.iso3, d.homicide_rate);
    });

  geoData.objects.world.geometries.forEach((d) => {
    const value = homicideByIso3.get(d.id);
    d.properties.homicide_rate = Number.isFinite(value) ? value : null;
  });
}

function getYears(countryData) {
  return Array.from(new Set(countryData.map((d) => d.year))).sort((a, b) => a - b);
}

function getBestCoverageYear(countryData) {
  const yearCounts = d3.rollups(
    countryData.filter((d) => Number.isFinite(d.homicide_rate)),
    (v) => v.length,
    (d) => d.year
  );

  return yearCounts.sort((a, b) => d3.descending(a[1], b[1]))[0][0];
}

Promise.all([d3.json("data/world.topo.json"), d3.csv("data/data.csv", parseRow)])
  .then(([geoData, countryData]) => {
    drawScatter(countryData);

    const yearSelect = d3.select("#year-select");
    const years = getYears(countryData);
    const defaultYear = getBestCoverageYear(countryData);

    yearSelect
      .selectAll("option")
      .data(years)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d);

    yearSelect.property("value", defaultYear);

    const choroplethMap = new ChoroplethMap(
      {
        parentElement: "#map",
        tooltipElement: "#tooltip",
        width: 1100,
        height: 620,
        tooltipPadding,
      },
      geoData
    );

    function update(year) {
      attachHomicideValues(geoData, countryData, +year);
      choroplethMap.update();
    }

    update(defaultYear);

    yearSelect.on("change", (event) => {
      update(event.target.value);
    });
  })
  .catch((error) => {
    console.error(error);
  });
