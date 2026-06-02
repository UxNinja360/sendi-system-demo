export type AccountType = 'delivery_company' | 'restaurant' | 'courier';
export type OnboardingStatus = 'not_started' | 'in_progress' | 'complete';

export type AuthUser = {
  id: string;
  accountType: AccountType;
  createdAt: string;
  name?: string;
  phone: string;
};

export type WorkspaceRole = 'owner' | 'admin' | 'dispatcher' | 'viewer';

export type AuthWorkspaceMember = {
  joinedAt: string;
  name?: string;
  phone: string;
  role: WorkspaceRole;
  userId: string;
};

export type AuthWorkspace = {
  activityAreas?: string[];
  id: string;
  accountType: AccountType;
  createdAt: string;
  members?: AuthWorkspaceMember[];
  name: string;
  onboardingStatus: OnboardingStatus;
  ownerUserId?: string;
  phone?: string;
  registrationNumber?: string;
  updatedAt: string;
};

export type AuthSession = {
  version: 1;
  createdAt: string;
  expiresAt: string;
  lastLoginAt: string;
  sessionToken: string;
  user: AuthUser;
  workspace: AuthWorkspace | null;
};

export type AuthProfile = {
  user: AuthUser;
  workspace: AuthWorkspace | null;
};

export const AUTH_SESSION_STORAGE_KEY = 'sendi-auth-session-v1';
const AUTH_PROFILES_STORAGE_KEY = 'sendi-auth-profiles-v1';
const LEGACY_AUTH_STORAGE_KEY = 'isAuthenticated';
const LEGACY_ONBOARDING_DONE_STORAGE_KEY = 'onboarding_done_v1';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const createId = (prefix: string, seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(36)}`;
};

const createSessionToken = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `demo_${crypto.randomUUID()}`;
  }

  return `demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getProfiles = (): Record<string, AuthProfile> => {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(AUTH_PROFILES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const readAuthProfiles = () => getProfiles();

const writeProfiles = (profiles: Record<string, AuthProfile>) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(AUTH_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
};

const getProfileKey = (accountType: AccountType, phone: string) => `${accountType}:${phone}`;

const isValidSession = (value: Partial<AuthSession> | null): value is AuthSession =>
  Boolean(
    value?.version === 1 &&
      value.user?.id &&
      value.user.phone &&
      value.user.accountType &&
      value.sessionToken &&
      value.expiresAt &&
      new Date(value.expiresAt).getTime() > Date.now(),
  );

const createLegacySession = (): AuthSession => {
  const now = new Date().toISOString();
  const user: AuthUser = {
    id: 'usr_legacy_demo',
    accountType: 'delivery_company',
    createdAt: now,
    phone: '0500000000',
  };

  return {
    version: 1,
    createdAt: now,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    lastLoginAt: now,
    sessionToken: createSessionToken(),
    user,
    workspace: {
      id: 'wrk_legacy_tlv_runners',
      accountType: 'delivery_company',
      createdAt: now,
      name: 'TLV RUNNERS',
      onboardingStatus: 'complete',
      updatedAt: now,
    },
  };
};

export const readAuthSession = (): AuthSession | null => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (isValidSession(parsed)) return parsed;
  } catch {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  }

  if (storage.getItem(LEGACY_AUTH_STORAGE_KEY) === 'true') {
    const legacySession = createLegacySession();
    writeAuthSession(legacySession);
    return legacySession;
  }

  return null;
};

export const writeAuthSession = (session: AuthSession) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  storage.setItem(LEGACY_AUTH_STORAGE_KEY, 'true');

  if (session.workspace?.onboardingStatus === 'complete') {
    storage.setItem(LEGACY_ONBOARDING_DONE_STORAGE_KEY, 'true');
  } else {
    storage.removeItem(LEGACY_ONBOARDING_DONE_STORAGE_KEY);
  }
};

export const clearAuthSession = () => {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  storage.removeItem(LEGACY_AUTH_STORAGE_KEY);
};

export const deleteAuthProfile = ({
  accountType,
  phone,
}: {
  accountType: AccountType;
  phone: string;
}) => {
  const storage = getStorage();
  if (!storage) return false;

  const normalizedPhone = phone.replace(/\D/g, '');
  const profileKey = getProfileKey(accountType, normalizedPhone);
  const profiles = getProfiles();
  const existed = Boolean(profiles[profileKey]);

  delete profiles[profileKey];
  writeProfiles(profiles);

  try {
    const rawSession = storage.getItem(AUTH_SESSION_STORAGE_KEY);
    const session = rawSession ? (JSON.parse(rawSession) as Partial<AuthSession>) : null;

    if (
      session?.user?.accountType === accountType &&
      session.user.phone === normalizedPhone
    ) {
      clearAuthSession();
    }
  } catch {
    clearAuthSession();
  }

  return existed;
};

export const upsertAuthProfile = ({
  accountType,
  phone,
  sessionToken,
  user,
  workspace,
}: {
  accountType: AccountType;
  phone: string;
  sessionToken?: string;
  user?: Partial<AuthUser>;
  workspace?: Partial<AuthWorkspace> | null;
}) => {
  const now = new Date().toISOString();
  const profiles = getProfiles();
  const profileKey = getProfileKey(accountType, phone);
  const existing = profiles[profileKey];
  const nextUser: AuthUser = {
    id: user?.id ?? existing?.user.id ?? createId('usr', profileKey),
    accountType,
    createdAt: existing?.user.createdAt ?? user?.createdAt ?? now,
    name: user?.name ?? existing?.user.name,
    phone,
  };
  const nextWorkspace: AuthWorkspace | null =
    accountType === 'delivery_company'
      ? {
          id:
            workspace?.id ??
            existing?.workspace?.id ??
            createId('wrk', profileKey),
          accountType,
          activityAreas:
            workspace?.activityAreas ??
            existing?.workspace?.activityAreas,
          createdAt: existing?.workspace?.createdAt ?? workspace?.createdAt ?? now,
          name: workspace?.name ?? existing?.workspace?.name ?? 'חברת משלוחים חדשה',
          members:
            workspace?.members ??
            existing?.workspace?.members,
          onboardingStatus:
            workspace?.onboardingStatus ??
            existing?.workspace?.onboardingStatus ??
            'not_started',
          ownerUserId:
            workspace?.ownerUserId ??
            existing?.workspace?.ownerUserId,
          phone:
            workspace?.phone ??
            existing?.workspace?.phone,
          registrationNumber:
            workspace?.registrationNumber ??
            existing?.workspace?.registrationNumber,
          updatedAt: now,
        }
      : null;
  const profile = { user: nextUser, workspace: nextWorkspace };

  profiles[profileKey] = profile;
  writeProfiles(profiles);

  const session: AuthSession = {
    version: 1,
    createdAt: existing?.user.createdAt ?? now,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    lastLoginAt: now,
    sessionToken: sessionToken ?? createSessionToken(),
    user: nextUser,
    workspace: nextWorkspace,
  };

  writeAuthSession(session);
  return session;
};

export const updateAuthSessionWorkspaceStatus = (status: OnboardingStatus) => {
  return updateAuthSessionWorkspace({ onboardingStatus: status });
};

export const updateAuthSessionWorkspace = (updates: Partial<Omit<AuthWorkspace, 'id' | 'accountType' | 'createdAt'>>) => {
  const session = readAuthSession();
  if (!session?.workspace) return null;

  const now = new Date().toISOString();
  const nextSession: AuthSession = {
    ...session,
    workspace: {
      ...session.workspace,
      ...updates,
      updatedAt: now,
    },
  };
  const profiles = getProfiles();
  profiles[getProfileKey(session.user.accountType, session.user.phone)] = {
    user: nextSession.user,
    workspace: nextSession.workspace,
  };

  writeProfiles(profiles);
  writeAuthSession(nextSession);
  return nextSession;
};

export const updateAuthSessionUser = (updates: Partial<Omit<AuthUser, 'id' | 'accountType' | 'createdAt'>>) => {
  const session = readAuthSession();
  if (!session) return null;

  const currentProfileKey = getProfileKey(session.user.accountType, session.user.phone);
  const nextPhone = updates.phone?.replace(/\D/g, '') ?? session.user.phone;
  const nextProfileKey = getProfileKey(session.user.accountType, nextPhone);
  const profiles = getProfiles();
  const existingNextProfile = profiles[nextProfileKey];
  if (
    nextProfileKey !== currentProfileKey &&
    existingNextProfile &&
    existingNextProfile.user.id !== session.user.id
  ) {
    return null;
  }

  const nextSession: AuthSession = {
    ...session,
    user: {
      ...session.user,
      ...updates,
      phone: nextPhone,
    },
  };

  if (nextProfileKey !== currentProfileKey) {
    delete profiles[currentProfileKey];
  }

  profiles[nextProfileKey] = {
    user: nextSession.user,
    workspace: nextSession.workspace,
  };

  writeProfiles(profiles);
  writeAuthSession(nextSession);
  return nextSession;
};
