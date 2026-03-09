import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, RoundProgress } from '../types';
import { mockRounds } from '../data/mockData';
import { competitionConfig } from '../config/competitionConfig';

interface AppState {
    // Auth & Session
    team: Team | null;
    setTeam: (team: Team | null) => void;

    // Progress & Game State
    unlockedRounds: string[];
    roundsProgress: Record<string, RoundProgress>;

    // Actions
    unlockNextRound: () => void;
    startRound: (roundId: string) => void;
    submitRound: (roundId: string) => void;
    setAnswer: (roundId: string, questionId: string, optionId: string) => void;
    markDocsVisited: (roundId: string) => void;
    markDatasetOpened: (roundId: string) => void;
    updateTimeRemaining: (roundId: string, timeMs: number) => void;

    // Util
    resetState: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            team: null,
            setTeam: (team) => set({ team }),

            unlockedRounds: [mockRounds[0].id], // Round 1 is unlocked initially
            roundsProgress: {},

            unlockNextRound: () => {
                set((state) => {
                    const rounds = state.unlockedRounds;
                    const currentMax = rounds.length;
                    if (currentMax < competitionConfig.totalRounds) {
                        return {
                            unlockedRounds: [...rounds, mockRounds[currentMax].id]
                        };
                    }
                    return state;
                });
            },

            startRound: (roundId) => {
                set((state) => {
                    const existing = state.roundsProgress[roundId];
                    if (existing && existing.timerStartedAt) return state; // Already started

                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: {
                                roundId,
                                status: 'in_progress',
                                timerStartedAt: Date.now(),
                                timeRemainingMs: competitionConfig.timerMinutesPerRound * 60 * 1000,
                                answers: existing?.answers || {},
                                submittedAt: null,
                                docsVisited: existing?.docsVisited || false,
                                datasetOpened: existing?.datasetOpened || false,
                            }
                        }
                    };
                });
            },

            submitRound: (roundId) => {
                set((state) => {
                    const progress = state.roundsProgress[roundId];
                    if (!progress) return state;

                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: {
                                ...progress,
                                status: 'submitted',
                                submittedAt: Date.now(),
                            }
                        }
                    };
                });

                if (competitionConfig.sequentialRoundUnlock) {
                    get().unlockNextRound();
                }
            },

            setAnswer: (roundId, questionId, optionId) => {
                set((state) => {
                    const progress = state.roundsProgress[roundId];
                    if (!progress || progress.status === 'submitted') return state;

                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: {
                                ...progress,
                                answers: {
                                    ...progress.answers,
                                    [questionId]: optionId
                                }
                            }
                        }
                    };
                });
            },

            markDocsVisited: (roundId) => {
                set((state) => {
                    const progress = state.roundsProgress[roundId];
                    if (!progress) return state;
                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: { ...progress, docsVisited: true }
                        }
                    };
                });
            },

            markDatasetOpened: (roundId) => {
                set((state) => {
                    const progress = state.roundsProgress[roundId];
                    if (!progress) return state;
                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: { ...progress, datasetOpened: true }
                        }
                    };
                });
            },

            updateTimeRemaining: (roundId, timeMs) => {
                set((state) => {
                    const progress = state.roundsProgress[roundId];
                    if (!progress || progress.status === 'submitted' || timeMs < 0) return state;
                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: { ...progress, timeRemainingMs: timeMs }
                        }
                    };
                });
            },

            resetState: () => {
                set({
                    unlockedRounds: [mockRounds[0].id],
                    roundsProgress: {},
                });
            }
        }),
        {
            name: 'guilty-by-data-storage', // key in localStorage
        }
    )
);
