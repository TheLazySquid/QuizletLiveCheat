import { Socket } from "socket.io-client";
import { IGameState, IGameStateAndSet, INewAnswer, INewStreak, IQuizletStreak, QuizletWindow } from "./interfaces";
import Hud from "./hud/hud";

export default class Cheat {
    alreadyIntercepted: boolean = false;
    io?: Socket;

    hasPrompts: number[] = [];

    currentPrompts: number[] = [];
    streakNumber: number = 0;
    roundNumber: number = 0;

    hud: Hud;
    
    autoAnswering: boolean = false;

    constructor() {
        this.hud = new Hud();

        this.hud.addEventListener("answerOnce", () => {
            this.answerQuestion();
        })

        this.hud.addEventListener("toggleAutoAnswer", () => {
            this.autoAnswering = !this.autoAnswering;
            this.answerQuestion();
        })

        this.setupSocketGetting();
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

            if(this.autoAnswering) {
                this.answerQuestion();
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
        console.log(data)

        let playerId = this.getPlayerId();
        let playerTeam = data.teams.find(team => team.players.includes(playerId));

        console.log("playerTeam", playerTeam)

        if(!playerTeam) return;
        let streak = playerTeam.streaks[playerTeam.streaks.length - 1];
        console.log("streak", streak)
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

        console.log(this.streakNumber, this.roundNumber, correctId)
    }

    getPlayerId() {
        let playerId = String((window as unknown as QuizletWindow).Quizlet.user.id);
        if(playerId) return playerId;
        
        return (window as unknown as QuizletWindow).Quizlet.uid;
    }

    setupSocketGetting() {
        let cheat = this;

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                // Check if a new script element was added
                if (mutation.type !== 'childList') return
                const addedNodes = Array.from(mutation.addedNodes);
    
                for (let node of addedNodes) {
                    let src;

                    if(node.nodeName == "LINK") {
                        src = (node as HTMLLinkElement).href;                       
                    } else if(node.nodeName == "SCRIPT") {
                        src = (node as HTMLScriptElement).src;
                    } else continue;

                    if(!src.includes("live_game_student")) continue;

                    // get rid of the element so it doesn't get executed
                    (node as HTMLElement).remove();

                    if(cheat.alreadyIntercepted) continue;
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