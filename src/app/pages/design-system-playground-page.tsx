import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Bike,
  Clock3,
  Filter,
  MapPin,
  Package,
  Power,
  Search,
  SlidersHorizontal,
  Store,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type Density = 'compact' | 'comfortable' | 'spacious';
type DeliveryStage = 'pending' | 'assigned' | 'delivering' | 'delivered' | 'cancelled';

const densityConfig: Record<Density, { label: string; row: string; pad: string }> = {
  compact: { label: 'צפוף', row: 'min-h-[48px]', pad: 'px-2 py-1.5' },
  comfortable: { label: 'רגיל', row: 'min-h-[58px]', pad: 'px-3 py-2' },
  spacious: { label: 'מרווח', row: 'min-h-[72px]', pad: 'px-4 py-3' },
};

const stageConfig: Record<
  DeliveryStage,
  { activeSegments: number; color: string; label: string; chip: string }
> = {
  pending: {
    activeSegments: 1,
    color: '#f97316',
    label: 'ממתין',
    chip: 'border-orange-500/35 bg-orange-500/10 text-orange-400',
  },
  assigned: {
    activeSegments: 2,
    color: '#eab308',
    label: 'שובץ',
    chip: 'border-yellow-500/35 bg-yellow-500/10 text-yellow-400',
  },
  delivering: {
    activeSegments: 3,
    color: '#22c55e',
    label: 'נאסף',
    chip: 'border-green-500/35 bg-green-500/10 text-green-400',
  },
  delivered: {
    activeSegments: 4,
    color: '#0070f3',
    label: 'נמסר',
    chip: 'border-blue-500/35 bg-blue-500/10 text-blue-400',
  },
  cancelled: {
    activeSegments: 4,
    color: '#ef4444',
    label: 'בוטל',
    chip: 'border-red-500/35 bg-red-500/10 text-red-400',
  },
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const createArcPath = (startAngle: number, endAngle: number) => {
  const start = polarToCartesian(16, 16, 11, endAngle);
  const end = polarToCartesian(16, 16, 11, startAngle);

  return `M ${start.x} ${start.y} A 11 11 0 0 0 ${end.x} ${end.y}`;
};

const ringSegments = [
  createArcPath(12, 78),
  createArcPath(102, 168),
  createArcPath(192, 258),
  createArcPath(282, 348),
];

const ProgressRing: React.FC<{ stage: DeliveryStage; size?: 'sm' | 'md' }> = ({ stage, size = 'md' }) => {
  const config = stageConfig[stage];
  const className = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <span className={`relative flex ${className} shrink-0 items-center justify-center`}>
      <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
        {ringSegments.map((path, index) => (
          <path
            key={`track-${index}`}
            d={path}
            fill="none"
            stroke="#303030"
            strokeLinecap="round"
            strokeWidth="3"
          />
        ))}
        {ringSegments.slice(0, config.activeSegments).map((path, index) => (
          <path
            key={`active-${index}`}
            d={path}
            fill="none"
            stroke={config.color}
            strokeLinecap="round"
            strokeWidth="3"
          />
        ))}
      </svg>
    </span>
  );
};

const Panel: React.FC<{
  children: React.ReactNode;
  title: string;
}> = ({ children, title }) => (
  <section className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
    <div className="border-b border-app-nav-border px-4 py-3">
      <h2 className="text-sm font-semibold text-app-text">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const SegmentedControl = <T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) => (
  <div>
    <div className="mb-2 text-xs font-medium text-app-text-secondary">{label}</div>
    <div className="flex rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-background p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            'h-8 min-w-0 flex-1 rounded-[var(--app-radius-xs)] px-2 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-app-surface-raised text-app-text shadow-[inset_0_0_0_1px_var(--app-border)]'
              : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const ToolbarToggle: React.FC<{
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, children, label, onClick }) => (
  <div className="relative flex">
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={[
        'relative flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-xs)] border bg-app-surface text-app-text-secondary transition-colors focus:outline-none',
        active
          ? 'border-[#ededed] text-[#ededed]'
          : 'border-app-nav-border hover:bg-app-surface-raised hover:text-app-text',
      ].join(' ')}
    >
      <span className={active ? '-translate-y-0.5 transition-transform' : 'transition-transform'}>
        {children}
      </span>
      {active ? <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#ededed]" /> : null}
    </button>
  </div>
);

const sampleRows = [
  {
    courier: 'אביב משלוחים',
    customer: 'תמר בן דוד',
    customerAddress: 'ז׳בוטינסקי 38, רמת גן',
    restaurant: 'אל גאוצ׳ו',
    restaurantAddress: 'ז׳בוטינסקי 7, רמת גן',
    sla: 'שניות 0',
    vehicle: 'רכב',
  },
  {
    courier: 'אביב משלוחים',
    customer: 'גיא שרון',
    customerAddress: 'דיזנגוף 22, תל אביב',
    restaurant: 'דומינוס אבן גבירול',
    restaurantAddress: 'אבן גבירול 143, תל אביב',
    sla: '5:42 דקות',
    vehicle: 'רכב',
  },
  {
    courier: 'אביב משלוחים',
    customer: 'רון חדד',
    customerAddress: 'אבן גבירול 65, תל אביב',
    restaurant: 'משה לוי',
    restaurantAddress: 'ביאליק 14, רמת גן',
    sla: '-',
    vehicle: 'רכב',
  },
];

export const DesignSystemPlaygroundPage: React.FC = () => {
  const [density, setDensity] = useState<Density>('comfortable');
  const [stage, setStage] = useState<DeliveryStage>('assigned');
  const [showMeta, setShowMeta] = useState(true);
  const [connectedOnly, setConnectedOnly] = useState(true);
  const [inShiftOnly, setInShiftOnly] = useState(false);
  const [restaurantFilter, setRestaurantFilter] = useState('אל גאוצ׳ו');
  const [courierFilter, setCourierFilter] = useState('אביב משלוחים');

  const densityStyle = densityConfig[density];
  const stageStyle = stageConfig[stage];

  const rowClassName = useMemo(
    () =>
      [
        'grid grid-cols-[44px_minmax(210px,1.2fr)_minmax(230px,1.35fr)_minmax(160px,0.9fr)_minmax(108px,0.7fr)_96px_44px_44px] items-center border-b border-app-nav-border bg-app-surface text-sm text-app-text last:border-b-0',
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
              <span>Sendi Component Playground</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-app-text">פלייגראונד</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-app-text-secondary">
              אזור ניסוי רק לדפוסים שבנינו במוצר: שורות משלוחים, חיפוש פילטרים, כפתורי toolbar וטבעת התקדמות.
            </p>
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
          <Panel title="בקרות ניסוי">
            <div className="space-y-4">
              <Input
                value={restaurantFilter}
                onChange={(event) => setRestaurantFilter(event.target.value)}
                placeholder="שם מסעדה"
              />
              <Input
                value={courierFilter}
                onChange={(event) => setCourierFilter(event.target.value)}
                placeholder="שם שליח"
              />
              <SegmentedControl
                label="צפיפות שורה"
                value={density}
                onChange={setDensity}
                options={[
                  { value: 'compact', label: densityConfig.compact.label },
                  { value: 'comfortable', label: densityConfig.comfortable.label },
                  { value: 'spacious', label: densityConfig.spacious.label },
                ]}
              />
              <SegmentedControl
                label="שלב משלוח"
                value={stage}
                onChange={setStage}
                options={[
                  { value: 'pending', label: stageConfig.pending.label },
                  { value: 'assigned', label: stageConfig.assigned.label },
                  { value: 'delivering', label: stageConfig.delivering.label },
                  { value: 'delivered', label: stageConfig.delivered.label },
                  { value: 'cancelled', label: stageConfig.cancelled.label },
                ]}
              />
              <label className="flex items-center justify-between gap-3 rounded-[var(--app-radius-md)] border border-app-nav-border px-3 py-2">
                <span className="text-sm text-app-text">הצג שורות משנה</span>
                <input
                  type="checkbox"
                  checked={showMeta}
                  onChange={(event) => setShowMeta(event.target.checked)}
                  className="h-4 w-4 accent-[#ededed]"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Spec Snapshot">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Row</span>
                <span className="font-medium">{densityStyle.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Stage</span>
                <span className="font-medium">{stageStyle.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Ring</span>
                <span className="font-medium tabular-nums">{stageStyle.activeSegments}/4</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-app-text-secondary">Text</span>
                <span className="font-medium">14px regular</span>
              </div>
            </div>
          </Panel>
        </aside>

        <main className="space-y-4">
          <Panel title="Toolbar Toggles">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarToggle
                active={connectedOnly}
                label="הצג רק מחוברים"
                onClick={() => setConnectedOnly((prev) => !prev)}
              >
                <Power className="h-4 w-4" />
              </ToolbarToggle>
              <ToolbarToggle
                active={inShiftOnly}
                label="הצג רק במשמרת"
                onClick={() => setInShiftOnly((prev) => !prev)}
              >
                <UsersRound className="h-4 w-4" />
              </ToolbarToggle>
              <div className="flex h-10 min-w-[280px] flex-1 items-center gap-2 rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-surface px-3">
                <Search className="h-4 w-4 text-app-text-secondary" />
                <span className="min-w-0 flex-1 truncate text-sm text-app-text-muted">חפש משלוח...</span>
              </div>
            </div>
          </Panel>

          <Panel title="Command Search Filters">
            <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-background p-3">
              <div className="flex h-10 min-w-0 items-center gap-2 rounded-[var(--app-radius-xs)] border border-app-nav-border bg-app-surface px-3">
                <Search className="h-4 w-4 text-app-text-secondary" />
                <span className="rounded-[var(--app-radius-xs)] border border-app-nav-border px-2 py-0.5 text-xs text-app-text">
                  מסעדות: {restaurantFilter || 'אל גאוצ׳ו'}
                </span>
                <span className="rounded-[var(--app-radius-xs)] border border-app-nav-border px-2 py-0.5 text-xs text-app-text">
                  שליחים: {courierFilter || 'אביב משלוחים'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-app-text-muted">הוסף פילטר...</span>
                <X className="h-4 w-4 text-app-text-secondary" />
              </div>
              <div className="mt-3 rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface p-2">
                <div className="mb-2 text-xs font-medium text-app-text-secondary">פילטרים</div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {['מסעדות:', 'שליחים:', 'סטטוס:', 'תאריך:'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="flex items-center gap-2 rounded-[var(--app-radius-xs)] px-2 py-2 text-right text-sm text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
                    >
                      <Filter className="h-4 w-4" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Delivery Row Lab">
            <div className="overflow-auto">
              <div className="min-w-[980px] overflow-hidden rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-surface">
                {sampleRows.map((row, index) => (
                  <div key={`${row.restaurant}-${row.customer}`} className={rowClassName}>
                    <div className={`flex h-full items-center justify-center ${densityStyle.pad}`}>
                      <input type="checkbox" className="h-4 w-4 rounded border-[#404040] bg-transparent accent-[#ededed]" />
                    </div>
                    <div className={`min-w-0 ${densityStyle.pad}`}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
                        <span className="truncate text-sm font-normal text-app-text">
                          {index === 0 ? restaurantFilter || row.restaurant : row.restaurant}
                        </span>
                      </div>
                      {showMeta ? (
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{row.restaurantAddress}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className={`min-w-0 ${densityStyle.pad}`}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
                        <span className="truncate text-sm font-normal text-app-text">{row.customer}</span>
                      </div>
                      {showMeta ? (
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{row.customerAddress}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className={`min-w-0 ${densityStyle.pad}`}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-app-text-secondary" />
                        <span className="truncate text-sm font-normal text-app-text">
                          {index === 0 ? courierFilter || row.courier : row.courier}
                        </span>
                      </div>
                      {showMeta ? (
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-normal text-app-text-secondary">
                          <Bike className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{row.vehicle}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className={`min-w-0 text-left ${densityStyle.pad}`} dir="ltr">
                      <div className="truncate text-sm font-normal text-app-text">{row.sla}</div>
                      {showMeta ? <div className="mt-1 truncate text-sm text-app-text-secondary">SLA</div> : null}
                    </div>
                    <div className={`flex items-center justify-center ${densityStyle.pad}`}>
                      <span className={`rounded-[var(--app-radius-xs)] border px-2 py-0.5 text-xs font-medium ${stageStyle.chip}`}>
                        {stageStyle.label}
                      </span>
                    </div>
                    <div className={`flex items-center justify-center ${densityStyle.pad}`}>
                      <ProgressRing stage={stage} />
                    </div>
                    <div className={`flex items-center justify-center ${densityStyle.pad}`}>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-xs)] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
                        aria-label="פעולות"
                      >
                        <Package className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Progress Ring States">
              <div className="grid gap-2">
                {(Object.keys(stageConfig) as DeliveryStage[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStage(item)}
                    className={[
                      'flex items-center justify-between gap-3 rounded-[var(--app-radius-md)] border px-3 py-2 text-sm transition-colors',
                      stage === item
                        ? 'border-[#ededed] bg-app-surface-raised text-app-text'
                        : 'border-app-nav-border bg-app-surface text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text',
                    ].join(' ')}
                  >
                    <span>{stageConfig[item].label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums">{stageConfig[item].activeSegments}/4</span>
                      <ProgressRing stage={item} size="sm" />
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Action Surface">
              <div className="rounded-[var(--app-radius-md)] border border-app-nav-border bg-app-background p-4">
                <div className="mb-4 flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 text-app-text-secondary" />
                  <div>
                    <div className="text-sm font-medium text-app-text">וריאציה לבדיקה</div>
                    <p className="mt-1 text-sm leading-6 text-app-text-secondary">
                      שינוי הצפיפות, הסטטוס והפילטרים למעלה משפיע רק על הדפוסים שכבר קיימים במוצר.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">שמור וריאציה</Button>
                  <Button variant="secondary">שכפל</Button>
                  <Button variant="ghost">נקה</Button>
                </div>
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
};
