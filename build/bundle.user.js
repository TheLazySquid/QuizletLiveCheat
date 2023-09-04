// ==UserScript==
// @name        Quizlet Live Cheat
// @description A userscript that lets you cheat in Quizlet Live
// @namespace   https://github.com/TheLazySquid/QuizletLiveCheat
// @match       https://quizlet.com/live*
// @run-at      document-start
// @iconURL     https://assets.quizlet.com/a/j/dist/app/i/logo/2021/q-twilight.e27821d9baad165.png
// @author      TheLazySquid
// @updateURL   https://raw.githubusercontent.com/TheLazySquid/QuizletLiveCheat/main/build/bundle.user.js
// @downloadURL https://raw.githubusercontent.com/TheLazySquid/QuizletLiveCheat/main/build/bundle.user.js
// @version     0.1.0
// @license     MIT
// @grant       none
// ==/UserScript==
(function () {
  'use strict';

  var version = "0.1.0";

  var hudCss = "#qlc-hud {\r\n    position: absolute;\r\n    top: 15px;\r\n    left: 15px;\r\n    width: 300px;\r\n    height: 150px;\r\n    border: 2px solid black;\r\n    background-color: rgba(0, 0, 0, 0.5);\r\n    color: white;\r\n    border-radius: 5px;\r\n    display: flex;\r\n    flex-direction: column;\r\n    align-items: center;\r\n    z-index: 9999999999;\r\n    padding: 10px;\r\n}\r\n\r\n#qlc-hud button {\r\n    width: 80%;\r\n    background: rgba(0, 0, 0, 0.5);\r\n    color: white;\r\n    border-radius: 5px;\r\n    border: none;\r\n    font-size: 20px;\r\n    margin: 5px;\r\n    transition: transform 0.2s;\r\n}\r\n\r\n#qlc-hud button:active {\r\n    transform: scale(0.93);\r\n}\r\n\r\n#qlc-hud button.active {\r\n    border: 3px solid rgb(123, 204, 1);\r\n}";

  var hudHtml = "<button class=\"answerOnce\">Answer Question</button>\r\n<button class=\"autoAnswer\">Auto Answer Questions</button>";

  // @ts-ignore
  class Hud extends EventTarget {
      constructor() {
          var _a;
          super();
          this.addStyleSheet();
          let hudElement = document.createElement("div");
          hudElement.id = "qlc-hud";
          hudElement.innerHTML = hudHtml;
          window.addEventListener("load", () => {
              document.body.appendChild(hudElement);
          });
          (_a = hudElement.querySelector(".answerOnce")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
              this.dispatchEvent(new CustomEvent("answerOnce"));
          });
          let autoAnswerBtn = hudElement.querySelector(".autoAnswer");
          let autoAnswering = false;
          autoAnswerBtn === null || autoAnswerBtn === void 0 ? void 0 : autoAnswerBtn.addEventListener("click", () => {
              autoAnswering = !autoAnswering;
              // switch the button to active if auto answering is on
              autoAnswerBtn === null || autoAnswerBtn === void 0 ? void 0 : autoAnswerBtn.classList.toggle("active", autoAnswering);
              this.dispatchEvent(new CustomEvent("toggleAutoAnswer"));
          });
          // toggle the hud with \
          let hudOpen = true;
          window.addEventListener("keydown", (e) => {
              if (e.key != "\\")
                  return;
              hudOpen = !hudOpen;
              if (!hudOpen)
                  hudElement.style.display = "none";
              else
                  hudElement.style.display = "flex";
          });
      }
      addStyleSheet() {
          let style = new CSSStyleSheet();
          style.replaceSync(hudCss);
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];
      }
  }

  class Cheat {
      constructor() {
          this.alreadyIntercepted = false;
          this.hasPrompts = [];
          this.currentPrompts = [];
          this.streakNumber = 0;
          this.roundNumber = 0;
          this.autoAnswering = false;
          this.hud = new Hud();
          this.hud.addEventListener("answerOnce", () => {
              this.answerQuestion();
          });
          this.hud.addEventListener("toggleAutoAnswer", () => {
              this.autoAnswering = !this.autoAnswering;
              this.answerQuestion();
          });
          this.setupSocketGetting();
      }
      log(...args) {
          console.log("[QLC]", ...args);
      }
      setIo(io) {
          // io is the socket.io instance that the game uses to communicate with the server
          this.io = io;
          this.log("io set", io);
          // this.attachDebugListeners();
          io.on("current-game-state-and-set", this.handleGameState.bind(this));
          io.on("current-game-state", this.handleGameState.bind(this));
          io.on("matchteam.new-answer", (data) => {
              this.streakNumber = data.streakNum;
              this.roundNumber = data.roundNum + 1;
              // if the answer is incorrect, reset the streak and round number
              if (!data.answer.isCorrect) {
                  this.streakNumber++;
                  this.roundNumber = 0;
              }
              // update the prompts
              let newPrompts = data.terms[this.getPlayerId()];
              if (newPrompts)
                  this.hasPrompts = newPrompts;
              if (this.autoAnswering) {
                  this.answerQuestion();
              }
          });
          io.on("matchteam.new-streak", (data) => {
              this.setPrompts(data.streak);
          });
      }
      attachDebugListeners() {
          var _a;
          const listenTo = ["reconnect_failed", "connect_error", "current-game-state-and-set", "current-game-state", "current-team-state", "current-leaderboard-state", "replay-game", "delete-game", "reconnect_failed", "error", "reconnecting", "connect", "disconnect", "game-error", "matchteam.new-answer", "matchteam.new-streak", "matchteam.submit-answer", "late-join-backfill", "next-question", "game-status", "player-added", "player-info-reload", "grade-answers", "user-answers", "studiable-item-ids", "written-studiable-item-ids", "game-errors", "game-restarted", "player-removed", "late-join", "qping", "player-info", "next-question", "answer-info"];
          for (let event of listenTo) {
              (_a = this.io) === null || _a === void 0 ? void 0 : _a.on(event, (...args) => {
                  this.log("event", event, args);
              });
          }
      }
      setPrompts(streak) {
          this.currentPrompts = streak.prompts;
          let newPrompts = streak.terms[this.getPlayerId()];
          if (newPrompts)
              this.hasPrompts = newPrompts;
      }
      handleGameState(data) {
          console.log(data);
          let playerId = this.getPlayerId();
          let playerTeam = data.teams.find(team => team.players.includes(playerId));
          console.log("playerTeam", playerTeam);
          if (!playerTeam)
              return;
          let streak = playerTeam.streaks[playerTeam.streaks.length - 1];
          console.log("streak", streak);
          if (!streak)
              return;
          this.setPrompts(streak);
          // get the current streak and round number
          this.streakNumber = playerTeam.streaks.length - 1;
          this.roundNumber = streak.answers.length;
      }
      answerQuestion() {
          var _a;
          let correctId = this.currentPrompts[this.roundNumber];
          if (!this.hasPrompts.includes(correctId))
              return;
          (_a = this.io) === null || _a === void 0 ? void 0 : _a.emit("matchteam.submit-answer", {
              streak: this.streakNumber,
              round: this.roundNumber,
              termId: correctId
          });
          console.log(this.streakNumber, this.roundNumber, correctId);
      }
      getPlayerId() {
          let playerId = String(window.Quizlet.user.id);
          if (playerId)
              return playerId;
          return window.Quizlet.uid;
      }
      setupSocketGetting() {
          let cheat = this;
          const observer = new MutationObserver(function (mutations) {
              mutations.forEach(function (mutation) {
                  // Check if a new script element was added
                  if (mutation.type !== 'childList')
                      return;
                  const addedNodes = Array.from(mutation.addedNodes);
                  for (let node of addedNodes) {
                      let src;
                      if (node.nodeName == "LINK") {
                          src = node.href;
                      }
                      else if (node.nodeName == "SCRIPT") {
                          src = node.src;
                      }
                      else
                          continue;
                      if (!src.includes("live_game_student"))
                          continue;
                      // get rid of the element so it doesn't get executed
                      node.remove();
                      if (cheat.alreadyIntercepted)
                          continue;
                      cheat.alreadyIntercepted = true;
                      // we want to manually fetch the script so we can modify it
                      fetch(src)
                          .then(response => response.text())
                          .then(text => {
                          const insertAfter = "j=E()((0,i.Z)(w)),";
                          const insertText = "window.qlc.setIo(j),";
                          // find the index of "j=E()((0,i.Z)(w))," and append "window.qlc.io=j," after it
                          const index = text.indexOf(insertAfter) + insertAfter.length;
                          text = text.slice(0, index) + insertText + text.slice(index);
                          // create a new blob with the modified text
                          const blob = new Blob([text], { type: 'text/javascript' });
                          const url = URL.createObjectURL(blob);
                          // create a new script element with the modified url
                          const script = document.createElement('script');
                          script.src = url;
                          // append the script element to the document
                          document.head.appendChild(script);
                      });
                  }
              });
          });
          observer.observe(document.documentElement, {
              childList: true,
              subtree: true
          });
      }
  }

  window.qlc = new Cheat();
  console.log(`Quizlet Live Cheat v${version} loaded!`);

})();
