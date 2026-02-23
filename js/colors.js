(function (global) {
  const COLOR_CONFIG = {
    attributes: {
      homicide: {
        base: "#d73027",
        scale: d3.interpolateOrRd,
        label: "Homicide Rate",
      },
      gdp: {
        base: "#4682B4",
        scale: d3.interpolateBlues,
        label: "GDP per capita",
      },
      gini: {
        base: "#57be76",
        scale: d3.interpolateGreens,
        label: "Gini Coefficient",
      },
    },
    scatter: {
      dotDefault: "#4682B4",
      dotOpacity: 0.6,
      trendLine: {
        global: "#e45050",
        selected: "#F39C12",
      },
    },
    map: {
      defaultFill: "#eeeeee",
      stroke: "#9ca3af",
      highlightStroke: "#333333",
    },
    ui: {
      background: "#ffffff",
      textMain: "#333333",
      textSub: "#777777",
    },
  };

  global.COLOR_CONFIG = COLOR_CONFIG;
})(window);
