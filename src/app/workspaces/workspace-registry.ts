import type { AuthProfile, AuthSession, AuthWorkspace } from '../auth/auth-session';
import {
  deleteAuthProfile,
  readAuthSession,
  readAuthProfiles,
  upsertAuthProfile,
  writeAuthSession,
} from '../auth/auth-session';
import {
  createInitialDeliveryState,
  mergeDefaultSendiPlusRestaurants,
} from '../context/delivery-bootstrap';
import {
  DELIVERY_STORAGE_KEYS,
  clearSystemResetStorage,
  createStorageEpoch,
} from '../context/delivery-storage';
import type { DeliveryState } from '../types/delivery.types';
import {
  writeStoredSendiPlusRadius,
  writeStoredSendiPlusTermsAccepted,
} from '../utils/sendi-plus';

export type WorkspaceAccount = {
  id: string;
  kind: 'demo' | 'registered';
  name: string;
  phone: string;
  profile?: AuthProfile;
  workspace: AuthWorkspace;
};

export const TLV_RUNNERS_WORKSPACE_ID = 'wrk_legacy_tlv_runners';
export const TLV_RUNNERS_DEMO_PHONE = '0500000000';

const WORKSPACE_STATE_STORAGE_PREFIX = 'sendi-delivery-state-workspace:';
const DEFAULT_DELIVERY_BALANCE = 100;
const DEFAULT_WORKSPACE_NAMES = new Set(['חברת משלוחים חדשה']);

const normalizePhone = (value: string) => value.replace(/\D/g, '');
const normalizeRegistrationNumber = (value: string) => value.replace(/\D/g, '');

const zeroStats = (): DeliveryState['stats'] => ({
  hour: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
  today: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
  week: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
  month: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
  year: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
});

const createDemoWorkspace = (createdAt: string): AuthWorkspace => ({
  id: TLV_RUNNERS_WORKSPACE_ID,
  accountType: 'delivery_company',
  createdAt,
  name: 'TLV RUNNERS',
  onboardingStatus: 'complete',
  phone: TLV_RUNNERS_DEMO_PHONE,
  updatedAt: createdAt,
});

export const createTlvRunnersDemoSession = (): AuthSession => {
  const now = new Date().toISOString();

  return {
    version: 1,
    createdAt: now,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    lastLoginAt: now,
    sessionToken: `demo_tlv_${Date.now()}`,
    user: {
      id: 'usr_legacy_demo',
      accountType: 'delivery_company',
      createdAt: now,
      name: 'Alex',
      phone: TLV_RUNNERS_DEMO_PHONE,
    },
    workspace: createDemoWorkspace(now),
  };
};

export const getWorkspaceStateStorageKey = (workspaceId: string) =>
  `${WORKSPACE_STATE_STORAGE_PREFIX}${workspaceId}`;

export const createEmptyWorkspaceState = ({
  area,
  companyName,
  companyPhone,
  workspaceId,
}: {
  area?: string;
  companyName: string;
  companyPhone?: string;
  workspaceId: string;
}): DeliveryState => {
  const baseState = createInitialDeliveryState();
  const now = new Date();

  return {
    ...baseState,
    dataMode: workspaceId === TLV_RUNNERS_WORKSPACE_ID ? 'demo' : 'workspace',
    workspaceId,
    workspaceName: companyName.trim(),
    workspaceArea: area?.trim(),
    workspacePhone: companyPhone?.trim(),
    isSystemOpen: false,
    isReceivingDeliveries: false,
    autoAssignEnabled: false,
    deliveries: [],
    couriers: [],
    shifts: [],
    restaurants: mergeDefaultSendiPlusRestaurants([]),
    customers: [],
    courierRoutePlans: {},
    activityLogs: [
      {
        id: `log-${now.getTime()}-workspace-created`,
        timestamp: now,
        title: 'חברת משלוחים נפתחה',
        description: [companyName.trim(), area?.trim()].filter(Boolean).join(' · '),
        actionType: 'WORKSPACE_CREATED',
        category: 'settings',
      },
    ],
    deliveryBalance: DEFAULT_DELIVERY_BALANCE,
    stats: zeroStats(),
  };
};

export const createCleanTlvRunnersState = () =>
  createEmptyWorkspaceState({
    companyName: 'TLV RUNNERS',
    companyPhone: TLV_RUNNERS_DEMO_PHONE,
    workspaceId: TLV_RUNNERS_WORKSPACE_ID,
  });

export const writeWorkspaceState = (
  state: DeliveryState,
  storage: Storage = window.localStorage,
) => {
  if (!state.workspaceId) return;
  storage.setItem(getWorkspaceStateStorageKey(state.workspaceId), JSON.stringify(state));
};

const readStoredWorkspaceState = (workspaceId: string, storage: Storage) => {
  try {
    const raw = storage.getItem(getWorkspaceStateStorageKey(workspaceId));
    return raw ? (JSON.parse(raw) as DeliveryState) : null;
  } catch {
    return null;
  }
};

const getDemoAccount = (): WorkspaceAccount => {
  const now = new Date().toISOString();
  const workspace = createDemoWorkspace(now);

  return {
    id: workspace.id,
    kind: 'demo',
    name: workspace.name,
    phone: TLV_RUNNERS_DEMO_PHONE,
    workspace,
  };
};

export const readWorkspaceAccounts = (): WorkspaceAccount[] => {
  const accounts = [getDemoAccount()];
  const seenWorkspaceIds = new Set(accounts.map((account) => account.id));
  const profiles = readAuthProfiles();

  Object.values(profiles).forEach((profile) => {
    const workspace = profile.workspace;
    if (!workspace || workspace.accountType !== 'delivery_company') return;
    if (workspace.onboardingStatus !== 'complete') return;
    if (DEFAULT_WORKSPACE_NAMES.has(workspace.name.trim())) return;
    if (seenWorkspaceIds.has(workspace.id)) return;

    accounts.push({
      id: workspace.id,
      kind: 'registered',
      name: workspace.name,
      phone: profile.user.phone,
      profile,
      workspace,
    });
    seenWorkspaceIds.add(workspace.id);
  });

  return accounts;
};

export const readWorkspaceAccountByPhone = (phone: string): WorkspaceAccount | null => {
  const normalizedPhone = normalizePhone(phone);
  const profiles = readAuthProfiles();

  for (const profile of Object.values(profiles)) {
    const workspace = profile.workspace;
    if (!workspace || workspace.accountType !== 'delivery_company') continue;
    if (workspace.onboardingStatus !== 'complete') continue;
    if (DEFAULT_WORKSPACE_NAMES.has(workspace.name.trim())) continue;
    if (normalizePhone(profile.user.phone) !== normalizedPhone) continue;

    return {
      id: workspace.id,
      kind: 'registered',
      name: workspace.name,
      phone: profile.user.phone,
      profile,
      workspace,
    };
  }

  if (normalizedPhone === TLV_RUNNERS_DEMO_PHONE) {
    return getDemoAccount();
  }

  return null;
};

export const readWorkspaceAccountByRegistrationNumber = (
  registrationNumber: string,
): WorkspaceAccount | null => {
  const normalizedRegistrationNumber = normalizeRegistrationNumber(registrationNumber);
  if (!normalizedRegistrationNumber) return null;

  const profiles = readAuthProfiles();
  const seenWorkspaceIds = new Set<string>();

  for (const profile of Object.values(profiles)) {
    const workspace = profile.workspace;
    if (!workspace || workspace.accountType !== 'delivery_company') continue;
    if (workspace.onboardingStatus !== 'complete') continue;
    if (DEFAULT_WORKSPACE_NAMES.has(workspace.name.trim())) continue;
    if (seenWorkspaceIds.has(workspace.id)) continue;
    seenWorkspaceIds.add(workspace.id);
    if (normalizeRegistrationNumber(workspace.registrationNumber ?? '') !== normalizedRegistrationNumber) continue;

    return {
      id: workspace.id,
      kind: 'registered',
      name: workspace.name,
      phone: profile.user.phone,
      profile,
      workspace,
    };
  }

  return null;
};

export const activateWorkspaceAccount = (account: WorkspaceAccount) => {
  const storage = window.localStorage;
  const rawTargetState =
    readStoredWorkspaceState(account.id, storage) ??
    (account.kind === 'demo'
      ? createCleanTlvRunnersState()
      : createEmptyWorkspaceState({
          companyName: account.name,
          companyPhone: account.phone,
          workspaceId: account.id,
        }));
  const targetState = {
    ...rawTargetState,
    isReceivingDeliveries:
      rawTargetState.isSystemOpen &&
      ((rawTargetState.couriers ?? []).length > 0) &&
      (
        typeof rawTargetState.isReceivingDeliveries === 'boolean'
          ? rawTargetState.isReceivingDeliveries
          : rawTargetState.isSystemOpen
      ),
    autoAssignEnabled:
      rawTargetState.isSystemOpen &&
      ((rawTargetState.couriers ?? []).length > 0) &&
      rawTargetState.autoAssignEnabled,
    restaurants: mergeDefaultSendiPlusRestaurants(rawTargetState.restaurants ?? []),
  };

  clearSystemResetStorage(storage);
  storage.setItem(DELIVERY_STORAGE_KEYS.stateEpoch, createStorageEpoch());
  storage.setItem(DELIVERY_STORAGE_KEYS.state, JSON.stringify(targetState));
  writeWorkspaceState(targetState, storage);
  writeStoredSendiPlusTermsAccepted(false, storage);
  writeStoredSendiPlusRadius(5, storage);

  if (account.kind === 'demo') {
    writeAuthSession(createTlvRunnersDemoSession());
    return;
  }

  if (!account.profile) return;

  upsertAuthProfile({
    accountType: 'delivery_company',
    phone: account.phone,
    user: account.profile.user,
    workspace: account.workspace,
  });
};

export type DeleteWorkspaceAccountResult =
  | { ok: true; phone: string; workspaceId: string }
  | { ok: false; reason: 'demo' | 'no_session' | 'no_workspace' };

export const deleteCurrentWorkspaceAccount = (): DeleteWorkspaceAccountResult => {
  const session = readAuthSession();

  if (!session) {
    return { ok: false, reason: 'no_session' };
  }

  if (!session.workspace) {
    return { ok: false, reason: 'no_workspace' };
  }

  if (session.workspace.id === TLV_RUNNERS_WORKSPACE_ID) {
    return { ok: false, reason: 'demo' };
  }

  const storage = window.localStorage;
  const workspaceId = session.workspace.id;
  const phone = session.user.phone;

  storage.removeItem(getWorkspaceStateStorageKey(workspaceId));
  clearSystemResetStorage(storage);
  storage.removeItem(DELIVERY_STORAGE_KEYS.stateEpoch);
  deleteAuthProfile({
    accountType: session.user.accountType,
    phone,
  });

  return { ok: true, phone, workspaceId };
};
