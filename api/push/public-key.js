import { json, methodNotAllowed } from '../_lib/http.js';
import { getPublicVapidKey, hasVapidConfig } from '../_lib/push-web.js';
import { getPushStorageMode } from '../_lib/push-store.js';

export default function handler(request, response) {
  if (request.method !== 'GET') {
    return methodNotAllowed(response, ['GET']);
  }

  return json(response, 200, {
    ok: true,
    configured: hasVapidConfig(),
    publicKey: getPublicVapidKey(),
    storage: getPushStorageMode(),
  });
}
