import type { NodeRequest, NodeResponse } from './_lib/server.js';
import { authenticateRequest, sendJson } from './_lib/server.js';
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
  starts_at: string | null;
  ends_at: string | null;
  documentation: unknown;
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
    sendJson(response, 500, { error: teamResult.error.message });
    return;
  }

  if (!teamResult.data) {
    sendJson(response, 403, { error: 'This account is not registered as a team.' });
    return;
  }

  const [
    roundsResult,
    questionsResult,
    optionsResult,
    submissionsResult,
    leaderboardResult,
  ] = await Promise.all([
    auth.supabase
      .from('rounds')
      .select('id, order_index, title, description, objective, case_brief, zip_password, status, timer_minutes, timer_state, timer_duration_seconds, timer_remaining_seconds, starts_at, ends_at, documentation')
      .order('order_index', { ascending: true }),
    auth.supabase
      .from('questions')
      .select('id, round_id, order_index, text, type, input_type')
      .order('order_index', { ascending: true }),
    auth.supabase
      .from('options')
      .select('id, question_id, order_index, text')
      .order('order_index', { ascending: true }),
    auth.supabase
      .from('submissions')
      .select('id, round_id, submitted_at, total_score, status')
      .eq('team_id', auth.user.id),
    auth.supabase
      .from('leaderboard')
      .select('team_id, team_name, username, round_1_score, round_2_score, round_3_score, total_score, updated_at')
      .order('total_score', { ascending: false })
      .order('updated_at', { ascending: true }),
  ]);

  if (roundsResult.error || questionsResult.error || optionsResult.error || submissionsResult.error || leaderboardResult.error) {
    sendJson(response, 500, {
      error: roundsResult.error?.message
        || questionsResult.error?.message
        || optionsResult.error?.message
        || submissionsResult.error?.message
        || leaderboardResult.error?.message
        || 'Failed to load participant bundle.',
    });
    return;
  }

  const submissionsByRound = ((submissionsResult.data ?? []) as SubmissionRow[]).reduce<Record<string, {
    id: string;
    roundId: string;
    submittedAt: string;
    totalScore: number | null;
    status: 'accepted' | 'rejected';
  }>>((acc, row) => {
    acc[row.round_id] = {
      id: row.id,
      roundId: row.round_id,
      submittedAt: row.submitted_at,
      totalScore: row.total_score,
      status: row.status,
    };
    return acc;
  }, {});

  const optionsByQuestionId = new Map<string, OptionRow[]>();
  for (const row of (optionsResult.data ?? []) as OptionRow[]) {
    const group = optionsByQuestionId.get(row.question_id) ?? [];
    group.push(row);
    optionsByQuestionId.set(row.question_id, group);
  }

  const questionsByRoundId = new Map<string, QuestionRow[]>();
  for (const row of (questionsResult.data ?? []) as QuestionRow[]) {
    const group = questionsByRoundId.get(row.round_id) ?? [];
    group.push(row);
    questionsByRoundId.set(row.round_id, group);
  }

  let previousRoundsSubmitted = true;
  const rounds = ((roundsResult.data ?? []) as RoundRow[]).map((row) => {
    const roundQuestions = (questionsByRoundId.get(row.id) ?? []).map((question) => ({
      id: question.id,
      roundId: question.round_id,
      questionIndex: question.order_index,
      text: question.text,
      type: question.type,
      inputType: question.input_type,
      options: (optionsByQuestionId.get(question.id) ?? []).map((option) => ({
        id: option.id,
        text: option.text,
      })),
    }));

    const submission = submissionsByRound[row.id];
    const status = deriveParticipantRoundStatus({
      round: {
        status: row.status,
        timerState: row.timer_state,
        endsAt: row.ends_at,
      },
      sequentiallyAvailable: previousRoundsSubmitted,
      submission,
      hasDraftActivity: false,
    });

    const contentVisible = status === 'submitted' || status === 'available' || status === 'in_progress';
    previousRoundsSubmitted = previousRoundsSubmitted && Boolean(submission);

    return {
      id: row.id,
      orderIndex: row.order_index,
      title: row.title,
      description: row.description ?? '',
      objective: contentVisible ? row.objective ?? '' : '',
      caseBrief: contentVisible ? row.case_brief ?? '' : '',
      zipPassword: contentVisible ? row.zip_password : null,
      documentation: contentVisible ? toDocumentationSections(row.documentation) : [],
      status: row.status,
      timerMinutes: row.timer_minutes,
      timerState: row.timer_state,
      timerDurationSeconds: row.timer_duration_seconds,
      timerRemainingSeconds: row.timer_remaining_seconds,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
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
