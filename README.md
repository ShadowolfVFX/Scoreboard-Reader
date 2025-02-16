# Scoreboard Reader 

Scoreboard Reader is a javascript app for getting all scores for an objective for all players on a Minecraft server, even if they are offline. Minecraft's scoreboard system is heavilly stupid its very hard to do in game. This app take the entire scoreboard.dat file for a world, finds all the player scores for the inputted objective and outputs them to a text file as well as totting up the total scores counted.

# Usage:
<sub>You will need Node installed on your computer to use this software. You can find the lastest download here: https://nodejs.org/en</sub>

1. Download and install the latest release
2. Open the app and hit open and find your scoreboard.dat
3. Select the objective from your dropdown and hit ``Read Scores``.
4. The list below should be populated with all players scores, listed low to high. You can copy paste or download the scores.

# Where's my scoreboard.dat?

 Scoreboard.dat is normally found relative to the root directory of your minecraft server or saves directory:

 - Singleplayer (windows): ``c:/users/<user>/appdata/roaming/.minecraft/saves/<world>/data/scoreboard.dat``
 - Multiplayer ``./<world>/data/scoreboard.dat``
