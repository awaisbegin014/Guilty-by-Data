import { createClient } from '@supabase/supabase-js';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';

export interface NodeRequest<TBody = unknown> extends IncomingMessage {
  body?: TBody | string;
  headers: IncomingHttpHeaders;
}

export interface NodeResponse extends ServerResponse {
  body?: unknown;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export function sendJson(response: NodeResponse, status: number, body: Record<string, unknown>) {
  response.statusCode = status;
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export function sendOptions(response: NodeResponse, methods: string) {
  response.setHeader('Allow', methods);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  response.setHeader('Access-Control-Allow-Methods', methods);
  response.statusCode = 200;
  response.end();
}

export function logServerError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
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

export async function readBody<TBody>(request: NodeRequest<TBody>, maxBytes = 64 * 1024) {
  if (request.body !== undefined) {
    if (typeof request.body === 'string' && Buffer.byteLength(request.body, 'utf8') > maxBytes) {
      throw new ApiRequestError(413, 'Request body is too large.');
    }

    if (typeof request.body === 'object') {
      try {
        if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > maxBytes) {
          throw new ApiRequestError(413, 'Request body is too large.');
        }
      } catch (error) {
        if (error instanceof ApiRequestError) {
          throw error;
        }

        throw new ApiRequestError(400, 'Request body is invalid.');
      }
    }

    return normalizeBody<TBody>(request.body);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      throw new ApiRequestError(413, 'Request body is too large.');
    }

    chunks.push(buffer);
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
