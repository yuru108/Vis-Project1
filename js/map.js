(function (global) {
  const DEFAULTS = {
    mapSelector: "#map",
    tooltipSelector: "#tooltip",
    stripeFillId: "lightstripe",
    width: 1100,
    height: 620,
    tooltipPadding: 10,
    onCountrySelect: null,
  };

  const formatValue = (key, value) => {
    if (!Number.isFinite(value)) return "No data";
    if (key === "gdp_pc") return d3.format("$,.0f")(value);
    if (key === "gini") return d3.format(".1f")(value);
    return d3.format(".2f")(value);
  };

  class ChoroplethMap {
    constructor(config, geoData) {
      this.config = { ...DEFAULTS, ...config };
      this.geoData = geoData;
      this.svg = d3.select(this.config.mapSelector);
      this.tooltip = d3.select(this.config.tooltipSelector);
      this.selectedIso3 = null;
      this.fixedDomain = this.config.fixedDomain || null;

      this.projection = d3.geoMercator();
      this.geoPath = d3.geoPath().projection(this.projection);

      const countries = topojson.feature(this.geoData, this.geoData.objects.world);
      countries.features = countries.features.filter((d) => d.properties.name !== "Antarctica");
      this.projection.fitSize([this.config.width, this.config.height], countries);

      this.chart = this.svg.append("g");

      this.legend = this.svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, ${this.config.height - 60})`);

      this.svg.on("click", () => {
        if (this.config.onCountrySelect) {
          this.setSelected(null);
          this.config.onCountrySelect(null, null);
        }
      });
    }

    setSelected(iso3) {
      this.selectedIso3 = iso3;
      this.chart
        .selectAll(".country")
        .classed("selected", (d) => d.id === this.selectedIso3);
    }

    update(metricKey, metricLabel, fixedDomain = null) {
      const countries = topojson.feature(this.geoData, this.geoData.objects.world);
      countries.features = countries.features.filter((d) => d.properties.name !== "Antarctica");

      const values = this.geoData.objects.world.geometries
        .map((d) => d.properties.metric_value)
        .filter((d) => Number.isFinite(d));

      const extent = d3.extent(values);
      const stableDomain = fixedDomain || this.fixedDomain;
      const domain = Array.isArray(stableDomain) && Number.isFinite(stableDomain[0]) && Number.isFinite(stableDomain[1])
        ? stableDomain
        : Number.isFinite(extent[0]) && Number.isFinite(extent[1])
          ? extent[0] === extent[1]
            ? [extent[0], extent[0] + 1]
            : extent
          : [0, 1];

      const scaleMap = {
        homicide_rate: COLOR_CONFIG.attributes.homicide.scale,
        gdp_pc: COLOR_CONFIG.attributes.gdp.scale,
        gini: COLOR_CONFIG.attributes.gini.scale,
      };
      const domainMin = Array.isArray(domain) && Number.isFinite(domain[0]) ? domain[0] : 0;
      const domainMax = Array.isArray(domain) && Number.isFinite(domain[1]) ? domain[1] : 1;

      const colorScale = d3
        .scaleSequential(scaleMap[metricKey] || d3.interpolateBlues)
        .domain([domainMin, domainMax]);

      const legendWidth = 300;
      const legendHeight = 10;

      this.legend.selectAll("*").remove();
      this.legend.attr("transform", `translate(20, ${this.config.height - 60})`);

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
          colorScale.ticks(6).map((t, i, n) => ({
            offset: `${(100 * i) / (n.length - 1)}%`,
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
        .style("fill", "url(#linear-gradient)")
        .attr("rx", 2)
        .attr("ry", 2);

      const legendScale = d3
        .scaleLinear()
        .domain([domainMin, domainMax])
        .range([0, legendWidth]);
      const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickSize(5)
        .tickFormat(d3.format("~s"));

      this.legend
        .append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "16px")
        .style("fill", "var(--text-secondary)");

      this.legend.selectAll(".domain, .tick line")
        .style("stroke", "var(--border-color)");

      this.legend
        .append("text")
        .attr("x", 0)
        .attr("y", -8)
        .style("font-size", "18px")
        .style("font-weight", "500")
        .style("fill", "var(--text-primary)")
        .text(metricLabel);

      const countryPath = this.chart
        .selectAll(".country")
        .data(countries.features)
        .join("path")
        .attr("class", "country")
        .classed("selected", (d) => d.id === this.selectedIso3)
        .attr("d", this.geoPath)
        .attr("stroke", COLOR_CONFIG.map.stroke)
        .attr("stroke-width", 0.5)
        .attr("fill", (d) => {
          const value = d.properties.metric_value;
          if (Number.isFinite(value)) {
            return colorScale(value);
          }
          return COLOR_CONFIG.map.defaultFill;
        })
        .style("transition", "fill 0.3s ease, opacity 0.2s ease")
        .style("pointer-events", "all")
        .on("mouseover", function () {
          d3.select(this)
            .style("opacity", 0.8)
            .attr("stroke-width", 1.5)
            .attr("stroke", COLOR_CONFIG.map.highlightStroke);
        })
        .on("mouseout", function () {
          d3.select(this)
            .style("opacity", 1)
            .attr("stroke-width", 0.5)
            .attr("stroke", COLOR_CONFIG.map.stroke);
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          const nextIso = this.selectedIso3 === d.id ? null : d.id;
          this.setSelected(nextIso);
          if (this.config.onCountrySelect) {
            this.config.onCountrySelect(nextIso, d.properties.name);
          }
        });

      countryPath
        .on("mousemove", (event, d) => {
          const metricValue = formatValue(metricKey, d.properties.metric_value);
          const homicideValue = formatValue("homicide_rate", d.properties.homicide_rate);
          const gdpValue = formatValue("gdp_pc", d.properties.gdp_pc);
          const giniValue = formatValue("gini", d.properties.gini);

          this.tooltip
            .style("display", "block")
            .style("opacity", 1)
            .style("left", `${event.pageX + this.config.tooltipPadding}px`)
            .style("top", `${event.pageY + this.config.tooltipPadding}px`)
            .html(`
            <strong>${d.properties.name}</strong>
            <div>${metricLabel}: ${metricValue}</div>
            <div>Homicide rate: ${homicideValue}</div>
            <div>GDP per capita: ${gdpValue}</div>
            <div>Gini: ${giniValue}</div>
          `);
        })
        .on("mouseleave", () => {
          this.tooltip.style("display", "none").style("opacity", 0);
        });
    }
  }

  function attachMetricValues(geoData, averagedData, metricKey) {
    const valueByIso3 = new Map();

    averagedData.forEach((d) => {
      if (Number.isFinite(d[metricKey])) {
        valueByIso3.set(d.iso3, d[metricKey]);
      }
    });

    geoData.objects.world.geometries.forEach((d) => {
      const value = valueByIso3.get(d.id);
      d.properties.metric_value = Number.isFinite(value) ? value : null;
    });

    const extraByIso = new Map(
      averagedData.map((d) => [d.iso3, d])
    );

    geoData.objects.world.geometries.forEach((d) => {
      const extra = extraByIso.get(d.id);
      d.properties.homicide_rate = extra ? extra.homicide_rate : null;
      d.properties.gdp_pc = extra ? extra.gdp_pc : null;
      d.properties.gini = extra ? extra.gini : null;
    });
  }

  function calculateCountryAverages(countryData) {
    const countryGroups = d3.group(countryData, (d) => d.iso3);

    return Array.from(countryGroups, ([iso3, values]) => {
      const validHomicide = values.filter((d) => Number.isFinite(d.homicide_rate));
      const validGdp = values.filter((d) => Number.isFinite(d.gdp_pc));
      const validGini = values.filter((d) => Number.isFinite(d.gini));

      if (validHomicide.length === 0 && validGdp.length === 0 && validGini.length === 0) return null;

      return {
        iso3,
        country: values[0].country,
        homicide_rate: validHomicide.length
          ? d3.mean(validHomicide, (d) => d.homicide_rate)
          : null,
        gdp_pc: validGdp.length ? d3.mean(validGdp, (d) => d.gdp_pc) : null,
        gini: validGini.length ? d3.mean(validGini, (d) => d.gini) : null,
      };
    }).filter((d) => d !== null);
  }

  function initMap(geoData, averagedData, metricKey, metricLabel, config = {}) {
    attachMetricValues(geoData, averagedData, metricKey);

    const choroplethMap = new ChoroplethMap(config, geoData);
    choroplethMap.update(metricKey, metricLabel, config.fixedDomain || null);

    return {
      choroplethMap,
      setSelected: (iso3) => choroplethMap.setSelected(iso3),
      updateMetric(nextKey, nextLabel, data, fixedDomain = null) {
        attachMetricValues(geoData, data, nextKey);
        choroplethMap.update(nextKey, nextLabel, fixedDomain);
      },
    };
  }

  global.MapView = {
    initMap,
    calculateCountryAverages,
    attachMetricValues,
  };
})(window);
