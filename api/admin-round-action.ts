import type { PostgrestError } from '@supabase/supabase-js';
import type { NodeRequest, NodeResponse } from './_lib/server.js';
import { authenticateRequest, readBody, sendJson } from './_lib/server.js';

interface AdminRoundActionBody {
  roundId?: string;
  action?: 'unlock_round' | 'lock_round' | 'start_timer' | 'pause_timer' | 'resume_timer' | 'set_timer_duration';
  timerMinutes?: number;
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
      message: error.message,
    };
  }

  return {
    status: 500,
    message: error.message || 'Round action failed.',
  };
}

export default async function handler(
  request: NodeRequest<AdminRoundActionBody>,
  response: NodeResponse,
) {
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
    sendJson(response, 500, { error: adminResult.error.message });
    return;
  }

  if (!adminResult.data) {
    sendJson(response, 403, { error: 'This account is not authorized as an admin.' });
    return;
  }

  const payload = await readBody(request);
  if (!payload?.roundId || !payload.action) {
    sendJson(response, 400, { error: 'Request must include roundId and action.' });
    return;
  }

  const rpcPayload = payload.action === 'set_timer_duration'
    ? { timerMinutes: payload.timerMinutes ?? null }
    : {};

  const { error } = await auth.supabase.rpc('apply_admin_round_action', {
    p_actor_id: auth.user.id,
    p_round_id: payload.roundId,
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
