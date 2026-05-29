import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  clearAuthSession,
  readAuthSession,
  updateAuthSessionUser,
  updateAuthSessionWorkspace,
  upsertAuthProfile,
  type AuthSession,
  type AuthWorkspaceMember,
} from '../auth/auth-session';
import { AppLogo } from '../components/icons/app-logo';
import { createInitialDeliveryState } from '../context/delivery-bootstrap';
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
import {
  activateWorkspaceAccount,
  readWorkspaceAccountByRegistrationNumber,
  writeWorkspaceState,
} from '../workspaces/workspace-registry';
import { blurActiveEditableInside } from '../utils/editable-focus';
import { LoginDotField, type LoginDotFieldHandle } from './login-page';

type OnboardingStep = 'userName' | 'companyChoice' | 'companyDetails' | 'activityArea' | 'joinCompany';
type WorkspaceAreaSection = {
  areas: string[];
  label: string;
};

type WorkspaceAreaGroup = {
  label: string;
  sections: WorkspaceAreaSection[];
};

const normalizePhone = (value: string) => value.replace(/\D/g, '');
const normalizeRegistrationNumber = (value: string) => value.replace(/\D/g, '').slice(0, 9);
const ALL_COUNTRY_AREA = 'כל הארץ';
const WORKSPACE_AREA_GROUPS: WorkspaceAreaGroup[] = [
  {
    label: 'מטרופולין תל אביב',
    sections: [
      {
        label: 'גלעין המטרופולין',
        areas: [
          'תל אביב-יפו',
          'רמת גן',
          'גבעתיים',
          'בני ברק',
          'חולון',
          'בת ים',
          'אזור',
        ],
      },
      {
        label: 'טבעת מזרחית',
        areas: [
          'פתח תקווה',
          'קריית אונו',
          'גני תקווה',
          'אור יהודה',
          'יהוד-מונוסון',
          'סביון',
          'ראש העין',
          'אלעד',
          'שוהם',
          'לוד',
          'רמלה',
          'מודיעין-מכבים-רעות',
        ],
      },
      {
        label: 'טבעת דרומית',
        areas: [
          'ראשון לציון',
          'באר יעקב',
          'נס ציונה',
          'רחובות',
          'יבנה',
          'גדרה',
          'מזכרת בתיה',
          'קריית עקרון',
          'בית דגן',
        ],
      },
      {
        label: 'טבעת צפונית והשרון הדרומי',
        areas: [
          'הרצליה',
          'רמת השרון',
          'רעננה',
          'כפר סבא',
          'הוד השרון',
          'כפר שמריהו',
          'רשפון',
          'גליל ים',
        ],
      },
    ],
  },
  {
    label: 'מטרופולין ירושלים',
    sections: [
      {
        label: 'גלעין וסביבה קרובה',
        areas: [
          'ירושלים',
          'מבשרת ציון',
          'גבעת זאב',
          'מעלה אדומים',
          'בית שמש',
          'אבו גוש',
          'קריית יערים',
          'צור הדסה',
        ],
      },
      {
        label: 'מערב הרי ירושלים',
        areas: [
          'בית זית',
          'בית נקופה',
          'קריית ענבים',
          'מעלה החמישה',
          'שורש',
          'צובה',
          'אשתאול',
          'כסלון',
          'נס הרים',
          'עין ראפה',
          'עין נקובא',
        ],
      },
      {
        label: 'מזרח ירושלים ומדבר יהודה',
        areas: [
          'עזריה',
          'אבו דיס',
          'מצפה יריחו',
          'ורד יריחו',
          'קליה',
          'אלמוג',
          'בית הערבה',
        ],
      },
    ],
  },
  {
    label: 'מטרופולין חיפה',
    sections: [
      {
        label: 'גלעין חיפה',
        areas: ['חיפה', 'נשר', 'טירת כרמל'],
      },
      {
        label: 'הקריות',
        areas: [
          'קריית אתא',
          'קריית ביאליק',
          'קריית מוצקין',
          'קריית ים',
          'קריית טבעון',
          'רכסים',
        ],
      },
      {
        label: 'כרמל וחוף הכרמל',
        areas: [
          'דלית אל-כרמל',
          'עספיא',
          'זכרון יעקב',
          'בנימינה-גבעת עדה',
          'פרדיס',
          'ג׳סר א-זרקא',
          'עתלית',
          'קיסריה',
          'אור עקיבא',
        ],
      },
      {
        label: 'עכו וגליל מערבי קרוב',
        areas: [
          'עכו',
          'נהריה',
          'שלומי',
          'כפר ורדים',
          'מעלות-תרשיחא',
          'אבו סנאן',
          'ג׳וליס',
          'ירכא',
          'כפר יאסיף',
        ],
      },
    ],
  },
  {
    label: 'מטרופולין באר שבע',
    sections: [
      {
        label: 'גלעין באר שבע',
        areas: ['באר שבע', 'עומר', 'להבים', 'מיתר'],
      },
      {
        label: 'יישובי לוויין',
        areas: ['רהט', 'לקייה', 'חורה', 'תל שבע', 'שגב שלום', 'כסייפה', 'ערערה בנגב'],
      },
      {
        label: 'נגב מערבי',
        areas: ['אופקים', 'נתיבות', 'שדרות'],
      },
      {
        label: 'נגב מזרחי',
        areas: ['דימונה', 'ירוחם', 'ערד', 'מצפה רמון'],
      },
    ],
  },
  {
    label: 'צפון',
    sections: [
      {
        label: 'אצבע הגליל והגולן',
        areas: [
          'קריית שמונה',
          'מטולה',
          'קצרין',
          'צפת',
          'ראש פינה',
          'חצור הגלילית',
          'יסוד המעלה',
          'מג׳דל שמס',
          'מסעדה',
          'בוקעתא',
          'עין קנייא',
          'בני יהודה',
          'רמות',
          'חד נס',
          'מירון',
          'ביריה',
        ],
      },
      {
        label: 'גליל מערבי',
        areas: [
          'כרמיאל',
          'סח׳נין',
          'עראבה',
          'דיר אל-אסד',
          'מג׳ד אל-כרום',
          'נחף',
          'בענה',
          'פקיעין',
          'חורפיש',
          'יאנוח-ג׳ת',
          'מעיליא',
          'כברי',
          'רגבה',
        ],
      },
      {
        label: 'גליל תחתון ועמקים',
        areas: [
          'טבריה',
          'עפולה',
          'בית שאן',
          'נצרת',
          'נוף הגליל',
          'מגדל העמק',
          'יקנעם עילית',
          'כפר תבור',
          'יבנאל',
          'דבורייה',
          'שפרעם',
          'ריינה',
          'משהד',
          'עילוט',
          'כפר כנא',
          'טורעאן',
          'איכסאל',
          'זרזיר',
        ],
      },
      {
        label: 'ואדי ערה וחדרה',
        areas: [
          'חדרה',
          'פרדס חנה-כרכור',
          'חריש',
          'אום אל-פחם',
          'באקה אל-גרבייה',
          'ג׳ת',
          'ערערה',
          'כפר קרע',
          'מעלה עירון',
          'זמר',
          'קציר',
          'אליכין',
        ],
      },
    ],
  },
  {
    label: 'שרון ומישור החוף',
    sections: [
      {
        label: 'שרון צפוני',
        areas: [
          'נתניה',
          'כפר יונה',
          'אבן יהודה',
          'קדימה-צורן',
          'תל מונד',
          'פרדסיה',
          'צור משה',
          'בית יהושע',
          'אודים',
        ],
      },
      {
        label: 'עמק חפר והחוף',
        areas: [
          'כפר ויתקין',
          'בית יצחק-שער חפר',
          'בת חפר',
          'חבצלת השרון',
          'ינוב',
          'בית חירות',
          'מכמורת',
          'גבעת חיים',
        ],
      },
      {
        label: 'המשולש והשרון המזרחי',
        areas: [
          'טייבה',
          'טירה',
          'קלנסווה',
          'כפר קאסם',
          'ג׳לג׳וליה',
          'כפר ברא',
          'כוכב יאיר-צור יגאל',
          'צור יצחק',
          'שער אפרים',
          'ניצני עוז',
          'יד חנה',
        ],
      },
    ],
  },
  {
    label: 'דרום ומישור החוף הדרומי',
    sections: [
      {
        label: 'אשדוד ואשקלון',
        areas: [
          'אשדוד',
          'אשקלון',
          'גן יבנה',
          'בני עי״ש',
          'חצור אשדוד',
          'ניר גלים',
          'שתולים',
          'עזריקם',
          'בית עזרא',
          'ניצן',
          'ניצנים',
          'יד מרדכי',
          'זיקים',
          'כרמיה',
          'מבקיעים',
          'ברכיה',
          'הודיה',
          'גיאה',
          'בת הדר',
        ],
      },
      {
        label: 'לכיש ושפלה דרומית',
        areas: [
          'קריית גת',
          'קריית מלאכי',
          'לכיש',
          'בית גוברין',
          'אמציה',
          'נוגה',
          'נהורה',
          'שדה משה',
          'קוממיות',
          'שפיר',
          'עוזה',
          'זבדיאל',
          'אחוזם',
          'כפר מנחם',
        ],
      },
      {
        label: 'עוטף עזה',
        areas: [
          'ניר עם',
          'ארז',
          'מפלסים',
          'כפר עזה',
          'סעד',
          'עלומים',
          'בארי',
          'רעים',
          'נירים',
          'כיסופים',
          'ניר עוז',
          'מגן',
          'עין הבשור',
          'כרם שלום',
          'חולית',
          'סופה',
          'יתד',
          'יבול',
          'פרי גן',
          'תקומה',
          'שובה',
          'יכיני',
          'כפר מימון',
        ],
      },
      {
        label: 'ערבה ואילת',
        areas: [
          'אילת',
          'באר אורה',
          'יטבתה',
          'יהל',
          'קטורה',
          'לוטן',
          'פארן',
          'צוקים',
          'עין יהב',
          'חצבה',
          'ספיר',
          'עידן',
          'נאות סמדר',
          'אליפז',
          'שחרות',
        ],
      },
      {
        label: 'ים המלח והר הנגב',
        areas: [
          'מדרשת בן גוריון',
          'שדה בוקר',
          'עין גדי',
          'נאות הכיכר',
          'עין תמר',
          'מרחב עם',
          'כמהין',
          'אשלים',
          'טללים',
        ],
      },
    ],
  },
  {
    label: 'איו״ש',
    sections: [
      {
        label: 'ערים ומועצות מקומיות',
        areas: [
          'אריאל',
          'מעלה אדומים',
          'מודיעין עילית',
          'ביתר עילית',
          'אפרת',
          'גבעת זאב',
          'קריית ארבע',
          'עמנואל',
          'קרני שומרון',
          'אלפי מנשה',
          'אורנית',
          'אלקנה',
          'בית אריה-עופרים',
          'קדומים',
          'מעלה אפרים',
          'הר אדר',
        ],
      },
      {
        label: 'שומרון',
        areas: [
          'ברקן',
          'יקיר',
          'רבבה',
          'נופים',
          'קריית נטפים',
          'איתמר',
          'יצהר',
          'הר ברכה',
          'עינב',
          'שבי שומרון',
          'חיננית',
          'טל מנשה',
          'מבוא דותן',
        ],
      },
      {
        label: 'בנימין',
        areas: [
          'בית אל',
          'עפרה',
          'פסגות',
          'כוכב יעקב',
          'גבע בנימין',
          'עלי',
          'שילה',
          'מעלה מכמש',
          'כפר אדומים',
          'אלון',
          'נופי פרת',
          'ענתות',
          'דולב',
          'טלמון',
          'חלמיש',
          'ניל״י',
          'נעלה',
          'חשמונאים',
        ],
      },
      {
        label: 'גוש עציון והר חברון',
        areas: [
          'אלון שבות',
          'כפר עציון',
          'מגדל עוז',
          'ראש צורים',
          'נוקדים',
          'תקוע',
          'כרמי צור',
          'אלעזר',
          'נווה דניאל',
          'הר גילה',
          'מיצד',
          'עתניאל',
          'סוסיא',
          'שמעה',
          'טנא עומרים',
          'כרמל',
          'מעון',
          'בית חגי',
          'אדורה',
          'נגוהות',
          'חברון',
        ],
      },
      {
        label: 'בקעת הירדן',
        areas: [
          'ארגמן',
          'מחולה',
          'בקעות',
          'חמרה',
          'משואה',
          'פצאל',
          'ייט״ב',
          'נעמה',
          'גלגל',
          'תומר',
          'מכורה',
          'נתיב הגדוד',
        ],
      },
    ],
  },
];

const WORKSPACE_AREA_SEARCH_OPTIONS = Array.from(
  new Set([
    ALL_COUNTRY_AREA,
    ...WORKSPACE_AREA_GROUPS.flatMap((group) => [
      group.label,
      ...group.sections.flatMap((section) => [section.label, ...section.areas]),
    ]),
  ]),
);

const inputClassName =
  'h-12 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 text-right text-sm font-medium text-[#0d0d12] outline-none transition-colors placeholder:text-[#777] hover:border-[#bdbdbd] focus:border-[#0d0d12] focus:bg-white focus:ring-2 focus:ring-[#0d0d12]/10 dark:border-[#252525] dark:bg-[#050505] dark:text-app-text dark:placeholder:text-[#777] dark:hover:border-[#3a3a3a] dark:hover:bg-[#080808] dark:focus:border-[#ededed] dark:focus:ring-[#ededed]/10';

const primaryButtonClassName =
  'flex h-12 w-full items-center justify-center rounded-lg bg-[#0d0d12] px-4 text-sm font-bold text-white transition-colors hover:bg-[#24242b] active:bg-[#050505] dark:bg-[#ededed] dark:text-[#050505] dark:hover:bg-white dark:active:bg-[#d8d8d8]';

const secondaryButtonClassName =
  'flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-[#d8d8d8] bg-white px-4 py-3 text-right text-sm font-bold text-[#0d0d12] outline-none transition-colors hover:border-[#bdbdbd] hover:bg-[#f5f5f5] focus:border-[#0d0d12] focus:ring-2 focus:ring-[#0d0d12]/10 active:bg-[#ededed] dark:border-[#252525] dark:bg-[#050505] dark:text-app-text dark:hover:border-[#3a3a3a] dark:hover:bg-[#111] dark:focus:border-[#ededed] dark:focus:ring-[#ededed]/10 dark:active:bg-[#181818]';

const normalizeWorkspaceArea = (value: string) => value.trim().replace(/\s+/g, ' ');

const formatWorkspaceAreaSummary = (areas: string[]) => {
  if (areas.includes(ALL_COUNTRY_AREA)) return ALL_COUNTRY_AREA;
  if (areas.length <= 3) return areas.join(', ');

  return `${areas.slice(0, 3).join(', ')} ועוד ${areas.length - 3}`;
};

const createWorkspaceMember = (
  session: AuthSession,
  role: AuthWorkspaceMember['role'],
  joinedAt = new Date().toISOString(),
): AuthWorkspaceMember => ({
  joinedAt,
  name: session.user.name?.trim() || undefined,
  phone: normalizePhone(session.user.phone),
  role,
  userId: session.user.id,
});

const upsertWorkspaceMember = (
  members: AuthWorkspaceMember[] | undefined,
  member: AuthWorkspaceMember,
) => {
  const memberPhone = normalizePhone(member.phone);
  const withoutCurrentMember = (members ?? []).filter(
    (item) => item.userId !== member.userId && normalizePhone(item.phone) !== memberPhone,
  );

  return [...withoutCurrentMember, member];
};

const createEmptyWorkspaceState = ({
  area,
  areas,
  companyName,
  companyPhone,
  companyRegistrationNumber,
  session,
}: {
  area: string;
  areas: string[];
  companyName: string;
  companyPhone: string;
  companyRegistrationNumber: string;
  session: AuthSession;
}) => {
  const workspaceId = session.workspace?.id ?? `wrk-${Date.now()}`;
  const baseState = createInitialDeliveryState();
  const now = new Date();

  return {
    ...baseState,
    dataMode: 'workspace',
    workspaceId,
    workspaceName: companyName.trim(),
    workspaceArea: area.trim(),
    workspaceAreas: areas,
    workspacePhone: companyPhone.trim(),
    workspaceRegistrationNumber: companyRegistrationNumber.trim(),
    isSystemOpen: false,
    isReceivingDeliveries: false,
    autoAssignEnabled: false,
    deliveries: [],
    couriers: [],
    shifts: [],
    restaurants: [],
    customers: [],
    courierRoutePlans: {},
    activityLogs: [
      {
        id: `log-${now.getTime()}-workspace-created`,
        timestamp: now,
        title: 'חברת משלוחים נפתחה',
        description: `${companyName.trim()} · ח.פ ${companyRegistrationNumber.trim()}`,
        actionType: 'ONBOARDING_COMPLETE',
        category: 'settings',
      },
    ],
    deliveryBalance: 500,
    stats: {
      hour: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      today: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      week: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      month: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
      year: { total: 0, delivered: 0, cancelled: 0, revenue: 0 },
    },
  } satisfies DeliveryState;
};

const saveWorkspace = ({
  area,
  areas,
  companyName,
  companyPhone,
  companyRegistrationNumber,
  session,
}: {
  area: string;
  areas: string[];
  companyName: string;
  companyPhone: string;
  companyRegistrationNumber: string;
  session: AuthSession;
}) => {
  const storage = window.localStorage;
  const ownerMember = createWorkspaceMember(session, 'owner');
  const nextState = createEmptyWorkspaceState({
    area,
    areas,
    companyName,
    companyPhone,
    companyRegistrationNumber,
    session,
  });

  clearSystemResetStorage(storage);
  storage.setItem(DELIVERY_STORAGE_KEYS.stateEpoch, createStorageEpoch());
  storage.setItem(DELIVERY_STORAGE_KEYS.state, JSON.stringify(nextState));
  writeWorkspaceState(nextState, storage);
  writeStoredSendiPlusTermsAccepted(false, storage);
  writeStoredSendiPlusRadius(5, storage);

  updateAuthSessionWorkspace({
    activityAreas: areas,
    members: [ownerMember],
    name: companyName.trim(),
    onboardingStatus: 'complete',
    ownerUserId: session.user.id,
    registrationNumber: companyRegistrationNumber.trim(),
  });
};

export const OnboardingPage: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [step, setStep] = useState<OnboardingStep>('userName');
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [selectedWorkspaceAreas, setSelectedWorkspaceAreas] = useState<string[]>([]);
  const [workspaceAreaSearch, setWorkspaceAreaSearch] = useState('');
  const [isMobileWorkspaceAreaSearchOpen, setIsMobileWorkspaceAreaSearchOpen] = useState(false);
  const [expandedWorkspaceAreaGroups, setExpandedWorkspaceAreaGroups] = useState<string[]>([]);
  const [joinRegistrationNumber, setJoinRegistrationNumber] = useState('');
  const [error, setError] = useState('');
  const dotFieldRef = useRef<LoginDotFieldHandle>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const filteredWorkspaceAreaGroups = useMemo(() => {
    const query = normalizeWorkspaceArea(workspaceAreaSearch).toLocaleLowerCase('he-IL');
    if (!query) return WORKSPACE_AREA_GROUPS;

    return WORKSPACE_AREA_GROUPS.map((group) => {
      const groupMatches = group.label.toLocaleLowerCase('he-IL').includes(query);
      const sections = group.sections
        .map((section) => {
          const sectionMatches = section.label.toLocaleLowerCase('he-IL').includes(query);
          const areas = groupMatches || sectionMatches
            ? section.areas
            : section.areas.filter((area) => area.toLocaleLowerCase('he-IL').includes(query));

          return areas.length > 0 || sectionMatches
            ? { ...section, areas }
            : null;
        })
        .filter((section): section is WorkspaceAreaSection => Boolean(section));

      return sections.length > 0 || groupMatches
        ? { ...group, sections }
        : null;
    }).filter((group): group is WorkspaceAreaGroup => Boolean(group));
  }, [workspaceAreaSearch]);

  const isCustomWorkspaceAreaVisible = useMemo(() => {
    const customArea = normalizeWorkspaceArea(workspaceAreaSearch);
    if (!customArea) return false;

    return !WORKSPACE_AREA_SEARCH_OPTIONS.some((area) => area === customArea);
  }, [workspaceAreaSearch]);

  useEffect(() => {
    const currentSession = readAuthSession();
    setSession(currentSession);

    if (!currentSession) {
      navigate('/login', { replace: true });
      return;
    }

    const currentName = currentSession.user.name?.trim() ?? '';
    setUserName(currentName);
    setStep(currentName ? 'companyChoice' : 'userName');
  }, [navigate]);

  const toggleWorkspaceArea = useCallback((rawArea: string) => {
    const area = normalizeWorkspaceArea(rawArea);
    if (!area) return;

    setSelectedWorkspaceAreas((currentAreas) => {
      if (area === ALL_COUNTRY_AREA) {
        return currentAreas.includes(ALL_COUNTRY_AREA) ? [] : [ALL_COUNTRY_AREA];
      }

      const withoutCountrywide = currentAreas.filter((currentArea) => currentArea !== ALL_COUNTRY_AREA);
      return withoutCountrywide.includes(area)
        ? withoutCountrywide.filter((currentArea) => currentArea !== area)
        : [...withoutCountrywide, area];
    });
    setError('');
  }, []);

  const addCustomWorkspaceArea = useCallback(() => {
    const customArea = normalizeWorkspaceArea(workspaceAreaSearch);
    if (!customArea) return;

    toggleWorkspaceArea(customArea);
    setWorkspaceAreaSearch('');
  }, [toggleWorkspaceArea, workspaceAreaSearch]);

  const toggleExpandedWorkspaceAreaGroup = useCallback((groupLabel: string) => {
    setExpandedWorkspaceAreaGroups((currentGroups) =>
      currentGroups.includes(groupLabel)
        ? currentGroups.filter((label) => label !== groupLabel)
        : [...currentGroups, groupLabel],
    );
  }, []);

  const handleUserNameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = userName.trim();
    if (trimmedName.length < 2) {
      setError('צריך להזין שם מלא');
      return;
    }

    const nextSession = updateAuthSessionUser({ name: trimmedName });
    if (!nextSession) {
      navigate('/login', { replace: true });
      return;
    }

    setSession(nextSession);
    setError('');
    blurActiveEditableInside(shellRef.current);
    setStep('companyChoice');
  };

  const handleCreateCompanySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (companyName.trim().length < 2) {
      setError('צריך להזין את שם העסק כפי שהוא רשום');
      return;
    }

    if (companyRegistrationNumber.length !== 9) {
      setError('צריך להזין ח.פ תקין בן 9 ספרות');
      return;
    }

    setError('');
    blurActiveEditableInside(shellRef.current);
    setStep('activityArea');
  };

  const handleActivityAreaSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    const normalizedAreas = selectedWorkspaceAreas
      .map(normalizeWorkspaceArea)
      .filter(Boolean);

    if (normalizedAreas.length === 0) {
      setError('צריך לבחור לפחות אזור פעילות אחד');
      return;
    }

    const companyPhone = normalizePhone(session.user.phone);
    if (companyPhone.length < 9) {
      setError('מספר הטלפון לא תקין');
      return;
    }

    blurActiveEditableInside(shellRef.current);
    saveWorkspace({
      area: formatWorkspaceAreaSummary(normalizedAreas),
      areas: normalizedAreas,
      companyName,
      companyPhone,
      companyRegistrationNumber,
      session,
    });

    navigate('/dashboard', { replace: true });
  };

  const handleJoinCompanySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    if (joinRegistrationNumber.length !== 9) {
      setError('צריך להזין ח.פ תקין בן 9 ספרות');
      return;
    }

    const account = readWorkspaceAccountByRegistrationNumber(joinRegistrationNumber);
    if (!account?.profile) {
      setError('לא מצאנו חברת משלוחים עם הח.פ הזה');
      return;
    }

    blurActiveEditableInside(shellRef.current);
    const ownerMember = {
      joinedAt: account.profile.user.createdAt,
      name: account.profile.user.name,
      phone: normalizePhone(account.profile.user.phone),
      role: 'owner' as const,
      userId: account.profile.user.id,
    };
    const member = createWorkspaceMember(session, 'dispatcher');
    const membersWithOwner = upsertWorkspaceMember(account.workspace.members, ownerMember);
    const nextWorkspace = {
      ...account.workspace,
      members: upsertWorkspaceMember(membersWithOwner, member),
      ownerUserId: account.workspace.ownerUserId ?? account.profile.user.id,
    };

    upsertAuthProfile({
      accountType: account.profile.user.accountType,
      phone: normalizePhone(account.profile.user.phone),
      user: account.profile.user,
      workspace: nextWorkspace,
    });

    const nextSession = upsertAuthProfile({
      accountType: session.user.accountType,
      phone: normalizePhone(session.user.phone),
      user: session.user,
      workspace: nextWorkspace,
    });

    activateWorkspaceAccount({
      id: account.id,
      kind: 'registered',
      name: nextWorkspace.name,
      phone: nextSession.user.phone,
      profile: {
        user: nextSession.user,
        workspace: nextWorkspace,
      },
      workspace: nextWorkspace,
    });

    navigate('/dashboard', { replace: true });
  };

  const handleBack = () => {
    blurActiveEditableInside(shellRef.current);
    setError('');

    if (step === 'userName') {
      clearAuthSession();
      navigate('/login', { replace: true });
      return;
    }

    if (step === 'companyChoice') {
      setStep('userName');
      return;
    }

    if (step === 'activityArea') {
      setWorkspaceAreaSearch('');
      setStep('companyDetails');
      return;
    }

    setStep('companyChoice');
  };

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;

    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.();
    const latestEvent = coalescedEvents?.[coalescedEvents.length - 1] ?? event;

    dotFieldRef.current?.move(
      latestEvent.clientX,
      latestEvent.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
  }, []);

  const handlePointerLeave = useCallback(() => {
    dotFieldRef.current?.leave();
  }, []);

  if (!session) return null;

  return (
    <div
      ref={shellRef}
      className={`login-shell relative isolate flex w-full flex-col overflow-x-hidden text-app-text ${
        step === 'activityArea' ? 'login-shell--fixed' : ''
      }`}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      <LoginDotField ref={dotFieldRef} />

      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6" dir="rtl">
        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0d0d12] dark:text-app-text">
          <AppLogo size={28} className="h-7 w-7" />
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8d8d8] px-4 text-sm font-bold text-[#0d0d12] transition-colors hover:border-[#bdbdbd] hover:bg-[#f5f5f5] dark:border-[#252525] dark:text-app-text dark:hover:border-[#3a3a3a] dark:hover:bg-[#111]"
        >
          חזור
        </button>
      </header>

      <main
        className={`login-main relative z-10 flex min-h-0 flex-1 justify-center px-5 sm:px-6 ${
          step === 'activityArea'
            ? 'login-main--activity-area items-start overflow-hidden pb-3 pt-4 sm:pb-4'
            : 'items-center overflow-y-auto pb-16 pt-8'
        }`}
      >
        {step === 'userName' ? (
          <section className="w-full max-w-[320px] text-center" dir="rtl" aria-label="פרטי משתמש">
            <h1 className="mb-7 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-[32px]">
              איך קוראים לך?
            </h1>

            <form onSubmit={handleUserNameSubmit} className="space-y-3">
              <label className="sr-only" htmlFor="onboarding-user-name">
                שם מלא
              </label>
              <input
                id="onboarding-user-name"
                value={userName}
                onChange={(event) => {
                  setUserName(event.target.value);
                  setError('');
                }}
                placeholder="שם מלא"
                className={inputClassName}
                required
                minLength={2}
                autoComplete="name"
              />

              {error ? (
                <div className="rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-right text-sm font-medium text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
                  {error}
                </div>
              ) : null}

              <button type="submit" className={primaryButtonClassName}>
                המשך
              </button>
            </form>
          </section>
        ) : null}

        {step === 'companyChoice' ? (
          <section className="w-full max-w-[360px] text-center" dir="rtl" aria-label="בחירת סוג הצטרפות">
            <h1 className="mb-7 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-[32px]">
              מה תרצה לעשות?
            </h1>

            <div className="space-y-3">
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => {
                  setError('');
                  setStep('companyDetails');
                }}
              >
                <span>אני פותח חברת משלוחים חדשה</span>
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => {
                  setError('');
                  setStep('joinCompany');
                }}
              >
                <span>אני מצטרף לחברת משלוחים קיימת</span>
                <span aria-hidden="true">←</span>
              </button>
            </div>
          </section>
        ) : null}

        {step === 'companyDetails' ? (
          <section className="w-full max-w-[320px] text-center" dir="rtl" aria-label="פרטי העסק">
            <h1 className="mb-7 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-[32px]">
              פרטי העסק
            </h1>

            <form onSubmit={handleCreateCompanySubmit} className="space-y-3">
              <label className="sr-only" htmlFor="onboarding-company-name">
                שם העסק כפי שרשום
              </label>
              <input
                id="onboarding-company-name"
                value={companyName}
                onChange={(event) => {
                  setCompanyName(event.target.value);
                  setError('');
                }}
                placeholder="שם העסק כפי שרשום"
                className={inputClassName}
                required
                minLength={2}
                autoComplete="organization"
              />
              <label className="sr-only" htmlFor="onboarding-company-registration">
                ח.פ של חברת המשלוחים
              </label>
              <input
                id="onboarding-company-registration"
                value={companyRegistrationNumber}
                onChange={(event) => {
                  setCompanyRegistrationNumber(normalizeRegistrationNumber(event.target.value));
                  setError('');
                }}
                placeholder="ח.פ של חברת המשלוחים"
                className={inputClassName}
                required
                pattern="[0-9]{9}"
                maxLength={9}
                dir="rtl"
                inputMode="numeric"
                autoComplete="off"
              />

              {error ? (
                <div className="rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-right text-sm font-medium text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
                  {error}
                </div>
              ) : null}

              <button type="submit" className={primaryButtonClassName}>
                המשך
              </button>
            </form>
          </section>
        ) : null}

        {step === 'activityArea' ? (
          <section className="flex h-full min-h-0 w-full max-w-[560px] flex-1 flex-col text-center sm:max-w-[720px]" dir="rtl" aria-label="בחירת אזור פעילות">
            <h1 className="mb-5 shrink-0 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:mb-7 sm:text-[32px]">
              בחירת אזור פעילות
            </h1>

            <form onSubmit={handleActivityAreaSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-3 text-right">
                <label className="sr-only" htmlFor="onboarding-workspace-area">
                  אזור פעילות
                </label>
                <div className="relative hidden sm:block">
                  <input
                    id="onboarding-workspace-area"
                    value={workspaceAreaSearch}
                    onChange={(event) => {
                      setWorkspaceAreaSearch(event.target.value);
                      setError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || !isCustomWorkspaceAreaVisible) return;
                      event.preventDefault();
                      addCustomWorkspaceArea();
                    }}
                    placeholder={
                      selectedWorkspaceAreas.length > 0
                        ? formatWorkspaceAreaSummary(selectedWorkspaceAreas)
                        : 'חפש עיר או יישוב'
                    }
                    className={inputClassName}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2 sm:hidden">
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    onClick={() => {
                      setIsMobileWorkspaceAreaSearchOpen((isOpen) => {
                        const nextIsOpen = !isOpen;
                        if (!nextIsOpen) setWorkspaceAreaSearch('');
                        return nextIsOpen;
                      });
                    }}
                  >
                    <span>{isMobileWorkspaceAreaSearchOpen ? 'סגור חיפוש' : 'חיפוש עיר או יישוב'}</span>
                    <span aria-hidden="true">{isMobileWorkspaceAreaSearchOpen ? '⌃' : '⌄'}</span>
                  </button>

                  {isMobileWorkspaceAreaSearchOpen ? (
                    <>
                      <label className="sr-only" htmlFor="onboarding-workspace-area-mobile">
                        חיפוש אזור פעילות
                      </label>
                      <input
                        id="onboarding-workspace-area-mobile"
                        value={workspaceAreaSearch}
                        onChange={(event) => {
                          setWorkspaceAreaSearch(event.target.value);
                          setError('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' || !isCustomWorkspaceAreaVisible) return;
                          event.preventDefault();
                          addCustomWorkspaceArea();
                        }}
                        placeholder="חפש עיר או יישוב"
                        className={inputClassName}
                        autoComplete="off"
                      />
                    </>
                  ) : null}
                </div>

                {selectedWorkspaceAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-[#d8d8d8] bg-white p-2 dark:border-[#252525] dark:bg-[#050505]">
                    {selectedWorkspaceAreas.map((area) => (
                      <button
                        key={area}
                        type="button"
                        className="inline-flex h-8 items-center gap-2 rounded-full bg-[#f0f0f0] px-3 text-xs font-bold text-[#0d0d12] transition-colors hover:bg-[#e4e4e4] dark:bg-[#1a1a1a] dark:text-app-text dark:hover:bg-[#222]"
                        onClick={() => toggleWorkspaceArea(area)}
                        aria-label={`הסר ${area}`}
                      >
                        <span>{area}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="z-20 min-h-0 flex-1 text-right">
                  <div className="onboarding-area-list flex h-full min-h-0 flex-col gap-2 overflow-y-auto pb-2 pl-1">
                    <button
                      type="button"
                      className={`flex h-12 w-full items-center justify-between rounded-lg border px-3 text-sm font-black transition-colors ${
                        selectedWorkspaceAreas.includes(ALL_COUNTRY_AREA)
                          ? 'border-[#0d0d12] bg-[#0d0d12] text-white dark:border-[#ededed] dark:bg-[#ededed] dark:text-[#050505]'
                          : 'border-[#d8d8d8] bg-white text-[#0d0d12] hover:border-[#bdbdbd] hover:bg-[#f5f5f5] dark:border-[#252525] dark:bg-[#050505] dark:text-app-text dark:hover:border-[#3a3a3a] dark:hover:bg-[#111]'
                      }`}
                      onClick={() => toggleWorkspaceArea(ALL_COUNTRY_AREA)}
                    >
                      <span>{ALL_COUNTRY_AREA}</span>
                      {selectedWorkspaceAreas.includes(ALL_COUNTRY_AREA) ? <span aria-hidden="true">✓</span> : null}
                    </button>

                    {isCustomWorkspaceAreaVisible ? (
                      <button
                        type="button"
                        className="flex h-12 w-full items-center justify-between rounded-lg border border-dashed border-[#bdbdbd] bg-white px-3 text-sm font-bold text-[#0d0d12] transition-colors hover:bg-[#f5f5f5] dark:border-[#3a3a3a] dark:bg-[#050505] dark:text-app-text dark:hover:bg-[#111]"
                        onClick={addCustomWorkspaceArea}
                      >
                        <span>הוסף אזור מותאם</span>
                        <span>{normalizeWorkspaceArea(workspaceAreaSearch)}</span>
                      </button>
                    ) : null}

                      {filteredWorkspaceAreaGroups.length > 0 ? (
                        filteredWorkspaceAreaGroups.map((group) => {
                          const hasQuery = normalizeWorkspaceArea(workspaceAreaSearch).length > 0;
                          const isGroupExpanded =
                            hasQuery || expandedWorkspaceAreaGroups.includes(group.label);

                          return (
                            <div key={group.label} className="overflow-hidden rounded-lg border border-[#d8d8d8] bg-white dark:border-[#252525] dark:bg-[#050505]">
                              <div className="flex h-12 items-center justify-between gap-2 px-3">
                                <button
                                  type="button"
                                  className={`min-w-0 flex-1 rounded-md px-2 py-1 text-right text-sm font-black transition-colors ${
                                    isGroupExpanded
                                      ? 'text-[#0d0d12] dark:text-app-text'
                                      : 'text-[#0d0d12] hover:bg-[#f5f5f5] dark:text-app-text dark:hover:bg-[#111]'
                                  }`}
                                  onClick={() => toggleExpandedWorkspaceAreaGroup(group.label)}
                                >
                                  {group.label}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md px-2 py-1 text-xs font-bold text-[#777] transition-colors hover:bg-[#f5f5f5] dark:text-[#888] dark:hover:bg-[#111]"
                                  onClick={() => toggleExpandedWorkspaceAreaGroup(group.label)}
                                >
                                  {isGroupExpanded ? 'סגור' : `${group.sections.reduce((total, section) => total + section.areas.length, 0)} אזורים`}
                                </button>
                              </div>

                              {isGroupExpanded ? (
                                <div className="space-y-2 border-t border-[#ededed] p-2 dark:border-[#1f1f1f]">
                                  {group.sections.map((section) => {
                                    const sectionKey = `${group.label}-${section.label}`;

                                    return (
                                      <div key={sectionKey} className="rounded-md bg-[#fafafa] p-2 dark:bg-[#080808]">
                                        <div className="mb-2 flex items-center justify-between gap-2 px-1">
                                          <h2 className="text-xs font-black text-[#0d0d12] dark:text-app-text">
                                            {section.label}
                                          </h2>
                                          <span className="text-[11px] font-bold text-[#777] dark:text-[#888]">
                                            {section.areas.length}
                                          </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                          {section.areas.map((area) => {
                                            const isSelected = selectedWorkspaceAreas.includes(area);

                                            return (
                                              <button
                                                key={`${section.label}-${area}`}
                                                type="button"
                                                className={`inline-flex h-8 items-center rounded-full border px-2.5 text-xs font-bold transition-colors ${
                                                  isSelected
                                                    ? 'border-[#0d0d12] bg-[#0d0d12] text-white dark:border-[#ededed] dark:bg-[#ededed] dark:text-[#050505]'
                                                    : 'border-[#d8d8d8] bg-white text-[#0d0d12] hover:border-[#bdbdbd] hover:bg-[#f5f5f5] dark:border-[#252525] dark:bg-[#050505] dark:text-app-text dark:hover:border-[#3a3a3a] dark:hover:bg-[#111]'
                                                }`}
                                                onClick={() => toggleWorkspaceArea(area)}
                                              >
                                                {area}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-lg border border-[#d8d8d8] bg-white px-3 py-4 text-sm font-medium text-[#777] dark:border-[#252525] dark:bg-[#050505] dark:text-[#888]">
                          לא מצאנו אזור ברשימה. אפשר להוסיף אזור מותאם.
                        </div>
                      )}
                    </div>
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-right text-sm font-medium text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
                  {error}
                </div>
              ) : null}

              <div className="onboarding-action-bar z-30 shrink-0 bg-[var(--login-bg)] pb-2 pt-2">
                <button type="submit" className={primaryButtonClassName}>
                  כניסה
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {step === 'joinCompany' ? (
          <section className="w-full max-w-[320px] text-center" dir="rtl" aria-label="הצטרפות לחברה קיימת">
            <h1 className="mb-7 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-[32px]">
              הצטרפות לחברה קיימת
            </h1>

            <form onSubmit={handleJoinCompanySubmit} className="space-y-3">
              <label className="sr-only" htmlFor="onboarding-join-registration">
                ח.פ של חברת המשלוחים
              </label>
              <input
                id="onboarding-join-registration"
                value={joinRegistrationNumber}
                onChange={(event) => {
                  setJoinRegistrationNumber(normalizeRegistrationNumber(event.target.value));
                  setError('');
                }}
                placeholder="ח.פ של חברת המשלוחים"
                className={inputClassName}
                required
                pattern="[0-9]{9}"
                maxLength={9}
                dir="rtl"
                inputMode="numeric"
                autoComplete="off"
              />

              {error ? (
                <div className="rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-right text-sm font-medium text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
                  {error}
                </div>
              ) : null}

              <button type="submit" className={primaryButtonClassName}>
                הצטרף
              </button>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
};
