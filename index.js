const fs = require("fs");
const zlib = require("zlib");
const nbt = require("nbt");
const path = require("path");

function parseScoreboard(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      zlib.gunzip(data, (err, unzippedData) => {
        if (err) {
          reject(err);
          return;
        }

        nbt.parse(unzippedData, (err, nbtData) => {
          if (err) {
            reject(err);
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

  if (
    nbtData &&
    nbtData.value &&
    nbtData.value.data &&
    nbtData.value.data.value
  ) {
    const dataValue = nbtData.value.data.value;

    if (
      dataValue.PlayerScores &&
      dataValue.PlayerScores.value &&
      dataValue.PlayerScores.value.value
    ) {
      const playerScores = dataValue.PlayerScores.value.value;

      playerScores.forEach((entry) => {
        if (
          entry.Objective &&
          entry.Objective.value === objective &&
          entry.Name &&
          entry.Score
        ) {
          scores.push({
            name: entry.Name.value,
            score: entry.Score.value,
          });
        }
      });
    } else {
      console.log("PlayerScores data not found in NBT.");
    }
  } else {
    console.log("Data not found in NBT.");
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function outputScores(scores, objective, filePath) {
  const outputString = scores
    .map((player, index) => `${index + 1}. ${player.name}: ${player.score}`)
    .join("\n");
  const totalScore = scores.reduce((sum, player) => sum + player.score, 0);
  const outputWithTotal = outputString + `\nTotal: ${totalScore}`;

  console.log(outputWithTotal);

  fs.writeFile(filePath, outputWithTotal, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log("Scores written to", filePath);
    }
  });
}

async function main() {
  const filePath = process.argv[2];
  const objective = process.argv[3];

  if (!filePath || !objective) {
    console.error("Usage: node index.js <file_path> <objective>");
    return;
  }

  const resolvedFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, filePath);

  try {
    const nbtData = await parseScoreboard(resolvedFilePath);
    const scores = processScores(nbtData, objective);
    outputScores(
      scores,
      objective,
      resolvedFilePath.replace("scoreboard.dat", `${objective}_scores.txt`)
    );
  } catch (err) {
    console.error("Error processing scoreboard:", err);
  }
}

main();
