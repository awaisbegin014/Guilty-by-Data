import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, RoundProgress, Round } from '../types';
import { mockRounds } from '../data/mockData';
import { competitionConfig } from '../config/competitionConfig';

interface AppState {
    // Auth & Session
    team: Team | null;
    setTeam: (team: Team | null) => void;
    isAdmin: boolean;
    setAdmin: (isAdmin: boolean) => void;

    // Competition Data (Source of Truth)
    rounds: Round[];
    updateRound: (roundId: string, updates: Partial<Round>) => void;

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
    extendRoundTimer: (roundId: string, minutes: number) => void;

    // Util
    resetParticipantProgress: () => void;
    resetState: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            team: null,
            setTeam: (team) => set({ team }),
            isAdmin: false,
            setAdmin: (isAdmin) => set({ isAdmin }),

            rounds: mockRounds,
            updateRound: (roundId, updates) => {
                set((state) => ({
                    rounds: state.rounds.map((r) =>
                        r.id === roundId ? { ...r, ...updates } : r
                    )
                }));
            },

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
                                timeRemainingMs: existing?.timeRemainingMs ?? (competitionConfig.timerMinutesPerRound * 60 * 1000),
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
                    if (timeMs < 0) return state;
                    const progress = state.roundsProgress[roundId];
                    if (!progress) return state;

                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: { ...progress, timeRemainingMs: timeMs }
                        }
                    };
                });
            },

            extendRoundTimer: (roundId, minutes) => {
                set((state) => {
                    const progress = state.roundsProgress[roundId];
                    if (!progress || progress.timeRemainingMs === null) return state;

                    const addedMs = minutes * 60 * 1000;
                    const newTime = Math.max(0, progress.timeRemainingMs + addedMs);

                    return {
                        roundsProgress: {
                            ...state.roundsProgress,
                            [roundId]: { ...progress, timeRemainingMs: newTime }
                        }
                    };
                });
            },

            resetParticipantProgress: () => {
                set((state) => ({
                    roundsProgress: {},
                    unlockedRounds: state.rounds.length > 0 ? [state.rounds[0].id] : []
                }));
            },

            resetState: () => {
                set({
                    team: null,
                    isAdmin: false,
                    unlockedRounds: [mockRounds[0].id],
                    roundsProgress: {},
                    rounds: mockRounds, // Reset rounds back to initial mock data
                });
            }
        }),
        {
            name: 'guilty-by-data-storage', // key in localStorage
        }
    )
);
