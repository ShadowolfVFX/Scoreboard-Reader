const Chart = require('chart.js/auto');
const ChartDataLabels = require('chartjs-plugin-datalabels');
const ChartJsImage = require('chartjs-to-image');

Chart.register(ChartDataLabels);

Chart.defaults.font.family = 'Panton';

const canvas = document.getElementById('score-canvas');
const ctx = canvas.getContext('2d');
const outputElement = document.getElementById('output');
const totalScoreTitle = document.getElementById('total-score');
const toggleLabelButton = document.getElementById('toggle-labels-button');
const exportButton = document.getElementById('export-button');
const invisibleCanvas = document.getElementById('invisible-canvas');

const myChart = new Chart(ctx, {
  normalized: true,
  parsing: false,
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Scores',
      data: [],
      backgroundColor: (context) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) {
          return '#FF7B00';
        }
        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
        gradient.addColorStop(1, '#00B4D8'); // color-alternate
        gradient.addColorStop(0, '#004346'); // color-background-2
        return gradient;
      },
      borderWidth: 2,
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 1,
    animation: {
      duration: 0,
      x: {
        duration: 500
      },
    },
    plugins: {
      tooltip: {
        enabled: false,
        mode: 'index',
      },
      legend: {
        display: false,
      },
      datalabels: {
        color: '#FFFFFF',
        anchor: 'center',
        align: 'center',
        font: {
          family: 'Panton',
          size: 14
        },
        formatter: (value) => {
          return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: '#001c35',
        },
        stacked: true,
        ticks: {
          color: '#FF7B00',
          autoSkip: false
        },
        categoryPercentage: 1.0,
        barPercentage: 1.0
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#001c35',
        },
        stacked: true,
        ticks: {
          color: '#FF7B00'
        },
        categoryPercentage: 1.0,
        barPercentage: 1.0
      }
    },
  }
});

toggleLabelButton.onclick = function () {
  let plugins = myChart.options.plugins;
  plugins.tooltip.enabled = !plugins.tooltip.enabled;
  plugins.datalabels.font.size = plugins.datalabels.font.size === 0 ? 14 : 0;
  myChart.update('none');
}

function addData(chart, labels, newDataArray) {
  if (!labels.length || !newDataArray.length) return;
  chart.data.labels = chart.data.labels.concat(labels);
  chart.data.datasets.forEach((dataset) => {
    dataset.data = dataset.data.concat(newDataArray);
  });
  chart.update();
}

function removeData(chart) {
  if (!chart.data.labels.length) return;
  chart.data.labels.length = 0;
  chart.data.datasets.forEach((dataset) => {
    dataset.data.length = 0;
  });
  chart.update();
}

ipcRenderer.on('scores-result', (event, receivedScores, receivedNames, totalScore) => {
  if (typeof receivedResult === 'string' && receivedResult.startsWith('Error:')) {
    outputElement.textContent = receivedResult;
    return;
  }
  totalScore = totalScore.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  totalScoreTitle.textContent = `Total Score: ${totalScore}`;
  removeData(myChart);
  addData(myChart, receivedNames, receivedScores);
  outputElement.textContent = '';
});

function getSimplifiedConfig(chart) {
  const config = JSON.parse(JSON.stringify(chart?.config));
  config?.data?.datasets?.forEach(dataset => {
    delete dataset.backgroundColor;
  });
  return config;
}
//TODO: This needs better implementing. Currently it's exporting based on the size of window, not a size set by the user.
/* exportButton.addEventListener('click', async () => {
  const simplifiedConfig = getSimplifiedConfig(myChart);
  const chartJsImage = new ChartJsImage();
  chartJsImage.setConfig(simplifiedConfig);
  chartJsImage.setWidth(1920);
  chartJsImage.setHeight(1080);
  const imageBuffer = await chartJsImage.toBuffer();
  const blob = new Blob([imageBuffer], { type: 'image/png' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'scoreboard.png';
  link.click();
}); */