import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  Box,
  Check,
  Copy,
  Layers3,
  Moon,
  Palette,
  Ruler,
  Search,
  SlidersHorizontal,
  Sun,
  Type,
  Workflow,
} from 'lucide-react';

import themeCss from '../../styles/theme.css?raw';

type TokenCategory =
  | 'semantic'
  | 'palette'
  | 'raw'
  | 'alpha'
  | 'layout'
  | 'typography'
  | 'tailwind'
  | 'compat';

type ModeFilter = 'all' | 'light' | 'dark';

type TokenRecord = {
  category: TokenCategory;
  darkResolved: string;
  darkValue: string;
  description: string;
  lightResolved: string;
  lightValue: string;
  name: string;
  utility: string;
};

type TokenDeclaration = {
  name: string;
  value: string;
};

const colorFamilies = ['gray', 'blue', 'red', 'amber', 'green', 'teal', 'purple', 'pink'];
const colorSteps = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];

const categoryMeta: Record<TokenCategory, { label: string; description: string }> = {
  semantic: {
    label: 'Semantic app',
    description: 'טוקנים לשימוש בקומפוננטות. אלה השמות שצריך להעדיף בקוד.',
  },
  palette: {
    label: 'Primitive palette',
    description: 'סקאלות הצבע הבסיסיות. הן מקור הערכים, לא תמיד השם הנכון לשימוש ישיר.',
  },
  raw: {
    label: 'HSL values',
    description: 'כל המספרים והאחוזים שמרכיבים את הסקאלות: hue, saturation, lightness.',
  },
  alpha: {
    label: 'Alpha',
    description: 'שכבות שקיפות לשחור/לבן לפי theme.',
  },
  layout: {
    label: 'Layout',
    description: 'ריווחים, רדיוסים, צללים ומידות מוצר.',
  },
  typography: {
    label: 'Typography',
    description: 'פונט, גדלים, משקלים וקו בסיס.',
  },
  tailwind: {
    label: 'Tailwind aliases',
    description: 'השמות שנפתחים ל-utility classes כמו bg-app-surface או text-app-text.',
  },
  compat: {
    label: 'Compatibility',
    description: 'טוקנים שמחברים רכיבי shadcn/ui וספריות חיצוניות לשפה שלנו.',
  },
};

const semanticDescriptions: Record<string, { description: string; utility?: string }> = {
  '--app-background': { description: 'רקע מסך מלא, האזור הכי אחורי.', utility: 'bg-app-background' },
  '--app-surface': { description: 'משטח עבודה רגיל: טבלאות, פאנלים וכלים.', utility: 'bg-app-surface' },
  '--app-surface-raised': { description: 'משטח מורם, hover או אזור מודגש קל.', utility: 'bg-app-surface-raised' },
  '--app-surface-inset': { description: 'אזור פנימי שקוע או canvas בתוך panel.', utility: 'bg-app-surface-inset' },
  '--app-interactive': { description: 'רקע בסיס לפעולות משניות.', utility: 'bg-app-interactive' },
  '--app-interactive-hover': { description: 'מצב hover לפעולות משניות.', utility: 'bg-app-interactive-hover' },
  '--app-border': { description: 'קו מפריד רגיל ורוב הגבולות.', utility: 'border-app-border' },
  '--app-border-strong': { description: 'גבול חזק יותר, focus או הפרדה משמעותית.', utility: 'border-app-border-strong' },
  '--app-text': { description: 'טקסט ראשי בגוף הממשק.', utility: 'text-app-text' },
  '--app-text-secondary': { description: 'מטא דאטה, כתובות, labels משניים ואייקונים שקטים.', utility: 'text-app-text-secondary' },
  '--app-text-muted': { description: 'placeholder, disabled, hint חלש.', utility: 'text-app-text-muted' },
  '--app-nav-bg': { description: 'רקע תפריט צד וטופ בר.', utility: 'bg-app-nav-bg' },
  '--app-nav-border': { description: 'גבולות ניווט ודיווידרים צפופים.', utility: 'border-app-nav-border' },
  '--app-nav-active-bg': { description: 'רקע פריט ניווט פעיל.', utility: 'bg-app-nav-active-bg' },
  '--app-nav-active-text': { description: 'טקסט פריט ניווט פעיל.', utility: 'text-app-nav-active-text' },
  '--app-nav-indicator': { description: 'סימון פעיל קטן או outline פעיל.', utility: 'bg-app-nav-indicator' },
  '--app-nav-hover-bg': { description: 'רקע hover בתפריט וב-toolbar.', utility: 'bg-app-nav-hover-bg' },
  '--app-nav-badge-bg': { description: 'רקע תג קטן בתוך ניווט.', utility: 'bg-app-nav-badge-bg' },
  '--app-nav-badge-text': { description: 'טקסט תג קטן בתוך ניווט.', utility: 'text-app-nav-badge-text' },
  '--app-brand': { description: 'צבע מותג/אינדיקציה כללית.', utility: 'text-app-brand' },
  '--app-brand-solid': { description: 'רקע פעולה ראשית.', utility: 'bg-app-brand-solid' },
  '--app-brand-hover': { description: 'hover לפעולה ראשית.', utility: 'bg-app-brand-hover' },
  '--app-brand-subtle': { description: 'רקע עדין למותג.', utility: 'bg-app-brand-subtle' },
  '--app-brand-text': { description: 'טקסט על רקע brand subtle.', utility: 'text-app-brand-text' },
  '--app-success-subtle': { description: 'רקע הצלחה עדין.', utility: 'bg-app-success-subtle' },
  '--app-success-text': { description: 'טקסט ואייקון הצלחה.', utility: 'text-app-success-text' },
  '--app-warning-subtle': { description: 'רקע אזהרה עדין.', utility: 'bg-app-warning-subtle' },
  '--app-warning-text': { description: 'טקסט ואייקון אזהרה.', utility: 'text-app-warning-text' },
  '--app-error-subtle': { description: 'רקע שגיאה עדין.', utility: 'bg-app-error-subtle' },
  '--app-error-text': { description: 'טקסט ואייקון שגיאה.', utility: 'text-app-error-text' },
  '--app-info-subtle': { description: 'רקע מידע עדין.', utility: 'bg-app-info-subtle' },
  '--app-info-text': { description: 'טקסט ואייקון מידע.', utility: 'text-app-info-text' },
  '--app-radius-xs': { description: 'רדיוס לפקדים צפופים, chips ו-inputים קטנים.' },
  '--app-radius-sm': { description: 'רדיוס ברירת מחדל לכפתורים, cards וכלי עבודה.' },
  '--app-radius-md': { description: 'רדיוס למסגרות מעט גדולות יותר.' },
  '--app-shadow-panel': { description: 'צל לפאנלים צפים או drawers.' },
};

const compatibilityTokens = new Set([
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--input-background',
  '--ring',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
]);

const productSpecs = [
  { name: 'Toolbar control', value: '40px', role: 'גובה כפתור/שדה ב-toolbar' },
  { name: 'Entity row', value: '58px min', role: 'גובה מינימלי לשורת רשימה' },
  { name: 'Sidebar expanded', value: '256px', role: 'רוחב תפריט פתוח' },
  { name: 'Sidebar collapsed', value: '60px', role: 'רוחב תפריט מצומצם' },
  { name: 'Icon small', value: '14px', role: 'אייקון מטא דאטה בתוך שורה' },
  { name: 'Icon toolbar', value: '16px', role: 'אייקון בתוך button או toolbar' },
  { name: 'Stage ring', value: '32px', role: 'טבעת התקדמות משלוח' },
  { name: 'List gutter', value: '12px', role: 'padding צדדי לרשימות צפופות' },
];

const typographyRows = [
  { name: 'Font family', token: 'body', value: 'Arimo, system-ui, sans-serif', sample: 'ניהול משלוחים בזמן אמת' },
  { name: 'Body dense', token: 'text-sm / 14px', value: '400 / line-height 1.5', sample: 'אל גאוצ׳ו / ז׳בוטינסקי 7, רמת גן' },
  { name: 'Meta', token: 'text-sm + secondary', value: '400 / --app-text-secondary', sample: 'ז׳בוטינסקי 38, רמת גן' },
  { name: 'Caption', token: 'text-xs / 12px', value: '400-500', sample: 'עודכן לפני 2 דקות' },
  { name: 'Control', token: 'button', value: '500 / 14px', sample: 'סטטוס 5/6' },
  { name: 'Metric', token: 'tabular nums', value: '600 / 24-32px', sample: '492' },
];

const tokenPrinciples = [
  'משתמשים קודם בטוקן סמנטי לפי משמעות, לא לפי צבע שנראה קרוב.',
  'Light/Dark מחליפים ערכים, לא שמות. אותו token צריך לעבוד בשני המצבים.',
  'Primitive palette מיועד לבניית semantic tokens; קומפוננטות מוצר משתמשות בעיקר ב-app tokens.',
  'רשימות תפעוליות נשארות צפופות, רגילות במשקל טקסט, ועם היררכיה דרך מיקום/צבע ולא דרך bold מוגזם.',
];

const extractBlock = (start: string, end: string) => {
  const startIndex = themeCss.indexOf(start);
  if (startIndex === -1) return '';
  const bodyStart = themeCss.indexOf('{', startIndex);
  const endIndex = themeCss.indexOf(end, bodyStart);
  if (bodyStart === -1 || endIndex === -1) return '';
  return themeCss.slice(bodyStart + 1, endIndex);
};

const parseDeclarations = (block: string): TokenDeclaration[] => {
  const declarationRegex = /(--[A-Za-z0-9-_]+)\s*:\s*([^;]+);/g;
  const declarations: TokenDeclaration[] = [];
  let match: RegExpExecArray | null;

  while ((match = declarationRegex.exec(block))) {
    declarations.push({ name: match[1], value: match[2].trim() });
  }

  return declarations;
};

const toTokenMap = (declarations: TokenDeclaration[]) => {
  const map = new Map<string, string>();
  declarations.forEach((declaration) => {
    map.set(declaration.name, declaration.value);
  });
  return map;
};

const rootDeclarations = parseDeclarations(extractBlock(':root', '\n}\n\n.dark'));
const darkDeclarations = parseDeclarations(extractBlock('.dark', '\n}\n\n@theme inline'));
const themeDeclarations = parseDeclarations(extractBlock('@theme inline', '\n}\n\n@layer base'));
const lightMap = toTokenMap(rootDeclarations);
const darkMap = new Map([...lightMap, ...toTokenMap(darkDeclarations)]);
const themeMap = toTokenMap(themeDeclarations);

const resolveValue = (value: string, modeMap: Map<string, string>, depth = 0): string => {
  if (!value || depth > 8) return value;
  return value.replace(/var\((--[A-Za-z0-9-_]+)(?:,[^)]+)?\)/g, (_, tokenName: string) => {
    const nextValue = modeMap.get(tokenName);
    return nextValue ? resolveValue(nextValue, modeMap, depth + 1) : `var(${tokenName})`;
  });
};

const isPaintValue = (value: string) =>
  /^(#|rgb|hsl|oklch|color-mix|white|black|transparent)/i.test(value);

const getCategory = (name: string): TokenCategory => {
  if (name.startsWith('--color-')) return 'tailwind';
  if (name.startsWith('--app-')) {
    if (name.includes('radius') || name.includes('shadow')) return 'layout';
    return 'semantic';
  }
  if (name.includes('font') || name.startsWith('--text-')) return 'typography';
  if (name.startsWith('--geist-space') || name.includes('radius') || name.includes('shadow')) return 'layout';
  if (name.includes('alpha')) return 'alpha';
  if (name.endsWith('-value')) return 'raw';
  if (name.startsWith('--ds-') || name.startsWith('--accents-') || name.startsWith('--geist-')) return 'palette';
  if (compatibilityTokens.has(name) || name.startsWith('--chart-') || name.startsWith('--sidebar')) return 'compat';
  return 'compat';
};

const getDescription = (name: string, category: TokenCategory) => {
  if (semanticDescriptions[name]) return semanticDescriptions[name].description;
  if (category === 'palette') return 'Primitive color token. טוב לבדיקת סקאלה או לבניית semantic token.';
  if (category === 'raw') return 'ערך HSL מספרי. זה מקור האחוזים של palette token.';
  if (category === 'alpha') return 'שקיפות לפי theme. ב-light היא מבוססת שחור, ב-dark מבוססת לבן.';
  if (category === 'tailwind') return 'Alias של Tailwind utility שמצביע לטוקן semantic או primitive.';
  if (category === 'typography') return 'טוקן טיפוגרפי או משקל פונט.';
  if (category === 'layout') return 'מידת layout, ריווח, רדיוס או צל.';
  return 'Compatibility token שמחבר רכיבים חיצוניים לשפת Sendi.';
};

const allTokenRecords: TokenRecord[] = Array.from(
  new Set([
    ...rootDeclarations.map((item) => item.name),
    ...darkDeclarations.map((item) => item.name),
    ...themeDeclarations.map((item) => item.name),
  ]),
)
  .sort((a, b) => a.localeCompare(b))
  .map((name) => {
    const category = getCategory(name);
    const lightValue = lightMap.get(name) ?? themeMap.get(name) ?? '';
    const darkValue = darkMap.get(name) ?? themeMap.get(name) ?? lightValue;
    const lightResolved = resolveValue(lightValue, new Map([...lightMap, ...themeMap]));
    const darkResolved = resolveValue(darkValue, new Map([...darkMap, ...themeMap]));

    return {
      category,
      darkResolved,
      darkValue,
      description: getDescription(name, category),
      lightResolved,
      lightValue,
      name,
      utility: semanticDescriptions[name]?.utility ?? name.replace(/^--color-/, ''),
    };
  });

const appSemanticRecords = allTokenRecords.filter((record) => record.name.startsWith('--app-'));
const tailwindAliasRecords = allTokenRecords.filter((record) => record.name.startsWith('--color-app-'));
const primitivePaletteRecords = allTokenRecords.filter(
  (record) =>
    record.category === 'palette' &&
    (colorFamilies.some((family) => record.name.startsWith(`--ds-${family}-`)) ||
      record.name.startsWith('--ds-background')),
);
const rawValueRecords = allTokenRecords.filter((record) => record.category === 'raw');
const alphaRecords = allTokenRecords.filter((record) => record.category === 'alpha');
const layoutRecords = allTokenRecords.filter((record) => record.category === 'layout');
const typographyRecords = allTokenRecords.filter((record) => record.category === 'typography');
const compatibilityRecords = allTokenRecords.filter((record) => record.category === 'compat');

const displayValue = (raw: string, resolved: string) => {
  if (!raw) return '-';
  if (raw === resolved) return raw;
  return `${raw} → ${resolved}`;
};

const TokenSwatch: React.FC<{ value: string; label: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="text-[11px] text-app-text-muted">{label}</span>
    </div>
    <div className="flex h-9 overflow-hidden rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-background">
      {isPaintValue(value) ? (
        <div className="w-full" style={{ background: value }} />
      ) : (
        <div className="flex w-full items-center justify-center px-2 text-[11px] text-app-text-muted">value</div>
      )}
    </div>
  </div>
);

const ModeValue: React.FC<{
  label: string;
  raw: string;
  resolved: string;
}> = ({ label, raw, resolved }) => (
  <div className="min-w-0 rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-background p-2">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-app-text-secondary">{label}</span>
      <span className="h-3 w-3 shrink-0 rounded-full border border-app-nav-border" style={{ background: resolved }} />
    </div>
    <code className="block truncate text-[11px] leading-5 text-app-text">{displayValue(raw, resolved)}</code>
  </div>
);

const Section: React.FC<{
  children: React.ReactNode;
  description?: string;
  id: string;
  title: string;
}> = ({ children, description, id, title }) => (
  <section id={id} className="scroll-mt-4 border-b border-app-nav-border px-4 py-6 md:px-8">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-app-text">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-app-text-secondary">{description}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

const TokenTable: React.FC<{
  mode: ModeFilter;
  records: TokenRecord[];
  showDescription?: boolean;
}> = ({ mode, records, showDescription = true }) => (
  <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
    <div
      className={[
        'grid gap-3 border-b border-app-nav-border bg-app-surface-raised px-3 py-2 text-xs font-medium text-app-text-secondary',
        mode === 'all'
          ? 'grid-cols-[minmax(180px,1.05fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(220px,1.35fr)]'
          : 'grid-cols-[minmax(180px,1.05fr)_minmax(220px,1.2fr)_minmax(220px,1.35fr)]',
      ].join(' ')}
    >
      <span>שם</span>
      {mode !== 'dark' ? <span>Light</span> : null}
      {mode !== 'light' ? <span>Dark</span> : null}
      <span>שימוש</span>
    </div>
    {records.map((record) => (
      <div
        key={record.name}
        className={[
          'grid min-h-[66px] gap-3 border-b border-app-nav-border px-3 py-3 last:border-b-0',
          mode === 'all'
            ? 'grid-cols-[minmax(180px,1.05fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(220px,1.35fr)]'
            : 'grid-cols-[minmax(180px,1.05fr)_minmax(220px,1.2fr)_minmax(220px,1.35fr)]',
        ].join(' ')}
      >
        <div className="min-w-0">
          <code className="block truncate text-xs text-app-text">{record.name}</code>
          {record.utility ? <div className="mt-1 truncate text-[11px] text-app-text-muted">{record.utility}</div> : null}
        </div>
        {mode !== 'dark' ? (
          <ModeValue label="Light" raw={record.lightValue} resolved={record.lightResolved} />
        ) : null}
        {mode !== 'light' ? (
          <ModeValue label="Dark" raw={record.darkValue} resolved={record.darkResolved} />
        ) : null}
        <p className="text-sm leading-6 text-app-text-secondary">{showDescription ? record.description : categoryMeta[record.category].description}</p>
      </div>
    ))}
  </div>
);

const PaletteFamily: React.FC<{
  family: string;
  mode: ModeFilter;
}> = ({ family, mode }) => {
  const records = colorSteps
    .map((step) => primitivePaletteRecords.find((record) => record.name === `--ds-${family}-${step}`))
    .filter(Boolean) as TokenRecord[];

  return (
    <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
      <div className="border-b border-app-nav-border px-3 py-2">
        <h3 className="text-sm font-semibold capitalize text-app-text">{family}</h3>
      </div>
      <div className="grid grid-cols-2 gap-px bg-app-nav-border md:grid-cols-5">
        {records.map((record) => (
          <div key={record.name} className="min-w-0 bg-app-surface p-2">
            <div className="mb-2 text-[11px] font-medium text-app-text-secondary">{record.name.replace('--ds-', '')}</div>
            <div className={mode === 'all' ? 'grid grid-cols-2 gap-1' : 'grid gap-1'}>
              {mode !== 'dark' ? <TokenSwatch label="L" value={record.lightResolved} /> : null}
              {mode !== 'light' ? <TokenSwatch label="D" value={record.darkResolved} /> : null}
            </div>
            <code className="mt-2 block truncate text-[10px] text-app-text-muted">
              {mode === 'dark' ? record.darkResolved : record.lightResolved}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
};

const FilterButton: React.FC<{
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}> = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'h-8 rounded-[var(--app-radius-xs)] border px-3 text-xs font-medium transition-colors',
      active
        ? 'border-app-text bg-app-text text-app-background'
        : 'border-app-nav-border bg-app-surface text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text',
    ].join(' ')}
  >
    {children}
  </button>
);

export const DesignSystemPage: React.FC = () => {
  const [category, setCategory] = useState<TokenCategory | 'all'>('semantic');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [query, setQuery] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allTokenRecords.filter((record) => {
      const categoryMatch = category === 'all' || record.category === category;
      if (!categoryMatch) return false;
      if (!search) return true;
      return [record.name, record.utility, record.description, record.lightValue, record.darkValue]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [category, query]);

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1400);
  };

  return (
    <div className="h-full overflow-auto bg-app-background text-app-text" dir="rtl">
      <div className="border-b border-app-nav-border px-4 py-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-app-text-secondary">
              <Palette className="h-4 w-4" />
              <span>Sendi Design System</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-app-text">מערכת עיצוב</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-app-text-secondary">
              מקור אמת אחד לטוקנים, צבעים, מספרים, אחוזים, מצבי light/dark, טיפוגרפיה ומידות מוצר.
            </p>
          </div>
          <Link
            to="/design-system/playground"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-surface px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
          >
            <span>Playground</span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="sticky top-0 z-20 border-b border-app-nav-border bg-app-background/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-secondary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חפש token, value, utility..."
              className="h-10 w-full rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-surface pr-9 pl-3 text-sm text-app-text outline-none placeholder:text-app-text-muted focus:border-app-border-strong"
            />
          </div>

          <div className="flex items-center gap-1">
            <FilterButton active={mode === 'all'} onClick={() => setMode('all')}>
              הכל
            </FilterButton>
            <FilterButton active={mode === 'light'} onClick={() => setMode('light')}>
              <span className="inline-flex items-center gap-1">
                <Sun className="h-3.5 w-3.5" />
                Light
              </span>
            </FilterButton>
            <FilterButton active={mode === 'dark'} onClick={() => setMode('dark')}>
              <span className="inline-flex items-center gap-1">
                <Moon className="h-3.5 w-3.5" />
                Dark
              </span>
            </FilterButton>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <FilterButton active={category === 'all'} onClick={() => setCategory('all')}>
            כל הטוקנים
          </FilterButton>
          {(Object.keys(categoryMeta) as TokenCategory[]).map((item) => (
            <FilterButton key={item} active={category === item} onClick={() => setCategory(item)}>
              {categoryMeta[item].label}
            </FilterButton>
          ))}
        </div>
      </div>

      <Section
        id="overview"
        title="מפת מערכת"
        description="המטרה היא לראות מהר מה קיים, מה השם שלו, לאיזה utility הוא מחובר, ומה הערך שלו בכל theme."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Palette, label: 'Primitive colors', value: primitivePaletteRecords.length, text: 'צבעים וערכי HSL' },
            { icon: Workflow, label: 'Semantic app tokens', value: appSemanticRecords.length, text: 'שמות לשימוש בקוד' },
            { icon: SlidersHorizontal, label: 'Tailwind aliases', value: tailwindAliasRecords.length, text: 'utility mapping' },
            { icon: Ruler, label: 'Numbers', value: rawValueRecords.length + layoutRecords.length, text: 'אחוזים, רדיוסים ומידות' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4">
                <Icon className="mb-4 h-5 w-5 text-app-text-secondary" />
                <div className="text-2xl font-semibold tabular-nums text-app-text">{item.value}</div>
                <div className="mt-1 text-sm font-medium text-app-text">{item.label}</div>
                <div className="mt-1 text-xs text-app-text-secondary">{item.text}</div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="semantic"
        title="Semantic Tokens"
        description="השכבה שצריכה להופיע בקומפוננטות. הערכים משתנים בין light ל-dark, אבל שם הטוקן נשאר זהה."
      >
        <TokenTable mode={mode} records={appSemanticRecords} />
      </Section>

      <Section
        id="palette"
        title="Primitive Palette"
        description="הסקאלה המלאה של הצבעים שלנו. כל קובייה מציגה light/dark ואת ה-HSL resolved שלה."
      >
        <div className="grid gap-4">
          {colorFamilies.map((family) => (
            <PaletteFamily key={family} family={family} mode={mode} />
          ))}
        </div>
      </Section>

      <Section
        id="numbers"
        title="מספרים, אחוזים ושקיפויות"
        description="כאן נמצאים ערכי ה-HSL הגולמיים, אחוזי ה-lightness/saturation, וטוקני alpha לשחור/לבן."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <TokenTable mode={mode} records={rawValueRecords} showDescription={false} />
          <TokenTable mode={mode} records={alphaRecords} showDescription={false} />
        </div>
      </Section>

      <Section
        id="layout"
        title="Spacing, Radius, Sizes"
        description="מידות שמופיעות במוצר בפועל. ה-base primitive הוא 4px, וה-layout התפעולי נשען בעיקר על קצב 8px."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
            {productSpecs.map((item) => (
              <div key={item.name} className="grid grid-cols-[150px_110px_1fr] gap-3 border-b border-app-nav-border px-3 py-3 text-sm last:border-b-0">
                <span className="font-medium text-app-text">{item.name}</span>
                <code className="text-xs text-app-text-secondary">{item.value}</code>
                <span className="text-app-text-secondary">{item.role}</span>
              </div>
            ))}
          </div>
          <TokenTable mode={mode} records={layoutRecords} />
        </div>
      </Section>

      <Section
        id="typography"
        title="Typography"
        description="הפונט והמשקלים שנבחרו לממשק צפוף בעברית. שמות ישויות ברשימות נשארים regular אלא אם יש סיבה תפעולית להדגשה."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {typographyRows.map((row) => (
            <div key={row.name} className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-app-text">{row.name}</div>
                  <code className="mt-1 block text-xs text-app-text-secondary">{row.token}</code>
                </div>
                <span className="text-xs text-app-text-muted">{row.value}</span>
              </div>
              <div className="text-sm leading-6 text-app-text">{row.sample}</div>
            </div>
          ))}
        </div>
        {typographyRecords.length > 0 ? <div className="mt-4"><TokenTable mode={mode} records={typographyRecords} /></div> : null}
      </Section>

      <Section
        id="alias"
        title="Tailwind Mapping"
        description="השמות שנפתחים ל-utility classes. זה מאפשר לכתוב bg-app-surface במקום לזכור CSS variable."
      >
        <TokenTable mode={mode} records={tailwindAliasRecords} />
      </Section>

      <Section
        id="reference"
        title="Token Reference"
        description={`${filteredRecords.length} מתוך ${allTokenRecords.length} טוקנים לפי החיפוש והקטגוריה הנוכחיים.`}
      >
        <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
          {filteredRecords.map((record) => (
            <div key={record.name} className="grid gap-3 border-b border-app-nav-border px-3 py-3 last:border-b-0 lg:grid-cols-[220px_130px_1fr_40px]">
              <div className="min-w-0">
                <code className="block truncate text-xs text-app-text">{record.name}</code>
                <span className="mt-1 inline-flex rounded-[var(--app-radius-xs)] border border-app-nav-border px-1.5 py-0.5 text-[10px] text-app-text-secondary">
                  {categoryMeta[record.category].label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <TokenSwatch label="L" value={record.lightResolved} />
                <TokenSwatch label="D" value={record.darkResolved} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs text-app-text-secondary">{record.description}</div>
                <code className="mt-1 block truncate text-[11px] text-app-text-muted">
                  {mode === 'dark'
                    ? displayValue(record.darkValue, record.darkResolved)
                    : displayValue(record.lightValue, record.lightResolved)}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyToken(record.name)}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--app-radius-xs)] border border-app-nav-border text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
                aria-label={`העתק ${record.name}`}
              >
                {copiedToken === record.name ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="rules"
        title="כללי שימוש"
        description="הכללים האלה שומרים שהמערכת לא תהפוך שוב לרשימת צבעים בלי הקשר."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {tokenPrinciples.map((rule, index) => (
            <div key={rule} className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4">
              <div className="mb-3 flex h-6 w-6 items-center justify-center rounded-full border border-app-nav-border text-xs tabular-nums text-app-text-secondary">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-app-text">{rule}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="compat"
        title="Compatibility Tokens"
        description="שומרים את זה מתועד כדי לדעת מה מגיע מה-design system ומה נועד לספריות/שכבות תאימות."
      >
        <TokenTable mode={mode} records={compatibilityRecords} />
      </Section>
    </div>
  );
};
