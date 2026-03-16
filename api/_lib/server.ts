import { createClient } from '@supabase/supabase-js';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';

export interface NodeRequest<TBody = unknown> extends IncomingMessage {
  body?: TBody | string;
  headers: IncomingHttpHeaders;
}

export interface NodeResponse extends ServerResponse {
  body?: unknown;
}

export function sendJson(response: NodeResponse, status: number, body: Record<string, unknown>) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export function getBearerToken(headers: IncomingHttpHeaders) {
  const raw = headers.authorization;
  if (!raw) {
    return null;
  }

  const value = Array.isArray(raw) ? raw[0] : raw;
  return value.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : null;
}

function normalizeBody<TBody>(body: NodeRequest<TBody>['body']): TBody | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as TBody;
    } catch {
      return null;
    }
  }

  return body as TBody;
}

export async function readBody<TBody>(request: NodeRequest<TBody>) {
  if (request.body !== undefined) {
    return normalizeBody<TBody>(request.body);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return normalizeBody<TBody>(Buffer.concat(chunks).toString('utf8'));
}

export function createServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL || getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export async function authenticateRequest(request: NodeRequest, response: NodeResponse) {
  const accessToken = getBearerToken(request.headers);
  if (!accessToken) {
    sendJson(response, 401, { error: 'Missing bearer token.' });
    return null;
  }

  const supabase = createServiceRoleClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    sendJson(response, 401, { error: 'Invalid auth token.' });
    return null;
  }

  return {
    supabase,
    user,
  };
}
