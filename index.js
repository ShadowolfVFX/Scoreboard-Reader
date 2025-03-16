const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const nbt = require("nbt");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      // preload: path.join(__dirname, "preload.js"),
      icon: path.join(__dirname, "assets", "icon.ico")
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile("index.html");
}

function parseScoreboard(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(new Error(`Failed to read file: ${err.message}`));
        return;
      }

      zlib.gunzip(data, (err, unzippedData) => {
        if (err) {
          reject(new Error(`Failed to unzip data: ${err.message}`));
          return;
        }

        nbt.parse(unzippedData, (err, nbtData) => {
          if (err) {
            reject(new Error(`Failed to parse NBT data: ${err.message}`));
            return;
          }
          resolve(nbtData);
        });
      });
    });
  });
}

function processScores(nbtData, objective) {
  const scores = [];

  const dataValue = nbtData?.value?.data?.value;
  if (!dataValue) {
    console.log("Data not found in NBT.");
    return scores;
  }

  const playerScores = dataValue.PlayerScores.value.value;
  if (!playerScores) {
    console.log("PlayerScores data not found in NBT.");
    return scores;
  }


  playerScores.forEach((entry) => {
    if (entry?.Objective?.value === objective && entry?.Name && entry?.Score) {
      scores.push({
        name: entry.Name.value,
        score: entry.Score.value,
      });
    }
  });

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function getObjectives(nbtData) {
  const objectives = [];

  if (nbtData?.value?.data?.value?.Objectives?.value?.value) {
    const objectivesList = nbtData.value.data.value.Objectives.value.value;
    objectivesList.forEach((objective) => {
      objectives.push(objective.Name.value);
    });
  }

  return objectives;
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
  try {
    const resolvedFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, filePath);
    const nbtData = await parseScoreboard(resolvedFilePath);
    const scores = processScores(nbtData, objective);
    const totalScore = scores.reduce((sum, player) => sum + player.score, 0);

    event.reply("scores-result", scores.map(entry => entry.score), scores.map(entry => entry.name), totalScore);
  } catch (error) {
    event.reply("scores-result", `Error: ${error.message}`);
  }
});

ipcMain.on("download-scores", (event, scores) => {
  dialog
    .showSaveDialog({
      title: "Save Scores",
      defaultPath: "scores.txt",
    })
    .then((result) => {
      if (!result.canceled) {
        fs.writeFile(result.filePath, scores, (err) => {
          if (err) {
            console.error("Error saving file:", err);
          }
        });
      }
    });
});

ipcMain.on("open-file-dialog", (event) => {
  dialog
    .showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Scoreboard Files", extensions: ["dat"] }],
    })
    .then((result) => {
      if (!result.canceled) {
        const filePaths = result.filePaths;
        const filePath = filePaths[0];

        event.reply("selected-file", filePath);

        parseScoreboard(filePath)
          .then((nbtData) => {
            const objectives = getObjectives(nbtData);
            event.reply("objectives-list", objectives);
          })
          .catch((err) => {
            console.error("Failed to parse objectives:", err);
            event.reply("objectives-error", err.message);
          });
      }
    });
});
