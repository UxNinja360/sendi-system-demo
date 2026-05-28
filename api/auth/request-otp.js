import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import {
  ACTIVE_ACCOUNT_TYPES,
  SUPPORTED_ACCOUNT_TYPES,
  createOtpChallenge,
  isValidPhone,
  normalizePhone,
} from '../_lib/auth-otp.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return methodNotAllowed(response, ['POST']);
  }

  try {
    const body = await readJsonBody(request);
    const accountType = String(body.accountType || 'delivery_company');
    const phone = normalizePhone(body.phone);

    if (!SUPPORTED_ACCOUNT_TYPES.has(accountType)) {
      return json(response, 400, { ok: false, error: 'unsupported_account_type' });
    }

    if (!ACTIVE_ACCOUNT_TYPES.has(accountType)) {
      return json(response, 409, { ok: false, error: 'account_type_not_available' });
    }

    if (!isValidPhone(phone)) {
      return json(response, 400, { ok: false, error: 'invalid_phone' });
    }

    const challenge = createOtpChallenge({ phone, accountType });

    return json(response, 200, {
      ok: true,
      challengeId: challenge.challengeId,
      demoOtp: challenge.otp,
      deliveryChannel: 'demo',
      expiresAt: challenge.expiresAt,
    });
  } catch {
    return json(response, 400, { ok: false, error: 'invalid_request' });
  }
}
