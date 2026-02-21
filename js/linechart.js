const LineChartView = (function () {
  function drawLineChart(data, options = {}) {
    const {
      selector = "#linechart",
      width = 1500,
      height = 200,
      margin = { top: 15, right: 180, bottom: 40, left: 70 },
    } = options;

    const svg = d3.select(selector);
    svg.selectAll("*").remove();

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = Array.from(new Set(data.map((d) => d.year))).sort(d3.ascending);

    const yearlyData = years.map(year => {
      const yearData = data.filter(d => d.year === year);

      const avgGdp = d3.mean(yearData.filter(d => d.gdp_pc != null), d => d.gdp_pc);
      const avgGini = d3.mean(yearData.filter(d => d.gini != null), d => d.gini);
      const avgHomicide = d3.mean(yearData.filter(d => d.homicide_rate != null), d => d.homicide_rate);

      return {
        year: year,
        gdp_pc: avgGdp,
        gini: avgGini,
        homicide_rate: avgHomicide
      };
    }).filter(d => d.gdp_pc != null && d.gini != null && d.homicide_rate != null);

    const metrics = [
      { key: "gdp_pc", label: "GDP per capita", color: "#2563eb" },
      { key: "gini", label: "Gini coefficient", color: "#10b981" },
      { key: "homicide_rate", label: "Homicide rate", color: "#ef4444" }
    ];

    const normalizedData = yearlyData.map(d => {
      const nd = { year: d.year };
      metrics.forEach(m => {
        const min = d3.min(yearlyData, yd => yd[m.key]);
        const max = d3.max(yearlyData, yd => yd[m.key]);
        nd[m.key] = max > min ? ((d[m.key] - min) / (max - min)) * 100 : 50;
        nd[`${m.key}_raw`] = d[m.key];
      });
      return nd;
    });

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(normalizedData, (d) => d.year))
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => d + "%").ticks(5);

    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat("").ticks(10))
      .selectAll("line")
      .attr("stroke", "var(--border-color)")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.8);

    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat("").ticks(5))
      .selectAll("line")
      .attr("stroke", "var(--border-color)")
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.8);

    g.selectAll(".grid .domain").remove();

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "18px")
      .style("fill", "var(--text-secondary)");

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "18px")
      .style("fill", "var(--text-secondary)");

    g.selectAll(".domain").attr("stroke", "var(--border-color)");
    g.selectAll(".tick line").attr("stroke", "var(--border-color)");

    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    metrics.forEach(metric => {
      const lineData = normalizedData.map(d => ({
        year: d.year,
        value: d[metric.key],
        raw: d[`${metric.key}_raw`]
      }));

      const path = g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", metric.color)
        .attr("stroke-width", 3)
        .attr("d", line);

      const totalLength = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

      g.selectAll(`.dot-${metric.key}`)
        .data(lineData)
        .enter()
        .append("circle")
        .attr("class", `dot-${metric.key}`)
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.value))
        .attr("r", 4)
        .attr("fill", metric.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("opacity", 0)
        .transition()
        .delay(2000)
        .duration(500)
        .style("opacity", 1);
    });

    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth + 20}, 10)`);

    metrics.forEach((metric, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 28})`);

      legendRow.append("line")
        .attr("x1", 0)
        .attr("y1", 5)
        .attr("x2", 20)
        .attr("y2", 5)
        .attr("stroke", metric.color)
        .attr("stroke-width", 3);

      legendRow.append("circle")
        .attr("cx", 10)
        .attr("cy", 5)
        .attr("r", 4)
        .attr("fill", metric.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      legendRow.append("text")
        .attr("x", 30)
        .attr("y", 10)
        .text(metric.label)
        .attr("font-size", "16px")
        .attr("font-family", "Inter")
        .attr("fill", "var(--text-primary)");
    });

    const tooltip = d3.select("#tooltip");
    const focusLine = g.append("line")
      .attr("class", "focus-line")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .style("opacity", 0);

    const overlay = g.append("rect")
      .attr("class", "overlay")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    overlay
      .on("mouseover", () => {
        focusLine.style("opacity", 1);
        tooltip.style("display", "block").style("opacity", 1);
      })
      .on("mouseout", () => {
        focusLine.style("opacity", 0);
        tooltip.style("display", "none").style("opacity", 0);
      })
      .on("mousemove", (event) => {
        const x0 = xScale.invert(d3.pointer(event)[0]);

        const bisect = d3.bisector(d => d.year).left;
        const i = bisect(normalizedData, x0, 1);
        const d0 = normalizedData[i - 1];
        const d1 = normalizedData[i];

        let d = d0;
        if (d1 && d0) {
          d = x0 - d0.year > d1.year - x0 ? d1 : d0;
        } else if (d1) {
          d = d1;
        }

        const xPos = xScale(d.year);
        focusLine.attr("x1", xPos).attr("x2", xPos);

        const formatValue = (val, key) => {
          if (key === "gdp_pc") return d3.format("$,.0f")(val);
          if (key === "gini") return d3.format(".1f")(val);
          return d3.format(".2f")(val);
        };

        tooltip.html(`
          <strong>Year: ${d.year}</strong>
          ${metrics.map(m => `
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${m.color};"></span>
              <span style="color: var(--text-secondary); ">${m.label}:</span>
              <span style="font-weight: 600; color: var(--text-primary); margin-left: auto; ">${formatValue(d[`${m.key}_raw`], m.key)}</span>
            </div>
          `).join("")}
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
      });
  }

  return {
    drawLineChart,
  };
})();

