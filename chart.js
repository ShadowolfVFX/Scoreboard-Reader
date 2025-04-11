if (typeof ChartDataLabels !== 'undefined') {
  Chart.register(ChartDataLabels);
} else {
  console.error("ChartDataLabels plugin not found. Labels may not work.");
}

Chart.defaults.font.family = 'Panton';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#EACAAC';

let myChart;

function updateChart(labels, data) {
  if (!myChart) {
     console.error("Chart object (myChart) not initialized. Cannot update.");
     return;
  }
  const maxLength = Math.max(labels.length, data.length);
  const safeLabels = labels.slice(0, maxLength);
  const safeData = data.slice(0, maxLength);

  myChart.data.labels = safeLabels;
  myChart.data.datasets.forEach((dataset) => {
     dataset.data = safeData;
  });

  try {
     myChart.update(); // Update chart data
  } catch (error) {
     console.error("Error during myChart.update():", error);
     // Optionally notify the user or handle the error
     // Maybe try to display the chart without labels if update fails?
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('score-canvas');
  if (!canvas) {
     console.error("score-canvas element not found!");
     return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
     console.error("Could not get 2D context from score-canvas");
     return;
  }

  const computedStyle = getComputedStyle(document.body);
  const primaryColor = computedStyle.getPropertyValue('--color-primary').trim() || '#FF7B00';
  const secondaryColor = computedStyle.getPropertyValue('--color-secondary').trim() || '#FFD791';
  const textColor = computedStyle.getPropertyValue('--color-text').trim() || '#EACAAC';
  const altColor = computedStyle.getPropertyValue('--color-alternate').trim() || '#00B4D8';
  const bg2Color = computedStyle.getPropertyValue('--color-background-2').trim() || '#004346';
  const bg3Color = computedStyle.getPropertyValue('--color-background-3').trim() || '#001c35';


  myChart = new Chart(ctx, {
     type: 'bar',
     data: {
         labels: [],
         datasets: [{
             label: 'Scores',
             data: [],
             backgroundColor: (context) => {
                 const chart = context.chart;
                 const { ctx, chartArea } = chart;
                 if (!chartArea) return primaryColor;
                 const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                 gradient.addColorStop(0, bg2Color);
                 gradient.addColorStop(1, altColor);
                 return gradient;
             },
             borderColor: 'transparent',
             borderWidth: 0,
         }]
     },
     options: {
         indexAxis: 'y',
         responsive: true,
         maintainAspectRatio: false,
         animation: {
             duration: 300
         },
         scales: {
             x: {
                 beginAtZero: true,
                 grid: {
                     color: 'rgba(234, 202, 172, 0.1)',
                     borderColor: secondaryColor
                 },
                 ticks: {
                     color: secondaryColor,
                     autoSkip: true,
                     maxTicksLimit: 10
                 }
             },
             y: {
                 grid: {
                     display: false,
                 },
                 ticks: {
                     color: secondaryColor,
                     autoSkip: false
                 }
             }
         },
         plugins: {
             legend: {
                 display: false
             },
             tooltip: {
                 enabled: true,
                 mode: 'index',
                 intersect: false,
                 backgroundColor: bg3Color,
                 titleColor: primaryColor,
                 bodyColor: textColor,
                 borderColor: primaryColor,
                 borderWidth: 1,
                 padding: 10,
                 callbacks: {
                     label: function(context) {
                         let label = context.dataset.label || '';
                         if (label) label += ': ';
                         if (context.parsed && context.parsed.x !== null) { // Check context.parsed exists
                              label += context.parsed.x.toLocaleString();
                         }
                         return label;
                     },
                      title: function(context) {
                           // Check context and context[0] exist
                           return context && context[0] ? context[0].label : '';
                       }
                 }
             },
             datalabels: {
                 display: true, // Can still be toggled by button
                 color: textColor,
                 font: {
                     family: 'Panton-Bold',
                     size: 12
                 },
                 formatter: (value, context) => {
                     // Check value type before formatting
                     if (typeof value === 'number') {
                         return value.toLocaleString();
                     }
                     return value; // Return as-is if not a number
                 },
                 // --- Conditional Positioning Logic (Value Based - More Robust) ---
                 align: function(context) {
                    try {
                        const chart = context.chart;
                        const scales = chart.scales;
                        // Added checks for context.parsed
                        const value = context.parsed ? context.parsed.x : null;

                        if (!scales || !scales.x || scales.x.max === undefined || scales.x.min === undefined || value === null || value === undefined) {
                             // console.warn("Datalabel Align: Missing context for calculation."); // Optional logging
                             return 'center'; // Fallback
                        }
                        const maxValue = scales.x.max;
                        const minValue = scales.x.min;
                        if (maxValue <= minValue) return 'center'; // Prevent division by zero/negative range

                        const valueRatio = (value - minValue) / (maxValue - minValue);
                        const thresholdRatio = 0.10; // <<< Adjust this value
                        return valueRatio < thresholdRatio ? 'right' : 'center';
                    } catch (e) {
                        console.error("Error in datalabel align function:", e, context);
                        return 'center'; // Fallback on error
                    }
                 },
                 anchor: function(context) {
                    try {
                        const chart = context.chart;
                        const scales = chart.scales;
                        const value = context.parsed ? context.parsed.x : null;

                        if (!scales || !scales.x || scales.x.max === undefined || scales.x.min === undefined || value === null || value === undefined) {
                            return 'center';
                        }
                        const maxValue = scales.x.max;
                        const minValue = scales.x.min;
                        if (maxValue <= minValue) return 'center';

                        const valueRatio = (value - minValue) / (maxValue - minValue);
                        const thresholdRatio = 0.10; // <<< Use same threshold
                        return valueRatio < thresholdRatio ? 'end' : 'center';
                     } catch (e) {
                        console.error("Error in datalabel anchor function:", e, context);
                        return 'center';
                     }
                 },
                 offset: function(context) {
                    try {
                        const chart = context.chart;
                        const scales = chart.scales;
                        const value = context.parsed ? context.parsed.x : null;

                        if (!scales || !scales.x || scales.x.max === undefined || scales.x.min === undefined || value === null || value === undefined) {
                            return 0;
                        }
                        const maxValue = scales.x.max;
                        const minValue = scales.x.min;
                        if (maxValue <= minValue) return 0;

                        const valueRatio = (value - minValue) / (maxValue - minValue);
                        const thresholdRatio = 0.10; // <<< Use same threshold
                        return valueRatio < thresholdRatio ? 8 : 0;
                     } catch (e) {
                         console.error("Error in datalabel offset function:", e, context);
                         return 0;
                     }
                 },
                 padding: {}
                 // --- End Conditional Logic ---
             }
         }
     }
  });

}); // End DOMContentLoaded