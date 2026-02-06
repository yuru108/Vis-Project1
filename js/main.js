const scatterSvg = d3.select("#scatter");
const histHomicideSvg = d3.select("#hist-homicide");
const histGdpSvg = d3.select("#hist-gdp");

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

function drawHistogram(svg, values, xLabel) {
  const { width, height } = getSize(svg);
  const margin = { top: 20, right: 20, bottom: 50, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  svg.selectAll("*").remove();

  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(values))
    .nice()
    .range([0, innerW]);

  const bins = d3
    .bin()
    .domain(x.domain())
    .thresholds(30)(values);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
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
    .text(xLabel);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Count");

  g.append("g")
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", (d) => innerH - y(d.length))
    .attr("fill", "#ff7f0e")
    .attr("opacity", 0.8);
}

async function init() {
  const data = await d3.csv("data/data.csv", parseRow);
  drawScatter(data);
  drawHistogram(
    histHomicideSvg,
    data.map((d) => d.homicide_rate),
    "Homicide rate per 100,000"
  );
  drawHistogram(
    histGdpSvg,
    data.map((d) => d.gdp_pc),
    "GDP per capita"
  );
}

init();
