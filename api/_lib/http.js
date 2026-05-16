export const json = (response, status, body) => {
  response.status(status).setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
};

export const methodNotAllowed = (response, allowed) => {
  response.setHeader('allow', allowed.join(', '));
  return json(response, 405, { ok: false, error: 'method_not_allowed' });
};

export const readJsonBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body;

  if (typeof request.body === 'string') {
    return request.body ? JSON.parse(request.body) : {};
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};
