import type { IGameState, IStreak } from './types';
import Hud from './hud.svelte';

enum HelpModes {
    None,
    AnswerInstant,
    AnswerDelayed,
    Highlight
}

// this is ugly, but I don't think there's a better way
const cardSelector = "#__next > div > div:nth-child(3) > div > div:nth-child(2) > div"

let messageCount = 0;
let socket: WebSocket | null = null;
let helpMode: number = 0;

let cards: HTMLElement[] = [];

window.addEventListener('DOMContentLoaded', () => {
    const hud = new Hud({
        target: document.body,
    });

    hud.$on('answer', () => {
        answer();
    });

    hud.$on('helpMode', (event: CustomEvent<number>) => {
        helpMode = event.detail;

        if(helpMode === HelpModes.Highlight) {
            setCardBorders();
        } else {
            document.querySelectorAll<HTMLElement>(cardSelector).forEach(card => {
                card.style.border = "";
            })
        }
    })
})

class NewWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        socket = this;

        this.addEventListener('message', (event) => {
            const data = event.data.toString() as string;
            if(!data.startsWith("42")) return;

            const message = data.substring(data.indexOf('['));
            const messageObj = JSON.parse(message);

            console.log("recieved", messageObj);

            onMessage(messageObj[0], messageObj[1]);
        });
    }

    send(data: any) {
        let str = data.toString() as string;
        if(!str.startsWith("42")) return super.send(data);

        let message = str.substring(Math.min(str.indexOf('['), str.indexOf('{')));
        
        const newMsg = `42${messageCount}${message}`

        super.send(newMsg);
        messageCount++;
    }
}

// override the WebSocket class
unsafeWindow.WebSocket = NewWebSocket;

function send(data: any) {
    if(socket === null) return;
    const message = `42${messageCount}${JSON.stringify(data)}`;
    socket.send(message);
    messageCount++;
}

let streak: IStreak;
let streakNum = 0;
let roundNum = 0;
let cardAssignments: number[] = [];

function checkAnswer() {
    if(helpMode === HelpModes.AnswerInstant) answer();
    else if(helpMode === HelpModes.AnswerDelayed) setTimeout(answer, 1900);
}

function onMessage(type: string, data: any) {
    let playerId = getPlayerId();

    switch(type) {
        case "current-game-state-and-set":
        case "current-game-state":
            onGameState(data);
            break;
        case "matchteam.new-answer":
            roundNum = data.roundNum + 1;
            streakNum = data.streakNum;
            cardAssignments = data.cardAssignments[playerId];
            checkAnswer();
            break;
        case "matchteam.new-streak":
            streak = data.streak;
            streakNum++;
            roundNum = 0;
            cardAssignments = data.streak.cardAssignments[playerId];
            checkAnswer();
            break;
    }
}

function onGameState(state: IGameState) {
    let playerId = getPlayerId();
    if(!playerId) return;

    let team = Object.values(state.teams).find(team => team.playerIds.includes(playerId));

    if(!team) return;
    
    streakNum = team.streak.length - 1;
    streak = team.streak[streakNum];
    if(!streak) return;

    cardAssignments = streak.cardAssignments[playerId];
    roundNum = streak.answers.length;
}

function answer() {
    let cardId = streak?.prompts?.[roundNum]?.cardId;
    if(!cardId) return;

    if(!cardAssignments.includes(cardId)) return;
    send(["gamehub.matchteam.submit-answer", {
        playerId: getPlayerId(),
        cardId,
        roundNum,
        streakNum
    }])
}

function setCardBorders () {
    let correctId = streak?.prompts?.[roundNum]?.cardId;
    if(!correctId) return;
    let correctIndex = cardAssignments.indexOf(correctId);

    cards.forEach((card, index) => {
        if(index === correctIndex) {
            card.style.border = "2px solid green";
        } else {
            card.style.border = "2px solid red";
        }
    })
}

// @ts-ignore
unsafeWindow.answer = answer;

const cardObserver = new MutationObserver((mutations) => {
    for(let mutation of mutations) {
        if(mutation.type !== "childList") continue;
        for(let node of mutation.addedNodes) {
            if(!(node instanceof HTMLElement)) continue;
            let foundCards: NodeListOf<HTMLElement>;
            if(node.matches(cardSelector)) {
                foundCards = document.querySelectorAll<HTMLElement>(cardSelector);
            } else {
                foundCards = node.querySelectorAll<HTMLElement>(cardSelector);
            }

            
            if(foundCards.length === 0) continue;
            cards = Array.from(foundCards);

            if(helpMode === HelpModes.Highlight) {
                setCardBorders();
            }
        }
    }
})

window.addEventListener('DOMContentLoaded', () => {
    cardObserver.observe(document.body, {
        childList: true,
        subtree: true
    })
})

let uid: string;
function getPlayerId() {
    if(uid) return uid;
    let script = document.getElementById("__NEXT_DATA__")!;
    let data = JSON.parse(script.textContent!);
    uid = data.props.pageProps.userId || data.props.pageProps.personId;

    return uid;
}