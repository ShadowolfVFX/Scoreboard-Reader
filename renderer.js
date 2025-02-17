const { ipcRenderer } = require('electron');

let result; // Declare result outside the callback
let selectedObjective = '';

ipcRenderer.on('scores-result', (event, receivedResult) => {
  const scoreList = document.getElementById('score-list');
  scoreList.innerHTML = ''; // Clear previous results

  if (typeof receivedResult === 'string' && receivedResult.startsWith('Error:')) {
    document.getElementById('output').textContent = receivedResult;
    return;
  }

  result = receivedResult; // Assign the received result to the outer variable

  const scoresArray = result.split('\n').filter(line => line.trim() !== '');

  scoresArray.forEach(score => {
    const li = document.createElement('li');
    li.textContent = score;
    scoreList.appendChild(li);
  });

  document.getElementById('output').textContent = '';
});

ipcRenderer.on('objectives-list', (event, objectives) => {
  const objectiveSelect = document.getElementById('objective-list');
  objectiveSelect.innerHTML = ''; // Clear previous options

  objectives.forEach(objective => {
    const li = document.createElement('li');
    li.textContent = objective;
    objectiveSelect.appendChild(li);

    li.onclick = function () {
      document.querySelectorAll("#selectable-list li").forEach(li => li.classList.remove("selected"));
      li.classList.add("selected");
      selectedObjective = li.textContent;

      //directly read the scores rather than clicking the read button
      const filePath = document.getElementById('file-path').value;
      ipcRenderer.send('read-scores', filePath, selectedObjective);

    }
  });
});

// Download button event listener
document.getElementById('download-button').addEventListener('click', () => {
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