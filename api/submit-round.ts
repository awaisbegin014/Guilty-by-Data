import type { PostgrestError } from '@supabase/supabase-js';
import type { NodeRequest, NodeResponse } from './_lib/server.js';
import {
  ApiRequestError,
  authenticateRequest,
  logServerError,
  readBody,
  sendJson,
  sendOptions,
} from './_lib/server.js';
import { isPlainObject, isUuid } from './_lib/validation.js';

interface SubmitAnswer {
  questionId?: string;
  answerValue?: string;
}

interface SubmitRoundBody {
  roundId?: string;
  answers?: SubmitAnswer[];
}

const MAX_ANSWERS = 100;
const MAX_ANSWER_VALUE_LENGTH = 200;

function safeClientMessage(error: PostgrestError) {
  const message = error.message || '';
  const knownMessages = [
    'Round not found.',
    'This round is locked.',
    'This round has not started yet.',
    'This round is paused.',
    'This round is not currently accepting submissions.',
    'This round has expired.',
    'Previous rounds must be submitted before this round can be submitted.',
    'Answers payload must be an array.',
    'Each answer must include questionId and answerValue.',
    'Duplicate answer provided in submission payload.',
    'One or more submitted questions do not belong to this round.',
    'This account is not registered as a team.',
    'Authenticated user does not match the submitting team.',
  ];

  return knownMessages.includes(message) ? message : null;
}

function mapRpcError(error: PostgrestError) {
  if (error.code === '23505') {
    return {
      status: 409,
      message: 'This round has already been submitted.',
    };
  }

  if (error.code === 'P0002') {
    return {
      status: 404,
      message: 'Round not found.',
    };
  }

  if (error.code === 'P0001' || error.code === '22023') {
    return {
      status: error.code === '22023' ? 400 : 403,
      message: safeClientMessage(error) ?? 'Round submission was rejected.',
    };
  }

  logServerError('submit-round rpc', error);
  return {
    status: 500,
    message: 'Round submission failed.',
  };
}

function validatePayload(payload: unknown): SubmitRoundBody | null {
  if (!isPlainObject(payload) || !isUuid(payload.roundId) || !Array.isArray(payload.answers)) {
    return null;
  }

  if (payload.answers.length > MAX_ANSWERS) {
    return null;
  }

  const questionIds = new Set<string>();
  for (const answer of payload.answers) {
    if (!isPlainObject(answer) || !isUuid(answer.questionId) || typeof answer.answerValue !== 'string') {
      return null;
    }

    const answerValue = answer.answerValue.trim();
    if (!answerValue || answerValue.length > MAX_ANSWER_VALUE_LENGTH) {
      return null;
    }

    if (questionIds.has(answer.questionId)) {
      return null;
    }

    questionIds.add(answer.questionId);
  }

  return payload as SubmitRoundBody;
}

export default async function handler(request: NodeRequest<SubmitRoundBody>, response: NodeResponse) {
  if (request.method === 'OPTIONS') {
    sendOptions(response, 'POST, OPTIONS');
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const auth = await authenticateRequest(request, response);
  if (!auth) {
    return;
  }

  let payload: SubmitRoundBody | null = null;
  try {
    payload = validatePayload(await readBody(request));
  } catch (error) {
    if (error instanceof ApiRequestError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }

    logServerError('submit-round readBody', error);
  }

  if (!payload) {
    sendJson(response, 400, { error: 'Request must include a valid roundId and answers.' });
    return;
  }

  const teamResult = await auth.supabase
    .from('teams')
    .select('id')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (teamResult.error) {
    logServerError('submit-round team lookup', teamResult.error);
    sendJson(response, 500, { error: 'Unable to verify team account.' });
    return;
  }

  if (!teamResult.data) {
    sendJson(response, 403, { error: 'This account is not registered as a team.' });
    return;
  }

  const { data, error } = await auth.supabase.rpc('process_round_submission', {
    p_authenticated_user_id: auth.user.id,
    p_team_id: auth.user.id,
    p_round_id: payload.roundId!,
    p_answers: payload.answers!.map((answer) => ({
      question_id: answer.questionId!,
      answer_value: answer.answerValue?.trim(),
    })),
  });

  if (error) {
    const mapped = mapRpcError(error);
    sendJson(response, mapped.status, { error: mapped.message });
    return;
  }

  const submission = Array.isArray(data) ? data[0] : data;
  if (!submission) {
    sendJson(response, 500, { error: 'Submission RPC did not return a submission.' });
    return;
  }

  sendJson(response, 200, {
    submissionId: submission.submission_id,
    submittedAt: submission.submitted_at,
    timeTakenSeconds: submission.time_taken_seconds,
    totalScore: submission.total_score,
    status: submission.status,
  });
}
