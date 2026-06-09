"use client";
// Bind react-plotly.js to the SCATTER+HEATMAP-only "basic" bundle (~1.1 MB)
// instead of the full plotly.js dist (~4.85 MB). Corvo only renders scatter
// line/fan charts and one correlation heatmap, all of which plotly-basic
// includes. This is the single largest bundle win in the app.
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = createPlotlyComponent(Plotly as any);
export default Plot;
