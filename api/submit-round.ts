import type { PostgrestError } from '@supabase/supabase-js';
import type { NodeRequest, NodeResponse } from './_lib/server.js';
import { authenticateRequest, readBody, sendJson } from './_lib/server.js';

interface SubmitAnswer {
  questionId?: string;
  answerValue?: string;
}

interface SubmitRoundBody {
  roundId?: string;
  answers?: SubmitAnswer[];
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
      status: 403,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: error.message || 'Round submission failed.',
  };
}

export default async function handler(request: NodeRequest<SubmitRoundBody>, response: NodeResponse) {
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

  const auth = await authenticateRequest(request, response);
  if (!auth) {
    return;
  }

  const payload = await readBody(request);
  if (!payload?.roundId || !Array.isArray(payload.answers)) {
    sendJson(response, 400, { error: 'Request must include roundId and answers.' });
    return;
  }

  const teamResult = await auth.supabase
    .from('teams')
    .select('id')
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

  const { data, error } = await auth.supabase.rpc('process_round_submission', {
    p_team_id: auth.user.id,
    p_round_id: payload.roundId,
    p_answers: payload.answers.map((answer) => ({
      question_id: answer.questionId ?? null,
      answer_value: answer.answerValue ?? null,
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
    totalScore: submission.total_score,
    status: submission.status,
  });
}
