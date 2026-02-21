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

  function drawScatter(data, config = {}) {
    const scatterSvg = d3.select(config.selector || "#scatter");
    const { width, height } = getSize(scatterSvg);
    const margin = config.margin || { top: 40, right: 40, bottom: 60, left: 80 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const metricKey = config.metricKey || "gdp_pc";
    const metricLabel = config.metricLabel || "GDP";

    const filtered = data.filter((d) => Number.isFinite(d[metricKey]) && Number.isFinite(d.homicide_rate));
    const plotData = metricKey === "gdp_pc" ? filtered.filter((d) => d.gdp_pc > 0) : filtered;

    scatterSvg.selectAll("*").remove();

    const g = scatterSvg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    let xDomain = d3.extent(plotData, (d) => d[metricKey]);
    if (metricKey === "gdp_pc") {
      const minVal = xDomain[0];
      const maxVal = xDomain[1];
      xDomain = [minVal * 0.9, maxVal * 1.1];
    }

    const x = (metricKey === "gdp_pc" ? d3.scaleLog() : d3.scaleLinear())
      .domain(xDomain)
      .range([0, innerW]);

    if (metricKey !== "gdp_pc") {
      x.nice();
    }

    const y = d3
      .scaleLinear()
      .domain(d3.extent(plotData, (d) => d.homicide_rate))
      .nice()
      .range([innerH, 0]);

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

    g.append("g")
      .selectAll("circle")
      .data(plotData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d[metricKey]))
      .attr("cy", (d) => y(d.homicide_rate))
      .attr("r", 5)
      .attr("fill", "var(--accent-color)")
      .attr("opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("pointer-events", "all")
      .on("mouseover", function () {
        d3.select(this)
          .attr("r", 7)
          .attr("stroke-width", 2)
          .attr("opacity", 0.9);
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("r", 5)
          .attr("stroke-width", 1)
          .attr("opacity", 0.7);
      })
      .on("mousemove", (event, d) => {
        const tooltip = d3.select("#tooltip");
        tooltip
          .style("display", "block")
          .style("opacity", 1)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY + 15}px`)
          .html(`
            <strong>${d.country}</strong>
            <div>${metricLabel}: ${d[metricKey].toFixed(2)}</div>
            <div>Homicide Rate: ${d.homicide_rate.toFixed(2)}</div>
          `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none").style("opacity", 0);
      });

    const n = plotData.length;
    if (n > 1) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;
      for (const d of plotData) {
        sumX += d[metricKey];
        sumY += d.homicide_rate;
        sumXY += d[metricKey] * d.homicide_rate;
        sumX2 += d[metricKey] * d[metricKey];
      }

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const x1 = d3.min(plotData, (d) => d[metricKey]);
      const x2 = d3.max(plotData, (d) => d[metricKey]);
      const y1 = slope * x1 + intercept;
      const y2 = slope * x2 + intercept;

      g.append("line")
        .attr("x1", x(x1))
        .attr("y1", y(y1))
        .attr("x2", x(x2))
        .attr("y2", y(y2))
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.8);

      const legend = g.append("g")
        .attr("transform", `translate(${innerW - 120}, -20)`);

      legend.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 30)
        .attr("y2", 0)
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4");

      legend.append("text")
        .attr("x", 40)
        .attr("y", 4)
        .style("font-size", "18px")
        .style("font-weight", "500")
        .style("fill", "var(--text-secondary)")
        .text("Trendline");
    }
  }

  global.ScatterView = {
    drawScatter,
  };
})(window);
