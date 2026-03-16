import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  deleteQuestion as deleteQuestionRequest,
  fetchAdminRounds,
  fetchParticipantBundle,
  fetchLeaderboard,
  resolveSession,
  runAdminRoundAction as runAdminRoundActionRequest,
  saveQuestion as saveQuestionRequest,
  signInAdmin,
  signInTeam,
  signOut as signOutRequest,
  submitRound as submitRoundRequest,
  updateRound as updateRoundRequest,
} from '../lib/appApi';
import { competitionConfig } from '../config/competitionConfig';
import { deriveParticipantRoundStatus, isRoundPlayable } from '../lib/roundState';
import type {
  AdminUser,
  LeaderboardEntry,
  Question,
  Round,
  RoundProgress,
  RoundSubmission,
  Team,
} from '../types';

interface DraftRoundProgress {
  answers: Record<string, string>;
  docsVisited: boolean;
  resourceViewed: boolean;
}

function createEmptyDraftProgress(): DraftRoundProgress {
  return {
    answers: {},
    docsVisited: false,
    resourceViewed: false,
  };
}

interface AppState {
  authReady: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  error: string | null;
  team: Team | null;
  admin: AdminUser | null;
  isAdmin: boolean;
  rounds: Round[];
  leaderboard: LeaderboardEntry[];
  unlockedRounds: string[];
  roundsProgress: Record<string, RoundProgress>;
  submissionsByRound: Record<string, RoundSubmission>;
  draftProgressByRound: Record<string, DraftRoundProgress>;
  bootstrapApp: () => Promise<void>;
  loginTeam: (identifier: string, password: string) => Promise<void>;
  loginAdmin: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshParticipantData: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  setAnswer: (roundId: string, questionId: string, optionId: string) => void;
  markDocsVisited: (roundId: string) => void;
  markResourceViewed: (roundId: string) => void;
  submitRound: (roundId: string) => Promise<void>;
  updateRound: (roundId: string, updates: Partial<Round>) => Promise<void>;
  runAdminRoundAction: (
    roundId: string,
    action: 'unlock_round' | 'lock_round' | 'start_timer' | 'pause_timer' | 'resume_timer' | 'set_timer_duration',
    payload?: { timerMinutes?: number },
  ) => Promise<void>;
  saveQuestion: (roundId: string, question: Question) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  clearError: () => void;
  resetLocalDrafts: () => void;
}

function buildParticipantState(
  rounds: Round[],
  drafts: Record<string, DraftRoundProgress>,
  submissionsByRound: Record<string, RoundSubmission>,
) {
  const sortedRounds = rounds.slice().sort((left, right) => left.orderIndex - right.orderIndex);
  const unlockedRounds: string[] = [];
  const roundsProgress: Record<string, RoundProgress> = {};
  let previousRoundsSubmitted = true;
  const now = Date.now();

  for (const round of sortedRounds) {
    const draft = drafts[round.id] ?? createEmptyDraftProgress();
    const submission = submissionsByRound[round.id];
    const sequentiallyAvailable = !competitionConfig.sequentialRoundUnlock || previousRoundsSubmitted;
    const hasDraftActivity = Object.keys(draft.answers).length > 0 || draft.docsVisited || draft.resourceViewed;
    const status = deriveParticipantRoundStatus({
      round,
      sequentiallyAvailable,
      submission,
      hasDraftActivity,
      now,
    });
    const unlocked = isRoundPlayable(round, sequentiallyAvailable, now);

    if (unlocked) {
      unlockedRounds.push(round.id);
    }

    roundsProgress[round.id] = {
      roundId: round.id,
      status,
      answers: draft.answers,
      submittedAt: submission?.submittedAt ?? null,
      docsVisited: draft.docsVisited,
      resourceViewed: draft.resourceViewed,
    };

    previousRoundsSubmitted = previousRoundsSubmitted && Boolean(submission);
  }

  return {
    unlockedRounds,
    roundsProgress,
  };
}

function withParticipantState(
  state: Pick<AppState, 'rounds' | 'draftProgressByRound' | 'submissionsByRound'>,
) {
  return buildParticipantState(state.rounds, state.draftProgressByRound, state.submissionsByRound);
}

async function loadParticipantBundle() {
  const bundle = await fetchParticipantBundle();
  return {
    team: bundle.team,
    rounds: bundle.rounds,
    submissionsByRound: bundle.submissionsByRound,
    leaderboard: bundle.leaderboard,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      authReady: false,
      isBootstrapping: false,
      isSubmitting: false,
      error: null,
      team: null,
      admin: null,
      isAdmin: false,
      rounds: [],
      leaderboard: [],
      unlockedRounds: [],
      roundsProgress: {},
      submissionsByRound: {},
      draftProgressByRound: {},

      bootstrapApp: async () => {
        if (get().isBootstrapping) {
          return;
        }

        set({
          isBootstrapping: true,
          error: null,
        });

        try {
          const session = await resolveSession();

          if (session.role === 'team' && session.team) {
            const participantBundle = await loadParticipantBundle();
            set((state) => ({
              authReady: true,
              isBootstrapping: false,
              team: participantBundle.team,
              admin: null,
              isAdmin: false,
              rounds: participantBundle.rounds,
              leaderboard: participantBundle.leaderboard,
              submissionsByRound: participantBundle.submissionsByRound,
              ...buildParticipantState(
                participantBundle.rounds,
                state.draftProgressByRound,
                participantBundle.submissionsByRound,
              ),
            }));
            return;
          }

          if (session.role === 'admin' && session.admin) {
            const rounds = await fetchAdminRounds();
            set({
              authReady: true,
              isBootstrapping: false,
              team: null,
              admin: session.admin,
              isAdmin: true,
              rounds,
              leaderboard: [],
              submissionsByRound: {},
              unlockedRounds: [],
              roundsProgress: {},
            });
            return;
          }

          set({
            authReady: true,
            isBootstrapping: false,
            team: null,
            admin: null,
            isAdmin: false,
            rounds: [],
            leaderboard: [],
            submissionsByRound: {},
            unlockedRounds: [],
            roundsProgress: {},
          });
        } catch (error) {
          set({
            authReady: true,
            isBootstrapping: false,
            error: error instanceof Error ? error.message : 'Unable to bootstrap the app session.',
            team: null,
            admin: null,
            isAdmin: false,
            rounds: [],
            leaderboard: [],
            submissionsByRound: {},
            unlockedRounds: [],
            roundsProgress: {},
          });
        }
      },

      loginTeam: async (identifier, password) => {
        set({
          isBootstrapping: true,
          error: null,
        });

        try {
          await signInTeam(identifier, password);
          const participantBundle = await loadParticipantBundle();

          set((state) => ({
            authReady: true,
            isBootstrapping: false,
            team: participantBundle.team,
            admin: null,
            isAdmin: false,
            rounds: participantBundle.rounds,
            leaderboard: participantBundle.leaderboard,
            submissionsByRound: participantBundle.submissionsByRound,
            ...buildParticipantState(
              participantBundle.rounds,
              state.draftProgressByRound,
              participantBundle.submissionsByRound,
            ),
          }));
        } catch (error) {
          set({
            isBootstrapping: false,
            error: error instanceof Error ? error.message : 'Team login failed.',
          });
          throw error;
        }
      },

      loginAdmin: async (identifier, password) => {
        set({
          isBootstrapping: true,
          error: null,
        });

        try {
          const admin = await signInAdmin(identifier, password);
          const rounds = await fetchAdminRounds();

          set({
            authReady: true,
            isBootstrapping: false,
            team: null,
            admin,
            isAdmin: true,
            rounds,
            leaderboard: [],
            submissionsByRound: {},
            unlockedRounds: [],
            roundsProgress: {},
          });
        } catch (error) {
          set({
            isBootstrapping: false,
            error: error instanceof Error ? error.message : 'Admin login failed.',
          });
          throw error;
        }
      },

      logout: async () => {
        await signOutRequest();
        set({
          authReady: true,
          error: null,
          team: null,
          admin: null,
          isAdmin: false,
          rounds: [],
          leaderboard: [],
          unlockedRounds: [],
          roundsProgress: {},
          submissionsByRound: {},
          draftProgressByRound: {},
        });
      },

      refreshParticipantData: async () => {
        const team = get().team;
        if (!team) {
          return;
        }

        const participantBundle = await loadParticipantBundle();
        set((state) => ({
          team: participantBundle.team,
          rounds: participantBundle.rounds,
          leaderboard: participantBundle.leaderboard,
          submissionsByRound: participantBundle.submissionsByRound,
          ...buildParticipantState(
            participantBundle.rounds,
            state.draftProgressByRound,
            participantBundle.submissionsByRound,
          ),
        }));
      },

      refreshAdminData: async () => {
        const rounds = await fetchAdminRounds();
        set({ rounds });
      },

      refreshLeaderboard: async () => {
        const leaderboard = await fetchLeaderboard();
        set({ leaderboard });
      },

      setAnswer: (roundId, questionId, optionId) => {
        set((state) => {
          const existing = state.draftProgressByRound[roundId] ?? createEmptyDraftProgress();

          const draftProgressByRound = {
            ...state.draftProgressByRound,
            [roundId]: {
              ...existing,
              answers: {
                ...existing.answers,
                [questionId]: optionId,
              },
            },
          };

          return {
            draftProgressByRound,
            ...buildParticipantState(state.rounds, draftProgressByRound, state.submissionsByRound),
          };
        });
      },

      markDocsVisited: (roundId) => {
        set((state) => {
          const existing = state.draftProgressByRound[roundId] ?? createEmptyDraftProgress();
          const draftProgressByRound = {
            ...state.draftProgressByRound,
            [roundId]: {
              ...existing,
              docsVisited: true,
            },
          };

          return {
            draftProgressByRound,
            ...buildParticipantState(state.rounds, draftProgressByRound, state.submissionsByRound),
          };
        });
      },

      markResourceViewed: (roundId) => {
        set((state) => {
          const existing = state.draftProgressByRound[roundId] ?? createEmptyDraftProgress();
          const draftProgressByRound = {
            ...state.draftProgressByRound,
            [roundId]: {
              ...existing,
              resourceViewed: true,
            },
          };

          return {
            draftProgressByRound,
            ...buildParticipantState(state.rounds, draftProgressByRound, state.submissionsByRound),
          };
        });
      },

      submitRound: async (roundId) => {
        const progress = get().roundsProgress[roundId];
        if (!progress) {
          return;
        }

        set({
          isSubmitting: true,
          error: null,
        });

        try {
          await submitRoundRequest(roundId, progress.answers);

          set((state) => {
            const nextDrafts = { ...state.draftProgressByRound };
            delete nextDrafts[roundId];

            return {
              draftProgressByRound: nextDrafts,
            };
          });

          await get().refreshParticipantData();
          set({ isSubmitting: false });
        } catch (error) {
          set({
            isSubmitting: false,
            error: error instanceof Error ? error.message : 'Round submission failed.',
          });
          throw error;
        }
      },

      updateRound: async (roundId, updates) => {
        set({ error: null });

        try {
          await updateRoundRequest(roundId, updates);
          await get().refreshAdminData();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Round update failed.',
          });
          throw error;
        }
      },

      runAdminRoundAction: async (roundId, action, payload) => {
        set({ error: null });

        try {
          await runAdminRoundActionRequest(roundId, action, payload);
          await get().refreshAdminData();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Round action failed.',
          });
          throw error;
        }
      },

      saveQuestion: async (roundId, question) => {
        set({ error: null });

        try {
          await saveQuestionRequest(roundId, question);
          await get().refreshAdminData();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Question save failed.',
          });
          throw error;
        }
      },

      deleteQuestion: async (questionId) => {
        set({ error: null });

        try {
          await deleteQuestionRequest(questionId);
          await get().refreshAdminData();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Question deletion failed.',
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      resetLocalDrafts: () => {
        set((state) => ({
          draftProgressByRound: {},
          ...withParticipantState({
            rounds: state.rounds,
            draftProgressByRound: {},
            submissionsByRound: state.submissionsByRound,
          }),
        }));
      },
    }),
    {
      name: 'guilty-by-data-storage',
      partialize: (state) => ({
        draftProgressByRound: state.draftProgressByRound,
      }),
    },
  ),
);
