const { ipcRenderer } = require('electron');

let result; // Declare result outside the callback
let selectedObjective = '';

const searchInput = document.getElementById('search-box');
const objectiveSelect = document.getElementById('objectives-list');
const filePathInput = document.getElementById('file-path');
const openFileButton = document.getElementById('open-file-button');
const siteReferral = document.getElementById('site-referral');
const saveButton = document.getElementById('save-button');
const siteReferralModal = document.getElementById('open-site-modal');
const closeModalButton = document.getElementById('close-modal-button');
const siteReferralButton = document.getElementById('site-referral-button');
let objectiveList = objectiveSelect.querySelectorAll('li');

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

ipcRenderer.on('selected-file', (event, filePath) => {
  if (filePath) {
    filePathInput.value = filePath;
  }
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
  siteReferralModal.showModal();
  // ipcRenderer.confirmOpenLink('https://swfx.uk/resources/scoreboard-reader');
});


closeModalButton.addEventListener('click', () => {
  siteReferralModal.close();
}
);

siteReferralButton.addEventListener('click', () => {
  const { shell } = require('electron');
  shell.openExternal('https://swfx.uk/resources/scoreboard-reader');
  siteReferralModal.close();
}
);

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
