import Cheat from "./cheat";

export interface IQuizletTerm {
    // there's more fields but these are the only ones we care about
    definition: string;
    definitionImageId?: number;
    id: number;
    word: string;
    _imageUrl?: string;
}

export interface IQuizletOptions {
    answerWith: 1 | 2; // 1 = word, 2 = definition
    promptWith: 1 | 2; // 1 = word, 2 = definition
    termAudio: boolean;
}

export interface IQuizletPlayer {
    connectionStatuses: String[];
    id: string;
    image?: string;
    joinTimestamp: number;
    username: string;
}

export interface IQuizletSet {
    creatorId: number;
    defLang: string;
    description: string;
    hasDiagrams: boolean;
    hasImages: boolean;
    id: number;
    lastModified: number;
    numTerms: number;
    title: string;
    wordLang: string;
    _thumbnailUrl: string;
    _webUrl: string;
}

export interface IQuizletAnswer {
    isCorrect: boolean;
    playerId: string;
    termId: number;
}

export interface IQuizletStreak {
    answers: IQuizletAnswer[];
    lastAnsweredTimestamp: number;
    prompts: number[];
    roundTerms: [number, number, number, number][];
    terms: Record<string, [number, number, number, number]>;
}

export interface IQuizletTeam {
    color: string;
    expectedPlayerCount: number;
    id: string;
    mascotCode: string;
    name: string;
    players: string[];
    streaks: IQuizletStreak[];
}

export interface ILeaderboardEntry {
    answerCount: number;
    color: string;
    expectedPlayerCount: number;
    id: string;
    isLastAnswerIncorrect: boolean;
    mascotCode: string;
    name: string;
    players: string[];
    promptCount: number;
}

export interface IGameState {
    gameInstanceUuid: string;
    leaderboard: ILeaderboardEntry[];
    id: string;
    mascotLang: string;
    options: IQuizletOptions;
    players: Record<string, IQuizletPlayer>;
    set: IQuizletSet;
    teams: IQuizletTeam[];
    terms: IQuizletTerm[];
    type: number;
}

export interface IGameStateAndSet extends IGameState {
    allTerms: IQuizletTerm[];
}

export interface INewStreak {
    id: string;
    streak: IQuizletStreak;
}

export interface INewAnswer {
    answer: IQuizletAnswer;
    leaderboard: ILeaderboardEntry[];
    roundNum: number;
    streakNum: number;
    submissionTime: number;
    terms: Record<string, [number, number, number, number]>;
}

export interface QuizletWindow extends Window {
    Quizlet: {
        // theres more but we only care about these
        uid: string;
        user: {
            id: number;
        }
    }
    qlc?: Cheat;
}

export interface IHudInteract {
    answerQuestion: (() => void) | undefined;
    onHelpModeChange: ((mode: number) => void) | undefined;
    onShowAnswerChange: ((showAnswer: boolean) => void) | undefined;
    helpMode: number;
    showAnswer: boolean;
}