import React from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  Check,
  Clock3,
  Download,
  Eye,
  Filter,
  Package,
  Palette,
  Search,
  Settings,
  Store,
} from 'lucide-react';

import { Button, IconButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { InfoBar } from '../components/common/info-bar';
import { ToolbarIconButton } from '../components/common/toolbar-icon-button';

type TokenSwatch = {
  name: string;
  variable: string;
  role: string;
};

const colorTokens: TokenSwatch[] = [
  { name: 'Background', variable: '--app-background', role: 'רקע מסכים' },
  { name: 'Surface', variable: '--app-surface', role: 'פאנלים וכלים' },
  { name: 'Raised', variable: '--app-surface-raised', role: 'hover / active' },
  { name: 'Border', variable: '--app-border', role: 'גבולות עדינים' },
  { name: 'Text', variable: '--app-text', role: 'טקסט ראשי' },
  { name: 'Secondary', variable: '--app-text-secondary', role: 'טקסט משני' },
  { name: 'Muted', variable: '--app-text-muted', role: 'רמזים ומצב כבוי' },
  { name: 'Brand', variable: '--app-brand-solid', role: 'פעולה ראשית' },
  { name: 'Success', variable: '--app-success-text', role: 'הצלחה' },
  { name: 'Warning', variable: '--app-warning-text', role: 'אזהרה' },
  { name: 'Error', variable: '--app-error-text', role: 'שגיאה' },
  { name: 'Info', variable: '--app-info-text', role: 'מידע' },
];

const typeScale = [
  { label: 'Page title', className: 'text-2xl font-semibold', sample: 'ניהול משלוחים' },
  { label: 'Section title', className: 'text-lg font-semibold', sample: 'רשימת שליחים פעילים' },
  { label: 'Body', className: 'text-sm', sample: 'טקסט עבודה רגיל, מתאים לטבלאות ולפאנלים צפופים.' },
  { label: 'Caption', className: 'text-xs text-app-text-secondary', sample: 'עודכן לפני 2 דקות' },
  { label: 'Metric', className: 'text-3xl font-semibold tabular-nums', sample: '48' },
];

const statusItems = [
  { label: 'שובץ', className: 'border-yellow-500/35 bg-yellow-500/10 text-yellow-400' },
  { label: 'נאסף', className: 'border-green-500/35 bg-green-500/10 text-green-400' },
  { label: 'נמסר', className: 'border-blue-500/35 bg-blue-500/10 text-blue-400' },
  { label: 'בוטל', className: 'border-red-500/35 bg-red-500/10 text-red-400' },
  { label: 'פג תוקף', className: 'border-zinc-500/35 bg-zinc-500/10 text-zinc-300' },
];

const DSSection: React.FC<{
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}> = ({ eyebrow, title, children }) => (
  <section className="border-b border-app-nav-border px-4 py-6 md:px-8">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-xs font-semibold text-app-text-muted">{eyebrow}</div>
        <h2 className="mt-1 text-lg font-semibold text-app-text">{title}</h2>
      </div>
    </div>
    {children}
  </section>
);

const SpecRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-app-nav-border px-3 py-2 last:border-b-0">
    <span className="text-xs text-app-text-secondary">{label}</span>
    <span className="text-sm font-medium text-app-text">{value}</span>
  </div>
);

export const DesignSystemPage: React.FC = () => {
  return (
    <div className="h-full overflow-auto bg-app-background text-app-text" dir="rtl">
      <div className="border-b border-app-nav-border px-4 py-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-app-text-secondary">
              <Palette className="h-4 w-4" />
              <span>Sendi Design System</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-app-text">
              מערכת העיצוב
            </h1>
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

      <DSSection eyebrow="Foundation" title="צבעים וטוקנים">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {colorTokens.map((token) => (
            <div
              key={token.variable}
              className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface"
            >
              <div
                className="h-16 border-b border-app-nav-border"
                style={{ background: `var(${token.variable})` }}
              />
              <div className="space-y-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-app-text">{token.name}</span>
                  <code className="text-[11px] text-app-text-muted">{token.variable}</code>
                </div>
                <div className="text-xs text-app-text-secondary">{token.role}</div>
              </div>
            </div>
          ))}
        </div>
      </DSSection>

      <DSSection eyebrow="Typography" title="סולם טיפוגרפי">
        <div className="grid gap-3 lg:grid-cols-2">
          {typeScale.map((item) => (
            <div
              key={item.label}
              className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4"
            >
              <div className="mb-3 text-xs text-app-text-muted">{item.label}</div>
              <div className={item.className}>{item.sample}</div>
            </div>
          ))}
        </div>
      </DSSection>

      <DSSection eyebrow="Components" title="פעולות, שדות וסטטוסים">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
          <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4">
            <div className="mb-4 text-sm font-semibold text-app-text">Buttons</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={<Package className="h-4 w-4" />}>ראשי</Button>
              <Button variant="secondary">משני</Button>
              <Button variant="outline">מסגרת</Button>
              <Button variant="ghost">שקט</Button>
              <Button variant="danger">מסוכן</Button>
              <IconButton icon={<Settings className="h-4 w-4" />} aria-label="הגדרות" />
            </div>
          </div>

          <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4">
            <div className="mb-4 text-sm font-semibold text-app-text">Inputs</div>
            <div className="space-y-3">
              <Input icon={<Search className="h-4 w-4" />} placeholder="חפש משלוח..." />
              <Input value="מסעדות: טרטוריה" readOnly />
              <Input error="שדה חובה" placeholder="שם שליח" />
            </div>
          </div>

          <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4">
            <div className="mb-4 text-sm font-semibold text-app-text">Status</div>
            <div className="flex flex-wrap gap-2">
              {statusItems.map((status) => (
                <span
                  key={status.label}
                  className={`rounded-[var(--app-radius-xs)] border px-2 py-1 text-xs font-semibold ${status.className}`}
                >
                  {status.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </DSSection>

      <DSSection eyebrow="Patterns" title="תבניות מוצר">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
            <InfoBar
              leadLabel="משלוחים"
              leadValue="48"
              items={[
                { label: 'ממתינים', value: 12, tone: 'warning' },
                { label: 'נאספו', value: 18, tone: 'success' },
                { label: 'חריגים', value: 3, tone: 'danger' },
              ]}
            />
            <div className="grid grid-cols-[44px_1fr_1fr_1fr_92px] border-b border-app-nav-border bg-app-surface-raised px-3 py-2 text-xs font-semibold text-app-text-secondary">
              <span />
              <span>מסעדה</span>
              <span>לקוח</span>
              <span>שליח</span>
              <span>סטטוס</span>
            </div>
            {[
              ['דומינוס קרליבך', 'נועה שלום', 'יוני שליח', 'שובץ'],
              ['פיצה שמש', 'עדי שמעון', 'רועי משלוחים', 'נאסף'],
              ['אל גאוצ׳ו', 'משה לוי', 'נתן שליח', 'נמסר'],
            ].map((row, index) => (
              <div
                key={row.join('-')}
                className="grid grid-cols-[44px_1fr_1fr_1fr_92px] items-center border-b border-app-nav-border px-3 py-3 text-sm last:border-b-0"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded border border-app-border text-app-text-secondary">
                  {index === 1 ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="truncate font-semibold">{row[0]}</span>
                <span className="truncate text-app-text-secondary">{row[1]}</span>
                <span className="truncate text-app-text-secondary">{row[2]}</span>
                <span className="w-fit rounded-[var(--app-radius-xs)] border border-app-nav-border px-2 py-0.5 text-xs">
                  {row[3]}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-app-text">Toolbar Pattern</div>
                <div className="mt-1 text-xs text-app-text-secondary">חיפוש, פילטרים, יצוא ועמודות</div>
              </div>
              <div className="flex items-center gap-1">
                <ToolbarIconButton label="פילטר">
                  <Filter className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label="ייצוא">
                  <Download className="h-4 w-4" />
                </ToolbarIconButton>
              </div>
            </div>
            <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-background p-3">
              <div className="mb-3 flex min-w-0 items-center gap-2 rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-surface px-3 py-2">
                <Search className="h-4 w-4 text-app-text-secondary" />
                <span className="text-sm text-app-text-muted">חפש או הוסף פילטר...</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-[var(--app-radius-xs)] border border-app-nav-border px-2 py-1 text-xs">
                  מסעדות: טרטוריה
                </span>
                <span className="rounded-[var(--app-radius-xs)] border border-app-nav-border px-2 py-1 text-xs">
                  שליחים: יוני
                </span>
              </div>
            </div>
          </div>
        </div>
      </DSSection>

      <DSSection eyebrow="Guidelines" title="כללי ממשק חיים">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Store, title: 'RTL first', text: 'כל רשימה, toolbar ו־drawer נפתחים מימין ונשארים עגונים לימין.' },
            { icon: Eye, title: 'Dense by default', text: 'מסכים תפעוליים צריכים להיות סריקים, צפופים ושקטים.' },
            { icon: Clock3, title: 'State visible', text: 'סטטוס, זמן וחריגה צריכים להופיע בלי פתיחת פאנל.' },
            { icon: AlertTriangle, title: 'Risk explicit', text: 'פעולות מחיקה, ביטול ושיוך דורשות היררכיית אזהרה ברורה.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} padding="md">
                <Icon className="mb-3 h-5 w-5 text-app-text-secondary" />
                <div className="text-sm font-semibold text-app-text">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-app-text-secondary">{item.text}</p>
              </Card>
            );
          })}
        </div>
      </DSSection>

      <DSSection eyebrow="Specs" title="מידות בסיס">
        <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
          <SpecRow label="Radius XS" value="4px" />
          <SpecRow label="Radius SM" value="6px" />
          <SpecRow label="Radius MD" value="8px" />
          <SpecRow label="Toolbar height" value="40px controls / 48-56px shell" />
          <SpecRow label="Table row" value="58px min height" />
          <SpecRow label="Sidebar" value="256px expanded / 60px collapsed" />
        </div>
      </DSSection>
    </div>
  );
};
