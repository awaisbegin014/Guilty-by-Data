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
  status: RoundStatus;
  timer_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  documentation: unknown;
}

interface DatasetRow {
  id: string;
  round_id: string;
  title: string;
  description: string | null;
  link: string | null;
  show_link: boolean;
}

interface OptionRow {
  id: string;
  question_id: string;
  order_index: number;
  text: string;
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
  updated_at: string;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured in this environment.');
  }

  return supabase;
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
  datasetRows: DatasetRow[],
  questionRows: QuestionRow[],
  optionRows: OptionRow[],
  correctRows?: CorrectAnswerRow[],
) {
  const datasetsByRoundId = new Map<string, DatasetRow>();
  for (const dataset of datasetRows) {
    datasetsByRoundId.set(dataset.round_id, dataset);
  }

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
      const dataset = datasetsByRoundId.get(row.id);

      return {
        id: row.id,
        orderIndex: row.order_index,
        title: row.title,
        description: row.description ?? '',
        objective: row.objective ?? '',
        caseBrief: row.case_brief ?? '',
        datasetTitle: dataset?.title ?? 'Dataset',
        datasetDescription: dataset?.description ?? '',
        datasetLink: dataset?.link ?? undefined,
        datasetVisible: dataset?.show_link ?? false,
        documentation: toDocumentationSections(row.documentation),
        status: row.status,
        timerMinutes: row.timer_minutes,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
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

  const [roundsResult, datasetsResult, questionsResult, optionsResult] = await Promise.all([
    client
      .from('rounds')
      .select('id, order_index, title, description, objective, case_brief, status, timer_minutes, starts_at, ends_at, documentation'),
    client
      .from('datasets')
      .select('id, round_id, title, description, link, show_link'),
    client
      .from('questions')
      .select('id, round_id, order_index, text, type, input_type'),
    client
      .from('options')
      .select('id, question_id, order_index, text'),
  ]);

  if (roundsResult.error) {
    throw roundsResult.error;
  }

  if (datasetsResult.error) {
    throw datasetsResult.error;
  }

  if (questionsResult.error) {
    throw questionsResult.error;
  }

  if (optionsResult.error) {
    throw optionsResult.error;
  }

  return {
    roundRows: (roundsResult.data ?? []) as RoundRow[],
    datasetRows: (datasetsResult.data ?? []) as DatasetRow[],
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
  return mapRounds(rows.roundRows, rows.datasetRows, rows.questionRows, rows.optionRows);
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
    rows.datasetRows,
    rows.questionRows,
    rows.optionRows,
    (correctAnswersResult.data ?? []) as CorrectAnswerRow[],
  );
}

export async function fetchTeamSubmissions(teamId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('submissions')
    .select('id, round_id, submitted_at, total_score, status')
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
      status: submission.status,
    };
    return acc;
  }, {});
}

export async function fetchLeaderboard() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('leaderboard')
    .select('team_id, team_name, username, round_1_score, round_2_score, round_3_score, total_score, updated_at')
    .order('total_score', { ascending: false })
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
  if (typeof updates.status === 'string') roundPayload.status = updates.status;
  if (typeof updates.timerMinutes === 'number') roundPayload.timer_minutes = updates.timerMinutes;
  if (updates.startsAt !== undefined) roundPayload.starts_at = updates.startsAt;
  if (updates.endsAt !== undefined) roundPayload.ends_at = updates.endsAt;
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

  if (
    updates.datasetTitle !== undefined ||
    updates.datasetDescription !== undefined ||
    updates.datasetLink !== undefined ||
    updates.datasetVisible !== undefined
  ) {
    const { error } = await client
      .from('datasets')
      .upsert(
        {
          round_id: roundId,
          title: updates.datasetTitle ?? 'Dataset',
          description: updates.datasetDescription ?? '',
          link: updates.datasetLink ?? null,
          show_link: updates.datasetVisible ?? Boolean(updates.datasetLink),
        },
        { onConflict: 'round_id' },
      );

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
      local_id: option.id,
    }));

  if (inserts.length > 0) {
    const { data, error } = await client
      .from('options')
      .insert(inserts.map((insert) => ({
        question_id: insert.question_id,
        order_index: insert.order_index,
        text: insert.text,
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
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to submit a round.');
  }

  const submitUrl = (import.meta.env.VITE_SUBMIT_API_URL || '').trim() || '/api/submit-round';
  const payload = {
    roundId,
    answers: Object.entries(answers).map(([questionId, answerValue]) => ({
      questionId,
      answerValue,
    })),
  };

  const response = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) as unknown : null;

  if (!response.ok) {
    throw new Error(
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : response.status === 404
          ? 'Submission API not found. If you are running locally, start the app with `vercel dev` or set `VITE_SUBMIT_API_URL`.'
          : 'Round submission failed.',
    );
  }

  return data;
}
