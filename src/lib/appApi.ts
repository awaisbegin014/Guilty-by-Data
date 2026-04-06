import type {
  AdminUser,
  LeaderboardEntry,
  Question,
  Round,
  RoundSubmission,
  Team,
} from '../types';
import { supabase } from './supabase';

const TEAM_EMAIL_DOMAIN = 'guiltybydata.local';
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RoundStatus = Round['status'];

interface TeamRow {
  id: string;
  username: string;
  name: string;
}

interface AdminRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface RoundRow {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  objective: string | null;
  case_brief: string | null;
  zip_password: string | null;
  status: RoundStatus;
  timer_minutes: number;
  timer_state: Round['timerState'];
  timer_duration_seconds: number;
  timer_remaining_seconds: number | null;
  starts_at: string | null;
  ends_at: string | null;
  documentation: unknown;
}

interface OptionRow {
  id: string;
  question_id: string;
  order_index: number;
  text: string;
  score: number | null;
}

interface QuestionRow {
  id: string;
  round_id: string;
  order_index: number;
  text: string;
  type: 'mcq' | 'blank';
  input_type: 'int' | 'float' | 'string' | null;
}

interface CorrectAnswerRow {
  question_id: string;
  answer_value: string;
}

interface SubmissionRow {
  id: string;
  round_id: string;
  submitted_at: string;
  total_score: number | null;
  time_taken_seconds: number | null;
  status: 'accepted' | 'rejected';
}

interface LeaderboardRow {
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

interface ParticipantBundleResponse {
  team: Team;
  rounds: Round[];
  submissionsByRound: Record<string, RoundSubmission>;
  leaderboard: LeaderboardEntry[];
}

interface ServerTimeResponse {
  serverNow: string;
}

export interface ServerTimeSample {
  serverNow: string;
  requestStartedAtMs: number;
  responseReceivedAtMs: number;
}

function tryParseJson(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toApiFailureMessage(params: {
  data: unknown;
  text: string;
  fallback: string;
  localDevHint: string;
}) {
  const { data, text, fallback, localDevHint } = params;

  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }

  const preview = text.trim().slice(0, 120).toLowerCase();
  if (
    preview.startsWith('import ')
    || preview.startsWith('export ')
    || preview.startsWith('<!doctype')
    || preview.startsWith('<html')
    || preview.startsWith('<')
  ) {
    return localDevHint;
  }

  return fallback;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured in this environment.');
  }

  return supabase;
}

function sessionNeedsRefresh(session: { access_token?: string | null; expires_at?: number | null } | null) {
  if (!session?.access_token || !session.expires_at) {
    return false;
  }

  return (session.expires_at * 1000) - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS;
}

async function getAccessToken(missingAuthMessage: string, forceRefresh = false) {
  const client = requireSupabase();
  const {
    data: { session: initialSession },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  let session = initialSession;

  if (!session) {
    throw new Error(missingAuthMessage);
  }

  if (forceRefresh || sessionNeedsRefresh(session)) {
    const { data, error } = await client.auth.refreshSession();
    if (error) {
      throw error;
    }

    session = data.session ?? session;
  }

  if (!session?.access_token) {
    throw new Error(missingAuthMessage);
  }

  return session.access_token;
}

async function authorizedFetch(
  url: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
  missingAuthMessage: string,
) {
  const accessToken = await getAccessToken(missingAuthMessage);
  const requestInit: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };

  let response = await fetch(url, requestInit);

  if (response.status !== 401) {
    return response;
  }

  const refreshedAccessToken = await getAccessToken(missingAuthMessage, true);
  return fetch(url, {
    ...requestInit,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${refreshedAccessToken}`,
    },
  });
}

function toTeamEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();

  if (normalized.includes('@')) {
    return normalized;
  }

  return `${normalized}@${TEAM_EMAIL_DOMAIN}`;
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

function mapTeam(row: TeamRow, email?: string): Team {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email,
  };
}

function mapAdmin(row: AdminRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}

function mapQuestions(
  rows: QuestionRow[],
  optionsByQuestionId: Map<string, OptionRow[]>,
  correctByQuestionId?: Map<string, string>,
) {
  return rows
    .slice()
    .sort((left, right) => left.order_index - right.order_index)
    .map<Question>((row) => {
      const options = (optionsByQuestionId.get(row.id) ?? [])
        .slice()
        .sort((left, right) => left.order_index - right.order_index)
        .map((option) => ({
          id: option.id,
          text: option.text,
          score: option.score ?? 0,
          orderIndex: option.order_index,
        }));

      return {
        id: row.id,
        roundId: row.round_id,
        questionIndex: row.order_index,
        text: row.text,
        options,
        correctOptionId: correctByQuestionId?.get(row.id) ?? null,
        type: row.type,
        inputType: row.input_type,
      };
    });
}

function mapRounds(
  roundRows: RoundRow[],
  questionRows: QuestionRow[],
  optionRows: OptionRow[],
  correctRows?: CorrectAnswerRow[],
) {
  const optionsByQuestionId = new Map<string, OptionRow[]>();
  for (const option of optionRows) {
    const group = optionsByQuestionId.get(option.question_id) ?? [];
    group.push(option);
    optionsByQuestionId.set(option.question_id, group);
  }

  const questionsByRoundId = new Map<string, QuestionRow[]>();
  for (const question of questionRows) {
    const group = questionsByRoundId.get(question.round_id) ?? [];
    group.push(question);
    questionsByRoundId.set(question.round_id, group);
  }

  const correctByQuestionId = new Map<string, string>();
  for (const row of correctRows ?? []) {
    correctByQuestionId.set(row.question_id, row.answer_value);
  }

  return roundRows
    .slice()
    .sort((left, right) => left.order_index - right.order_index)
    .map<Round>((row) => {
      return {
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
        questionCount: (questionsByRoundId.get(row.id) ?? []).length,
        contentVisible: true,
        questions: mapQuestions(
          questionsByRoundId.get(row.id) ?? [],
          optionsByQuestionId,
          correctRows ? correctByQuestionId : undefined,
        ),
      };
    });
}

async function loadRoundRows() {
  const client = requireSupabase();

  const [roundsResult, questionsResult, optionsResult] = await Promise.all([
    client
      .from('rounds')
      .select('id, order_index, title, description, objective, case_brief, zip_password, status, timer_minutes, timer_state, timer_duration_seconds, timer_remaining_seconds, starts_at, ends_at, documentation'),
    client
      .from('questions')
      .select('id, round_id, order_index, text, type, input_type'),
    client
      .from('options')
      .select('id, question_id, order_index, text, score'),
  ]);

  if (roundsResult.error) {
    throw roundsResult.error;
  }

  if (questionsResult.error) {
    throw questionsResult.error;
  }

  if (optionsResult.error) {
    throw optionsResult.error;
  }

  return {
    roundRows: (roundsResult.data ?? []) as RoundRow[],
    questionRows: (questionsResult.data ?? []) as QuestionRow[],
    optionRows: (optionsResult.data ?? []) as OptionRow[],
  };
}

export async function signInTeam(identifier: string, password: string) {
  const client = requireSupabase();
  const email = toTeamEmail(identifier);

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Team login did not return a user.');
  }

  const team = await fetchTeamProfile(data.user.id, email);
  if (!team) {
    await client.auth.signOut();
    throw new Error('This account is not registered as a team.');
  }

  return team;
}

export async function signInAdmin(identifier: string, password: string) {
  const client = requireSupabase();
  const email = toTeamEmail(identifier);

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Admin login did not return a user.');
  }

  const admin = await fetchAdminProfile(data.user.id);
  if (!admin) {
    await client.auth.signOut();
    throw new Error('This account is not authorized as an admin.');
  }

  return admin;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function resolveSession(): Promise<
  | { role: 'team'; team: Team; admin: null }
  | { role: 'admin'; team: null; admin: AdminUser }
  | { role: null; team: null; admin: null }
> {
  const client = requireSupabase();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    return { role: null, team: null, admin: null };
  }

  const [team, admin] = await Promise.all([
    fetchTeamProfile(session.user.id, session.user.email ?? undefined),
    fetchAdminProfile(session.user.id),
  ]);

  if (admin) {
    return { role: 'admin' as const, admin, team: null };
  }

  if (team) {
    return { role: 'team' as const, team, admin: null };
  }

  await client.auth.signOut();
  return { role: null, team: null, admin: null };
}

export async function fetchTeamProfile(id: string, email?: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('teams')
    .select('id, username, name')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapTeam(data as TeamRow, email) : null;
}

export async function fetchAdminProfile(id: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('admins')
    .select('id, email, display_name')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAdmin(data as AdminRow) : null;
}

export async function fetchParticipantRounds() {
  const rows = await loadRoundRows();
  return mapRounds(rows.roundRows, rows.questionRows, rows.optionRows);
}

export async function fetchParticipantBundle() {
  const participantBundleUrl = (import.meta.env.VITE_PARTICIPANT_BUNDLE_API_URL || '').trim() || '/api/participant-bundle';
  const response = await authorizedFetch(participantBundleUrl, {
    method: 'GET',
  }, 'You must be signed in to load participant data.');

  const text = await response.text();
  const data = tryParseJson(text);

  if (!response.ok) {
    throw new Error(toApiFailureMessage({
      data,
      text,
      fallback: 'Failed to load participant data.',
      localDevHint: 'Participant API returned a non-JSON response. If you are running locally, start the app with `vercel dev` or set `VITE_PARTICIPANT_BUNDLE_API_URL`.',
    }));
  }

  if (!data) {
    throw new Error(
      toApiFailureMessage({
        data,
        text,
        fallback: 'Participant API returned an invalid response.',
        localDevHint: 'Participant API returned source instead of JSON. If you are running locally, start the app with `vercel dev` or set `VITE_PARTICIPANT_BUNDLE_API_URL`.',
      }),
    );
  }

  return data as ParticipantBundleResponse;
}

export async function fetchServerTime() {
  const serverTimeUrl = (import.meta.env.VITE_SERVER_TIME_API_URL || '').trim() || '/api/server-time';
  const requestStartedAtMs = Date.now();
  const response = await fetch(serverTimeUrl, {
    method: 'GET',
    cache: 'no-store',
  });
  const responseReceivedAtMs = Date.now();

  const text = await response.text();
  const data = tryParseJson(text);

  if (!response.ok) {
    throw new Error(toApiFailureMessage({
      data,
      text,
      fallback: 'Failed to load server time.',
      localDevHint: 'Server time API returned a non-JSON response. If you are running locally, start the app with `vercel dev` or set `VITE_SERVER_TIME_API_URL`.',
    }));
  }

  if (!data || typeof data !== 'object' || typeof (data as ServerTimeResponse).serverNow !== 'string') {
    throw new Error(
      toApiFailureMessage({
        data,
        text,
        fallback: 'Server time API returned an invalid response.',
        localDevHint: 'Server time API returned source instead of JSON. If you are running locally, start the app with `vercel dev` or set `VITE_SERVER_TIME_API_URL`.',
      }),
    );
  }

  return {
    serverNow: (data as ServerTimeResponse).serverNow,
    requestStartedAtMs,
    responseReceivedAtMs,
  } satisfies ServerTimeSample;
}

export async function fetchAdminRounds() {
  const client = requireSupabase();
  const rows = await loadRoundRows();
  const correctAnswersResult = await client
    .from('correct_answers')
    .select('question_id, answer_value');

  if (correctAnswersResult.error) {
    throw correctAnswersResult.error;
  }

  return mapRounds(
    rows.roundRows,
    rows.questionRows,
    rows.optionRows,
    (correctAnswersResult.data ?? []) as CorrectAnswerRow[],
  );
}

export async function fetchTeamSubmissions(teamId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('submissions')
    .select('id, round_id, submitted_at, total_score, time_taken_seconds, status')
    .eq('team_id', teamId);

  if (error) {
    throw error;
  }

  return (data ?? []).reduce<Record<string, RoundSubmission>>((acc, row) => {
    const submission = row as SubmissionRow;
    acc[submission.round_id] = {
      id: submission.id,
      roundId: submission.round_id,
      submittedAt: submission.submitted_at,
      totalScore: submission.total_score,
      timeTakenSeconds: submission.time_taken_seconds,
      status: submission.status,
    };
    return acc;
  }, {});
}

export async function fetchLeaderboard() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('leaderboard')
    .select('team_id, team_name, username, round_1_score, round_2_score, round_3_score, total_score, total_time_seconds, updated_at')
    .order('total_score', { ascending: false })
    .order('total_time_seconds', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map<LeaderboardEntry>((row, index) => {
    const entry = row as LeaderboardRow;
    return {
      rank: index + 1,
      teamId: entry.team_id,
      teamName: entry.team_name,
      username: entry.username,
      round1Score: entry.round_1_score,
      round2Score: entry.round_2_score,
      round3Score: entry.round_3_score,
      totalScore: entry.total_score,
      totalTimeSeconds: entry.total_time_seconds,
      updatedAt: entry.updated_at,
    };
  });
}

export async function updateRound(roundId: string, updates: Partial<Round>) {
  const client = requireSupabase();
  const roundPayload: Record<string, unknown> = {};

  if (typeof updates.title === 'string') roundPayload.title = updates.title;
  if (typeof updates.description === 'string') roundPayload.description = updates.description;
  if (typeof updates.objective === 'string') roundPayload.objective = updates.objective;
  if (typeof updates.caseBrief === 'string') roundPayload.case_brief = updates.caseBrief;
  if (updates.zipPassword !== undefined) roundPayload.zip_password = updates.zipPassword;
  if (updates.documentation !== undefined) roundPayload.documentation = updates.documentation;

  if (Object.keys(roundPayload).length > 0) {
    const { error } = await client
      .from('rounds')
      .update(roundPayload)
      .eq('id', roundId);

    if (error) {
      throw error;
    }
  }
}

export async function saveQuestion(roundId: string, question: Question) {
  const client = requireSupabase();
  const isExistingQuestion = UUID_RE.test(question.id);

  const questionPayload = {
    round_id: roundId,
    order_index: question.questionIndex,
    type: question.type ?? 'mcq',
    text: question.text,
    input_type: question.inputType ?? null,
  };

  let persistedQuestionId = question.id;

  if (isExistingQuestion) {
    const { error } = await client
      .from('questions')
      .update(questionPayload)
      .eq('id', question.id);

    if (error) {
      throw error;
    }
  } else {
    const { data, error } = await client
      .from('questions')
      .insert(questionPayload)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    persistedQuestionId = data.id;
  }

  const existingOptionsResult = await client
    .from('options')
    .select('id, order_index')
    .eq('question_id', persistedQuestionId);

  if (existingOptionsResult.error) {
    throw existingOptionsResult.error;
  }

  const existingOptionIds = new Set((existingOptionsResult.data ?? []).map((row) => row.id));
  const localToPersistedId = new Map<string, string>();

  const updates = question.options
    .filter((option) => UUID_RE.test(option.id))
    .map((option, index) => ({
      id: option.id,
      question_id: persistedQuestionId,
      order_index: index,
      text: option.text,
      score: option.score ?? 0,
    }));

  if (updates.length > 0) {
    const { data, error } = await client
      .from('options')
      .upsert(updates, { onConflict: 'id' })
      .select('id, order_index');

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const localOption = question.options[row.order_index];
      if (localOption) {
        localToPersistedId.set(localOption.id, row.id);
      }
    }
  }

  const inserts = question.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !UUID_RE.test(option.id))
    .map(({ option, index }) => ({
      question_id: persistedQuestionId,
      order_index: index,
      text: option.text,
      score: option.score ?? 0,
      local_id: option.id,
    }));

  if (inserts.length > 0) {
    const { data, error } = await client
      .from('options')
      .insert(inserts.map((insert) => ({
        question_id: insert.question_id,
        order_index: insert.order_index,
        text: insert.text,
        score: insert.score,
      })))
      .select('id, order_index');

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const localId = inserts.find((insert) => insert.order_index === row.order_index)?.local_id;
      if (localId) {
        localToPersistedId.set(localId, row.id);
      }
    }
  }

  const currentPersistedIds = new Set<string>();
  for (const option of question.options) {
    const persistedId = localToPersistedId.get(option.id) ?? (UUID_RE.test(option.id) ? option.id : undefined);
    if (persistedId) {
      currentPersistedIds.add(persistedId);
    }
  }

  const staleIds = [...existingOptionIds].filter((id) => !currentPersistedIds.has(id));
  if (staleIds.length > 0) {
    const { error } = await client
      .from('options')
      .delete()
      .in('id', staleIds);

    if (error) {
      throw error;
    }
  }

  const resolvedCorrectOptionId = question.correctOptionId
    ? localToPersistedId.get(question.correctOptionId) ?? question.correctOptionId
    : null;

  if (resolvedCorrectOptionId) {
    const { error } = await client
      .from('correct_answers')
      .upsert(
        {
          question_id: persistedQuestionId,
          answer_value: resolvedCorrectOptionId,
        },
        { onConflict: 'question_id' },
      );

    if (error) {
      throw error;
    }
  }
}

export async function deleteQuestion(questionId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from('questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    throw error;
  }
}

export async function submitRound(roundId: string, answers: Record<string, string>) {
  const submitUrl = (import.meta.env.VITE_SUBMIT_API_URL || '').trim() || '/api/submit-round';
  const payload = {
    roundId,
    answers: Object.entries(answers).map(([questionId, answerValue]) => ({
      questionId,
      answerValue,
    })),
  };

  const response = await authorizedFetch(submitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, 'You must be signed in to submit a round.');

  const text = await response.text();
  const data = tryParseJson(text);

  if (!response.ok) {
    throw new Error(toApiFailureMessage({
      data,
      text,
      fallback: response.status === 404
        ? 'Submission API not found. If you are running locally, start the app with `vercel dev` or set `VITE_SUBMIT_API_URL`.'
        : 'Round submission failed.',
      localDevHint: 'Submission API returned source instead of JSON. If you are running locally, start the app with `vercel dev` or set `VITE_SUBMIT_API_URL`.',
    }));
  }

  if (!data) {
    throw new Error(
      toApiFailureMessage({
        data,
        text,
        fallback: 'Submission API returned an invalid response.',
        localDevHint: 'Submission API returned source instead of JSON. If you are running locally, start the app with `vercel dev` or set `VITE_SUBMIT_API_URL`.',
      }),
    );
  }

  return data;
}

export async function runAdminRoundAction(
  roundId: string,
  action: 'unlock_round' | 'lock_round' | 'start_timer' | 'pause_timer' | 'resume_timer' | 'reset_round' | 'set_timer_duration',
  payload?: { timerMinutes?: number },
) {
  const adminRoundActionUrl = (import.meta.env.VITE_ADMIN_ROUND_ACTION_API_URL || '').trim() || '/api/admin-round-action';
  const response = await authorizedFetch(adminRoundActionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roundId,
      action,
      timerMinutes: payload?.timerMinutes,
    }),
  }, 'You must be signed in as an admin to manage rounds.');

  const text = await response.text();
  const data = tryParseJson(text);

  if (!response.ok) {
    throw new Error(toApiFailureMessage({
      data,
      text,
      fallback: 'Round action failed.',
      localDevHint: 'Admin round action API returned source instead of JSON. If you are running locally, start the app with `vercel dev` or set `VITE_ADMIN_ROUND_ACTION_API_URL`.',
    }));
  }

  if (!data) {
    throw new Error(
      toApiFailureMessage({
        data,
        text,
        fallback: 'Admin round action API returned an invalid response.',
        localDevHint: 'Admin round action API returned source instead of JSON. If you are running locally, start the app with `vercel dev` or set `VITE_ADMIN_ROUND_ACTION_API_URL`.',
      }),
    );
  }

  return data;
}
