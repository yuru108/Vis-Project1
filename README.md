# Crime, Economy, and Inequality

> Yu Jou Chang  
> Application: https://yuru108.github.io/Vis-Project1/  
> Github: https://github.com/yuru108/Vis-Project1  

![image](https://hackmd.io/_uploads/S1Pe_p3O-e.png)

![ezgif-706098c6590009f9 (1)](https://hackmd.io/_uploads/ryJI8hj_be.gif)

---

## Motivation

We often assume that "the wealthier and more advanced a country is, the safer it is," but is this truly the case? Is the crime rate directly correlated with "economic conditions"? Or are there other factors that actually influence public safety?

### Data

#### [[Homicide rate per 100,000 population]](https://ourworldindata.org/grapher/homicide-rate-unodc?country=ECU~JAM~COL~RUS)

Because the definition of general crime varies from country to country, using the overall "crime rate" may not fairly represent the security situation across different regions. Therefore, I decided to use the "Homicide Rate"—the most representative type of crime—as the benchmark to evaluate the crime level in different locations.

This data comes from the UNODC. They explicitly state that "All killings that meet the criteria listed below are to be considered intentional homicides, irrespective of definitions provided by national legislations or practices," ensuring that we obtain the most unbiased and comprehensive data.

#### [[GDP per capita]](https://ourworldindata.org/grapher/gdp-per-capita-worldbank)

GDP is an indicator that measures average income. It helps us understand the economic disparities and living standards between different countries and across different time periods. Thus, we can use GDP as an indicator of a "country's wealth" to serve as our first benchmark for comparison.

This data is sourced from the World Bank and is expressed in constant international dollars to adjust for inflation and differences in the cost of living across regions.

#### [[Income inequality: Gini coefficient]](https://ourworldindata.org/grapher/economic-inequality-gini-index)

Unlike GDP, the Gini coefficient assesses the level of economic inequality within each country. When relying solely on GDP, there can be situations where "a specific group of people has an extremely high income, skewing the GDP upwards," even if the actual average living standard has not reached that level. This can lead to a misjudgment of a country's overall economic well-being. Therefore, I decided to include the Gini coefficient as a second benchmark to examine which factor has a more significant impact on the crime rate.

This data is also sourced from the World Bank. The value ranges from 0 to 1, where a value closer to 1 indicates a higher degree of inequality and a larger wealth gap.

---

## Design Sketches

### Ver. 1

This was the initial wireframe for the dashboard. The primary concept was to utilize a map to illustrate regional disparities in crime rates, paired with a line chart at the bottom to track and select yearly trends. A sidebar was included on the right side to display detailed metrics for a specific country, alongside interactive buttons for toggling between different data variables.

![image](https://hackmd.io/_uploads/ByvV8Bcdbg.png)

### Ver. 2

As I explored the dataset, I realized that relying solely on a map and a line chart made it difficult to intuitively grasp the correlations between different variables. To address this, I introduced a scatter plot into the main layout to explicitly show these relationships.

To make room for the scatter plot and keep the interface clean, I removed the static sidebar and moved the detailed country information into hover tooltips. Furthermore, since aggregating and visualizing data for a selected "range of years" simultaneously presented significant visual and technical challenges, I adjusted the timeline interaction from a brush selection (range) to a single-year selection point.

![image](https://hackmd.io/_uploads/ByyoOrcd-l.png)

---

## Preprocessing

For this project, I used Python's `pandas` library for data preprocessing.

1. **Standardize column names**: Ensured consistent naming conventions across all datasets for easier merging.
2. **Align timeframes**: Took the intersection of years from the three datasets, retaining only the common overlapping period.
3. **Strict merging**: Applied an inner join to keep only the records that have complete data across all three metrics, effectively filtering out any missing values.

---

## Visualization Components & Interactions

### World Map

![ezgif-46e1c2fb85ae719b](https://hackmd.io/_uploads/rJOFPhjOWe.gif)

#### Design Purpose:
To enable quick spatial comparisons of countries across different metrics.

#### Visual Design:

- Utilizes a sequential, orange-red color palette for the Homicide Rate, intuitively signaling that "darker red equates to higher danger."
- Employs highly contrasting blue and green palettes for GDP and Gini, respectively, to ensure clear visual distinction.
- Features a continuous color gradient with a corresponding legend and numerical scale anchored in the bottom-left corner.

#### Interactive Features:

- A top dropdown menu allows users to toggle the map's metric between **Homicide Rate**, **GDP**, and **Gini**.
- Hovering over a country triggers a tooltip displaying detailed information.
- Clicking on a country selects or deselects it, seamlessly synchronizing the other charts to focus specifically on the chosen country.

### Scatter Plot & Correlation

![ezgif-4a9d3771700178e8](https://hackmd.io/_uploads/S107Y2sd-x.gif)

#### Design Purpose:
To explicitly examine the correlation between the Homicide Rate and either GDP or the Gini coefficient.

#### Visual Design:

- When specific data is selected, unselected data points fade out, while the global trendline remains visible for baseline comparison. Faded points do not trigger tooltips.
- The combination of blue data points against a red global trendline accelerates the user's understanding of the overall correlation.
- The trendline for the currently selected data is highlighted in yellow with a thicker stroke weight for maximum visibility.

#### Interactive Features:

- A top-right dropdown menu toggles the X-axis metric between GDP and Gini.
- Hovering over data point triggers a tooltip displaying detailed information.
- Selecting a specific country on the World Map highlights its corresponding data points and renders its unique trendline in the scatter plot.
- Selecting a specific year on the timeline highlights the data distribution specifically for that year.

### Timeline

![ezgif-1b5665ef686e2d0d](https://hackmd.io/_uploads/HJUKijqOWx.gif)

#### Design Purpose:
To observe the macroscopic trends of the three metrics over time and allow users to select a specific year to synchronously update the map and scatter plot.

#### Visual Design:

- Features three distinct lines representing Homicide Rate, GDP, and Gini.
- Because the three metrics have vastly different dimensions and units, the lines are plotted on a normalized 0–100 scale, allowing for direct comparison within the same chart.
- A legend on the right side maps colors to their respective metrics.

#### Interactive Features:

- Hovering over the timeline reveals a tooltip showing the specific year alongside the values for all three metrics.
- Clicking to select a specific year triggers a synchronized update across both the map and the scatter plot to reflect that exact year's data.
- Clicking the same year again deselects it, reverting the dashboard to an "all-years average" overview mode.

---

## Discoveries

### Does GDP strictly dictate safety?

The scatter plot reveals a classic "L-shaped" distribution. While high-income nations are consistently safe, countries in the lower-income bracket (GDP < $20k) exhibit extreme variance in their homicide rates. This clearly demonstrates that absolute poverty alone does not inevitably lead to high crime.

![image](https://hackmd.io/_uploads/SJ5Z1aoubg.png)

### The Power of Inequality (Gini)

Toggling the X-axis to the Gini coefficient reveals a much clearer positive correlation. This suggests that in many nations, the "relative deprivation" caused by uneven wealth distribution is often a stronger catalyst for severe violent crime than simple economic hardship.

![image](https://hackmd.io/_uploads/rJ-Aos5ubg.png)

---

## Architecture & Implementation

### Libraries

- **D3.js v7**: The core library used for binding data and rendering the map, scatter plot, line chart, and handling all complex SVG interactions.
- **topojson-client**: Used to parse the world.topo.json file and convert it into GeoJSON format to draw the world map borders.
- **Google Fonts (Inter)**: Applied for clean, modern, and highly legible typography across the dashboard UI.

### Structure

Vis-Project1/  
├─ index.html  
├─ README.md  
├─ package.json  
├─ css/  
│  └─ style.css  
├─ data/  
│  ├─ data.csv  
│  └─ world.topo.json  
├─ js/  
│  ├─ main.js  
│  ├─ map.js  
│  ├─ scatter.js  
│  ├─ linechart.js  
│  └─ colors.js  
└─ scripts/  
   └─ preprocess.py  
   
### How to Access & Run

- Direct Access: Open [this page](https://yuru108.github.io/Vis-Project1/)
- Local Execution:
    1. Clone the repo from [Github](https://github.com/yuru108/Vis-Project1)
    2. From the project root, run `npm run start`
    3. Open the local URL shown in the terminal

### Overall Data Flow & State Management

- **Asynchronous Initialization**: Upon loading, the system uses Promise.all to fetch both the geographical boundaries (world.geojson) and the preprocessed dataset (data.csv) simultaneously. A global "All-Years Average" dataset is calculated immediately to serve as the default view.
- **Global State Variables**: The application's state is centrally managed using global variables, primarily `currentYear` (the currently selected year) and `selectedIso3` (the currently selected country).

### Interaction-Driven Data Flow

#### Metric Switching (World Map & Scatter Plot)

![image](https://hackmd.io/_uploads/BJnugZ2OZe.png)

- Trigger: Toggle the primary metric via the dropdown menus
- Processing:
    1. Switch the active data key (e.g., gdp_pc ↔ gini) and pull the precomputed global domain to keep scales consistent across years
    2. Recompute scales and redraw the view with the new metric
- Rendering:
    - Scatter Plot: Redraws all points and axes with the new X‑axis metric
    - World Map: The fill colors are recalculated with `d3.scaleSequential` and applied to each country path

#### Spatial Interaction (Map ⇒ Scatter & Timeline)

![image](https://hackmd.io/_uploads/HJF2e-nOZx.png)

- Trigger: Click on a specific country on the World Map
- Processing:
    1. Update the `selectedIso3` state
    2. Broadcast this state change to trigger the update() functions of the other components
- Rendering:
    - Timeline: Extract data for the selected country to plot its unique trajectory
    - Scatter Plot: Highlight the selected country's data points and draw a yellow selected-country trendline

#### Timeline Interaction (Timeline ⇒ Map & Scatter)

![image](https://hackmd.io/_uploads/r1T65l3OWe.png)

- Trigger: Select a specific year on the bottom timeline
- Processing: 
    1. Update the `currentYear` state
    2. Switch the data from the "All-Years Average" to the specific subset of data for that year
- Rendering:
    - World Map: Recalculate the color fill for each country
    - Scatter Plot: Fade out irrelevant data points

---

## Challenges

### Scale Comparability

The three metrics (Homicide Rate, GDP per capita, and Gini coefficient) possess vastly different units and numerical ranges, making it hard to meaningfully compare their historical trends on a single standard line chart.

=> I try to implement a 0–100 normalized scale for the Timeline component. This mathematical transformation preserves the relative peaks and valleys of each metric's historical trend while allowing all three lines to be plotted and directly compared within the same visual coordinate system.

### Interaction Complexity & Synchronization

Coordinating interactive selections across the choropleth map, scatter plot, and timeline carried a high risk of state desynchronization, which could lead to inconsistent data filtering or conflicting visual highlights.

=> I centralized the state management. Instead of letting each chart manage its own data state, I stored the global variables (e.g., `selectedIso3`, `currentYear`) exclusively in `main.js`. Whenever a user interacts with any component, it updates this centralized state and subsequently triggers a unified `update() `broadcast to all three charts simultaneously, ensuring a perfectly synchronized dashboard.

---

## AI

- **Code Debugging**: Assisting in identifying and resolving bugs.
- **CSS Styling**: Helping to write and refine the CSS styles for the dashboard's layout and user interface.
- **Documentation Translation**: Translating and polishing the project documentation from Chinese into English.