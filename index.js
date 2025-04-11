const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const nbt = require("nbt");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      devTools: !app.isPackaged,
    },
    icon: path.join(__dirname, "assets", "icon.ico"),
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#001c35'
  });

  mainWindow.loadFile("index.html");

  mainWindow.once('ready-to-show', () => {
     mainWindow.show();
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

function parseScoreboard(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return reject(new Error(`Failed to read file: ${err.message}`));
      }
      if (data[0] === 0x1f && data[1] === 0x8b) {
          zlib.gunzip(data, (err, unzippedData) => {
               if (err) {
                   return reject(new Error(`Failed to unzip data: ${err.message}`));
               }
               parseNbtData(unzippedData, resolve, reject);
          });
      } else {
          parseNbtData(data, resolve, reject);
      }
    });
  });
}

function parseNbtData(buffer, resolve, reject){
     nbt.parse(buffer, (err, nbtData) => {
       if (err) {
            return reject(new Error(`Failed to parse NBT data: ${err.message}`));
       }
       resolve(nbtData);
    });
}


function processScores(nbtData, objective) {
  const scores = [];
  try {
    const dataValue = nbtData?.value?.data?.value;
    if (!dataValue) {
      console.warn("NBT structure invalid: 'data' not found.");
      return scores;
    }

    const playerScoresList = dataValue.PlayerScores?.value?.value;
    if (!playerScoresList || !Array.isArray(playerScoresList)) {
      console.warn("NBT structure invalid: 'PlayerScores' list not found or not an array.");
      return scores;
    }

    playerScoresList.forEach((entry) => {
      if (entry?.Objective?.value === objective && entry?.Name?.value && typeof entry?.Score?.value === 'number') {
        scores.push({
          name: entry.Name.value,
          score: entry.Score.value,
        });
      }
    });

    scores.sort((a, b) => b.score - a.score);
    return scores;

  } catch (error) {
     console.error("Error processing scores from NBT data:", error);
     return [];
  }
}

function getObjectives(nbtData) {
  const objectives = [];
  try {
     const objectivesList = nbtData?.value?.data?.value?.Objectives?.value?.value;
     if (objectivesList && Array.isArray(objectivesList)) {
         objectivesList.forEach((objectiveEntry) => {
              if (objectiveEntry?.Name?.value) {
                  objectives.push(objectiveEntry.Name.value);
              }
         });
     } else {
          console.warn("NBT structure invalid: 'Objectives' list not found or not an array.");
     }
  } catch (error) {
     console.error("Error extracting objectives:", error);
  }
  return objectives.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("read-scores", async (event, filePath, objective) => {
  if (!filePath || !objective) {
     return event.reply("scores-result", "Error: Missing file path or objective name.");
  }
  try {
    const nbtData = await parseScoreboard(filePath);
    const scoresData = processScores(nbtData, objective);
    const totalScore = scoresData.reduce((sum, player) => sum + player.score, 0);
    event.reply("scores-result", scoresData.map(entry => entry.score), scoresData.map(entry => entry.name), totalScore);
  } catch (error) {
    console.error(`Error reading scores for ${objective} from ${filePath}:`, error);
    event.reply("scores-result", `Error: ${error.message}`);
  }
});

ipcMain.on("download-scores", (event, data) => {
  if (!data || !data.scores || !data.objective) {
     console.error("Invalid data received for download-scores");
     return dialog.showErrorBox("Save Error", "Internal error: Invalid data received for saving.");
  }

  const { objective, scores } = data;
  const defaultFilename = `scores-${objective.replace(/[/\\?%*:|"<>]/g, '-')}.txt`;

  dialog
    .showSaveDialog(mainWindow, {
      title: `Save Scores for ${objective}`,
      defaultPath: defaultFilename,
      filters: [
         { name: 'Text Files', extensions: ['txt'] },
         { name: 'CSV Files (Comma Separated)', extensions: ['csv'] },
         { name: 'All Files', extensions: ['*'] }
      ]
    })
    .then((result) => {
      if (!result.canceled && result.filePath) {
          let fileContent = "";
          const fileExt = path.extname(result.filePath).toLowerCase();

          if (fileExt === '.csv') {
              fileContent = "Player,Score\n";
              fileContent += scores.map(entry => `"${String(entry.name).replace(/"/g, '""')}","${entry.score}"`).join('\n');
          } else {
              const totalScore = scores.reduce((sum, player) => sum + player.score, 0);
              fileContent = `Objective: ${objective}\r\n`;
              fileContent += `Total Score: ${totalScore.toLocaleString()}\r\n`;
              fileContent += `--------------------------\r\n`;
              fileContent += scores.map(entry => `${entry.name}: ${entry.score.toLocaleString()}`).join('\r\n');
          }

          fs.writeFile(result.filePath, fileContent, (err) => {
            if (err) {
              console.error("Error saving scores file:", err);
              dialog.showErrorBox("Save Error", `Failed to save the scores file:\n${err.message}`);
            } else {
              console.log("Scores file saved successfully to:", result.filePath);
            }
          });
      }
    })
    .catch(err => {
       console.error("Error showing save dialog:", err);
       dialog.showErrorBox("Dialog Error", `Could not show the save file dialog:\n${err.message}`);
    });
});

ipcMain.on("open-file-dialog", (event) => {
  dialog
    .showOpenDialog(mainWindow, {
      title: "Select scoreboard.dat",
      properties: ["openFile"],
      filters: [{ name: "Scoreboard File", extensions: ["dat"] }],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        event.reply("selected-file", filePath);
        parseScoreboard(filePath)
          .then((nbtData) => {
            const objectives = getObjectives(nbtData);
            event.reply("objectives-list", objectives);
          })
          .catch((err) => {
            console.error(`Failed to parse objectives from ${filePath}:`, err);
            event.reply("objectives-error", err.message);
          });
      }
    })
     .catch(err => {
       console.error("Error showing open file dialog:", err);
       dialog.showErrorBox("Dialog Error", `Could not show the open file dialog:\n${err.message}`);
    });
});

ipcMain.on("request-objectives", (event, filePath) => {
     if (!filePath) return;
     parseScoreboard(filePath)
       .then((nbtData) => {
            const objectives = getObjectives(nbtData);
            event.reply("objectives-list", objectives);
       })
       .catch((err) => {
            console.error(`Failed to parse objectives from ${filePath} (manual request):`, err);
            event.reply("objectives-error", err.message);
       });
});