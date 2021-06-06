const ruleSets = {
  standard: 1, // 2nd edition rules
  old: 2, // 1st edition rules
  family: 3, // Family rules
  party: 4, // Party rules
  custom: 5 // Custom rules
};

const phases = {
  guessing: 1, // Beginning of round, players are making guesses
  confirmingGuesses: 2, // Players confirming entered guesses
  betting: 3, // Players are placing bets
  confirmingBets: 4, // Players confirming entered bets
  revealingAnswer: 5, // End of round, answer revealed and points added up
  results: 6 // Round-end summary is shown
}

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
  appState: {
    dialog: {
      id: null,
      playerId: null
    }
  },
  gameState: {
    players: [],
    maxPlayerId: 0,
    round: 1,
    phase: phases.guessing,
    firstBet: true,
    remainingGuessers: [],
    remainingBetters: [],
    guessList: [],
    selectedGuess: null,
    answer: null
  }
}

document.addEventListener('keydown', handleKeyPress);

window.addEventListener('beforeunload', function (e) {
  // Confirm exit if players have been added
  if (wwApp.gameState.players.length > 0) {
    e.preventDefault();
    e.returnValue = '';
  } else { // Otherwise, let page unload
    delete e['returnValue'];
  }
});

function handleKeyPress(e) {
  const key = e.key;

  let appState = wwApp.appState;
  let gameState = wwApp.gameState;

  if (appState.dialog.id !== null) {
    // Enter should apply the changes in the dialog box
    if (key === 'Enter') {
      applyDialog();
    } else if (key === 'Escape') { // Escape should cancel
      if (appState.dialog.id === 'confirm-guesses')
        cancelGuesses();
      else if (appState.dialog.id === 'confirm-bets')
        cancelBets();
      else
        cancelDialog();
    }

    // Arrow keys should change bet selection
    if (appState.dialog.id === 'do-betting') {
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        if (gameState.selectedGuess === null || gameState.selectedGuess === 0)
          gameState.selectedGuess = gameState.guessList.length - 1;
        else
          gameState.selectedGuess--;
        updateWagerBoard();
      } else if (key === 'ArrowRight' || key === 'ArrowDown') {
        if (gameState.selectedGuess === null
            || gameState.selectedGuess >= gameState.guessList.length - 1)
          gameState.selectedGuess = 0;
        else
          gameState.selectedGuess++;
        updateWagerBoard();
      }
    }
  } else {
    switch (key) {
    case 'n':
      loadDialog('add-player');
      e.preventDefault();
      break;
    case ' ':
    case 'Enter':
      if (gameState.players.length > 0) {
        loadDialog(getPhaseAction());
      }
      break;
    }
  }
}

// Prevent form submission
function submitForm(e) {
  e.preventDefault();
}

// Sanitize HTML from inputs
function sanitize(string) {
  let elem = document.createElement('div');
  elem.innerText = string;
  return elem.innerHTML;
}

function newGame() {
  let state = wwApp.gameState;

  for (let player of state.players) {
    player.cash = wwApp.config.startingCash;
    player.rank = 1;
  }

  state.round = 0;
  newRound();
  updatePlayerList();
}

function newRound() {
  let state = wwApp.gameState;
  state.round++;
  state.phase = phases.guessing;
  state.firstBet = true;
  state.remainingGuessers = [];
  state.remainingBetters = [];
  state.guessList = [];
  state.selectedAnswer = null;
  state.answer = null;

  for (let player of state.players) {
    player.guess = null;
    player.bet1Amount = null;
    player.bet1Guess = null;
    player.bet2Amount = null;
    player.bet2Guess = null;
  }

  updateStatus();
}

function isGameOver() {
  let state = wwApp.gameState;
  let config = wwApp.config;

  if (config.numRounds !== null && state.round >= config.numRounds)
    return true;

  if (config.winningScore !== null) {
    let index = state.players.findIndex(p1 => p1.cash >= config.winningScore);

    if (index >= 0)
      return true;
  }

  return false;
}

function getPhaseMessage() {
  switch (wwApp.gameState.phase) {
  default:
  case phases.guessing:
    return 'Make Your Guesses';
  case phases.confirmingGuesses:
    return 'Confirm Your Guesses';
  case phases.betting:
    return 'Place Your Bets';
  case phases.confirmingBets:
    return 'Confirm Your Bets';
  case phases.revealingAnswer:
    return 'Reveal the Answer';
  case phases.results:
    return 'Displaying Results';
  }
}

function getPhaseAction() {
  switch (wwApp.gameState.phase) {
  default:
  case phases.guessing:
    return 'do-guessing';
  case phases.confirmingGuesses:
    return 'confirm-guesses';
  case phases.betting:
    return 'do-betting';
  case phases.confirmingBets:
    return 'confirm-bets';
  case phases.revealingAnswer:
    return 'do-answer';
  case phases.results:
    return 'results';
  }
}

function updateStatus() {
  let config = wwApp.config;
  let state = wwApp.gameState;
  let iconAction = null;

  roundElem = document.getElementById("round");
  if (config.numRounds !== null && state.round <= config.numRounds)
    roundElem.innerHTML = 'Round ' + state.round + ' of ' + config.numRounds;
  else
    roundElem.innerHTML = 'Round ' + state.round;

  if (state.players.length < 1) {
    setStatusMessage('Waiting for Players to Be Added...');
  } else {
    setStatusMessage(getPhaseMessage());
    iconAction = 'loadDialog(\'' + getPhaseAction() + '\')';
  }

  let icon = document.getElementById("message-icon");
  if (iconAction !== null) {
    icon.innerHTML = '<a class="game-icon material-icons" onclick="'
      + iconAction + '">launch</a>';
  } else {
    icon.innerHTML = '';
  }
}

function setStatusMessage(msg) {
  document.getElementById("message").innerHTML = msg;
}

function addPlayer(name) {
  if (name === null)
    return false;

  name = name.trim();
  if (name.length === 0)
    return false;

  let player = {
    id: ++wwApp.gameState.maxPlayerId,
    name: name,
    cash: wwApp.config.startingCash,
    rank: 1,
    guess: null,
    bet1Amount: null,
    bet1Guess: null,
    bet2Amount: null,
    bet2Guess: null
  };

  wwApp.gameState.players.push(player);
  updateStatus();
  updatePlayerList();

  return true;
}

function updateRankings() {
  let players = [...wwApp.gameState.players];

  // Sort player list by cash, descending
  players.sort((p1, p2) => p2.cash - p1.cash);

  let prevCash = null;
  let curRank = 1;
  for (let i = 0; i < players.length; i++) {
    if (players[i].cash !== prevCash)
      curRank = i + 1;

    getPlayer(players[i].id).rank = curRank;
    prevCash = players[i].cash;
  }
}

function rankToString(rank) {
  switch (rank % 10) {
  default:
  case 0:
    return rank + 'th';
  case 1:
    return (rank % 100 === 11) ? rank + 'th' : rank + 'st';
  case 2:
    return (rank % 100 === 12) ? rank + 'th' : rank + 'nd';
  case 3:
    return (rank % 100 === 13) ? rank + 'th' : rank + 'rd';
  case 4: case 5: case 6:
  case 7: case 8: case 9:
    return rank + 'th';
  }
}

function getPlayer(id) {
  let index = getPlayerIndex(id);

  return wwApp.gameState.players[index];
}

function getPlayerIndex(id) {
  return wwApp.gameState.players.findIndex(player => player.id === id);
}

function removePlayer(id) {
  let playerIndex = getPlayerIndex(id);
  wwApp.gameState.players.splice(playerIndex, 1);
  updateStatus();
  updatePlayerList();
}

function updatePlayerList() {
  let output = '';

  updateRankings();

  // Copy player list
  let players = [...wwApp.gameState.players];

  // Sort player list by rank
  players.sort((p1, p2) => p1.rank - p2.rank);

  for (let player of players) {
    output += '<div class="player">';
    output += '<div class="player-name">' + player.name;
    output += '<span class="player-controls">';
    output += '<a class="game-icon material-icons" ';
    output += 'onclick="loadDialog(\'edit-player\', ' + player.id + ')">edit</a>'
    output += '<a class="game-icon material-icons" ';
    output += 'onclick="loadDialog(\'remove-player\', ' + player.id + ')">delete</a>';
    output += '</span></div>';
    output += '<div class="player-stats">';
    output += '<span class="player-rank">' + rankToString(player.rank) + '</span>';
    output += '<span class="player-cash">$' + player.cash + '</span>';
    output += '</div></div>';
  }

  document.getElementById("player-list").innerHTML = output;
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

function startGuessing() {
  let state = wwApp.gameState;
  state.remainingGuessers = [];

  // Sort players by descending rank
  let players = [...wwApp.gameState.players];
  players.sort((p1, p2) => p2.rank - p1.rank);

  // Build guessing list
  players.forEach(player => state.remainingGuessers.push(player.id));

  updateGuessDialog();
}

function updateGuessDialog() {
  let remaining = wwApp.gameState.remainingGuessers;
  let player = getPlayer(remaining[0]);

  let guessInput = document.getElementById('guess');
  if (player.guess === null)
    guessInput.value = '';
  else
    guessInput.value = player.guess;

  guessInput.select();

  document.getElementById('guess-dialog-turn-indicator').innerHTML = player.name + '\'s Turn';
  document.getElementById('guess-dialog-player-name').innerHTML = player.name;
}

function makeGuess() {
  let remaining = wwApp.gameState.remainingGuessers;
  let player = getPlayer(remaining[0]);

  let guess = Number.parseInt(document.getElementById('guess').value);
  if (Number.isFinite(guess)) {
    player.guess = guess;
    remaining.shift();
  } else {
    alert("You must enter a numeric value.");
  }

  if (remaining.length === 0) {
    cancelDialog();
    wwApp.gameState.phase = phases.confirmingGuesses;
    updateStatus();
    loadDialog('confirm-guesses');
  } else {
    updateGuessDialog();
  }
}

function confirmGuesses() {
  // Sort players by descending rank
  let players = [...wwApp.gameState.players];
  players.sort((p1, p2) => p2.rank - p1.rank);

  // List player guesses
  let output = '<table><tr><th>Player</th><th>Guess</th></tr>';
  for (let player of players) {
    output += '<tr><td>' + player.name + '</td><td>';
    output += player.guess + '</td></tr>';
  }
  output += '</table>';
  document.getElementById('list-of-guesses').innerHTML = output;
}

function cancelGuesses() {
  wwApp.gameState.phase = phases.guessing;
  cancelDialog();
  updateStatus();
}

function startBetting() {
  // Sort players by descending rank
  let players = [...wwApp.gameState.players];
  players.sort((p1, p2) => p2.rank - p1.rank);

  // Build guess and betting lists
  let state = wwApp.gameState;
  state.remainingBetters = [];
  state.guessList = [];
  state.selectedGuess = null;
  state.firstBet = true;
  for (let player of players) {
    state.remainingBetters.push(player.id);

    let guessIndex = state.guessList.findIndex(g => g.value === player.guess);
    if (guessIndex < 0)
      state.guessList.push({
        value: player.guess,
        players: [player.name],
        payout: 1
      });
    else
      state.guessList[guessIndex].players.push(player.name);
  }

  // Sort list of guesses from low to high
  state.guessList.sort((g1, g2) => g1.value - g2.value);

  // Add Elvis guess
  state.guessList.unshift({value: null, players: ['(Elvis)']});

  // Set payouts
  calculatePayouts();

  updateBetDialog();
}

function calculatePayouts() {
  let guessList = wwApp.gameState.guessList;

  let payout = wwApp.config.centerPayout;
  let maxPayout = wwApp.config.endPayout;

  // Set Elvis's payout
  guessList[0].payout = wwApp.config.elvisPayout;

  // Set player guess payouts
  let count = guessList.length;
  if (count % 2 === 0) { // Even number of guesses (or odd excluding Elvis)
    for (let i = 0; i < count / 2; i++) {
      guessList[count / 2 - i].payout = payout;
      guessList[count / 2 + i].payout = payout;

      payout++;
      if (payout > maxPayout)
        payout = maxPayout;
    }
  } else { // Odd number of guesses (even number excluding Elvis)
    for (let i = 0; i < (count - 1) / 2; i++) {
      payout++;
      if (payout > maxPayout)
        payout = maxPayout;

      guessList[(count - 1) / 2 - i].payout = payout;
      guessList[(count - 1) / 2 + i + 1].payout = payout;
    }
  }
}

function updateBetDialog() {
  let remaining = wwApp.gameState.remainingBetters;
  let player = getPlayer(remaining[0]);
  let firstBet = wwApp.gameState.firstBet;

  document.getElementById('bet-dialog-turn-indicator').innerHTML = player.name + '\'s Turn';
  document.getElementById('bet-dialog-player-name').innerHTML = player.name;
  document.getElementById('bet-dialog-bet-number').innerHTML = (firstBet) ? 'first' : 'second';

  let pointValue = (firstBet) ? wwApp.config.wagerChipValue1 : wwApp.config.wagerChipValue2;
  let pointDisplay = '';
  if (pointValue !== 0) {
    pointDisplay = ' (worth ' + pointValue + ' point';
    if (pointValue !== 1)
      pointDisplay += 's';
    pointDisplay += ')'
  }
  document.getElementById('bet-dialog-bet-points').innerHTML = pointDisplay;

  let betLimit = currentBetLimit();
  if (betLimit === null || player.cash < betLimit)
    betLimit = player.cash;

  if (!firstBet && player.bet1Amount !== null)
    betLimit -= player.bet1Amount;

  document.getElementById('bet-dialog-bet-limit').innerHTML = betLimit;

  let betAmount = (firstBet) ? player.bet1Amount : player.bet2Amount;
  let additionalBetElem = document.getElementById('bet-dialog-additional-bet-amount');
  let betAmountInput = document.getElementById('additional-bet-amount');
  betAmountInput.value = '';
  if (betLimit !== 0) {
    additionalBetElem.style.display = 'block';
    if (betAmount !== null)
      betAmountInput.value = betAmount;
  } else {
    additionalBetElem.style.display = 'none';
  }

  let betGuess = (firstBet) ? player.bet1Guess : player.bet2Guess;
  selectGuess(betGuess);
}

function updateWagerBoard() {
  let output = '';
  const guessList = wwApp.gameState.guessList;
  const selected = wwApp.gameState.selectedGuess;

  for (let i = 0; i < guessList.length; i++) {
    output += '<div class="guess';

    if (selected === i)
      output += ' selected-guess';

    output += '" id="guess' + i + '" onclick="selectGuess(' + i + ')">';
    output += '<span class="guess-payout">Pays ' + guessList[i].payout + ' to 1</span>';
    output += '<span class="guess-value">';
    if (guessList[i].value === null)
      output += '&minus;&infin;';
    else
      output += guessList[i].value;
    output += '</span>';
    for (let playerName of guessList[i].players) {
      output += '<span class="guess-player">' + playerName + '</span>';
    }
    output += '</div>';
  }

  document.getElementById('wager-board').innerHTML = output;
}

function selectGuess(index) {
  wwApp.gameState.selectedGuess = index;
  updateWagerBoard();
}

function placeBet() {
  let remaining = wwApp.gameState.remainingBetters;
  let player = getPlayer(remaining[0]);

  let firstBet = wwApp.gameState.firstBet;
  let selection = wwApp.gameState.selectedGuess;
  let betAmount = Number.parseInt(document.getElementById('additional-bet-amount').value);

  if (!Number.isFinite(betAmount))
    betAmount = 0;

  let maxBet = currentBetLimit();

  if (maxBet === null || maxBet > player.cash)
    maxBet = player.cash;
  if (!firstBet && player.bet1Amount !== null)
    maxBet -= player.bet1Amount;
  if (betAmount > maxBet) {
    alert('You can not bet more than $' + maxBet + '.');
    return;
  }

  if (selection !== null) {
    if (wwApp.gameState.firstBet) {
      player.bet1Guess = selection;
      player.bet1Amount = betAmount;
      wwApp.gameState.firstBet = false;
    } else {
      player.bet2Guess = selection;
      player.bet2Amount = betAmount;
      remaining.shift();
      wwApp.gameState.firstBet = true;
    }
  } else {
    alert('You must select a guess to bet on.');
    return;
  }

  if (remaining.length === 0) {
    cancelDialog();
    wwApp.gameState.phase = phases.confirmingBets;
    updateStatus();
    loadDialog('confirm-bets');
  } else {
    updateBetDialog();
  }
}

function confirmBets() {
  // Sort players by descending rank
  let players = [...wwApp.gameState.players];
  players.sort((p1, p2) => p2.rank - p1.rank);

  let limit = currentBetLimit();
  let showAmounts = (limit !== 0);
  let guessList = wwApp.gameState.guessList;

  // List player bets
  let output = '<table><tr><th>Player</th><th>First Bet</th>';
  output += '<th>Second Bet</th></tr>';
  for (let player of players) {
    let value1 = guessList[player.bet1Guess].value;
    if (value1 === null)
      value1 = '&minus;&infin;';
    let value2 = guessList[player.bet2Guess].value;
    if (value2 === null)
      value2 = '&minus;&infin;';

    output += '<tr><td>' + player.name + '</td><td>';
    output += value1;
    if (showAmounts)
      output += ' ($' + player.bet1Amount + ')';
    output += '</td><td>';
    output += value2;
    if (showAmounts)
      output += ' ($' + player.bet2Amount + ')';
    output += '</td></tr>'
  }
  output += '</table>';
  document.getElementById('list-of-bets').innerHTML = output;
}

function cancelBets() {
  wwApp.gameState.phase = phases.betting;
  cancelDialog();
  updateStatus();
}

function revealAnswer() {
  wwApp.gameState.answer = Number.parseInt(document.getElementById('answer').value);

  if (!Number.isFinite(wwApp.gameState.answer)) {
    alert('You must enter a numeric answer.');
  } else {
    cancelDialog();
    wwApp.gameState.phase = phases.results;
    updateStatus();
    loadDialog('results');
  }
}

function showResults() {
  let state = wwApp.gameState;

  document.getElementById('results-heading').innerHTML = 'Round ' + state.round + ' Results';

  let answer = state.answer;
  let winningGuess = 0;
  for (let i = 1; i < state.guessList.length; i++) {
    let value = state.guessList[i].value;

    if (value <= answer)
      winningGuess = i;
    else
      break;
  }

  let winningValue = state.guessList[winningGuess].value;
  let winningPayoutMultiplier = state.guessList[winningGuess].payout;
  let playerResults = [];

  for (let player of state.players) {
    let correctGuess = false;
    let correctBet1 = false;
    let correctBet2 = false;
    let netChange = 0;

    // Did the player guess correctly?
    if (player.guess === winningValue) {
      correctGuess = true;
      netChange += wwApp.config.correctAnswerBonus;
      if (winningValue === answer)
        netChange += wwApp.config.exactAnswerBonus;
    }

    // Was the player's first bet on the correct guess?
    if (player.bet1Guess === winningGuess) {
      correctBet1 = true;

      let payout = wwApp.config.wagerChipValue1;

      if (player.bet1Amount !== null)
        payout += player.bet1Amount;

      payout *= winningPayoutMultiplier;

      netChange += payout;
    } else if (player.bet1Amount !== null) {
      netChange -= player.bet1Amount;
    }

    // Was the player's second bet on the correct guess?
    if (player.bet2Guess === winningGuess) {
      correctBet2 = true;

      let payout = wwApp.config.wagerChipValue2;

      if (player.bet2Amount !== null)
        payout += player.bet2Amount;

      payout *= winningPayoutMultiplier;

      netChange += payout;
    } else if (player.bet2Amount !== null) {
      netChange -= player.bet2Amount;
    }

    playerResults.push({
      name: player.name,
      correctGuess: correctGuess,
      correctBet1: correctBet1,
      correctBet2: correctBet2,
      netChange: netChange
    });

    player.cash += netChange;
  }

  // Sort results by net cash gain/loss
  playerResults.sort((r1, r2) => r2.netChange - r1.netChange);

  let results = '<table><tr><th>Player</th>';
  results += '<th class="narrow-heading">Correct Answer?</th>';
  results += '<th class="narrow-heading">First Bet Correct?</th>';
  results += '<th class="narrow-heading">Second Bet Correct?</th>';
  results += '<th class="narrow-heading">Net Gain/Loss</th></tr>';

  let check = '<td class="correct">&check;</td>';
  let cross = '<td class="incorrect">&cross;</td>';

  for (let pResult of playerResults) {
    results += '<tr><td>' + pResult.name + '</td>';
    results += (pResult.correctGuess) ? check : cross;
    results += (pResult.correctBet1) ? check : cross;
    results += (pResult.correctBet2) ? check : cross;

    results += '<td class="';
    if (pResult.netChange > 0)
      results += 'positive-cash">$+';
    else if (pResult.netChange < 0)
      results += 'negative-cash">$';
    else
      results += 'zero-cash">$';
    results += pResult.netChange + '</td>';

    results += '</tr>';
  }

  results += '</table>';

  document.getElementById('results-body').innerHTML = results;

  updatePlayerList();
}

function showVictory() {
  let players = [...wwApp.gameState.players];
  let winners = [];

  for (let player of players) {
    if (player.rank === 1)
      winners.push(player.name);
  }

  players.sort((p1, p2) => p1.rank - p2.rank);

  let heading = '';
  if (winners.length === 1)
    heading = winners[0] + ' is the winner! Congratulations!';
  else {
    heading = 'It\'s a tie! The winners are';
    for (let i = 0; i < winners.length; i++) {
      heading += ' ';
      heading += winners[i];
      if (winners.length > 2 && i < winners.length - 1)
        heading += ',';
      if (i === winners.length - 2)
        heading += ' and';
    }
    heading += '. Congratulations!';
  }

  document.getElementById('victory-heading').innerHTML = heading;

  let results = '<table><tr><th>Player</th><th>Rank</th><th>Cash</th></tr>';

  for (let player of players) {
    results += '<tr>';
    results += '<td>' + player.name + '</td>';
    results += '<td>' + rankToString(player.rank) + '</td>';
    results += '<td class="positive-cash">$' + player.cash + '</td>';
    results += '</tr>';
  }
  results += '</table>';

  document.getElementById('victory-body').innerHTML = results;
}

function loadDialog(id, playerId = null) {
  document.getElementById('overlay').style.display = 'block';
  document.getElementById(id).style.display = 'block';
  wwApp.appState.dialog.id = id;
  wwApp.appState.dialog.playerId = playerId;

  let player = null;
  if (playerId !== null)
    player = getPlayer(playerId);

  switch (id) {
  case 'new-game':
    document.getElementById('yes-new-game').focus();
    break;
  case 'add-player':
    let name = 'Player ' + (wwApp.gameState.maxPlayerId + 1);
    let nameBox = document.getElementById('player-name');
    nameBox.value = name;
    nameBox.select();
    break;
  case 'edit-player':
    let nameChangeBox = document.getElementById('new-player-name');
    nameChangeBox.value = player.name;
    nameChangeBox.select();
    document.getElementById('player-cash-override').value = player.cash;
    break;
  case 'remove-player':
    document.getElementById('remove-player-name').innerHTML = player.name;
    document.getElementById('yes-remove-player').focus();
    break;
  case 'do-guessing':
    startGuessing();
    break;
  case 'confirm-guesses':
    confirmGuesses();
    break;
  case 'do-betting':
    startBetting();
    break;
  case 'confirm-bets':
    confirmBets();
    break;
  case 'do-answer':
    let answerBox = document.getElementById('answer');
    answerBox.value = '';
    answerBox.focus();
    break;
  case 'results':
    showResults();
    break;
  case 'victory':
    showVictory();
    break;
  case 'options':
    loadOptions();
    break;
  case 'about':
    document.getElementById('about-okay').focus();
    break;
  case 'help':
    document.getElementById('help-okay').focus();
    break;
  default:
    break;
  }
}

function applyDialog() {
  let id = wwApp.appState.dialog.id;
  let playerId = wwApp.appState.dialog.playerId;

  switch (id) {
  case 'new-game':
    newGame();
    break;
  case 'add-player':
    if (!addPlayer(sanitize(document.getElementById('player-name').value)))
      return false;
    break;
  case 'edit-player':
    let player = getPlayer(playerId);
    player.name = sanitize(document.getElementById('new-player-name').value);

    let cashOverride = document.getElementById('player-cash-override').value;
    let newCash = Number.parseInt(cashOverride, 10);

    if (Number.isFinite(newCash))
      player.cash = newCash;

    updatePlayerList();
    break;
  case 'remove-player':
    removePlayer(playerId);
    break;
  case 'do-guessing':
    makeGuess();
    return false;
  case 'confirm-guesses':
    wwApp.gameState.phase = phases.betting;
    updateStatus();
    break;
  case 'do-betting':
    placeBet();
    return false;
  case 'confirm-bets':
    wwApp.gameState.phase = phases.revealingAnswer;
    updateStatus();
    break;
  case 'do-answer':
    revealAnswer();
    return false;
  case 'results':
    if (isGameOver()) {
      cancelDialog(id);
      loadDialog('victory');
      newRound();
      return false;
    } else {
      newRound();
    }
    break;
  case 'options':
    applyOptions();
    break;
  default:
    break;
  }

  cancelDialog(id);
  return true;
}

function cancelDialog() {
  let id = wwApp.appState.dialog.id;
  wwApp.appState.dialog.id = null;
  wwApp.appState.dialog.playerId = null;
  document.getElementById('overlay').style.display = 'none';
  document.getElementById(id).style.display = 'none';
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
    config.numRounds = Number.parseInt(document.getElementById("numRounds").value);
    config.winningScore = null;
  } else {
    config.numRounds = null;
    config.winningScore = Number.parseInt(document.getElementById("winningScore").value);
  }

  config.wagerChipValue1 = Number.parseInt(document.getElementById("wagerVal1").value);
  config.wagerChipValue2 = Number.parseInt(document.getElementById("wagerVal2").value);
  config.startingCash = Number.parseInt(document.getElementById("startingCash").value);

  let limitBets = document.getElementById("limitBets");
  let limitBetsLastRound = document.getElementById("limitBetsLastRound");
  if (limitBets.checked)
    config.betLimit = Number.parseInt(document.getElementById("maxBet").value);
  else
    config.betLimit = null;
  if (limitBetsLastRound.checked)
    config.lastRoundBetLimit = Number.parseInt(document.getElementById("maxBetLastRound").value);
  else
    config.lastRoundBetLimit = null;

  config.correctAnswerBonus = Number.parseInt(document.getElementById("correctAnswerBonus").value);
  config.exactAnswerBonus = Number.parseInt(document.getElementById("exactAnswerBonus").value);
  config.centerPayout = Number.parseInt(document.getElementById("centerPayout").value);
  config.endPayout = Number.parseInt(document.getElementById("endPayout").value);
  config.elvisPayout = Number.parseInt(document.getElementById("elvisPayout").value);

  updateStatus();
}
