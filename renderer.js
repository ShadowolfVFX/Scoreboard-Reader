const { ipcRenderer } = require('electron');
const Chart = require('chart.js/auto');

let result; // Declare result outside the callback
let selectedObjective = '';

const ctx = document.getElementById('score-canvas');

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
      // borderColor: '#FF7B00', // color-primary
      borderWidth: 2,
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 1,
    plugins: {
      legend: {
        display: false,
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
    // barThickness: 20,
  }
});

Chart.defaults.font.family = 'Panton';


function addData(chart, label, newData) {
  chart.data.labels.push(label);
  chart.data.datasets.forEach((dataset) => {
    dataset.data.push(newData);
  });
  chart.update();
}

function removeData(chart) {
  //remove all the data and labels without resetting the config
  chart.data.labels = [];
  chart.data.datasets.forEach((dataset) => {
    dataset.data = [];
  });
  chart.update();
}

ipcRenderer.on('scores-result', (event, receivedResult, totalScore) => {
  if (typeof receivedResult === 'string' && receivedResult.startsWith('Error:')) {
    document.getElementById('output').textContent = receivedResult;
    return;
  }

  let totalScoreTitle = document.getElementById('total-score');
  totalScore = totalScore.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Add commas to the total score as a string
  totalScoreTitle.textContent = `Total Score: ${totalScore}`;

  removeData(stackedBar);
  receivedResult.forEach(player => {
    addData(stackedBar, player.name, player.score);
  });

  document.getElementById('output').textContent = '';
});

ipcRenderer.on('objectives-list', (event, objectives) => {
  const objectiveSelect = document.getElementById('objectives-list');
  objectiveSelect.innerHTML = ''; // Clear previous options

  objectives.forEach(objective => {
    const li = document.createElement('li');
    li.textContent = objective;
    objectiveSelect.appendChild(li);

    li.onclick = function () {
      objectiveSelect.querySelectorAll("li").forEach(li => li.classList.remove("selected"));
      li.classList.add("selected");
      selectedObjective = li.textContent;

      //directly read the scores rather than clicking the read button
      const filePath = document.getElementById('file-path').value;
      ipcRenderer.send('read-scores', filePath, selectedObjective);

    }
  });
});

// Download button event listener
document.getElementById('save-button').addEventListener('click', () => {
  ipcRenderer.send('download-scores', result);
});

// Drag and drop support
const filePathInput = document.getElementById('file-path');

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
document.getElementById('open-file-button').addEventListener('click', () => {
  ipcRenderer.send('open-file-dialog');
});

ipcRenderer.on('selected-file', (event, filePath) => {
  if (filePath) {
    filePathInput.value = filePath;
  }
});