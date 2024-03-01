export interface IStreak {
    answers: any[]; // unimportant
    prompts: { cardId: number }[];
    cardAssignments: Record<string, number[]>;
}

export interface ITeam {
    playerIds: string[];
    streak: IStreak[];
}

export interface IGameState {
    teams: Record<string, ITeam>;
}