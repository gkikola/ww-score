var ruleSets = {
  standard: 1,
  old: 2,
  family: 3,
  party: 4,
  custom: 5
}

var config = {
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
}

function newGame() {
}

function confirmNewGame() {
  if (window.confirm("Are you sure you want to end the current game?"))
    newGame();
}

function loadOptions() {
  document.getElementById("options").style.display = "block";

  // Select rule set
  var selector = document.getElementById("ruleSet");

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

  var limitBets = document.getElementById("limitBets");
  var limitBetsLastRound = document.getElementById("limitBetsLastRound");
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
  var selector = document.getElementById("ruleSet");
  var limitRounds = document.getElementById("limitRounds");
  var limitScore = document.getElementById("limitScore");
  var numRounds = document.getElementById("numRounds");
  var winningScore = document.getElementById("winningScore");
  var wagerVal1 = document.getElementById("wagerVal1");
  var wagerVal2 = document.getElementById("wagerVal2");
  var startingCash = document.getElementById("startingCash");
  var limitBets = document.getElementById("limitBets");
  var limitBetsLastRound = document.getElementById("limitBetsLastRound");
  var maxBet = document.getElementById("maxBet");
  var maxBetLastRound = document.getElementById("maxBetLastRound");
  var correctAnswerBonus = document.getElementById("correctAnswerBonus");
  var exactAnswerBonus = document.getElementById("exactAnswerBonus");
  var centerPayout = document.getElementById("centerPayout");
  var endPayout = document.getElementById("endPayout");
  var elvisPayout = document.getElementById("elvisPayout");

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
  document.getElementById("options").style.display = "none";

  // Get rule set
  var selector = document.getElementById("ruleSet");

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

  var limitRounds = document.getElementById("limitRounds");
  var limitScore = document.getElementById("limitScore");
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

  var limitBets = document.getElementById("limitBets");
  var limitBetsLastRound = document.getElementById("limitBetsLastRound");
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
  document.getElementById("options").style.display = "none";
}

function loadAbout() {
  document.getElementById("about").style.display = "block";
}

function closeAbout() {
  document.getElementById("about").style.display = "none";
}
