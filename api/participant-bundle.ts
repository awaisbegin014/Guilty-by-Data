import type { NodeRequest, NodeResponse } from './_lib/server.js';
import { authenticateRequest, logServerError, sendJson, sendOptions } from './_lib/server.js';
import { deriveParticipantRoundStatus } from '../src/lib/roundState.js';

interface RoundRow {
  id: string;
  order_index: number;
  title: string;
  description: string | null;
  objective: string | null;
  case_brief: string | null;
  zip_password: string | null;
  status: 'draft' | 'open' | 'closed';
  timer_minutes: number;
  timer_state: 'idle' | 'running' | 'paused' | 'expired';
  timer_duration_seconds: number;
  timer_remaining_seconds: number | null;
  submission_grace_seconds: number | null;
  submission_ends_at: string | null;
  submission_remaining_seconds: number | null;
  starts_at: string | null;
  ends_at: string | null;
  documentation: unknown;
}

interface RoundPublicStateRow {
  round_id: string;
  order_index: number;
  title: string;
  description: string | null;
  status: 'draft' | 'open' | 'closed';
  timer_minutes: number;
  timer_state: 'idle' | 'running' | 'paused' | 'expired';
  starts_at: string | null;
  ends_at: string | null;
  timer_remaining_seconds: number | null;
  submission_ends_at: string | null;
  submission_remaining_seconds: number | null;
}

interface QuestionRow {
  id: string;
  round_id: string;
  order_index: number;
  text: string;
  type: 'mcq' | 'blank';
  input_type: 'int' | 'float' | 'string' | null;
}

interface OptionRow {
  id: string;
  question_id: string;
  order_index: number;
  text: string;
}

interface SubmissionRow {
  id: string;
  round_id: string;
  submitted_at: string;
  time_taken_seconds: number;
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
  total_time_seconds: number;
  updated_at: string;
}

function toDocumentationSections(value: unknown) {
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

export default async function handler(request: NodeRequest, response: NodeResponse) {
  if (request.method === 'OPTIONS') {
    sendOptions(response, 'GET, OPTIONS');
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const auth = await authenticateRequest(request, response);
  if (!auth) {
    return;
  }

  const teamResult = await auth.supabase
    .from('teams')
    .select('id, username, name')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (teamResult.error) {
    logServerError('participant-bundle team lookup', teamResult.error);
    sendJson(response, 500, { error: 'Unable to verify team account.' });
    return;
  }

  if (!teamResult.data) {
    sendJson(response, 403, { error: 'This account is not registered as a team.' });
    return;
  }

  const [
    roundPublicStateResult,
    submissionsResult,
    leaderboardResult,
  ] = await Promise.all([
    auth.supabase
      .from('round_public_state')
      .select('round_id, order_index, title, description, status, timer_minutes, timer_state, starts_at, ends_at, timer_remaining_seconds, submission_ends_at, submission_remaining_seconds')
      .order('order_index', { ascending: true }),
    auth.supabase
      .from('submissions')
      .select('id, round_id, submitted_at, time_taken_seconds, total_score, status')
      .eq('team_id', auth.user.id),
    auth.supabase
      .from('leaderboard')
      .select('team_id, team_name, username, round_1_score, round_2_score, round_3_score, total_score, total_time_seconds, updated_at')
      .order('total_score', { ascending: false })
      .order('total_time_seconds', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: true }),
  ]);

  if (roundPublicStateResult.error || submissionsResult.error || leaderboardResult.error) {
    logServerError('participant-bundle base load', {
      roundPublicStateError: roundPublicStateResult.error,
      submissionsError: submissionsResult.error,
      leaderboardError: leaderboardResult.error,
    });
    sendJson(response, 500, { error: 'Failed to load participant bundle.' });
    return;
  }

  const submissionsByRound = ((submissionsResult.data ?? []) as SubmissionRow[]).reduce<Record<string, {
    id: string;
    roundId: string;
    submittedAt: string;
    timeTakenSeconds: number;
    totalScore: number | null;
    status: 'accepted' | 'rejected';
  }>>((acc, row) => {
    acc[row.round_id] = {
      id: row.id,
      roundId: row.round_id,
      submittedAt: row.submitted_at,
      timeTakenSeconds: row.time_taken_seconds,
      totalScore: row.total_score,
      status: row.status,
    };
    return acc;
  }, {});

  const roundPublicRows = ((roundPublicStateResult.data ?? []) as RoundPublicStateRow[])
    .slice()
    .sort((left, right) => left.order_index - right.order_index);

  let previousRoundsAccepted = true;
  const visibleRoundIds = new Set<string>();
  const publicRoundStatuses = new Map<string, ReturnType<typeof deriveParticipantRoundStatus>>();

  for (const publicState of roundPublicRows) {
    const submission = submissionsByRound[publicState.round_id];
    const acceptedSubmission = submission?.status === 'accepted' ? submission : undefined;
    const participantRound = {
      status: publicState.status,
      timerState: publicState.timer_state,
      endsAt: publicState.ends_at,
      submissionEndsAt: publicState.submission_ends_at,
    };
    const status = deriveParticipantRoundStatus({
      round: participantRound,
      sequentiallyAvailable: previousRoundsAccepted,
      submission: acceptedSubmission,
      hasDraftActivity: false,
      now: Date.now(),
    });

    publicRoundStatuses.set(publicState.round_id, status);
    if (status === 'submitted' || status === 'available' || status === 'in_progress') {
      visibleRoundIds.add(publicState.round_id);
    }

    previousRoundsAccepted = previousRoundsAccepted && Boolean(acceptedSubmission);
  }

  const visibleRoundIdList = Array.from(visibleRoundIds);
  const [
    roundsResult,
    questionsResult,
  ] = visibleRoundIdList.length
    ? await Promise.all([
      auth.supabase
        .from('rounds')
        .select('id, order_index, title, description, objective, case_brief, zip_password, status, timer_minutes, timer_state, timer_duration_seconds, timer_remaining_seconds, submission_grace_seconds, submission_ends_at, submission_remaining_seconds, starts_at, ends_at, documentation')
        .in('id', visibleRoundIdList)
        .order('order_index', { ascending: true }),
      auth.supabase
        .from('questions')
        .select('id, round_id, order_index, text, type, input_type')
        .in('round_id', visibleRoundIdList)
        .order('order_index', { ascending: true }),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
    ];

  if (roundsResult.error || questionsResult.error) {
    logServerError('participant-bundle content load', {
      roundsError: roundsResult.error,
      questionsError: questionsResult.error,
    });
    sendJson(response, 500, { error: 'Failed to load participant round content.' });
    return;
  }

  const questionRows = (questionsResult.data ?? []) as QuestionRow[];
  const questionIdList = questionRows.map((question) => question.id);
  const optionsResult = questionIdList.length
    ? await auth.supabase
      .from('options')
      .select('id, question_id, order_index, text')
      .in('question_id', questionIdList)
      .order('order_index', { ascending: true })
    : { data: [], error: null };

  if (optionsResult.error) {
    logServerError('participant-bundle options load', optionsResult.error);
    sendJson(response, 500, { error: 'Failed to load participant options.' });
    return;
  }

  const optionsByQuestionId = new Map<string, OptionRow[]>();
  for (const row of (optionsResult.data ?? []) as OptionRow[]) {
    const group = optionsByQuestionId.get(row.question_id) ?? [];
    group.push(row);
    optionsByQuestionId.set(row.question_id, group);
  }

  const questionsByRoundId = new Map<string, QuestionRow[]>();
  for (const row of questionRows) {
    const group = questionsByRoundId.get(row.round_id) ?? [];
    group.push(row);
    questionsByRoundId.set(row.round_id, group);
  }

  const roundRowsById = new Map<string, RoundRow>();
  for (const row of (roundsResult.data ?? []) as RoundRow[]) {
    roundRowsById.set(row.id, row);
  }

  const rounds = roundPublicRows.map((publicState) => {
    const row = roundRowsById.get(publicState.round_id);
    const contentVisible = visibleRoundIds.has(publicState.round_id) && Boolean(row);
    const sanitizedTimerMinutes = contentVisible ? publicState.timer_minutes : 0;

    const roundQuestions = contentVisible && row ? (questionsByRoundId.get(row.id) ?? []).map((question) => ({
      id: question.id,
      roundId: question.round_id,
      questionIndex: question.order_index,
      text: question.text,
      type: question.type,
      inputType: question.input_type,
      options: (optionsByQuestionId.get(question.id) ?? []).map((option) => ({
        id: option.id,
        text: option.text,
        score: 0,
        orderIndex: option.order_index,
      })),
    })) : [];

    return {
      id: publicState.round_id,
      orderIndex: publicState.order_index,
      title: contentVisible ? row?.title ?? `Round ${publicState.order_index}` : `Round ${publicState.order_index}`,
      description: contentVisible ? row?.description ?? '' : '',
      objective: contentVisible ? row?.objective ?? '' : '',
      caseBrief: contentVisible ? row?.case_brief ?? '' : '',
      zipPassword: contentVisible ? row?.zip_password ?? null : null,
      documentation: contentVisible ? toDocumentationSections(row?.documentation) : [],
      status: contentVisible ? publicState.status : 'draft',
      timerMinutes: sanitizedTimerMinutes,
      timerState: contentVisible ? publicState.timer_state : 'idle',
      timerDurationSeconds: contentVisible ? row?.timer_duration_seconds ?? publicState.timer_minutes * 60 : 0,
      timerRemainingSeconds: contentVisible ? publicState.timer_remaining_seconds : null,
      submissionGraceSeconds: row?.submission_grace_seconds ?? 60,
      submissionEndsAt: contentVisible ? publicState.submission_ends_at : null,
      submissionRemainingSeconds: contentVisible ? publicState.submission_remaining_seconds : null,
      startsAt: contentVisible ? publicState.starts_at : null,
      endsAt: contentVisible ? publicState.ends_at : null,
      questionCount: roundQuestions.length,
      contentVisible,
      questions: contentVisible ? roundQuestions : [],
    };
  });

  const leaderboard = ((leaderboardResult.data ?? []) as LeaderboardRow[]).map((row, index) => ({
    rank: index + 1,
    teamId: row.team_id,
    teamName: row.team_name,
    username: row.username,
    round1Score: row.round_1_score,
    round2Score: row.round_2_score,
    round3Score: row.round_3_score,
    totalScore: row.total_score,
    totalTimeSeconds: row.total_time_seconds,
    updatedAt: row.updated_at,
  }));

  sendJson(response, 200, {
    team: {
      id: teamResult.data.id,
      username: teamResult.data.username,
      name: teamResult.data.name,
      email: auth.user.email ?? undefined,
    },
    rounds,
    submissionsByRound,
    leaderboard,
  });
}
