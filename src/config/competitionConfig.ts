import type { CompetitionConfig } from '../types';

export const competitionConfig: CompetitionConfig = {
    totalRounds: 3,
    questionsPerRound: 4,
    timerMinutesPerRound: 30, // 30 minutes
    timerStartMode: "round_open", // future option: "mcq_start"
    questionNavigationMode: "bidirectional", // future option: "one_way"
    sequentialRoundUnlock: true,
    leaderboardEnabled: true,
    showScoresImmediately: false
};
