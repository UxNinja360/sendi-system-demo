import crypto from 'node:crypto';

export const SUPPORTED_ACCOUNT_TYPES = new Set([
  'delivery_company',
  'restaurant',
  'courier',
]);

export const ACTIVE_ACCOUNT_TYPES = new Set(['delivery_company']);

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_SECRET =
  process.env.SENDI_AUTH_OTP_SECRET ||
  process.env.AUTH_OTP_SECRET ||
  'sendi-demo-otp-secret';

const toBase64Url = (value) =>
  Buffer.from(value).toString('base64url');

const fromBase64Url = (value) =>
  Buffer.from(value, 'base64url').toString('utf8');

const sign = (payload) =>
  crypto.createHmac('sha256', OTP_SECRET).update(payload).digest('base64url');

const hashOtp = (phone, otp, nonce) =>
  crypto
    .createHash('sha256')
    .update(`${phone}:${otp}:${nonce}:${OTP_SECRET}`)
    .digest('base64url');

export const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

export const isValidPhone = (phone) => /^0?5\d{8}$/.test(phone);

export const isValidOtp = (otp) => /^\d{6}$/.test(String(otp || ''));

export const createOtpChallenge = ({ phone, accountType }) => {
  const now = Date.now();
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const nonce = crypto.randomUUID();
  const payload = {
    accountType,
    expiresAt: now + OTP_TTL_MS,
    issuedAt: now,
    nonce,
    otpHash: hashOtp(phone, otp, nonce),
    phone,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));

  return {
    challengeId: `${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: payload.expiresAt,
    otp,
  };
};

export const verifyOtpChallenge = ({ accountType, challengeId, otp, phone }) => {
  if (!challengeId || typeof challengeId !== 'string') {
    return { ok: false, error: 'missing_challenge' };
  }

  const [encodedPayload, signature] = challengeId.split('.');
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    return { ok: false, error: 'invalid_challenge' };
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    if (payload.expiresAt < Date.now()) {
      return { ok: false, error: 'expired_otp' };
    }

    if (payload.phone !== phone || payload.accountType !== accountType) {
      return { ok: false, error: 'challenge_mismatch' };
    }

    if (payload.otpHash !== hashOtp(phone, otp, payload.nonce)) {
      return { ok: false, error: 'invalid_otp' };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'invalid_challenge' };
  }
};

export const createDemoUserPayload = ({ accountType, phone }) => {
  const hash = crypto.createHash('sha256').update(`${accountType}:${phone}`).digest('hex').slice(0, 12);
  const now = new Date().toISOString();

  return {
    accountType,
    demoMode: true,
    user: {
      id: `usr_${hash}`,
      phone,
      accountType,
      createdAt: now,
    },
    workspace:
      accountType === 'delivery_company'
        ? {
            id: `wrk_${hash}`,
            accountType,
            name: 'חברת משלוחים חדשה',
            onboardingStatus: 'not_started',
            createdAt: now,
            updatedAt: now,
          }
        : null,
  };
};
