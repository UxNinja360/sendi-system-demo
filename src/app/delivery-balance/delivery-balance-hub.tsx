import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  Pencil,
  Plus,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';
import { getDeliveryCreditConsumedAt } from '../utils/delivery-credits';

type BalanceTab = 'usage' | 'breakdown';
type PurchaseStep = 'amount' | 'payment';

type CreditPackage = {
  amount: number;
  price: number;
};

const customMinAmount = 250;
const customStep = 250;
const defaultAmount = 1000;

const creditPackages: CreditPackage[] = [
  { amount: 500, price: 20 },
  { amount: 1000, price: 40 },
  { amount: 1500, price: 60 },
  { amount: 2500, price: 100 },
  { amount: 5000, price: 200 },
  { amount: 10000, price: 400 },
];

const statusLabels: Record<string, string> = {
  assigned: 'שובץ',
  cancelled: 'בוטל',
  delivered: 'נמסר',
  delivering: 'במסירה',
  expired: 'פג תוקף',
  pending: 'ממתין',
};

const formatNumber = (value: number) => new Intl.NumberFormat('he-IL').format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('he-IL', {
    currency: 'ILS',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date);

const daysAgo = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

const clampCustomAmount = (value: number) =>
  Math.max(customMinAmount, Math.round(value / customStep) * customStep);

const getPackagePrice = (amount: number) => {
  const packagePrice = creditPackages.find((item) => item.amount === amount)?.price;
  return packagePrice ?? Math.max(10, Math.round(amount * 0.04));
};

const getRemainingPercent = (remaining: number, used: number) => {
  const total = remaining + used;
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
};

export const DeliveryBalanceHub: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const [activeTab, setActiveTab] = useState<BalanceTab>('usage');
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('amount');
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(defaultAmount);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState(defaultAmount);
  const [autoReloadOpen, setAutoReloadOpen] = useState(false);
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
  const [autoReloadMinimum, setAutoReloadMinimum] = useState(125);
  const [autoReloadTarget, setAutoReloadTarget] = useState(250);

  const usageEvents = useMemo(
    () =>
      state.deliveries
        .map((delivery) => ({
          consumedAt: getDeliveryCreditConsumedAt(delivery),
          delivery,
        }))
        .filter((event): event is { consumedAt: Date; delivery: (typeof state.deliveries)[number] } =>
          Boolean(event.consumedAt)
        )
        .sort((a, b) => b.consumedAt.getTime() - a.consumedAt.getTime()),
    [state.deliveries]
  );

  const usage = useMemo(() => {
    const todayStart = daysAgo(0).getTime();
    const weekStart = daysAgo(6).getTime();
    const monthStart = daysAgo(29).getTime();

    const today = usageEvents.filter((event) => event.consumedAt.getTime() >= todayStart).length;
    const week = usageEvents.filter((event) => event.consumedAt.getTime() >= weekStart).length;
    const month = usageEvents.filter((event) => event.consumedAt.getTime() >= monthStart).length;

    return {
      month: month || state.stats.month.total,
      today: today || state.stats.today.total,
      week: week || state.stats.week.total,
    };
  }, [state.stats.month.total, state.stats.today.total, state.stats.week.total, usageEvents]);

  const currentBalance = state.deliveryBalance;
  const averageDailyUsage = usage.month > 0 ? Math.max(1, Math.round(usage.month / 30)) : 0;
  const coverageDays = averageDailyUsage > 0 ? Math.floor(currentBalance / averageDailyUsage) : 0;
  const selectedPrice = getPackagePrice(selectedAmount);
  const balanceAfterPurchase = currentBalance + selectedAmount;
  const todayRemainingPercent = getRemainingPercent(currentBalance, usage.today);
  const weekRemainingPercent = getRemainingPercent(currentBalance, usage.week);
  const monthRemainingPercent = getRemainingPercent(currentBalance, usage.month);
  const autoReloadAmount = Math.max(customMinAmount, autoReloadTarget - Math.min(currentBalance, autoReloadMinimum));
  const autoReloadPrice = getPackagePrice(autoReloadAmount);

  const openPurchaseDialog = () => {
    setPurchaseOpen(true);
    setPurchaseStep('amount');
    setSelectOpen(false);
  };

  const closePurchaseDialog = () => {
    setPurchaseOpen(false);
    setPurchaseStep('amount');
    setSelectOpen(false);
  };

  const selectPackage = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(amount);
    setCustomMode(false);
    setSelectOpen(false);
  };

  const applyCustomAmount = () => {
    const amount = clampCustomAmount(customAmount);
    setSelectedAmount(amount);
    setCustomAmount(amount);
    setCustomMode(true);
    setSelectOpen(false);
  };

  const completePurchase = () => {
    dispatch({
      payload: selectedAmount,
      type: 'ADD_DELIVERY_BALANCE',
    });
    closePurchaseDialog();
  };

  const saveAutoReload = () => {
    const minimum = clampCustomAmount(autoReloadMinimum);
    const target = Math.max(minimum + customStep, clampCustomAmount(autoReloadTarget));
    setAutoReloadMinimum(minimum);
    setAutoReloadTarget(target);
    setAutoReloadEnabled(true);
    setAutoReloadOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-7 text-right" dir="rtl">
      <header className="border-b border-app-border">
        <div className="flex gap-6">
          <TabButton active={activeTab === 'usage'} onClick={() => setActiveTab('usage')}>
            שימוש
          </TabButton>
          <TabButton active={activeTab === 'breakdown'} onClick={() => setActiveTab('breakdown')}>
            פירוט צריכה
          </TabButton>
        </div>
      </header>

      {activeTab === 'usage' ? (
        <section className="space-y-7">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-app-text">יתרה ושימוש</h1>
            <p className="text-sm text-app-text-secondary">מעקב מהיר אחרי צריכת המשלוחים והיתרה שנשארה בחשבון.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <UsageLimitCard
              label="שימוש היום"
              value={`${todayRemainingPercent}% נותר`}
              helper={`${formatNumber(usage.today)} משלוחים נוצלו היום`}
              progress={todayRemainingPercent}
            />
            <UsageLimitCard
              label="שימוש שבועי"
              value={`${weekRemainingPercent}% נותר`}
              helper={`${formatNumber(usage.week)} משלוחים נוצלו השבוע`}
              progress={weekRemainingPercent}
            />
            <UsageLimitCard
              label="שימוש חודשי"
              value={`${monthRemainingPercent}% נותר`}
              helper={`${formatNumber(usage.month)} משלוחים נוצלו ב-30 יום`}
              progress={monthRemainingPercent}
            />
            <UsageLimitCard
              label="כיסוי בקצב הנוכחי"
              value={coverageDays > 0 ? `${formatNumber(coverageDays)} ימים` : 'אין מספיק נתונים'}
              helper={averageDailyUsage > 0 ? `${formatNumber(averageDailyUsage)} משלוחים בממוצע ליום` : 'נדרש שימוש כדי לחשב ממוצע'}
              progress={coverageDays > 0 ? Math.min(100, coverageDays * 3) : 100}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-none border border-app-border bg-app-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-app-text-secondary">
                    <WalletCards className="h-4 w-4 text-app-brand-text" />
                    יתרת קרדיטים
                  </div>
                  <div className="mt-4 text-4xl font-bold leading-none tabular-nums text-app-text">
                    {formatNumber(currentBalance)}
                  </div>
                  <p className="mt-3 text-sm text-app-text-secondary">
                    השתמש בקרדיטים כדי להמשיך לקבל ולשבץ משלוחים.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openPurchaseDialog}
                  aria-label="רכישת קרדיטים"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-text text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/35"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-xl font-bold text-app-text">טעינה אוטומטית</h2>

            <div className="rounded-none border border-app-border bg-app-surface p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-app-text">
                    <span>טעינת קרדיטים אוטומטית</span>
                    {autoReloadEnabled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-app-success-text">
                        <span className="h-1.5 w-1.5 rounded-full bg-app-success-text" />
                        פעיל
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-app-text-secondary">
                    הוסף קרדיטים אוטומטית כאשר היתרה יורדת מתחת לסף שהגדרת.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoReloadOpen(true)}
                  className="h-9 shrink-0 rounded-full bg-app-background px-4 text-sm font-bold text-app-text transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                >
                  הגדרות
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-app-text">פירוט צריכה</h1>
            <p className="text-sm text-app-text-secondary">רשימת האירועים שבהם ירד קרדיט מהיתרה.</p>
          </div>

          <div className="overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface">
            <div className="grid grid-cols-[minmax(0,1fr)_140px_80px] border-b border-app-border px-4 py-3 text-xs font-bold text-app-text-secondary max-sm:hidden">
              <span>משלוח</span>
              <span>זמן</span>
              <span className="text-left">קרדיטים</span>
            </div>

            {usageEvents.length > 0 ? (
              usageEvents.map(({ consumedAt, delivery }) => (
                <div
                  key={`${delivery.id}-${consumedAt.toISOString()}`}
                  className="grid gap-3 border-b border-app-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_140px_80px]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-app-text">{delivery.rest_name || 'משלוח'}</div>
                    <div className="mt-1 text-xs text-app-text-muted">
                      {statusLabels[delivery.status] ?? delivery.status} · {delivery.api_short_order_id ?? delivery.id}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-app-text-secondary">{formatDateTime(consumedAt)}</div>
                  <div className="text-left text-sm font-bold tabular-nums text-app-error-text" dir="ltr">
                    -1
                  </div>
                </div>
              ))
            ) : (
              <div className="flex min-h-44 items-center justify-center px-4 py-8 text-center text-sm text-app-text-secondary">
                עדיין אין צריכת קרדיטים מתועדת.
              </div>
            )}
          </div>
        </section>
      )}

      {autoReloadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[32rem] rounded-[var(--app-radius-lg)] border border-app-border bg-app-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setAutoReloadOpen(false)}
                aria-label="סגירה"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="min-w-0 text-lg font-bold text-app-text">טעינת קרדיטים אוטומטית</h2>
            </div>

            <div className="mt-7 space-y-6">
              <label className="block space-y-2">
                <span className="block text-sm font-bold text-app-text">יתרה מינימלית</span>
                <span className="block text-sm leading-6 text-app-text-secondary">
                  טעינה אוטומטית תפעל כאשר יתרת הקרדיטים יורדת מתחת לסכום הזה.
                </span>
                <input
                  type="number"
                  min={customMinAmount}
                  step={customStep}
                  value={autoReloadMinimum}
                  onBlur={() => setAutoReloadMinimum((value) => clampCustomAmount(value))}
                  onChange={(event) => setAutoReloadMinimum(Number(event.target.value) || customMinAmount)}
                  className="h-12 w-full rounded-[var(--app-radius-md)] border border-app-border bg-app-surface-raised px-4 text-sm font-bold tabular-nums text-app-text outline-none transition-colors focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                />
              </label>

              <label className="block space-y-2">
                <span className="block text-sm font-bold text-app-text">יעד יתרה</span>
                <span className="block text-sm leading-6 text-app-text-secondary">
                  הטעינה האוטומטית תחזיר את יתרת הקרדיטים עד לסכום הזה.
                </span>
                <input
                  type="number"
                  min={customMinAmount}
                  step={customStep}
                  value={autoReloadTarget}
                  onBlur={() =>
                    setAutoReloadTarget((value) =>
                      Math.max(clampCustomAmount(autoReloadMinimum) + customStep, clampCustomAmount(value))
                    )
                  }
                  onChange={(event) => setAutoReloadTarget(Number(event.target.value) || customMinAmount)}
                  className="h-12 w-full rounded-[var(--app-radius-md)] border border-app-border bg-app-surface-raised px-4 text-sm font-bold tabular-nums text-app-text outline-none transition-colors focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                />
              </label>

              <div className="space-y-4 text-sm leading-6 text-app-text-secondary">
                <p>
                  יירכשו לפחות {formatNumber(autoReloadAmount)} קרדיטים, בעלות משוערת של{' '}
                  <span className="font-bold text-app-text">{formatCurrency(autoReloadPrice)}</span>.
                </p>
                <p>נחייב את אמצעי התשלום באופן אוטומטי כאשר היתרה תגיע למינימום שהגדרת.</p>
              </div>

              {!autoReloadEnabled ? (
                <div className="rounded-[var(--app-radius-md)] border border-app-border bg-app-background p-4 text-sm leading-6 text-app-text-secondary">
                  הפעלת טעינה אוטומטית תבצע רכישה חד פעמית כדי להגיע ליעד היתרה. לאחר מכן המערכת תטעין רק כאשר היתרה תרד מתחת למינימום.
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (autoReloadEnabled) {
                      setAutoReloadEnabled(false);
                    }
                    setAutoReloadOpen(false);
                  }}
                  className="h-10 rounded-full bg-app-background px-4 text-sm font-bold text-app-text transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                >
                  {autoReloadEnabled ? 'כבה' : 'ביטול'}
                </button>
                <button
                  type="button"
                  onClick={saveAutoReload}
                  className="h-10 rounded-full bg-app-text px-5 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                >
                  {autoReloadEnabled ? 'שמור' : 'הפעל'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {purchaseOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[36rem] rounded-[var(--app-radius-lg)] border border-app-border bg-app-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                onClick={closePurchaseDialog}
                aria-label="סגירה"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h2 className="text-lg font-bold text-app-text">
                  {purchaseStep === 'amount' ? 'רכישת קרדיטים' : 'פרטי תשלום'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-app-text-secondary">
                  {purchaseStep === 'amount'
                    ? 'בחר כמות קרדיטים להוספה לחשבון. אפשר לבחור חבילה או להזין כמות מותאמת.'
                    : 'הכנס פרטי כרטיס אשראי כדי להשלים את הרכישה.'}
                </p>
              </div>
            </div>

            {purchaseStep === 'amount' ? (
              <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-app-text">כמות להוספה</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectOpen((open) => !open)}
                      className={`flex h-12 w-full items-center justify-between gap-3 rounded-[var(--app-radius-md)] border bg-app-surface-raised px-4 text-right text-sm font-bold text-app-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
                        selectOpen ? 'border-app-border-strong' : 'border-app-border'
                      }`}
                    >
                      <span>{formatNumber(selectedAmount)} קרדיטים</span>
                      <span className="flex items-center gap-3 text-app-text-secondary">
                        {formatCurrency(selectedPrice)}
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </button>

                    {selectOpen ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface shadow-2xl">
                        {creditPackages.map((option) => {
                          const selected = !customMode && selectedAmount === option.amount;

                          return (
                            <button
                              key={option.amount}
                              type="button"
                              onClick={() => selectPackage(option.amount)}
                              className={`flex h-12 w-full items-center justify-between px-4 text-sm transition-colors hover:bg-app-surface-raised ${
                                selected ? 'bg-app-surface-raised text-app-text' : 'text-app-text-secondary'
                              }`}
                            >
                              <span className="font-semibold">{formatNumber(option.amount)} קרדיטים</span>
                              <span className="font-bold tabular-nums">{formatCurrency(option.price)}</span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setCustomMode(true);
                            setCustomAmount(selectedAmount);
                          }}
                          className="flex h-12 w-full items-center gap-2 border-t border-app-border px-4 text-sm font-semibold text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
                        >
                          <Pencil className="h-4 w-4" />
                          כמות מותאמת
                        </button>

                        {customMode ? (
                          <div className="border-t border-app-border px-4 py-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min={customMinAmount}
                                step={customStep}
                                value={customAmount}
                                onChange={(event) => setCustomAmount(Number(event.target.value) || customMinAmount)}
                                className="h-10 min-w-0 flex-1 rounded-[var(--app-radius-sm)] border border-app-border bg-app-background px-3 text-sm font-bold tabular-nums text-app-text outline-none focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                              />
                              <span className="shrink-0 text-sm font-bold text-app-text-secondary">
                                {formatCurrency(getPackagePrice(customAmount))}
                              </span>
                              <button
                                type="button"
                                onClick={applyCustomAmount}
                                className="h-10 rounded-full bg-app-text px-4 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                              >
                                החל
                              </button>
                            </div>
                            <p className="mt-3 text-xs text-app-text-muted">
                              הזן קרדיטים בקפיצות של 250. מינימום רכישה: 250 קרדיטים.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[var(--app-radius-sm)] bg-app-background px-4 py-3 text-sm">
                  <span className="text-app-text-secondary">יתרה אחרי רכישה</span>
                  <span className="font-bold tabular-nums text-app-text">{formatNumber(balanceAfterPurchase)}</span>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closePurchaseDialog}
                    className="h-10 rounded-full bg-app-background px-4 text-sm font-bold text-app-text transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseStep('payment');
                      setSelectOpen(false);
                    }}
                    className="h-10 rounded-full bg-app-text px-5 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                  >
                    המשך
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                <div className="rounded-[var(--app-radius-md)] border border-app-border bg-app-background p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-app-text">
                    <CreditCard className="h-4 w-4 text-app-brand-text" />
                    כרטיס אשראי
                  </div>
                  <div className="mt-4 grid gap-3">
                    <input
                      inputMode="numeric"
                      placeholder="מספר כרטיס"
                      className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        inputMode="numeric"
                        placeholder="MM / YY"
                        className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                      />
                      <input
                        inputMode="numeric"
                        placeholder="CVC"
                        className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                      />
                    </div>
                    <input
                      placeholder="שם בעל הכרטיס"
                      className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[var(--app-radius-sm)] bg-app-background px-4 py-3 text-sm">
                  <span className="text-app-text-secondary">{formatNumber(selectedAmount)} קרדיטים</span>
                  <span className="font-bold tabular-nums text-app-text">{formatCurrency(selectedPrice)}</span>
                </div>

                <div className="flex justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPurchaseStep('amount')}
                    className="h-10 rounded-full bg-app-background px-4 text-sm font-bold text-app-text transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                  >
                    חזרה
                  </button>
                  <button
                    type="button"
                    onClick={completePurchase}
                    className="h-10 rounded-full bg-app-text px-5 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                  >
                    אישור רכישה
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}> = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative h-10 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
      active ? 'text-app-text' : 'text-app-text-secondary hover:text-app-text'
    }`}
  >
    {children}
    {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-app-text" /> : null}
  </button>
);

const UsageLimitCard: React.FC<{
  helper: string;
  label: string;
  progress: number;
  value: string;
}> = ({ helper, label, progress, value }) => (
  <div className="rounded-none border border-app-border bg-app-surface p-5">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-app-text-secondary">{label}</span>
      <BarChart3 className="h-4 w-4 text-app-text-muted" />
    </div>
    <div className="mt-4 text-2xl font-bold leading-none text-app-text">{value}</div>
    <div className="mt-5 h-2 rounded-full bg-app-surface-raised" dir="ltr">
      <div className="h-full rounded-full bg-app-success-text" style={{ width: `${progress}%` }} />
    </div>
    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-app-text-muted">
      <TrendingUp className="h-3.5 w-3.5" />
      {helper}
    </div>
  </div>
);
