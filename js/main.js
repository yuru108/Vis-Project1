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
  const viewBox = svg.attr("viewBox");
  if (viewBox) {
    const [minX, minY, width, height] = viewBox.split(" ").map(Number);
    return { width, height };
  }
  return {
    width: +svg.attr("width"),
    height: +svg.attr("height"),
  };
}

function drawScatter(data) {
  const { width, height } = getSize(scatterSvg);
  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
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
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")))
    .selectAll("text")
    .style("font-size", "20px");

  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "20px");

  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .text("GDP per capita");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Homicide rate per 100,000");

  g.append("g")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.gdp_pc))
    .attr("cy", (d) => y(d.homicide_rate))
    .attr("r", 4)
    .attr("fill", "#1f77b4")
    .attr("opacity", 0.5);

  // Calculate linear regression
  const n = data.length;
  if (n > 1) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const d of data) {
      sumX += d.gdp_pc;
      sumY += d.homicide_rate;
      sumXY += d.gdp_pc * d.homicide_rate;
      sumX2 += d.gdp_pc * d.gdp_pc;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const x1 = d3.min(data, d => d.gdp_pc);
    const x2 = d3.max(data, d => d.gdp_pc);
    const y1 = slope * x1 + intercept;
    const y2 = slope * x2 + intercept;

    g.append("line")
      .attr("x1", x(x1))
      .attr("y1", y(y1))
      .attr("x2", x(x2))
      .attr("y2", y(y2))
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5"); // Dashed line for trend
  }
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
    countries.features = countries.features.filter(d => d.properties.name !== "Antarctica");
    this.projection.fitSize([this.config.width, this.config.height], countries);

    this.chart = this.svg.append("g");
    
    // Legend Container
    this.legend = this.svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(10, ${this.config.height - 40})`);
  }

  update() {
    const countries = topojson.feature(this.geoData, this.geoData.objects.world);
    countries.features = countries.features.filter(d => d.properties.name !== "Antarctica");

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

    // Update Legend
    const legendWidth = 300;
    const legendHeight = 10;

    this.legend.selectAll("*").remove();
    this.legend.attr("transform", `translate(10, ${this.config.height - 40})`);

    const linearGradient = this.legend
      .append("defs")
      .append("linearGradient")
      .attr("id", "linear-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    linearGradient
      .selectAll("stop")
      .data(
        colorScale.ticks().map((t, i, n) => ({
          offset: `${(100 * i) / n.length}%`,
          stopColor: colorScale(t),
        }))
      )
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.stopColor);

    this.legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#linear-gradient)");

    const legendScale = d3.scaleLinear().domain(domain).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5).tickSize(5);

    this.legend
      .append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "20px");

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

function attachHomicideValues(geoData, averagedData) {
  const homicideByIso3 = new Map();

  averagedData
    .filter((d) => Number.isFinite(d.homicide_rate))
    .forEach((d) => {
      homicideByIso3.set(d.iso3, d.homicide_rate);
    });

  geoData.objects.world.geometries.forEach((d) => {
    const value = homicideByIso3.get(d.id);
    d.properties.homicide_rate = Number.isFinite(value) ? value : null;
  });
}

function calculateCountryAverages(countryData) {
  const countryGroups = d3.group(countryData, (d) => d.iso3);

  const averagedData = Array.from(countryGroups, ([iso3, values]) => {
    const validHomicide = values.filter((d) => Number.isFinite(d.homicide_rate));
    const validGdp = values.filter((d) => Number.isFinite(d.gdp_pc));

    if (validHomicide.length === 0 && validGdp.length === 0) return null;

    return {
      iso3: iso3,
      country: values[0].country,
      homicide_rate: validHomicide.length
        ? d3.mean(validHomicide, (d) => d.homicide_rate)
        : null,
      gdp_pc: validGdp.length ? d3.mean(validGdp, (d) => d.gdp_pc) : null,
    };
  }).filter((d) => d !== null);

  return averagedData;
}

Promise.all([
  d3.json("data/world.topo.json"),
  d3.csv("data/data.csv", parseRow),
])
  .then(([geoData, countryData]) => {
    const averagedData = calculateCountryAverages(countryData);

    drawScatter(averagedData.filter(d => d.gdp_pc !== null && d.homicide_rate !== null));

    attachHomicideValues(geoData, averagedData);

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
    
    choroplethMap.update();
  })
  .catch((error) => {
    console.error(error);
  });
