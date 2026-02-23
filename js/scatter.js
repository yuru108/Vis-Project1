(function (global) {
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

  function buildLogTicks(min, max) {
    const minPow = Math.floor(Math.log10(min));
    const maxPow = Math.ceil(Math.log10(max));
    const ticks = [];
    for (let p = minPow; p <= maxPow; p += 1) {
      ticks.push(10 ** p);
    }
    return ticks.filter((t) => t >= min && t <= max);
  }

  function computeTrendline(data, metricKey) {
    const n = data.length;
    if (n <= 1) return null;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    for (const d of data) {
      sumX += d[metricKey];
      sumY += d.homicide_rate;
      sumXY += d[metricKey] * d.homicide_rate;
      sumX2 += d[metricKey] * d[metricKey];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  function drawScatter(data, config = {}) {
    const scatterSvg = d3.select(config.selector || "#scatter");
    const { width, height } = getSize(scatterSvg);
    const margin = config.margin || { top: 40, right: 40, bottom: 60, left: 80 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const metricKey = config.metricKey || "gdp_pc";
    const metricLabel = config.metricLabel || "GDP";
    const highlightIso3 = config.highlightIso3 || null;

    const filtered = data.filter((d) => Number.isFinite(d[metricKey]) && Number.isFinite(d.homicide_rate));
    const plotData = metricKey === "gdp_pc" ? filtered.filter((d) => d.gdp_pc > 0) : filtered;

    scatterSvg.selectAll("*").remove();

    const g = scatterSvg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let xDomain = config.xDomain || d3.extent(plotData, (d) => d[metricKey]);
    let yDomain = config.yDomain || d3.extent(plotData, (d) => d.homicide_rate);

    if (!config.xDomain && metricKey === "gdp_pc") {
      const minVal = xDomain[0];
      const maxVal = xDomain[1];
      xDomain = [minVal * 0.9, maxVal * 1.1];
    }

    const x = (metricKey === "gdp_pc" ? d3.scaleLog() : d3.scaleLinear())
      .domain(xDomain)
      .range([0, innerW]);

    if (metricKey !== "gdp_pc" && !config.xDomain) {
      x.nice();
    }

    const y = d3
      .scaleLinear()
      .domain(yDomain)
      .range([innerH, 0]);

    if (!config.yDomain) {
      y.nice();
    }

    const xAxis = d3.axisBottom(x).tickFormat(d3.format("~s"));
    if (metricKey === "gdp_pc") {
      const [minX, maxX] = x.domain();
      const ticks = buildLogTicks(minX, maxX);
      xAxis.tickValues(ticks);
    } else {
      xAxis.ticks(5);
    }

    g.append("g")
      .attr("class", "grid-lines")
      .call(d3.axisLeft(y)
        .tickSize(-innerW)
        .tickFormat("")
      )
      .selectAll("line")
      .attr("stroke", "var(--border-color)")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.8);

    const xGridAxis = d3.axisBottom(x)
      .tickSize(-innerH)
      .tickFormat("");

    if (metricKey === "gdp_pc") {
      const [minX, maxX] = x.domain();
      xGridAxis.tickValues(buildLogTicks(minX, maxX));
    } else {
      xGridAxis.ticks(5);
    }

    g.append("g")
      .attr("class", "grid-lines")
      .attr("transform", `translate(0, ${innerH})`)
      .call(xGridAxis)
      .selectAll("line")
      .attr("stroke", "var(--border-color)")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.8);

    g.selectAll(".grid-lines .domain").style("display", "none");

    g.append("g")
      .attr("transform", `translate(0, ${innerH})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "18px")
      .style("fill", "var(--text-secondary)");

    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "18px")
      .style("fill", "var(--text-secondary)");

    g.selectAll(".domain").attr("stroke", "var(--border-color)");
    g.selectAll(".tick line").attr("stroke", "var(--border-color)");

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 45)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "500")
      .style("fill", "var(--text-primary)")
      .text(metricLabel);

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "500")
      .style("fill", "var(--text-primary)")
      .text("Homicide rate per 100,000");

    const hasHighlight = Boolean(highlightIso3);

    g.append("g")
      .selectAll("circle")
      .data(plotData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d[metricKey]))
      .attr("cy", (d) => y(d.homicide_rate))
      .attr("r", (d) => (hasHighlight && d.iso3 === highlightIso3 ? 6 : 4))
      .attr("fill", (d) => {
        if (!hasHighlight) return "var(--accent-color)";
        return d.iso3 === highlightIso3 ? "var(--accent-color)" : "#d1d5db";
      })
      .attr("opacity", (d) => {
        if (!hasHighlight) return 0.7;
        return d.iso3 === highlightIso3 ? 0.9 : 0.35;
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", (d) => (hasHighlight && d.iso3 === highlightIso3 ? 2 : 1))
      .style("pointer-events", (d) => (hasHighlight && d.iso3 !== highlightIso3 ? "none" : "all"))
      .on("mouseover", function (event, d) {
        if (hasHighlight && d.iso3 !== highlightIso3) return;
        d3.select(this)
          .attr("r", 7)
          .attr("stroke-width", 2)
          .attr("opacity", 0.9);
      })
      .on("mouseout", function (event, d) {
        if (hasHighlight && d.iso3 !== highlightIso3) return;
        const isHighlight = hasHighlight && d.iso3 === highlightIso3;
        d3.select(this)
          .attr("r", isHighlight ? 6 : 4)
          .attr("stroke-width", isHighlight ? 2 : 1)
          .attr("opacity", hasHighlight ? (isHighlight ? 0.9 : 0.35) : 0.7);
      })
      .on("mousemove", (event, d) => {
        if (hasHighlight && d.iso3 !== highlightIso3) return;
        const tooltip = d3.select("#tooltip");
        const yearText = Number.isFinite(d.year) ? `Year: ${d.year}` : "Year: N/A";
        tooltip
          .style("display", "block")
          .style("opacity", 1)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY + 15}px`)
          .html(`
            <strong>${d.country}</strong>
            <div>${yearText}</div>
            <div>${metricLabel}: ${d[metricKey].toFixed(2)}</div>
            <div>Homicide Rate: ${d.homicide_rate.toFixed(2)}</div>
          `);
      })
      .on("mouseleave", (event, d) => {
        if (hasHighlight && d.iso3 !== highlightIso3) return;
        d3.select("#tooltip").style("display", "none").style("opacity", 0);
      });

    if (hasHighlight) {
      g.selectAll("circle")
        .filter((d) => d.iso3 === highlightIso3)
        .raise();
    }

    const overallTrend = computeTrendline(plotData, metricKey);
    const extendPx = 16;
    if (overallTrend) {
      const x1 = d3.min(plotData, (d) => d[metricKey]);
      const x2 = d3.max(plotData, (d) => d[metricKey]);
      const x1e = x.invert(x(x1) - extendPx);
      const x2e = x.invert(x(x2) + extendPx);
      const y1 = overallTrend.slope * x1e + overallTrend.intercept;
      const y2 = overallTrend.slope * x2e + overallTrend.intercept;

      g.append("line")
        .attr("x1", x(x1e))
        .attr("y1", y(y1))
        .attr("x2", x(x2e))
        .attr("y2", y(y2))
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,3")
        .attr("opacity", 0.95);
    }

    if (hasHighlight) {
      const highlightData = plotData.filter((d) => d.iso3 === highlightIso3);
      const highlightTrend = computeTrendline(highlightData, metricKey);
      if (highlightTrend) {
        const x1 = d3.min(highlightData, (d) => d[metricKey]);
        const x2 = d3.max(highlightData, (d) => d[metricKey]);
        const x1e = x.invert(x(x1) - extendPx * 1.5);
        const x2e = x.invert(x(x2) + extendPx * 1.5);
        const y1 = highlightTrend.slope * x1e + highlightTrend.intercept;
        const y2 = highlightTrend.slope * x2e + highlightTrend.intercept;

        g.append("line")
          .attr("x1", x(x1e))
          .attr("y1", y(y1))
          .attr("x2", x(x2e))
          .attr("y2", y(y2))
          .attr("stroke", "#facc15")
          .attr("stroke-width", 3.5)
          .attr("stroke-dasharray", "4,3")
          .attr("opacity", 1);
      }
    }

    const legend = g.append("g")
      .attr("class", "trendline-legend")
      .attr("transform", `translate(${innerW - 10}, 10)`);

    legend.append("line")
      .attr("x1", -28)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 0)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,3");

    legend.append("text")
      .attr("x", -36)
      .attr("y", 4)
      .attr("text-anchor", "end")
      .style("font-size", "18px")
      .style("fill", "var(--text-secondary)")
      .text("Overall trend");

    const selectedLegendOpacity = hasHighlight ? 1 : 0;

    legend.append("line")
      .attr("x1", -28)
      .attr("y1", 24)
      .attr("x2", 0)
      .attr("y2", 24)
      .attr("stroke", "#facc15")
      .attr("stroke-width", 3.5)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", selectedLegendOpacity);

    legend.append("text")
      .attr("x", -36)
      .attr("y", 30)
      .attr("text-anchor", "end")
      .style("font-size", "18px")
      .style("fill", "var(--text-secondary)")
      .attr("opacity", selectedLegendOpacity)
      .text("Selected country");
  }

  global.ScatterView = {
    drawScatter,
  };
})(window);
