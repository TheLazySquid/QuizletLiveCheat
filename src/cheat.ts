import { Socket } from "socket.io-client";
import type { IGameState, IGameStateAndSet, IHudInteract, INewAnswer, INewStreak, IQuizletStreak, IQuizletTerm, QuizletWindow } from "./interfaces";

export default class Cheat {
    alreadyIntercepted: boolean = false;
    io?: Socket;

    hasPrompts: number[] = [];
    terms: IQuizletTerm[] = [];

    currentPrompts: number[] = [];
    streakNumber: number = 0;
    roundNumber: number = 0;
    promptKind: string = "definition";

    hudInteract?: IHudInteract;
    
    constructor() {
        this.setupSocketGetting();
        window.addEventListener('load', () => {
            this.addUpdateObserver();
        })
    }

    addHudInteract(hudInteract: IHudInteract) {
        this.hudInteract = hudInteract;

        this.hudInteract.answerQuestion = this.answerQuestion.bind(this);
        this.hudInteract.onHelpModeChange = (mode: number) => {
            if(mode == 3) {
                // outline correct
                this.addCorrectBorder();
            } else {
                this.removeCorrectBorder();
            }
        }
        this.hudInteract.onShowAnswerChange = (showAnswer: boolean) => {
            if(showAnswer) {
                this.updateAnswerDisplay();
            } else {
                this.removeAnswerDisplay();
            }
        }
    }

    updateAnswerDisplay() {
        let correctId = this.currentPrompts[this.roundNumber];
        let cardInfo = this.terms.find(term => term.id == correctId);
        if(!cardInfo) return;

        // get the element to put the answer into
        let promptDiv = document.querySelector(".StudentPrompt") as HTMLElement;
        if(!promptDiv) return;

        promptDiv.style.flexDirection = "column";

        // TODO: this sucks
        let answerEl = promptDiv.querySelector(".qlc-answer") as HTMLDivElement;
        if(!answerEl) {
            answerEl = document.createElement("div");
            answerEl.classList.add("qlc-answer");
        }

        // clear the element
        answerEl.innerHTML = "";
        answerEl.style.display = "flex";
        answerEl.style.alignItems = "center";
        answerEl.style.border = "2px solid #18ab1d";
        answerEl.style.borderRadius = "0.5rem";

        if(this.promptKind == "definition") {
            // set the text to the word
            answerEl.innerHTML = `<div>${cardInfo.word}</div>`;
        } else {
            // set the text, image or both
            if(cardInfo.definition != '') {
                answerEl.innerHTML = `<div>${cardInfo.definition}</div>`;
            }
            if(cardInfo._imageUrl != null) {
                let img = document.createElement("img");
                img.style.marginLeft = "0.5rem";
                img.style.borderRadius = "0.5rem";
                img.src = cardInfo._imageUrl;
                answerEl.appendChild(img);
            }
        }

        // add the element to the page
        promptDiv.appendChild(answerEl);
    }

    removeAnswerDisplay() {
        let answerEl = document.querySelector(".qlc-answer") as HTMLDivElement;
        if(!answerEl) return;
        answerEl.remove();
    }

    removeCorrectBorder() {
        let cards = document.querySelectorAll(".StudentAnswerOptions-optionCard");
        if(!cards) return;

        for(let card of cards) {
            (card as HTMLElement).style.borderRadius = "0.5rem";
            (card as HTMLElement).style.border = "none";
        }
    }

    addCorrectBorder() {
        let cards = document.querySelectorAll(".StudentAnswerOptions-optionCard");
        if(!cards) return;

        let correctId = this.currentPrompts[this.roundNumber];
        if(!this.hasPrompts.includes(correctId)) return;
        let cardInfo = this.terms.find(term => term.id == correctId);
        if(!cardInfo) return;
        
        // match the word to the card
        for(let card of cards) {
            let text = card.querySelector('.StudentAnswerOption-text > div')?.textContent;
            let bgImg = (card.querySelector('.StudentAnswerOption-image .Image-image') as HTMLElement)?.style.backgroundImage;
            let bgImgUrl = bgImg?.slice(5, bgImg.length - 2);

            let matches = true;

            // determine whether the card is correct
            if(this.promptKind == "definition") {
                if(text != cardInfo.word) matches = false;
            } else {
                if(text != cardInfo.definition && cardInfo.definition != '') matches = false;
                if(bgImgUrl != cardInfo._imageUrl && cardInfo._imageUrl != null) matches = false;
            }

            (card as HTMLElement).style.borderRadius = "0.5rem";
            if(matches) {
                (card as HTMLElement).style.border = "2px solid #18ab1d";
            } else {
                (card as HTMLElement).style.border = "2px solid #c72d0e";
            }
        }
    }

    log(...args: any[]) {
        console.log("[QLC]", ...args);
    }
    
    setIo(io: Socket) {
        // io is the socket.io instance that the game uses to communicate with the server
        this.io = io;
        this.log("io set", io);

        // this.attachDebugListeners();

        io.on("current-game-state-and-set", this.handleGameState.bind(this));
        io.on("current-game-state", this.handleGameState.bind(this));

        io.on("matchteam.new-answer", (data: INewAnswer) => {
            this.streakNumber = data.streakNum;
            this.roundNumber = data.roundNum + 1;

            // if the answer is incorrect, reset the streak and round number
            if(!data.answer.isCorrect) {
                this.streakNumber++;
                this.roundNumber = 0;
            }

            // update the prompts
            let newPrompts = data.terms[this.getPlayerId()]
            if(newPrompts) this.hasPrompts = newPrompts;

            if(this.hudInteract!.helpMode == 1) { // auto answer
                this.answerQuestion();
            } else if(this.hudInteract!.helpMode == 2) { // auto answer (wait)
                setTimeout(() => {
                    this.answerQuestion();
                }, 1900);
            }
        })

        io.on("matchteam.new-streak", (data: INewStreak) => {
            this.setPrompts(data.streak);
        })
    }

    attachDebugListeners() {
        const listenTo = ["reconnect_failed", "connect_error", "current-game-state-and-set", "current-game-state", "current-team-state", "current-leaderboard-state", "replay-game", "delete-game", "reconnect_failed", "error", "reconnecting", "connect", "disconnect", "game-error", "matchteam.new-answer", "matchteam.new-streak", "matchteam.submit-answer", "late-join-backfill", "next-question", "game-status", "player-added", "player-info-reload", "grade-answers", "user-answers", "studiable-item-ids", "written-studiable-item-ids", "game-errors", "game-restarted", "player-removed", "late-join", "qping", "player-info", "next-question", "answer-info"]

        for(let event of listenTo) {
            this.io?.on(event, (...args: any[]) => {
                this.log("event", event, args);
            });
        }
    }

    setPrompts(streak: IQuizletStreak) {
        this.currentPrompts = streak.prompts;
        let newPrompts = streak.terms[this.getPlayerId()]
        if(newPrompts) this.hasPrompts = newPrompts;
    }

    handleGameState(data: IGameState | IGameStateAndSet) {
        this.terms = data.terms;
        this.promptKind = data.options.promptWith == 1 ? 'term' : 'definition';

        let playerId = this.getPlayerId();
        let playerTeam = data.teams.find(team => team.players.includes(playerId));

        if(!playerTeam) return;
        let streak = playerTeam.streaks[playerTeam.streaks.length - 1];
        if(!streak) return;

        this.setPrompts(streak);

        // get the current streak and round number
        this.streakNumber = playerTeam.streaks.length - 1;
        this.roundNumber = streak.answers.length;
    }

    answerQuestion() {
        let correctId = this.currentPrompts[this.roundNumber];
        if(!this.hasPrompts.includes(correctId)) return;

        this.io?.emit("matchteam.submit-answer", {
            streak: this.streakNumber,
            round: this.roundNumber,
            termId: correctId
        })
    }

    getPlayerId() {
        let playerId = (window as unknown as QuizletWindow).Quizlet?.user?.id
        if(playerId) return String(playerId);
        
        return (window as unknown as QuizletWindow).Quizlet.uid;
    }

    addUpdateObserver() {
        let cheat = this;

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if(mutation.type !== "childList") return;
                // prevent infinite loop
                if((mutation.target as HTMLElement).matches(".StudentPrompt, .StudentPrompt *")) return;

                if(cheat.hudInteract!.helpMode == 3) { // outline correct
                    cheat.addCorrectBorder();
                }

                if(cheat.hudInteract!.showAnswer) {
                    // cheat.updateAnswerDisplay();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupSocketGetting() {
        let cheat = this;

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                // Check if a new script element was added
                if (mutation.type !== 'childList') return
                const addedNodes = Array.from(mutation.addedNodes);
    
                for (let node of addedNodes) {
                    let src: string;

                    if(node.nodeName == "LINK") {
                        src = (node as HTMLLinkElement).href;                       
                    } else if(node.nodeName == "SCRIPT") {
                        src = (node as HTMLScriptElement).src;
                    } else continue;

                    if(!src.includes("live_game_student") || !src.endsWith(".js")) continue;

                    // get rid of the element so it doesn't get executed
                    (node as HTMLElement).remove();

                    if(cheat.alreadyIntercepted) { // we have to do it here, because for some reason quizlet loads the script twice
                        observer.disconnect();
                        return;
                    }
                    cheat.alreadyIntercepted = true;
        
                    // we want to manually fetch the script so we can modify it
                    fetch(src)
                        .then(response => response.text())
                        .then(text => {
                            const insertAfter = "j=E()((0,i.Z)(w)),"
                            const insertText = "window.qlc.setIo(j),"
    
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