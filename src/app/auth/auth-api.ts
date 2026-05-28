import type { AccountType } from './auth-session';

type RequestOtpResult = {
  challengeId: string;
  deliveryChannel: 'demo' | 'local-demo';
  demoOtp: string;
  expiresAt: number;
};

type VerifyOtpResult = {
  accountType: AccountType;
  demoMode: boolean;
  sessionToken: string;
  user: {
    id: string;
    accountType: AccountType;
    createdAt: string;
    phone: string;
  };
  workspace: {
    id: string;
    accountType: AccountType;
    createdAt: string;
    name: string;
    onboardingStatus: 'not_started';
    updatedAt: string;
  } | null;
};

const LOCAL_OTP_STORAGE_KEY = 'sendi-local-otp-challenges-v1';
const LOCAL_OTP_TTL_MS = 5 * 60 * 1000;

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

const readLocalChallenges = (): Record<string, {
  accountType: AccountType;
  expiresAt: number;
  phone: string;
}> => {
  try {
    const raw = window.localStorage.getItem(LOCAL_OTP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeLocalChallenges = (challenges: ReturnType<typeof readLocalChallenges>) => {
  window.localStorage.setItem(LOCAL_OTP_STORAGE_KEY, JSON.stringify(challenges));
};

const createLocalId = (prefix: string, seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(36)}`;
};

const createLocalDemoOtp = (phone: string, accountType: AccountType): RequestOtpResult => {
  const challengeId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const challenges = readLocalChallenges();
  const expiresAt = Date.now() + LOCAL_OTP_TTL_MS;

  challenges[challengeId] = {
    accountType,
    expiresAt,
    phone,
  };
  writeLocalChallenges(challenges);

  return {
    challengeId,
    deliveryChannel: 'local-demo',
    demoOtp: '',
    expiresAt,
  };
};

const createLocalDemoVerification = ({
  accountType,
  phone,
}: {
  accountType: AccountType;
  phone: string;
}): VerifyOtpResult => {
  const profileKey = `${accountType}:${phone}`;
  const now = new Date().toISOString();

  return {
    accountType,
    demoMode: true,
    sessionToken: `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    user: {
      id: createLocalId('usr', profileKey),
      accountType,
      createdAt: now,
      phone,
    },
    workspace:
      accountType === 'delivery_company'
        ? {
            id: createLocalId('wrk', profileKey),
            accountType,
            createdAt: now,
            name: 'חברת משלוחים חדשה',
            onboardingStatus: 'not_started',
            updatedAt: now,
          }
        : null,
  };
};

const verifyLocalDemoOtp = ({
  accountType,
  challengeId,
  otp,
  phone,
}: {
  accountType: AccountType;
  challengeId: string;
  otp: string;
  phone: string;
}): VerifyOtpResult => {
  const challenges = readLocalChallenges();
  const challenge = challenges[challengeId];
  const normalizedOtp = otp.replace(/\D/g, '');

  if (normalizedOtp.length !== 6) {
    throw new Error('invalid_otp');
  }

  if (
    challenge &&
    (
      challenge.accountType !== accountType ||
      challenge.phone !== phone ||
      challenge.expiresAt < Date.now()
    )
  ) {
    throw new Error('invalid_otp');
  }

  if (challenge) {
    delete challenges[challengeId];
    writeLocalChallenges(challenges);
  }

  return createLocalDemoVerification({ accountType, phone });
};

const postJson = async <Result>(path: string, body: Record<string, unknown>) => {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error('api_unavailable');
  }

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'request_failed');
  }

  return payload as Result;
};

export const requestOtp = async ({
  accountType,
  phone,
}: {
  accountType: AccountType;
  phone: string;
}): Promise<RequestOtpResult> => {
  const normalizedPhone = normalizePhone(phone);

  try {
    return await postJson<RequestOtpResult>('/api/auth/request-otp', {
      accountType,
      phone: normalizedPhone,
    });
  } catch (error) {
    if (accountType !== 'delivery_company') throw error;
    return createLocalDemoOtp(normalizedPhone, accountType);
  }
};

export const verifyOtp = async ({
  accountType,
  challengeId,
  otp,
  phone,
}: {
  accountType: AccountType;
  challengeId: string;
  otp: string;
  phone: string;
}): Promise<VerifyOtpResult> => {
  const normalizedPhone = normalizePhone(phone);

  try {
    return await postJson<VerifyOtpResult>('/api/auth/verify-otp', {
      accountType,
      challengeId,
      otp,
      phone: normalizedPhone,
    });
  } catch (error) {
    if (accountType !== 'delivery_company') throw error;

    return verifyLocalDemoOtp({
      accountType,
      challengeId,
      otp,
      phone: normalizedPhone,
    });
  }
};
