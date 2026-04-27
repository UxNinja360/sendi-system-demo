import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock3,
  Filter,
  Package,
  Search,
  SlidersHorizontal,
  Store,
  User,
  X,
} from 'lucide-react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type Density = 'compact' | 'comfortable' | 'spacious';
type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const densityConfig: Record<Density, { label: string; row: string; gap: string; pad: string }> = {
  compact: { label: 'צפוף', row: 'min-h-[46px]', gap: 'gap-1', pad: 'px-2 py-1.5' },
  comfortable: { label: 'רגיל', row: 'min-h-[58px]', gap: 'gap-2', pad: 'px-3 py-2' },
  spacious: { label: 'מרווח', row: 'min-h-[72px]', gap: 'gap-3', pad: 'px-4 py-3' },
};

const toneConfig: Record<Tone, { label: string; chip: string; accent: string; soft: string }> = {
  neutral: {
    label: 'רגיל',
    chip: 'border-app-nav-border text-app-text bg-app-surface',
    accent: 'bg-app-text-secondary',
    soft: 'bg-app-surface-raised',
  },
  success: {
    label: 'הצלחה',
    chip: 'border-green-500/35 bg-green-500/10 text-green-400',
    accent: 'bg-green-500',
    soft: 'bg-app-success-subtle',
  },
  warning: {
    label: 'אזהרה',
    chip: 'border-yellow-500/35 bg-yellow-500/10 text-yellow-400',
    accent: 'bg-yellow-500',
    soft: 'bg-app-warning-subtle',
  },
  danger: {
    label: 'סיכון',
    chip: 'border-red-500/35 bg-red-500/10 text-red-400',
    accent: 'bg-red-500',
    soft: 'bg-app-error-subtle',
  },
};

const SegmentedControl = <T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) => (
  <div>
    <div className="mb-2 text-xs font-semibold text-app-text-secondary">{label}</div>
    <div className="flex rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-8 min-w-0 flex-1 rounded-[var(--app-radius-xs)] px-2 text-xs font-semibold transition-colors ${
            value === option.value
              ? 'bg-app-surface-raised text-app-text shadow-[inset_0_0_0_1px_var(--app-border)]'
              : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const PlaygroundPanel: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
    <div className="border-b border-app-nav-border px-4 py-3">
      <h2 className="text-sm font-semibold text-app-text">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </section>
);

export const DesignSystemPlaygroundPage: React.FC = () => {
  const [density, setDensity] = useState<Density>('comfortable');
  const [tone, setTone] = useState<Tone>('warning');
  const [showMeta, setShowMeta] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const [title, setTitle] = useState('דומינוס קרליבך');

  const densityStyle = densityConfig[density];
  const toneStyle = toneConfig[tone];

  const componentClassName = useMemo(
    () =>
      [
        'grid grid-cols-[44px_minmax(160px,1.2fr)_minmax(140px,1fr)_minmax(130px,0.9fr)_auto] items-center border-b border-app-nav-border bg-app-surface text-sm text-app-text last:border-b-0',
        densityStyle.row,
      ].join(' '),
    [densityStyle.row],
  );

  return (
    <div className="h-full overflow-auto bg-app-background text-app-text" dir="rtl">
      <div className="border-b border-app-nav-border px-4 py-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-app-text-secondary">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Component Playground</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-app-text">
              פלייגראונד
            </h1>
          </div>
          <Link
            to="/design-system"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-surface px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-raised"
          >
            <ArrowRight className="h-4 w-4" />
            <span>Design System</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-5 md:px-8 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <PlaygroundPanel title="בקרות ניסוי">
            <div className="space-y-4">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="שם מסעדה" />
              <SegmentedControl
                label="צפיפות"
                value={density}
                onChange={setDensity}
                options={[
                  { value: 'compact', label: densityConfig.compact.label },
                  { value: 'comfortable', label: densityConfig.comfortable.label },
                  { value: 'spacious', label: densityConfig.spacious.label },
                ]}
              />
              <SegmentedControl
                label="טון"
                value={tone}
                onChange={setTone}
                options={[
                  { value: 'neutral', label: toneConfig.neutral.label },
                  { value: 'success', label: toneConfig.success.label },
                  { value: 'warning', label: toneConfig.warning.label },
                  { value: 'danger', label: toneConfig.danger.label },
                ]}
              />

              <label className="flex items-center justify-between gap-3 rounded-[var(--app-radius-md)] border border-app-nav-border px-3 py-2">
                <span className="text-sm text-app-text">מטא דאטה</span>
                <input
                  type="checkbox"
                  checked={showMeta}
                  onChange={(event) => setShowMeta(event.target.checked)}
                  className="h-4 w-4 accent-[#ededed]"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-[var(--app-radius-md)] border border-app-nav-border px-3 py-2">
                <span className="text-sm text-app-text">פעולות שורה</span>
                <input
                  type="checkbox"
                  checked={showActions}
                  onChange={(event) => setShowActions(event.target.checked)}
                  className="h-4 w-4 accent-[#ededed]"
                />
              </label>
            </div>
          </PlaygroundPanel>

          <PlaygroundPanel title="Spec Snapshot">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Row density</span>
                <span className="font-semibold">{densityStyle.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Tone</span>
                <span className="font-semibold">{toneStyle.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Radius</span>
                <span className="font-semibold">8px</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Direction</span>
                <span className="font-semibold">RTL</span>
              </div>
            </div>
          </PlaygroundPanel>
        </aside>

        <main className="space-y-4">
          <PlaygroundPanel title="Delivery Row Concept">
            <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
              {[0, 1, 2].map((index) => (
                <div key={index} className={componentClassName}>
                  <div className={`flex h-full items-center justify-center ${densityStyle.pad}`}>
                    <span className={`h-2 w-2 rounded-full ${toneStyle.accent}`} />
                  </div>
                  <div className={`min-w-0 ${densityStyle.pad}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <Store className="h-4 w-4 shrink-0 text-app-text-secondary" />
                      <span className="truncate font-semibold">{index === 0 ? title : ['פיצה שמש', 'אל גאוצ׳ו'][index - 1]}</span>
                    </div>
                    {showMeta ? (
                      <div className="mt-1 truncate text-xs text-app-text-secondary">
                        נחלת בנימין {21 + index * 7}, תל אביב
                      </div>
                    ) : null}
                  </div>
                  <div className={`min-w-0 ${densityStyle.pad}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <User className="h-4 w-4 shrink-0 text-app-text-secondary" />
                      <span className="truncate font-semibold">{['אברהם אוחיון', 'נועה שלום', 'דוד כהן'][index]}</span>
                    </div>
                    {showMeta ? (
                      <div className="mt-1 flex items-center gap-1 text-xs text-app-text-secondary">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>{index === 0 ? '18:10' : `18:0${index}`}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className={`min-w-0 ${densityStyle.pad}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <Bike className="h-4 w-4 shrink-0 text-app-text-secondary" />
                      <span className="truncate font-semibold">{['יוני שליח', 'רועי משלוחים', 'נתן שליח'][index]}</span>
                    </div>
                    {showMeta ? (
                      <div className="mt-1 truncate text-xs text-app-text-secondary">אופנוע</div>
                    ) : null}
                  </div>
                  <div className={`flex items-center justify-end ${densityStyle.gap} ${densityStyle.pad}`}>
                    <span className={`rounded-[var(--app-radius-xs)] border px-2 py-0.5 text-xs font-semibold ${toneStyle.chip}`}>
                      {toneStyle.label}
                    </span>
                    {showActions ? (
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-xs)] text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text"
                        aria-label="פעולות"
                      >
                        <Package className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </PlaygroundPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            <PlaygroundPanel title="Command Search Concept">
              <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-background p-3">
                <div className="flex h-10 items-center gap-2 rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-surface px-3">
                  <Search className="h-4 w-4 text-app-text-secondary" />
                  <span className="rounded-[var(--app-radius-xs)] border border-app-nav-border px-2 py-0.5 text-xs font-semibold">
                    מסעדות: {title || 'טרטוריה'}
                  </span>
                  <span className="rounded-[var(--app-radius-xs)] border border-app-nav-border px-2 py-0.5 text-xs font-semibold">
                    שליחים: יוני
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-app-text-muted">הוסף עוד פילטר...</span>
                  <X className="h-4 w-4 text-app-text-secondary" />
                </div>
                <div className="mt-3 rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-2">
                  <div className="mb-2 text-xs font-semibold text-app-text-secondary">פילטרים</div>
                  <div className="space-y-1">
                    {['מסעדות:', 'שליחים:', 'סטטוס:'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-[var(--app-radius-xs)] px-2 py-2 text-right text-sm text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text"
                      >
                        <Filter className="h-4 w-4" />
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PlaygroundPanel>

            <PlaygroundPanel title="Action Footer Concept">
              <div className={`rounded-[var(--app-radius-md)] border border-app-nav-border ${toneStyle.soft} p-4`}>
                <div className="mb-4 flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-app-text" />
                  <div>
                    <div className="text-sm font-semibold text-app-text">קומפוננטה מוכנה לבדיקה</div>
                    <p className="mt-1 text-sm leading-6 text-app-text-secondary">
                      הווריאציה הזאת יכולה להפוך לקומפוננטה אחרי שמחליטים על naming, props ומצבי קצה.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">שמור ל־DS</Button>
                  <Button variant="secondary">צור וריאציה</Button>
                  <Button variant="ghost">נקה</Button>
                </div>
              </div>
            </PlaygroundPanel>
          </div>
        </main>
      </div>
    </div>
  );
};
