const { ipcRenderer } = require('electron');
const Chart = require('chart.js/auto');
const ChartDataLabels = require('chartjs-plugin-datalabels'); 
Chart.register(ChartDataLabels);

let result; // Declare result outside the callback
let selectedObjective = '';

const ctx = document.getElementById('score-canvas');
const searchInput = document.getElementById('search-box');
const outputElement = document.getElementById('output');
const totalScoreTitle = document.getElementById('total-score');
const objectiveSelect = document.getElementById('objectives-list');
const filePathInput = document.getElementById('file-path');
const openFileButton = document.getElementById('open-file-button');
const siteReferral = document.getElementById('site-referral');
const saveButton = document.getElementById('save-button');
const toggleLabelButton = document.getElementById('toggle-labels-button');
let objectiveList = objectiveSelect.querySelectorAll('li');

Chart.defaults.font.family = 'Panton';

const stackedBar = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Scores',
      data: [],
      // Define backgroundColor as a function to recalc the gradient every render
      backgroundColor: (context) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        // If chartArea isn’t available yet, return a fallback color
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
      tooltip:{
        enabled: false
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
        stacked: true,
        ticks: {
          color: '#FF7B00'
        },
        categoryPercentage: 1.0, // Ensures bars use full width
        barPercentage: 1.0
      },
      y: { 
        stacked: true,
        ticks: {
          color: '#FF7B00'
        },
        categoryPercentage: 1.0, // Ensures bars use full width
        barPercentage: 1.0
      }
    },

    //TODO: This bar thickness causes overlapping of bars. Instead what I want to try is a minimum thickness for the bars,
    // and if the chart is too small, the canvas should rescale to fit the bars and be scrollable
  }
});



function addData(chart, labels, newDataArray) {
  if (!labels.length || !newDataArray.length) return;

  chart.data.labels = chart.data.labels.concat(labels);
  chart.data.datasets.forEach((dataset, index) => {
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

toggleLabelButton.onclick = function () {
  let plugins = stackedBar.options.plugins;
  plugins.tooltip.enabled = !plugins.tooltip.enabled;
  if(plugins.datalabels.font.size == 0) {
    plugins.datalabels.font.size = 14;
  } else {
    plugins.datalabels.font.size = 0;
  }

  stackedBar.update('none');

}

ipcRenderer.on('scores-result', (event, receivedScores, receivedNames, totalScore) => {
  if (typeof receivedResult === 'string' && receivedResult.startsWith('Error:')) {
    outputElement.textContent = receivedResult;
    return;
  }

  totalScore = totalScore.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to the total score as a string
  totalScoreTitle.textContent = `Total Score: ${totalScore}`;

  removeData(stackedBar);
  addData(stackedBar, receivedNames, receivedScores);

  outputElement.textContent = '';
});

ipcRenderer.on('objectives-list', (event, objectives) => {
  objectiveSelect.innerHTML = ''; // Clear previous options

  objectives.forEach(objective => {
    const li = document.createElement('li');
    li.textContent = objective;
    objectiveSelect.appendChild(li);

    li.onclick = function () {
      objectiveSelect.querySelectorAll("li").forEach(li => li.classList.remove("selected"));
      li.classList.add("selected");
      selectedObjective = li.textContent;

      document.title = `Scoreboard Reader - ${selectedObjective}`;

      //directly read the scores rather than clicking the read button
      ipcRenderer.send('read-scores', filePathInput.value, selectedObjective);

    }
  });

  objectiveList = objectiveSelect.querySelectorAll('li');
});

// Download button event listener
saveButton.addEventListener('click', () => {
  ipcRenderer.send('download-scores', result);
});

// Drag and drop support

filePathInput.addEventListener('dragover', (event) => {
  event.preventDefault();
  filePathInput.classList.add('dragging');
});

filePathInput.addEventListener('dragleave', () => {
  filePathInput.classList.remove('dragging');
});

filePathInput.addEventListener('drop', (event) => {
  event.preventDefault();
  filePathInput.classList.remove('dragging');

  const file = event.dataTransfer.files;
  filePathInput.value = file.path;
});

// Open file button
openFileButton.addEventListener('click', () => {
  ipcRenderer.send('open-file-dialog');
});

siteReferral.addEventListener('click', () => {
  //Doing this to prevent the default behavior of opening the link in the app and instead open it in the default browser
  require('electron').shell.openExternal('https://swfx.uk/resources/scoreboard-reader');
});

ipcRenderer.on('selected-file', (event, filePath) => {
  if (filePath) {
    filePathInput.value = filePath;
  }
});


searchInput.addEventListener('keyup', (event) => {
  let textInput = searchInput.value.toLowerCase();
  
  objectiveList.forEach((element) => {
    if (element.textContent.toLowerCase().includes(textInput)) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  });
});