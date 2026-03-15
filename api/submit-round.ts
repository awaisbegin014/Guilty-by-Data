import { createClient } from '@supabase/supabase-js';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';

interface SubmitAnswer {
  questionId?: string;
  answerValue?: string;
}

interface SubmitRoundBody {
  roundId?: string;
  answers?: SubmitAnswer[];
}

interface NodeRequest extends IncomingMessage {
  body?: SubmitRoundBody | string;
  headers: IncomingHttpHeaders;
}

interface NodeResponse extends ServerResponse {
  body?: unknown;
}

function sendJson(response: NodeResponse, status: number, body: Record<string, unknown>) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function getBearerToken(headers: IncomingHttpHeaders) {
  const raw = headers.authorization;
  if (!raw) {
    return null;
  }

  const value = Array.isArray(raw) ? raw[0] : raw;
  return value.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : null;
}

function normalizeBody(body: NodeRequest['body']): SubmitRoundBody | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as SubmitRoundBody;
    } catch {
      return null;
    }
  }

  return body;
}

async function readBody(request: NodeRequest) {
  if (request.body !== undefined) {
    return normalizeBody(request.body);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return normalizeBody(Buffer.concat(chunks).toString('utf8'));
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === '23505';
}

export default async function handler(request: NodeRequest, response: NodeResponse) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Allow', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.statusCode = 200;
    response.end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  let supabaseUrl: string;
  let serviceRoleKey: string;

  try {
    supabaseUrl = process.env.SUPABASE_URL || getEnv('VITE_SUPABASE_URL');
    serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Missing server environment configuration.',
    });
    return;
  }

  const accessToken = getBearerToken(request.headers);
  if (!accessToken) {
    sendJson(response, 401, { error: 'Missing bearer token.' });
    return;
  }

  const payload = await readBody(request);
  if (!payload?.roundId || !Array.isArray(payload.answers)) {
    sendJson(response, 400, { error: 'Request must include roundId and answers.' });
    return;
  }

  const uniqueQuestionIds = new Set<string>();
  for (const answer of payload.answers) {
    if (!answer.questionId || !answer.answerValue) {
      sendJson(response, 400, { error: 'Each answer must include questionId and answerValue.' });
      return;
    }

    if (uniqueQuestionIds.has(answer.questionId)) {
      sendJson(response, 400, { error: `Duplicate answer provided for question ${answer.questionId}.` });
      return;
    }

    uniqueQuestionIds.add(answer.questionId);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    sendJson(response, 401, { error: 'Invalid auth token.' });
    return;
  }

  const teamResult = await supabase
    .from('teams')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (teamResult.error) {
    sendJson(response, 500, { error: teamResult.error.message });
    return;
  }

  if (!teamResult.data) {
    sendJson(response, 403, { error: 'This account is not registered as a team.' });
    return;
  }

  const roundResult = await supabase
    .from('rounds')
    .select('id, status, starts_at, ends_at')
    .eq('id', payload.roundId)
    .maybeSingle();

  if (roundResult.error) {
    sendJson(response, 500, { error: roundResult.error.message });
    return;
  }

  const round = roundResult.data;
  if (!round) {
    sendJson(response, 404, { error: 'Round not found.' });
    return;
  }

  const now = Date.now();
  const startsAt = round.starts_at ? new Date(round.starts_at).getTime() : null;
  const endsAt = round.ends_at ? new Date(round.ends_at).getTime() : null;
  const roundIsOpen = round.status === 'open'
    && (!startsAt || now >= startsAt)
    && (!endsAt || now <= endsAt);

  if (!roundIsOpen) {
    sendJson(response, 403, { error: 'This round is not currently accepting submissions.' });
    return;
  }

  const duplicateCheck = await supabase
    .from('submissions')
    .select('id')
    .eq('team_id', user.id)
    .eq('round_id', payload.roundId)
    .maybeSingle();

  if (duplicateCheck.error) {
    sendJson(response, 500, { error: duplicateCheck.error.message });
    return;
  }

  if (duplicateCheck.data) {
    sendJson(response, 409, { error: 'This round has already been submitted.' });
    return;
  }

  const questionsResult = await supabase
    .from('questions')
    .select('id')
    .eq('round_id', payload.roundId);

  if (questionsResult.error) {
    sendJson(response, 500, { error: questionsResult.error.message });
    return;
  }

  const validQuestionIds = new Set(
    (questionsResult.data ?? []).map((question: { id: string }) => question.id),
  );
  const questionIds = payload.answers.map((answer) => answer.questionId as string);

  for (const answer of payload.answers) {
    if (!validQuestionIds.has(answer.questionId as string)) {
      sendJson(response, 400, { error: `Question ${answer.questionId} does not belong to this round.` });
      return;
    }
  }

  const optionsResult = await supabase
    .from('options')
    .select('id, question_id')
    .in('question_id', questionIds);

  if (optionsResult.error) {
    sendJson(response, 500, { error: optionsResult.error.message });
    return;
  }

  const validOptionIdsByQuestionId = new Map<string, Set<string>>();
  for (const option of (optionsResult.data ?? []) as { id: string; question_id: string }[]) {
    const group = validOptionIdsByQuestionId.get(option.question_id) ?? new Set<string>();
    group.add(option.id);
    validOptionIdsByQuestionId.set(option.question_id, group);
  }

  for (const answer of payload.answers) {
    const validOptions = validOptionIdsByQuestionId.get(answer.questionId as string);
    if (!validOptions?.has(answer.answerValue as string)) {
      sendJson(response, 400, {
        error: `Answer ${answer.answerValue} is not valid for question ${answer.questionId}.`,
      });
      return;
    }
  }

  const submissionInsert = await supabase
    .from('submissions')
    .insert({
      team_id: user.id,
      round_id: payload.roundId,
      status: 'accepted',
    })
    .select('id, submitted_at')
    .single();

  if (submissionInsert.error) {
    if (isUniqueViolation(submissionInsert.error)) {
      sendJson(response, 409, { error: 'This round has already been submitted.' });
      return;
    }

    sendJson(response, 500, { error: submissionInsert.error.message });
    return;
  }

  const submissionAnswersInsert = await supabase
    .from('submission_answers')
    .insert(
      payload.answers.map((answer) => ({
        submission_id: submissionInsert.data.id,
        question_id: answer.questionId as string,
        answer_value: answer.answerValue as string,
      })),
    );

  if (submissionAnswersInsert.error) {
    await supabase.from('submissions').delete().eq('id', submissionInsert.data.id);
    sendJson(response, 500, { error: submissionAnswersInsert.error.message });
    return;
  }

  sendJson(response, 200, {
    submissionId: submissionInsert.data.id,
    submittedAt: submissionInsert.data.submitted_at,
    status: 'accepted',
  });
}
