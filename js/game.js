const ruleSets = {
  standard: 1, // 2nd edition rules
  old: 2, // 1st edition rules
  family: 3, // Family rules
  party: 4, // Party rules
  custom: 5 // Custom rules
};

var wwApp = {
  config: {
    id: ruleSets.standard, // Preset game rules
    numRounds: 7, // Number of rounds before game ends
    winningScore: null, // Winning score, if any
    wagerChipValue1: 1, // Base value of first wager
    wagerChipValue2: 1, // Base value of second wager
    startingCash: 0, // Starting number of chips
    betLimit: null, // Maximum chips that can be bet (except in last round)
    lastRoundBetLimit: null, // Maximum chips that can be bet in the last round
    correctAnswerBonus: 3, // Bonus chips for closest answer without going over
    exactAnswerBonus: 0, // Extra bonus for getting an answer exactly
    centerPayout: 2, // The payout multiplier for the middle slot
    endPayout: 5, // The maximum payout multiplier for player answers
    elvisPayout: 6 // Elvis's payout multiplier
  },
  gameState: {
    players: [],
    maxPlayerId: 0,
    round: 1,
    betting: false
  }
}

function newGame() {
  wwApp.gameState.round = 1;
  wwApp.gameState.betting = false;
  updatePlayerList();
}

function confirmNewGame() {
  if (window.confirm("Are you sure you want to end the current game?"))
    newGame();
}

function setStatusMessage(msg) {
  document.getElementById("message").innerHTML = '<h3>' + msg + '</h3>';
}

function addPlayer() {
  let player = {
    id: ++wwApp.gameState.maxPlayerId,
    name: 'Player ' + (wwApp.gameState.players.length + 1),
    cash: wwApp.config.startingCash,
    guess: null,
    bet1Amount: null,
    bet1Guess: null,
    bet2Amount: null,
    bet2Guess: null
  };

  let name = window.prompt('Enter player name', player.name);

  if (name !== null) {
    if (name.length > 0)
      player.name = name;

    wwApp.gameState.players.push(player);
    updatePlayerList();
  }
}

function removePlayer(id) {
  let players = wwApp.gameState.players;
  let i = players.findIndex((player) => player.id == id);
  let name = players[i].name;

  if (i >= 0 && window.confirm("Are you sure you want to remove player '" + name + "'?")) {
    players.splice(i, 1);
    updatePlayerList();
  }
}

function updatePlayerList() {
  let output = '<table class="listing">';
  output += '<tr><th></th><th>Player</th><th>Chips</th>';

  let betting = wwApp.gameState.betting;
  if (betting)
    output += '<th>First Wager</th><th>Second Wager</th></tr>';
  else
    output += '<th>Guess</th></tr>';

  // Sort players by cash
  let players = wwApp.gameState.players;
  players.sort((p1,p2) => p2.cash - p1.cash);
  for (let player of players) {
    output += '<tr><td><a onclick="removePlayer(' + player.id + ')">&times;</a></td>';
    output += '<td>' + player.name + '</td><td>$' + player.cash + '</td>';

    if (betting) {
      output += '<td>' + generateWagerInputs(player.id, 1) + '</td>';
      output += '<td>' + generateWagerInputs(player.id, 2) + '</td>';
    } else {
      output += '<td><input type="number" class="guess" value="';
      if (player.guess !== null)
        output += player.guess;
      output += '" /></td>'
    }
    output += '</tr>';
  }

  output += '<tr><td></td><td><a onclick="addPlayer()">Add Player</a></td><td></td>';
  if (betting)
    output += '<td colspan="2"><a onclick="confirmBets()">Confirm Bets</a></td>';
  else
    output += '<td><a onclick="confirmGuesses()">Confirm Guesses</a></td>';
  output += '</tr></table>';

  document.getElementById("playerList").innerHTML = output;

  if (betting)
    updateWagerSelects();
}

function generateWagerInputs(playerId, wagerNum) {
  let output = '';
  let limit = currentBetLimit();
  let config = wwApp.config;
  let wagerChipValue = (wagerNum == 1) ? config.wagerChipValue1 : config.wagerChipValue2;

  if (wagerChipValue > 0)
    output += wagerChipValue + ' ';
  if (limit === null || limit > 0) {
    if (wagerChipValue > 0)
      output += '+ ';
    output += '<input type="number" class="numInput" id="player'
      + playerId + 'Wager' + wagerNum + 'Amount" /> chip(s) on ';
  } else {
    output += 'chip';
    if (wagerChipValue != 1)
      output += 's';
    output += ' on ';
  }

  output += '<select id="player' + playerId + 'Wager' + wagerNum + 'Guess" ';
  output += 'onchange="updateBets()">';
  output += '</select>';

  return output;
}

function updateWagerSelects() {
}

function currentBetLimit() {
  let config = wwApp.config;

  if (config.numRounds === null)
    return config.betLimit;
  else
    return (wwApp.gameState.round == config.numRounds) ?
    config.lastRoundBetLimit
    : config.betLimit;
}

function confirmGuesses() {
  wwApp.gameState.betting = true;
  updatePlayerList();
}

function confirmBets() {
}

function loadOptions() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("options").style.display = "block";

  let config = wwApp.config;

  // Select rule set
  let selector = document.getElementById("ruleSet");
  switch (config.id) {
  default:
  case ruleSets.standard:
    selector.value = "secondEd";
    break;
  case ruleSets.old:
    selector.value = "firstEd";
    break;
  case ruleSets.family:
    selector.value = "family";
    break;
  case ruleSets.party:
    selector.value = "party";
    break;
  case ruleSets.custom:
    selector.value = "custom";
    break;
  }

  if (config.numRounds === null) {
    document.getElementById("limitScore").checked = true;
    document.getElementById("winningScore").value = config.winningScore;
  } else {
    document.getElementById("limitRounds").checked = true;
    document.getElementById("numRounds").value = config.numRounds;
  }

  document.getElementById("wagerVal1").value = config.wagerChipValue1;
  document.getElementById("wagerVal2").value = config.wagerChipValue2;
  document.getElementById("startingCash").value = config.startingCash;

  let limitBets = document.getElementById("limitBets");
  let limitBetsLastRound = document.getElementById("limitBetsLastRound");
  if (config.betLimit !== null) {
    limitBets.checked = true;
    document.getElementById("maxBet").value = config.betLimit;
  } else {
    limitBets.checked = false;
  }

  if (config.lastRoundBetLimit !== null) {
    limitBetsLastRound.checked = true;
    document.getElementById("maxBetLastRound").value = config.lastRoundBetLimit;
  } else {
    limitBetsLastRound.checked = false;
  }

  document.getElementById("correctAnswerBonus").value = config.correctAnswerBonus;
  document.getElementById("exactAnswerBonus").value = config.exactAnswerBonus;
  document.getElementById("centerPayout").value = config.centerPayout;
  document.getElementById("endPayout").value = config.endPayout;
  document.getElementById("elvisPayout").value = config.elvisPayout;

  updateOptions();
}

function updateOptions() {
  let selector = document.getElementById("ruleSet");
  let limitRounds = document.getElementById("limitRounds");
  let limitScore = document.getElementById("limitScore");
  let numRounds = document.getElementById("numRounds");
  let winningScore = document.getElementById("winningScore");
  let wagerVal1 = document.getElementById("wagerVal1");
  let wagerVal2 = document.getElementById("wagerVal2");
  let startingCash = document.getElementById("startingCash");
  let limitBets = document.getElementById("limitBets");
  let limitBetsLastRound = document.getElementById("limitBetsLastRound");
  let maxBet = document.getElementById("maxBet");
  let maxBetLastRound = document.getElementById("maxBetLastRound");
  let correctAnswerBonus = document.getElementById("correctAnswerBonus");
  let exactAnswerBonus = document.getElementById("exactAnswerBonus");
  let centerPayout = document.getElementById("centerPayout");
  let endPayout = document.getElementById("endPayout");
  let elvisPayout = document.getElementById("elvisPayout");

  switch (selector.value) {
  default:
  case "secondEd":
    limitRounds.checked = true;
    numRounds.value = 7;
    wagerVal1.value = 1;
    wagerVal2.value = 1;
    startingCash.value = 0;
    limitBets.checked = false;
    limitBetsLastRound.checked = false;
    correctAnswerBonus.value = 3;
    exactAnswerBonus.value = 0;
    centerPayout.value = 2;
    endPayout.value = 5;
    elvisPayout.value = 6;
    break;
  case "firstEd":
    limitRounds.checked = true;
    numRounds.value = 7;
    wagerVal1.value = 0;
    wagerVal2.value = 0;
    startingCash.value = 2;
    limitBets.checked = true;
    maxBet.value = 10;
    limitBetsLastRound.checked = false;
    correctAnswerBonus.value = 10;
    exactAnswerBonus.value = 0;
    centerPayout.value = 1;
    endPayout.value = 4;
    elvisPayout.value = 5;
    break;
  case "family":
    limitScore.checked = true;
    winningScore.value = 15;
    wagerVal1.value = 2;
    wagerVal2.value = 1;
    startingCash.value = 0;
    limitBets.checked = true;
    maxBet.value = 0;
    limitBetsLastRound.checked = true;
    maxBetLastRound.value = 0;
    correctAnswerBonus.value = 1;
    exactAnswerBonus.value = 0;
    centerPayout.value = 1;
    endPayout.value = 1;
    elvisPayout.value = 1;
    break;
  case "party":
    limitRounds.checked = true;
    numRounds.value = 7;
    wagerVal1.value = 1;
    wagerVal2.value = 1;
    startingCash.value = 0;
    limitBets.checked = true;
    maxBet.value = 0;
    limitBetsLastRound.checked = false;
    correctAnswerBonus.value = 1;
    exactAnswerBonus.value = 0;
    centerPayout.value = 1;
    endPayout.value = 1;
    elvisPayout.value = 1;
    break;
  case "custom":
    break;
  }

  if (limitRounds.checked) {
    numRounds.disabled = false;
    winningScore.disabled = true;
  } else if (limitScore.checked) {
    numRounds.disabled = true;
    winningScore.disabled = false;
  }

  maxBet.disabled = !limitBets.checked;
  maxBetLastRound.disabled = !limitBetsLastRound.checked;
}

function customizeOptions() {
  document.getElementById("ruleSet").value = "custom";

  updateOptions();
}

function applyOptions() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("options").style.display = "none";

  // Get rule set
  let selector = document.getElementById("ruleSet");
  let config = wwApp.config;
  switch (selector.value) {
  default:
  case "secondEd":
    config.id = ruleSets.standard;
    break;
  case "firstEd":
    config.id = ruleSets.old;
    break;
  case "family":
    config.id = ruleSets.family;
    break;
  case "party":
    config.id = ruleSets.party;
    break;
  case "custom":
    config.id = ruleSets.custom;
    break;
  }

  let limitRounds = document.getElementById("limitRounds");
  let limitScore = document.getElementById("limitScore");
  if (limitRounds.checked) {
    config.numRounds = document.getElementById("numRounds").value;
    config.winningScore = null;
  } else {
    config.numRounds = null;
    config.winningScore = document.getElementById("winningScore").value;
  }

  config.wagerChipValue1 = document.getElementById("wagerVal1").value;
  config.wagerChipValue2 = document.getElementById("wagerVal2").value;
  config.startingCash = document.getElementById("startingCash").value;

  let limitBets = document.getElementById("limitBets");
  let limitBetsLastRound = document.getElementById("limitBetsLastRound");
  if (limitBets.checked)
    config.betLimit = document.getElementById("maxBet").value;
  else
    config.betLimit = null;
  if (limitBetsLastRound.checked)
    config.lastRoundBetLimit = document.getElementById("maxBetLastRound").value;
  else
    config.lastRoundBetLimit = null;

  config.correctAnswerBonus = document.getElementById("correctAnswerBonus").value;
  config.exactAnswerBonus = document.getElementById("exactAnswerBonus").value;
  config.centerPayout = document.getElementById("centerPayout").value;
  config.endPayout = document.getElementById("endPayout").value;
  config.elvisPayout = document.getElementById("elvisPayout").value;
}

function cancelOptions() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("options").style.display = "none";
}

function loadAbout() {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("about").style.display = "block";
}

function closeAbout() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("about").style.display = "none";
}
