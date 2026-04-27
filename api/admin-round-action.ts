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
import { isPlainObject, isUuid, parseIntegerInRange } from './_lib/validation.js';

interface AdminRoundActionBody {
  roundId?: string;
  action?: 'unlock_round' | 'lock_round' | 'start_timer' | 'pause_timer' | 'resume_timer' | 'reset_round' | 'set_timer_duration' | 'set_grace_duration';
  timerMinutes?: number;
  submissionGraceSeconds?: number;
}

const ADMIN_ROUND_ACTIONS = new Set<AdminRoundActionBody['action']>([
  'unlock_round',
  'lock_round',
  'start_timer',
  'pause_timer',
  'resume_timer',
  'reset_round',
  'set_timer_duration',
  'set_grace_duration',
]);

function safeClientMessage(error: PostgrestError) {
  const message = error.message || '';
  const knownMessages = [
    'Round not found.',
    'This account is not authorized as an admin.',
    'Authenticated user does not match the admin actor.',
    'Unlock the round before starting the timer.',
    'Unlock the round before pausing the timer.',
    'Unlock the round before resuming the timer.',
    'Unlock the round before changing the timer duration.',
    'Unlock the round before changing the grace duration.',
    'This timer has no remaining time to resume.',
    'Only an idle, paused, or expired round can be started.',
    'Only a running timer can be paused.',
    'Only a paused timer can be resumed.',
    'Timer duration must be at least 1 minute.',
    'Grace duration must be zero or greater.',
  ];

  return knownMessages.includes(message) ? message : null;
}

function mapRpcError(error: PostgrestError) {
  if (error.code === 'P0002') {
    return {
      status: 404,
      message: 'Round not found.',
    };
  }

  if (error.code === 'P0001' || error.code === '22023') {
    return {
      status: 400,
      message: safeClientMessage(error) ?? 'Round action was rejected.',
    };
  }

  logServerError('admin-round-action rpc', error);
  return {
    status: 500,
    message: 'Round action failed.',
  };
}

function validatePayload(payload: unknown): AdminRoundActionBody | null {
  if (!isPlainObject(payload) || !isUuid(payload.roundId) || typeof payload.action !== 'string') {
    return null;
  }

  if (!ADMIN_ROUND_ACTIONS.has(payload.action as AdminRoundActionBody['action'])) {
    return null;
  }

  if (payload.action === 'set_timer_duration') {
    const timerMinutes = parseIntegerInRange(payload.timerMinutes, 1, 24 * 60);
    return timerMinutes === null
      ? null
      : { roundId: payload.roundId, action: payload.action, timerMinutes };
  }

  if (payload.action === 'set_grace_duration') {
    const submissionGraceSeconds = parseIntegerInRange(payload.submissionGraceSeconds, 0, 60 * 60);
    return submissionGraceSeconds === null
      ? null
      : { roundId: payload.roundId, action: payload.action, submissionGraceSeconds };
  }

  return {
    roundId: payload.roundId,
    action: payload.action as AdminRoundActionBody['action'],
  };
}

export default async function handler(
  request: NodeRequest<AdminRoundActionBody>,
  response: NodeResponse,
) {
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

  const adminResult = await auth.supabase
    .from('admins')
    .select('id')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (adminResult.error) {
    logServerError('admin-round-action admin lookup', adminResult.error);
    sendJson(response, 500, { error: 'Unable to verify admin account.' });
    return;
  }

  if (!adminResult.data) {
    sendJson(response, 403, { error: 'This account is not authorized as an admin.' });
    return;
  }

  let payload: AdminRoundActionBody | null = null;
  try {
    payload = validatePayload(await readBody(request));
  } catch (error) {
    if (error instanceof ApiRequestError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }

    logServerError('admin-round-action readBody', error);
  }

  if (!payload) {
    sendJson(response, 400, { error: 'Request must include a valid roundId, action, and payload.' });
    return;
  }

  const rpcPayload = payload.action === 'set_timer_duration'
    ? { timerMinutes: payload.timerMinutes ?? null }
    : payload.action === 'set_grace_duration'
      ? { submissionGraceSeconds: payload.submissionGraceSeconds ?? null }
    : {};

  const { error } = await auth.supabase.rpc('apply_admin_round_action', {
    p_authenticated_user_id: auth.user.id,
    p_actor_id: auth.user.id,
    p_round_id: payload.roundId!,
    p_action: payload.action,
    p_payload: rpcPayload,
  });

  if (error) {
    const mapped = mapRpcError(error);
    sendJson(response, mapped.status, { error: mapped.message });
    return;
  }

  sendJson(response, 200, { ok: true });
}
