# Scoreboard Reader 

Scoreboard Reader is a javascript app for getting all scores for an objective for all players on a Minecraft server, even if they are offline. Minecraft's scoreboard system is heavilly stupid its very hard to do in game. This app take the entire scoreboard.dat file for a world, finds all the player scores for the inputted objective and outputs them to a text file as well as totting up the total scores counted.

# Usage:
<sub>You will need Node installed on your computer to use this software. You can find the lastest download here: https://nodejs.org/en</sub>

1. Download all the code as a Zip File
2. Extract the contents into a folder
3. Open a terminal/CMD at that folder location.
3. run ``npm install``
4. run ``node index.js <path_to_scoreboard.dat> <objective_name>``
5. Scoreboard reader will output the data found to the console as well as output ``<objective>_scores.txt`` to the location specified.

# Where's my scoreboard.dat?

 Scoreboard.dat is normally found relative to the root directory of your minecraft server or saves directory:

 - Singleplayer (windows): ``c:/users/<user>/appdata/roaming/.minecraft/saves/<world>/data/scoreboard.dat``
 - Multiplayer ``./<world>/data/scoreboard.dat``
