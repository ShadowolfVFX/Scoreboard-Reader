const { ipcRenderer, shell } = require('electron');

let currentScoresData = [];
let selectedObjective = '';
let objectiveListItems = [];

// --- DOM Elements ---
const searchInput = document.getElementById('search-box');
const objectivesListElement = document.getElementById('objectives-list');
const filePathInput = document.getElementById('file-path');
const openFileButton = document.getElementById('open-file-button');
const siteReferralIcon = document.getElementById('site-referral');
const saveButton = document.getElementById('save-button');
const exportPngButton = document.getElementById('export-png-button');
const toggleLabelsButton = document.getElementById('toggle-labels-button');
const toggleSidebarButton = document.getElementById('toggle-sidebar-button');
const sidebar = document.getElementById('sidebar');
const totalScoreElement = document.getElementById('total-score');
const chartPlaceholder = document.getElementById('chart-placeholder');
const resizeHandle = document.getElementById('resize-handle');

const siteReferralModal = document.getElementById('open-site-modal');
const closeModalButton = document.getElementById('close-modal-button');
const siteReferralButton = document.getElementById('site-referral-button');

// --- Initial State ---
saveButton.disabled = true;
exportPngButton.disabled = true;
toggleLabelsButton.disabled = true;
toggleLabelsButton.textContent = 'Show Labels';
totalScoreElement.textContent = 'Total Score: -';

// --- IPC Event Handlers ---
ipcRenderer.on('objectives-list', (event, objectives) => {
  objectivesListElement.innerHTML = '';
  objectiveListItems = [];

  if (!objectives || objectives.length === 0) {
     objectivesListElement.innerHTML = '<li class="text-gray-400 italic px-2 py-1">No objectives found in file.</li>';
     return;
  }

  objectives.forEach(objective => {
    const li = document.createElement('li');
    li.textContent = objective;
    li.title = objective;
    objectivesListElement.appendChild(li);
    objectiveListItems.push(li);

    li.addEventListener('click', () => {
      objectivesListElement.querySelectorAll("li").forEach(el => el.classList.remove('selected'));
      li.classList.add("selected");
      selectedObjective = li.textContent;
      document.title = `Scoreboard Reader - ${selectedObjective}`;
      const currentFilePath = filePathInput.value;
      if (currentFilePath) {
           chartPlaceholder.textContent = 'Loading scores...';
           chartPlaceholder.style.display = 'flex';
           if (typeof myChart !== 'undefined' && myChart) {
                 myChart.canvas.style.display = 'none';
           }
           ipcRenderer.send('read-scores', currentFilePath, selectedObjective);
      } else {
           alert("Please select a scoreboard.dat file first.");
           objectivesListElement.querySelectorAll("li").forEach(el => el.classList.remove('selected'));
           selectedObjective = '';
      }
    });
  });
});

ipcRenderer.on('scores-result', (event, scores, names, totalScore) => {
    if (typeof scores === 'string' && scores.startsWith('Error:')) {
        console.error("Error received from main process:", scores);
        alert(`Error reading scores: ${scores}`);
        chartPlaceholder.textContent = `Error loading scores for ${selectedObjective}.`;
        chartPlaceholder.style.display = 'flex';
        if (typeof myChart !== 'undefined' && myChart) {
             myChart.canvas.style.display = 'none';
        }
        currentScoresData = [];
        saveButton.disabled = true;
        exportPngButton.disabled = true;
        toggleLabelsButton.disabled = true;
        toggleLabelsButton.textContent = 'Show Labels';
        totalScoreElement.textContent = 'Total Score: Error';
        return;
    }

    currentScoresData = names.map((name, index) => ({ name: name, score: scores[index] }));

    if (typeof updateChart === 'function') {
        updateChart(names, scores, totalScore);
        setTimeout(() => {
            chartPlaceholder.style.display = 'none';
             if (typeof myChart !== 'undefined' && myChart && myChart.canvas) {
                 myChart.canvas.style.display = 'block';
                 const labelsAreVisible = myChart.options.plugins.datalabels.display;
                 toggleLabelsButton.textContent = labelsAreVisible ? 'Hide Labels' : 'Show Labels';
            } else {
                 chartPlaceholder.textContent = 'Error displaying chart.';
                 chartPlaceholder.style.display = 'flex';
            }
        }, 50);

    } else {
        console.error("updateChart function not found. Cannot display scores.");
        chartPlaceholder.textContent = 'Chart update function missing.';
        chartPlaceholder.style.display = 'flex';
         if (typeof myChart !== 'undefined' && myChart && myChart.canvas) {
             myChart.canvas.style.display = 'none';
         }
         toggleLabelsButton.textContent = 'Show Labels';
    }

    if (totalScoreElement) {
        totalScoreElement.textContent = `Total Score: ${totalScore.toLocaleString()}`;
        totalScoreElement.title = `Total score for ${selectedObjective}: ${totalScore.toLocaleString()}`;
    }

    saveButton.disabled = false;
    exportPngButton.disabled = false;
    toggleLabelsButton.disabled = false;
});

ipcRenderer.on('selected-file', (event, filePath) => {
  if (filePath) {
    filePathInput.value = filePath;
    objectivesListElement.innerHTML = '<li class="text-gray-400 italic px-2 py-1">Loading objectives...</li>';
    objectiveListItems = [];
    selectedObjective = '';
    currentScoresData = [];
    saveButton.disabled = true;
    exportPngButton.disabled = true;
    toggleLabelsButton.disabled = true;
    toggleLabelsButton.textContent = 'Show Labels';
    totalScoreElement.textContent = 'Total Score: -';
    chartPlaceholder.textContent = 'Select an objective...';
    chartPlaceholder.style.display = 'flex';
    if (typeof myChart !== 'undefined' && myChart) {
       myChart.canvas.style.display = 'none';
    }
     document.title = `Scoreboard Reader`;
  }
});

ipcRenderer.on('objectives-error', (event, errorMessage) => {
      console.error("Error parsing objectives:", errorMessage);
      alert(`Error reading file: ${errorMessage}`);
      objectivesListElement.innerHTML = `<li class="text-red-400 italic px-2 py-1">Error loading objectives.</li>`;
});

// --- DOM Event Listeners ---
openFileButton.addEventListener('click', () => {
  ipcRenderer.send('open-file-dialog');
});

saveButton.addEventListener('click', () => {
  if (currentScoresData && currentScoresData.length > 0 && selectedObjective) {
    ipcRenderer.send('download-scores', {
       objective: selectedObjective,
       scores: currentScoresData
    });
  } else {
     console.warn("No score data or objective selected to save.");
     alert("No score data available to save, or no objective selected.");
  }
});

// Modified Export PNG Button Listener
exportPngButton.addEventListener('click', () => {
    const chartCanvas = document.getElementById('score-canvas'); // Original canvas
    if (!chartCanvas || typeof myChart === 'undefined' || !myChart || typeof myChart.toBase64Image !== 'function' || !myChart.chartArea) { // Check chartArea exists
        console.error("Chart canvas, instance, or chartArea not ready for export!");
        alert("Chart is not ready to be exported. Please load data first or ensure chart is fully rendered.");
        return;
    }

    // Configuration
    const desiredWidth = 3840;
    const desiredHeight = 2160 + (currentScoresData.length > 30 ? currentScoresData.length * 10 : 0) ;
    const watermarkText = "Scoreboard Reader | swfx.uk";
    const computedStyle = getComputedStyle(document.body);
    // --- Increased font size ---
    const watermarkFontSize = 18; // New variable for font size
    const watermarkFont = `${watermarkFontSize}px ${computedStyle.fontFamily.split(',')[0] || 'Panton-Light'}`;
    const watermarkColor = `rgba(${parseInt(computedStyle.getPropertyValue('--color-text').trim().slice(1,3),16)}, ${parseInt(computedStyle.getPropertyValue('--color-text').trim().slice(3,5),16)}, ${parseInt(computedStyle.getPropertyValue('--color-text').trim().slice(5,7),16)}, 0.3)`;
    const filename = selectedObjective ? `scoreboard-${selectedObjective}-export.png` : "scoreboard-export.png";
    const backgroundColor = computedStyle.getPropertyValue('--color-background-3').trim() || '#001c35';
    const logoSrc = './assets/icon.ico';

    // Offscreen Canvas Setup
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = desiredWidth;
    offscreenCanvas.height = desiredHeight;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // Image Loading Setup
    const currentChartImage = new Image();
    const logoImage = new Image();
    let chartLoaded = false;
    let logoLoaded = false;
    let logoLoadFailed = false;

    // Function to perform drawing once images are loaded
    const performDraw = () => {
        if (!chartLoaded || !(logoLoaded || logoLoadFailed)) return;

        // --- Start Drawing ---
        offscreenCtx.fillStyle = backgroundColor;
        offscreenCtx.fillRect(0, 0, desiredWidth, desiredHeight);
        offscreenCtx.drawImage(currentChartImage, 0, 0, desiredWidth, desiredHeight); // Draw scaled chart

        // --- Calculate Scaled Chart Area ---
        const chartArea = myChart.chartArea; // { top, left, right, bottom } relative to original canvas
        const originalCanvasWidth = myChart.canvas.width;
        const originalCanvasHeight = myChart.canvas.height;

        if (!chartArea || !originalCanvasWidth || !originalCanvasHeight) {
            console.error("Original chart dimensions or chartArea not available for watermark positioning.");
            // Fallback or skip watermark? For now, let's skip precise positioning.
            // Maybe draw at bottom right of canvas as before? Or omit? Omit for now.
        } else {
            const scaleX = desiredWidth / originalCanvasWidth;
            const scaleY = desiredHeight / originalCanvasHeight;
            // Calculate boundaries of the chart area on the offscreen canvas
            const offscreenChartAreaRight = chartArea.right * scaleX;
            const offscreenChartAreaBottom = chartArea.bottom * scaleY;

            // --- Watermark Calculation (relative to chart area) ---
             // --- Increased logo size ---
            const logoHeight = 22; // Desired logo height in pixels
            let logoWidth = 0;
            if (!logoLoadFailed) {
                 logoWidth = (logoImage.naturalWidth / logoImage.naturalHeight) * logoHeight;
            }
            const padding = 8; // Space between logo and text
            // --- Padding from chart area edge ---
            const chartAreaPaddingX = 10; // Indentation from right edge
            const chartAreaPaddingY = 10; // Indentation from bottom edge

            offscreenCtx.font = watermarkFont; // Set font *before* measuring text
            offscreenCtx.textAlign = 'right';
            offscreenCtx.textBaseline = 'bottom';

            const textWidth = offscreenCtx.measureText(watermarkText).width;
             // --- Position based on offscreen chart area ---
            const textX = offscreenChartAreaRight - chartAreaPaddingX;
            const textY = offscreenChartAreaBottom - chartAreaPaddingY;

            // --- Draw Watermark Text ---
            offscreenCtx.fillStyle = watermarkColor;
            offscreenCtx.fillText(watermarkText, textX, textY);

            // --- Draw Watermark Logo (if loaded successfully) ---
            if (!logoLoadFailed) {
                const logoX = textX - textWidth - padding - logoWidth; // Position left of text
                const logoY = textY - logoHeight; // Align bottom edge

                offscreenCtx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
            }
            // --- End Watermark ---
        }

        // Trigger Download
        const dataUrl = offscreenCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // --- End Drawing ---
    };

    // Setup image onload/onerror handlers
    currentChartImage.onload = () => {
        console.log("Chart image loaded for export.");
        chartLoaded = true;
        performDraw();
    };
    currentChartImage.onerror = () => {
        console.error("Failed to load chart image for export.");
        alert("Error exporting chart: Could not generate chart image.");
    };

    logoImage.onload = () => {
        console.log("Logo image loaded for watermark.");
        logoLoaded = true;
        performDraw();
    };
    logoImage.onerror = () => {
        console.error("Failed to load logo image for watermark from:", logoSrc);
        logoLoadFailed = true;
        performDraw();
    };

    // Start loading images
    logoImage.src = logoSrc;
    currentChartImage.src = myChart.toBase64Image();
});


toggleLabelsButton.addEventListener('click', () => {
    if (typeof myChart !== 'undefined' && myChart && myChart.options?.plugins?.datalabels) {
        try {
             const currentState = myChart.options.plugins.datalabels.display;
             myChart.options.plugins.datalabels.display = !currentState;
             myChart.update();
             toggleLabelsButton.textContent = !currentState ? 'Hide Labels' : 'Show Labels';
        } catch (e) {
             console.error("ChartDataLabels plugin not configured or available.", e);
             alert("Could not toggle labels. Ensure 'chartjs-plugin-datalabels' is included and configured.")
        }
    } else {
        console.warn("Chart instance or datalabels plugin not available for toggling labels.");
    }
});

// Sidebar Toggle Button Logic using CSS class for transition
if (toggleSidebarButton && sidebar) {
  toggleSidebarButton.addEventListener('click', () => {
    const isCollapsing = sidebar.classList.toggle('sidebar-collapsed');
    const iconElement = toggleSidebarButton.querySelector('svg');
    if (iconElement) {
       const chevronLeftPath = "M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 246.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z";
       const chevronRightPath = "M278.6 233.4c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L186.7 256 73.4 369.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z";
       iconElement.querySelector('path').setAttribute('d', isCollapsing ? chevronRightPath : chevronLeftPath);
       toggleSidebarButton.setAttribute('title', isCollapsing ? 'Show Sidebar' : 'Hide Sidebar');
    }
    if (typeof myChart !== 'undefined' && myChart && typeof myChart.resize === 'function') {
      setTimeout(() => { myChart.resize(); }, 300);
    } else if (typeof myChart === 'undefined' || !myChart) {
       console.warn("Chart instance (myChart) not found for resizing after sidebar toggle.");
    }
  });
} else {
   console.error("Sidebar toggle button or sidebar element not found!");
}

searchInput.addEventListener('input', () => {
  let filter = searchInput.value.toLowerCase();
  objectiveListItems.forEach((liElement) => {
    let text = liElement.textContent.toLowerCase();
    if (text.includes(filter)) {
      liElement.style.display = "";
    } else {
      liElement.style.display = "none";
    }
  });
});

// --- Drag and Drop for File Path Input ---
filePathInput.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.stopPropagation();
  filePathInput.classList.add('dragging');
});

filePathInput.addEventListener('dragleave', (event) => {
  event.preventDefault();
  event.stopPropagation();
  filePathInput.classList.remove('dragging');
});

filePathInput.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
  filePathInput.classList.remove('dragging');

  const files = event.dataTransfer.files;
  if (files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.dat')) {
             filePathInput.value = file.path;
             ipcRenderer.send('manual-file-load', file.path);
        } else {
             alert("Please drop a valid 'scoreboard.dat' file.");
        }
  }
});

ipcRenderer.on('manual-file-load', (event, filePath) => {
        if (filePath) {
           filePathInput.value = filePath;
           objectivesListElement.innerHTML = '<li class="text-gray-400 italic px-2 py-1">Loading objectives...</li>';
           objectiveListItems = [];
           selectedObjective = '';
           currentScoresData = [];
           saveButton.disabled = true;
           exportPngButton.disabled = true;
           toggleLabelsButton.disabled = true;
           toggleLabelsButton.textContent = 'Show Labels';
           totalScoreElement.textContent = 'Total Score: -';
           chartPlaceholder.textContent = 'Select an objective...';
           chartPlaceholder.style.display = 'flex';
           if (typeof myChart !== 'undefined' && myChart) {
                myChart.canvas.style.display = 'none';
           }
           document.title = `Scoreboard Reader`;

           ipcRenderer.send('request-objectives', filePath);
        }
});

// --- Site Referral Modal ---
siteReferralIcon.addEventListener('click', () => {
  if(siteReferralModal.showModal) {
     siteReferralModal.showModal();
  } else {
     console.warn("Dialog API not fully supported.")
  }
});

closeModalButton.addEventListener('click', () => {
  siteReferralModal.close();
});

siteReferralButton.addEventListener('click', () => {
  shell.openExternal('https://swfx.uk/resources/scoreboard-reader');
  siteReferralModal.close();
});


// --- Custom Sidebar Resize Logic ---
if (resizeHandle && sidebar) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    const computedStyle = window.getComputedStyle(sidebar);
    const minWidth = parseFloat(computedStyle.minWidth) || 150;
    const maxWidth = parseFloat(computedStyle.maxWidth) || 800;

    const onMouseDown = (e) => {
        if (sidebar.classList.contains('sidebar-collapsed')) return;
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        document.body.classList.add('resizing');
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
        if (!isResizing) return;
        const currentX = e.clientX;
        const deltaX = currentX - startX;
        let newWidth = startWidth + deltaX;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        sidebar.style.width = `${newWidth}px`;
        if (typeof myChart !== 'undefined' && myChart && typeof myChart.resize === 'function') {
            myChart.resize();
        }
    };

    const onMouseUp = () => {
        if (isResizing) {
            isResizing = false;
            document.body.classList.remove('resizing');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (typeof myChart !== 'undefined' && myChart && typeof myChart.resize === 'function') {
                setTimeout(() => myChart.resize(), 50);
            }
        }
    };
    resizeHandle.addEventListener('mousedown', onMouseDown);
} else {
    console.error("Resize handle or sidebar element not found!");
}