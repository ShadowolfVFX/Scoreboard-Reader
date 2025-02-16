const { ipcRenderer } = require('electron');

let result; // Declare result outside the callback

ipcRenderer.on('scores-result', (event, receivedResult) => {
  const scoreList = document.getElementById('scoreList');
  scoreList.innerHTML = ''; // Clear previous results

  if (typeof receivedResult === 'string' && receivedResult.startsWith('Error:')) {
      document.getElementById('output').textContent = receivedResult;
      return;
  }

  result = receivedResult; // Assign the received result to the outer variable

  const scoresArray = result.split('\n').filter(line => line.trim()!== '');

  scoresArray.forEach(score => {
      const li = document.createElement('li');
      li.textContent = score;
      scoreList.appendChild(li);
  });

  document.getElementById('output').textContent = '';
});

ipcRenderer.on('objectives-list', (event, objectives) => {
  const objectiveSelect = document.getElementById('objectiveSelect');
  objectiveSelect.innerHTML = ''; // Clear previous options

  objectives.forEach(objective => {
    const option = document.createElement('option');
    option.value = objective;
    option.text = objective;
    objectiveSelect.appendChild(option);
  });
});

document.getElementById('readButton').addEventListener('click', () => {
  const filePath = document.getElementById('filePath').value;
  const objective = document.getElementById('objectiveSelect').value; // Get selected objective

  ipcRenderer.send('read-scores', filePath, objective);
});

// Download button event listener
const downloadButton = document.getElementById('downloadButton');
downloadButton.addEventListener('click', () => {
    ipcRenderer.send('download-scores', result);
});

// Drag and drop support
const filePathInput = document.getElementById('filePath');

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
const openFileButton = document.getElementById('openFileButton');

openFileButton.addEventListener('click', () => {
  ipcRenderer.send('open-file-dialog');
});

ipcRenderer.on('selected-file', (event, filePath) => {
  if (filePath) {
    filePathInput.value = filePath;
  }
});