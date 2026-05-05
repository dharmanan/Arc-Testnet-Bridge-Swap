import { json, methodNotAllowed } from './_lib/http.js';

export default function handler(req, res) {
  if (req.method === 'HEAD' || req.method === 'GET') {
    return json(res, 404, { error: 'GraphQL endpoint is not enabled' });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    return json(res, 404, { error: 'GraphQL endpoint is not enabled' });
  }

  return methodNotAllowed(res, ['GET', 'HEAD', 'OPTIONS']);
}