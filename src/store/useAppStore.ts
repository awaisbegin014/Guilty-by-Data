import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  deleteQuestion as deleteQuestionRequest,
  fetchAdminRounds,
  fetchParticipantBundle,
  fetchLeaderboard,
  fetchServerTime,
  resolveSession,
  runAdminRoundAction as runAdminRoundActionRequest,
  saveQuestion as saveQuestionRequest,
  signInAdmin,
  signInTeam,
  signOut as signOutRequest,
  submitRound as submitRoundRequest,
  updateRound as updateRoundRequest,
} from '../lib/appApi';
import type { ServerTimeSample } from '../lib/appApi';
import { competitionConfig } from '../config/competitionConfig';
import { deriveParticipantRoundStatus, isRoundPlayable } from '../lib/roundState';
import type {
  AdminUser,
  LeaderboardEntry,
  Option,
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

interface RoundPublicStateSyncRow {
  round_id: string;
  order_index: number;
  title: string;
  description: string | null;
  status: Round['status'];
  timer_minutes: number;
  timer_state: Round['timerState'];
  starts_at: string | null;
  ends_at: string | null;
  timer_remaining_seconds: number | null;
}

interface RoundSyncRow {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  objective: string | null;
  case_brief: string | null;
  zip_password: string | null;
  status: Round['status'];
  timer_minutes: number;
  timer_state: Round['timerState'];
  timer_duration_seconds: number;
  timer_remaining_seconds: number | null;
  starts_at: string | null;
  ends_at: string | null;
  documentation: unknown;
}

interface QuestionSyncRow {
  id: string;
  round_id: string;
  order_index: number;
  text: string;
  type: 'mcq' | 'blank';
  input_type: 'int' | 'float' | 'string' | null;
}

interface OptionSyncRow {
  id: string;
  question_id: string;
  order_index: number;
  text: string;
  score: number | null;
}

interface CorrectAnswerSyncRow {
  question_id: string;
  answer_value: string;
}

interface SubmissionSyncRow {
  id: string;
  round_id: string;
  submitted_at: string;
  total_score: number | null;
  time_taken_seconds: number | null;
  status: 'accepted' | 'rejected';
}

interface LeaderboardSyncRow {
  team_id: string;
  team_name: string;
  username: string;
  round_1_score: number;
  round_2_score: number;
  round_3_score: number;
  total_score: number;
  total_time_seconds: number | null;
  updated_at: string;
}

interface SubmitRoundResponse {
  submissionId: string;
  submittedAt: string;
  timeTakenSeconds: number | null;
  totalScore: number | null;
  status: 'accepted' | 'rejected';
}

type SyncEventType = 'INSERT' | 'UPDATE' | 'DELETE';

function createEmptyDraftProgress(): DraftRoundProgress {
  return {
    answers: {},
    docsVisited: false,
    resourceViewed: false,
  };
}

function toDocumentationSections(value: unknown): Round['documentation'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const section = item as { sectionTitle?: unknown; content?: unknown };
    if (typeof section.sectionTitle !== 'string' || typeof section.content !== 'string') {
      return [];
    }

    return [{ sectionTitle: section.sectionTitle, content: section.content }];
  });
}

function sortRounds(rounds: Round[]) {
  return rounds.slice().sort((left, right) => left.orderIndex - right.orderIndex);
}

function sortQuestions(questions: Question[]) {
  return questions.slice().sort((left, right) => left.questionIndex - right.questionIndex);
}

function sortOptions(options: Option[]) {
  return options
    .slice()
    .sort((left, right) => (left.orderIndex ?? Number.MAX_SAFE_INTEGER) - (right.orderIndex ?? Number.MAX_SAFE_INTEGER));
}

function normalizeLeaderboardEntries(entries: LeaderboardEntry[]) {
  return entries
    .slice()
    .sort((left, right) => {
      if (left.totalScore !== right.totalScore) {
        return right.totalScore - left.totalScore;
      }

      const leftTime = left.totalTimeSeconds ?? Number.POSITIVE_INFINITY;
      const rightTime = right.totalTimeSeconds ?? Number.POSITIVE_INFINITY;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function buildParticipantState(
  rounds: Round[],
  drafts: Record<string, DraftRoundProgress>,
  submissionsByRound: Record<string, RoundSubmission>,
  now = Date.now(),
) {
  const sortedRounds = sortRounds(rounds);
  const unlockedRounds: string[] = [];
  const roundsProgress: Record<string, RoundProgress> = {};
  let previousRoundsSubmitted = true;

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
      timeTakenSeconds: submission?.timeTakenSeconds ?? null,
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

function toServerTimeOffset(serverTime: string | ServerTimeSample, clientNow = Date.now()) {
  const parsed = new Date(typeof serverTime === 'string' ? serverTime : serverTime.serverNow).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }

  if (typeof serverTime === 'string') {
    return parsed - clientNow;
  }

  const midpointMs = serverTime.requestStartedAtMs
    + ((serverTime.responseReceivedAtMs - serverTime.requestStartedAtMs) / 2);
  return parsed - midpointMs;
}

async function loadServerTimeOffset(fallbackOffsetMs: number) {
  try {
    const serverTime = await fetchServerTime();
    return toServerTimeOffset(serverTime) ?? fallbackOffsetMs;
  } catch {
    return fallbackOffsetMs;
  }
}

interface AppState {
  authReady: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  serverTimeOffsetMs: number;
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
  syncServerClock: (serverNow: string | null | undefined) => void;
  recomputeParticipantState: () => void;
  syncRoundPublicState: (row: RoundPublicStateSyncRow) => void;
  syncRoundRecord: (eventType: SyncEventType, row: RoundSyncRow) => void;
  syncQuestionRecord: (eventType: SyncEventType, row: QuestionSyncRow) => void;
  syncOptionRecord: (eventType: SyncEventType, row: OptionSyncRow) => void;
  syncCorrectAnswerRecord: (eventType: SyncEventType, row: CorrectAnswerSyncRow) => void;
  syncSubmissionRecord: (eventType: SyncEventType, row: SubmissionSyncRow) => void;
  syncLeaderboardRecord: (eventType: SyncEventType, row: LeaderboardSyncRow) => void;
  setAnswer: (roundId: string, questionId: string, optionId: string) => void;
  markDocsVisited: (roundId: string) => void;
  markResourceViewed: (roundId: string) => void;
  submitRound: (roundId: string) => Promise<void>;
  updateRound: (roundId: string, updates: Partial<Round>) => Promise<void>;
  runAdminRoundAction: (
    roundId: string,
    action: 'unlock_round' | 'lock_round' | 'start_timer' | 'pause_timer' | 'resume_timer' | 'reset_round' | 'set_timer_duration',
    payload?: { timerMinutes?: number },
  ) => Promise<void>;
  saveQuestion: (roundId: string, question: Question) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  clearError: () => void;
  resetLocalDrafts: () => void;
}

function withDerivedParticipantState(
  state: Pick<AppState, 'team' | 'rounds' | 'draftProgressByRound' | 'submissionsByRound' | 'serverTimeOffsetMs'>,
  updates: Partial<Pick<AppState, 'rounds' | 'draftProgressByRound' | 'submissionsByRound'>>,
) {
  if (!state.team) {
    return updates;
  }

  const rounds = updates.rounds ?? state.rounds;
  const draftProgressByRound = updates.draftProgressByRound ?? state.draftProgressByRound;
  const submissionsByRound = updates.submissionsByRound ?? state.submissionsByRound;

  return {
    ...updates,
    ...buildParticipantState(rounds, draftProgressByRound, submissionsByRound, Date.now() + state.serverTimeOffsetMs),
  };
}

function withParticipantState(
  state: Pick<AppState, 'rounds' | 'draftProgressByRound' | 'submissionsByRound' | 'serverTimeOffsetMs'>,
) {
  return buildParticipantState(
    state.rounds,
    state.draftProgressByRound,
    state.submissionsByRound,
    Date.now() + state.serverTimeOffsetMs,
  );
}

function applyRoundPublicState(rounds: Round[], row: RoundPublicStateSyncRow) {
  const existing = rounds.find((round) => round.id === row.round_id);
  const nextRound: Round = existing
    ? {
      ...existing,
      orderIndex: row.order_index,
      title: row.title,
      description: row.description ?? '',
      status: row.status,
      timerMinutes: row.timer_minutes,
      timerState: row.timer_state,
      timerRemainingSeconds: row.timer_remaining_seconds,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    }
    : {
      id: row.round_id,
      orderIndex: row.order_index,
      title: row.title,
      description: row.description ?? '',
      objective: '',
      caseBrief: '',
      zipPassword: null,
      documentation: [],
      status: row.status,
      timerMinutes: row.timer_minutes,
      timerState: row.timer_state,
      timerDurationSeconds: row.timer_minutes * 60,
      timerRemainingSeconds: row.timer_remaining_seconds,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      questionCount: 0,
      contentVisible: true,
      questions: [],
    };

  const nextRounds = existing
    ? rounds.map((round) => (round.id === row.round_id ? nextRound : round))
    : [...rounds, nextRound];

  return sortRounds(nextRounds);
}

function applyRoundRecord(rounds: Round[], eventType: SyncEventType, row: RoundSyncRow) {
  if (eventType === 'DELETE') {
    return sortRounds(rounds.filter((round) => round.id !== row.id));
  }

  const existing = rounds.find((round) => round.id === row.id);
  const nextRound: Round = existing
    ? {
      ...existing,
      orderIndex: row.order_index,
      title: row.title,
      description: row.description ?? '',
      objective: row.objective ?? '',
      caseBrief: row.case_brief ?? '',
      zipPassword: row.zip_password,
      documentation: toDocumentationSections(row.documentation),
      status: row.status,
      timerMinutes: row.timer_minutes,
      timerState: row.timer_state,
      timerDurationSeconds: row.timer_duration_seconds,
      timerRemainingSeconds: row.timer_remaining_seconds,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      contentVisible: true,
    }
    : {
      id: row.id,
      orderIndex: row.order_index,
      title: row.title,
      description: row.description ?? '',
      objective: row.objective ?? '',
      caseBrief: row.case_brief ?? '',
      zipPassword: row.zip_password,
      documentation: toDocumentationSections(row.documentation),
      status: row.status,
      timerMinutes: row.timer_minutes,
      timerState: row.timer_state,
      timerDurationSeconds: row.timer_duration_seconds,
      timerRemainingSeconds: row.timer_remaining_seconds,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      questionCount: 0,
      contentVisible: true,
      questions: [],
    };

  const nextRounds = existing
    ? rounds.map((round) => (round.id === row.id ? nextRound : round))
    : [...rounds, nextRound];

  return sortRounds(nextRounds);
}

function applyQuestionRecord(rounds: Round[], eventType: SyncEventType, row: QuestionSyncRow) {
  const roundsWithoutQuestion = rounds.map((round) => {
    const nextQuestions = round.questions.filter((question) => question.id !== row.id);
    if (nextQuestions.length === round.questions.length) {
      return round;
    }

    return {
      ...round,
      questions: nextQuestions,
      questionCount: nextQuestions.length,
    };
  });

  if (eventType === 'DELETE') {
    return sortRounds(roundsWithoutQuestion);
  }

  return sortRounds(roundsWithoutQuestion.map((round) => {
    if (round.id !== row.round_id) {
      return round;
    }

    const existing = round.questions.find((question) => question.id === row.id);
    const nextQuestion: Question = existing
      ? {
        ...existing,
        roundId: row.round_id,
        questionIndex: row.order_index,
        text: row.text,
        type: row.type,
        inputType: row.input_type,
      }
      : {
        id: row.id,
        roundId: row.round_id,
        questionIndex: row.order_index,
        text: row.text,
        options: [],
        correctOptionId: null,
        type: row.type,
        inputType: row.input_type,
      };

    const nextQuestions = sortQuestions([...round.questions.filter((question) => question.id !== row.id), nextQuestion]);
    return {
      ...round,
      questions: nextQuestions,
      questionCount: nextQuestions.length,
    };
  }));
}

function applyOptionRecord(rounds: Round[], eventType: SyncEventType, row: OptionSyncRow) {
  const roundsWithoutOption = rounds.map((round) => ({
    ...round,
    questions: round.questions.map((question) => ({
      ...question,
      options: question.options.filter((option) => option.id !== row.id),
    })),
  }));

  if (eventType === 'DELETE') {
    return sortRounds(roundsWithoutOption);
  }

  return sortRounds(roundsWithoutOption.map((round) => ({
    ...round,
    questions: round.questions.map((question) => {
      if (question.id !== row.question_id) {
        return question;
      }

      const nextOption: Option = {
        id: row.id,
        text: row.text,
        score: row.score ?? 0,
        orderIndex: row.order_index,
      };

      return {
        ...question,
        options: sortOptions([...question.options, nextOption]),
      };
    }),
  })));
}

function applyCorrectAnswerRecord(rounds: Round[], eventType: SyncEventType, row: CorrectAnswerSyncRow) {
  return sortRounds(rounds.map((round) => ({
    ...round,
    questions: round.questions.map((question) => {
      if (question.id !== row.question_id) {
        return question;
      }

      return {
        ...question,
        correctOptionId: eventType === 'DELETE' ? null : row.answer_value,
      };
    }),
  })));
}

function applySubmissionRecord(
  submissionsByRound: Record<string, RoundSubmission>,
  eventType: SyncEventType,
  row: SubmissionSyncRow,
) {
  const nextSubmissions = { ...submissionsByRound };

  if (eventType === 'DELETE') {
    delete nextSubmissions[row.round_id];
    return nextSubmissions;
  }

  nextSubmissions[row.round_id] = {
    id: row.id,
    roundId: row.round_id,
    submittedAt: row.submitted_at,
    totalScore: row.total_score,
    timeTakenSeconds: row.time_taken_seconds,
    status: row.status,
  };

  return nextSubmissions;
}

function applyLeaderboardRecord(
  leaderboard: LeaderboardEntry[],
  eventType: SyncEventType,
  row: LeaderboardSyncRow,
) {
  const nextEntries = leaderboard.filter((entry) => entry.teamId !== row.team_id);

  if (eventType === 'DELETE') {
    return normalizeLeaderboardEntries(nextEntries);
  }

  nextEntries.push({
    rank: 0,
    teamId: row.team_id,
    teamName: row.team_name,
    username: row.username,
    round1Score: row.round_1_score,
    round2Score: row.round_2_score,
    round3Score: row.round_3_score,
    totalScore: row.total_score,
    totalTimeSeconds: row.total_time_seconds,
    updatedAt: row.updated_at,
  });

  return normalizeLeaderboardEntries(nextEntries);
}

async function loadParticipantBundle() {
  const bundle = await fetchParticipantBundle();
  return {
    team: bundle.team,
    rounds: sortRounds(bundle.rounds),
    submissionsByRound: bundle.submissionsByRound,
    leaderboard: normalizeLeaderboardEntries(bundle.leaderboard),
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      authReady: false,
      isBootstrapping: false,
      isSubmitting: false,
      serverTimeOffsetMs: 0,
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
          const fallbackOffsetMs = get().serverTimeOffsetMs;

          if (session.role === 'team' && session.team) {
            const [participantBundle, serverTimeOffsetMs] = await Promise.all([
              loadParticipantBundle(),
              loadServerTimeOffset(fallbackOffsetMs),
            ]);
            set((state) => ({
              authReady: true,
              isBootstrapping: false,
              serverTimeOffsetMs,
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
                Date.now() + serverTimeOffsetMs,
              ),
            }));
            return;
          }

          if (session.role === 'admin' && session.admin) {
            const [rounds, serverTimeOffsetMs] = await Promise.all([
              fetchAdminRounds(),
              loadServerTimeOffset(fallbackOffsetMs),
            ]);
            set({
              authReady: true,
              isBootstrapping: false,
              serverTimeOffsetMs,
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
            serverTimeOffsetMs: 0,
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
            serverTimeOffsetMs: 0,
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
          const fallbackOffsetMs = get().serverTimeOffsetMs;
          const [participantBundle, serverTimeOffsetMs] = await Promise.all([
            loadParticipantBundle(),
            loadServerTimeOffset(fallbackOffsetMs),
          ]);

          set((state) => ({
            authReady: true,
            isBootstrapping: false,
            serverTimeOffsetMs,
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
              Date.now() + serverTimeOffsetMs,
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
          const fallbackOffsetMs = get().serverTimeOffsetMs;
          const [rounds, serverTimeOffsetMs] = await Promise.all([
            fetchAdminRounds(),
            loadServerTimeOffset(fallbackOffsetMs),
          ]);

          set({
            authReady: true,
            isBootstrapping: false,
            serverTimeOffsetMs,
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
          serverTimeOffsetMs: 0,
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

        const fallbackOffsetMs = get().serverTimeOffsetMs;
        const [participantBundle, serverTimeOffsetMs] = await Promise.all([
          loadParticipantBundle(),
          loadServerTimeOffset(fallbackOffsetMs),
        ]);
        set((state) => ({
          serverTimeOffsetMs,
          team: participantBundle.team,
          rounds: participantBundle.rounds,
          leaderboard: participantBundle.leaderboard,
          submissionsByRound: participantBundle.submissionsByRound,
          ...buildParticipantState(
            participantBundle.rounds,
            state.draftProgressByRound,
            participantBundle.submissionsByRound,
            Date.now() + serverTimeOffsetMs,
          ),
        }));
      },

      refreshAdminData: async () => {
        const fallbackOffsetMs = get().serverTimeOffsetMs;
        const [rounds, serverTimeOffsetMs] = await Promise.all([
          fetchAdminRounds(),
          loadServerTimeOffset(fallbackOffsetMs),
        ]);
        set({
          rounds,
          serverTimeOffsetMs,
        });
      },

      refreshLeaderboard: async () => {
        const leaderboard = await fetchLeaderboard();
        set({ leaderboard: normalizeLeaderboardEntries(leaderboard) });
      },

      syncServerClock: (serverNow) => {
        if (!serverNow) {
          return;
        }

        const nextOffsetMs = toServerTimeOffset(serverNow);
        if (nextOffsetMs === null) {
          return;
        }

        set((state) => {
          const serverTimeOffsetMs = state.serverTimeOffsetMs === 0
            ? nextOffsetMs
            : state.serverTimeOffsetMs + Math.max(Math.min(nextOffsetMs - state.serverTimeOffsetMs, 1000), -1000);

          if (!state.team) {
            return { serverTimeOffsetMs };
          }

          return {
            serverTimeOffsetMs,
            ...buildParticipantState(
              state.rounds,
              state.draftProgressByRound,
              state.submissionsByRound,
              Date.now() + serverTimeOffsetMs,
            ),
          };
        });
      },

      recomputeParticipantState: () => {
        set((state) => withDerivedParticipantState(state, {}));
      },

      syncRoundPublicState: (row) => {
        set((state) => {
          const rounds = applyRoundPublicState(state.rounds, row);
          return withDerivedParticipantState(state, { rounds });
        });
      },

      syncRoundRecord: (eventType, row) => {
        set((state) => {
          const rounds = applyRoundRecord(state.rounds, eventType, row);
          return withDerivedParticipantState(state, { rounds });
        });
      },

      syncQuestionRecord: (eventType, row) => {
        set((state) => {
          const rounds = applyQuestionRecord(state.rounds, eventType, row);
          return withDerivedParticipantState(state, { rounds });
        });
      },

      syncOptionRecord: (eventType, row) => {
        set((state) => {
          const rounds = applyOptionRecord(state.rounds, eventType, row);
          return withDerivedParticipantState(state, { rounds });
        });
      },

      syncCorrectAnswerRecord: (eventType, row) => {
        set((state) => ({
          rounds: applyCorrectAnswerRecord(state.rounds, eventType, row),
        }));
      },

      syncSubmissionRecord: (eventType, row) => {
        set((state) => {
          const submissionsByRound = applySubmissionRecord(state.submissionsByRound, eventType, row);
          const draftProgressByRound = { ...state.draftProgressByRound };
          if (eventType !== 'DELETE') {
            delete draftProgressByRound[row.round_id];
          }

          return withDerivedParticipantState(state, {
            submissionsByRound,
            draftProgressByRound,
          });
        });
      },

      syncLeaderboardRecord: (eventType, row) => {
        set((state) => ({
          leaderboard: applyLeaderboardRecord(state.leaderboard, eventType, row),
        }));
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
            ...buildParticipantState(
              state.rounds,
              draftProgressByRound,
              state.submissionsByRound,
              Date.now() + state.serverTimeOffsetMs,
            ),
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
            ...buildParticipantState(
              state.rounds,
              draftProgressByRound,
              state.submissionsByRound,
              Date.now() + state.serverTimeOffsetMs,
            ),
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
            ...buildParticipantState(
              state.rounds,
              draftProgressByRound,
              state.submissionsByRound,
              Date.now() + state.serverTimeOffsetMs,
            ),
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
          const submission = await submitRoundRequest(roundId, progress.answers) as SubmitRoundResponse;

          set((state) => {
            const draftProgressByRound = { ...state.draftProgressByRound };
            delete draftProgressByRound[roundId];

            const submissionsByRound = {
              ...state.submissionsByRound,
              [roundId]: {
                id: submission.submissionId,
                roundId,
                submittedAt: submission.submittedAt,
                totalScore: submission.totalScore,
                timeTakenSeconds: submission.timeTakenSeconds,
                status: submission.status,
              },
            };

            return {
              isSubmitting: false,
              ...withDerivedParticipantState(state, {
                draftProgressByRound,
                submissionsByRound,
              }),
            };
          });
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
          set((state) => ({
            rounds: state.rounds.map((round) => (round.id === roundId
              ? {
                ...round,
                title: updates.title ?? round.title,
                description: updates.description ?? round.description,
                objective: updates.objective ?? round.objective,
                caseBrief: updates.caseBrief ?? round.caseBrief,
                zipPassword: updates.zipPassword !== undefined ? updates.zipPassword : round.zipPassword,
                documentation: updates.documentation ?? round.documentation,
              }
              : round)),
          }));
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
            serverTimeOffsetMs: state.serverTimeOffsetMs,
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
