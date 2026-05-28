import crypto from 'node:crypto';
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js';
import {
  ACTIVE_ACCOUNT_TYPES,
  SUPPORTED_ACCOUNT_TYPES,
  createDemoUserPayload,
  isValidOtp,
  isValidPhone,
  normalizePhone,
  verifyOtpChallenge,
} from '../_lib/auth-otp.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return methodNotAllowed(response, ['POST']);
  }

  try {
    const body = await readJsonBody(request);
    const accountType = String(body.accountType || 'delivery_company');
    const challengeId = String(body.challengeId || '');
    const otp = String(body.otp || '').replace(/\D/g, '');
    const phone = normalizePhone(body.phone);

    if (!SUPPORTED_ACCOUNT_TYPES.has(accountType)) {
      return json(response, 400, { ok: false, error: 'unsupported_account_type' });
    }

    if (!ACTIVE_ACCOUNT_TYPES.has(accountType)) {
      return json(response, 409, { ok: false, error: 'account_type_not_available' });
    }

    if (!isValidPhone(phone) || !isValidOtp(otp)) {
      return json(response, 400, { ok: false, error: 'invalid_credentials' });
    }

    const verification = verifyOtpChallenge({
      accountType,
      challengeId,
      otp,
      phone,
    });

    if (!verification.ok) {
      return json(response, 401, verification);
    }

    return json(response, 200, {
      ok: true,
      ...createDemoUserPayload({ accountType, phone }),
      sessionToken: `demo_${crypto.randomUUID?.() || Date.now()}`,
    });
  } catch {
    return json(response, 400, { ok: false, error: 'invalid_request' });
  }
}
