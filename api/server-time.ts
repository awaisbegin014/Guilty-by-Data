import type { NodeRequest, NodeResponse } from './_lib/server.js';
import { sendJson } from './_lib/server.js';

export default async function handler(request: NodeRequest, response: NodeResponse) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
  sendJson(response, 200, {
    serverNow: new Date().toISOString(),
  });
}
