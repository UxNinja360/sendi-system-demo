import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Minus,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TimerReset,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';
import { getDeliveryCreditConsumedAt } from '../utils/delivery-credits';

type PackageOption = {
  amount: number;
  badge?: string;
  label: string;
};

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 300000;
const DEFAULT_AMOUNT = 5000;

const packageOptions: PackageOption[] = [
  { amount: 1000, label: 'קטנה' },
  { amount: 5000, label: 'רגילה', badge: 'נפוץ' },
  { amount: 20000, label: 'עסקית' },
  { amount: 50000, label: 'נפח גבוה' },
];

const priceTiers = [
  { label: '100-999', price: 0.5 },
  { label: '1,000-9,999', price: 0.45 },
  { label: '10,000-49,999', price: 0.4 },
  { label: '50,000+', price: 0.35 },
];

const minLog = Math.log(MIN_AMOUNT);
const maxLog = Math.log(MAX_AMOUNT);

const clampAmount = (value: number) =>
  Math.min(Math.max(Math.round(value / 100) * 100, MIN_AMOUNT), MAX_AMOUNT);

const getSliderValue = (value: number) =>
  ((Math.log(value) - minLog) / (maxLog - minLog)) * 100;

const getRealValue = (position: number) => {
  if (position === 0) return MIN_AMOUNT;
  return clampAmount(Math.exp(minLog + (position / 100) * (maxLog - minLog)));
};

const getPricePerUnit = (amount: number) => {
  if (amount < 1000) return 0.5;
  if (amount < 10000) return 0.45;
  if (amount < 50000) return 0.4;
  return 0.35;
};

const formatCurrency = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('he-IL', {
    currency: 'ILS',
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? 2 : 0,
    style: 'currency',
  }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat('he-IL').format(value);

const getBalanceTone = (balance: number) => {
  if (balance <= 100) return 'text-app-error-text';
  if (balance <= 500) return 'text-app-warning-text';
  return 'text-app-text';
};

export const DeliveryBalanceHub: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const [purchaseAmount, setPurchaseAmount] = useState(DEFAULT_AMOUNT);

  const currentBalance = state.deliveryBalance;
  const pricePerUnit = getPricePerUnit(purchaseAmount);
  const totalPrice = purchaseAmount * pricePerUnit;
  const balanceAfterPurchase = currentBalance + purchaseAmount;

  const monthlyUsage = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const consumedInLast30Days = state.deliveries.filter((delivery) => {
      const consumedAt = getDeliveryCreditConsumedAt(delivery);
      return consumedAt ? consumedAt.getTime() >= thirtyDaysAgo : false;
    }).length;

    return consumedInLast30Days || state.stats.month.total;
  }, [state.deliveries, state.stats.month.total]);

  const coverageDays = monthlyUsage > 0 ? Math.floor(currentBalance / (monthlyUsage / 30)) : null;
  const activePackage = packageOptions.find((option) => option.amount === purchaseAmount);
  const balanceToneClassName = getBalanceTone(currentBalance);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPurchaseAmount(getRealValue(Number(event.target.value)));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextAmount = Number(event.target.value);
    if (!Number.isFinite(nextAmount)) return;
    setPurchaseAmount(clampAmount(nextAmount));
  };

  const adjustAmount = (delta: number) => {
    setPurchaseAmount((previousAmount) => clampAmount(previousAmount + delta));
  };

  const handleCheckout = () => {
    dispatch({
      payload: purchaseAmount,
      type: 'ADD_DELIVERY_BALANCE',
    });

    setPurchaseAmount(DEFAULT_AMOUNT);
  };

  return (
    <div className="flex flex-col gap-3 text-right" dir="rtl">
      <header className="flex flex-col gap-3 border-b border-app-border pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-app-text-secondary">
            <WalletCards className="h-4 w-4 text-app-brand" />
            <span>יתרת משלוחים</span>
          </div>
          <h1 className="mt-1 text-xl font-bold leading-tight text-app-text sm:text-2xl">
            ניהול יתרת משלוחים
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text">
          <span className="text-app-text-secondary">יתרה זמינה</span>
          <span className={`text-lg font-bold tabular-nums ${balanceToneClassName}`}>
            {formatNumber(currentBalance)}
          </span>
        </div>
      </header>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-app-text-secondary">יתרה נוכחית</span>
            <Package className="h-4 w-4 text-app-brand" />
          </div>
          <div className={`mt-3 text-3xl font-bold leading-none tabular-nums ${balanceToneClassName}`}>
            {formatNumber(currentBalance)}
          </div>
          <div className="mt-2 text-xs text-app-text-muted">משלוחים זמינים במערכת</div>
        </div>

        <div className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-app-text-secondary">צריכה חודשית</span>
            <TrendingUp className="h-4 w-4 text-app-success-text" />
          </div>
          <div className="mt-3 text-3xl font-bold leading-none tabular-nums text-app-text">
            {formatNumber(monthlyUsage)}
          </div>
          <div className="mt-2 text-xs text-app-text-muted">לפי 30 הימים האחרונים</div>
        </div>

        <div className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-app-text-secondary">כיסוי משוער</span>
            <TimerReset className="h-4 w-4 text-app-info-text" />
          </div>
          <div className="mt-3 text-3xl font-bold leading-none tabular-nums text-app-text">
            {coverageDays === null ? '—' : formatNumber(coverageDays)}
          </div>
          <div className="mt-2 text-xs text-app-text-muted">ימים בקצב הנוכחי</div>
        </div>

        <div className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-app-text-secondary">מחיר למשלוח</span>
            <Receipt className="h-4 w-4 text-app-warning-text" />
          </div>
          <div className="mt-3 text-3xl font-bold leading-none tabular-nums text-app-text">
            {formatCurrency(pricePerUnit, 2)}
          </div>
          <div className="mt-2 text-xs text-app-text-muted">
            {activePackage ? `חבילת ${activePackage.label}` : 'כמות מותאמת'}
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface">
          <div className="flex items-center justify-between gap-3 border-b border-app-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-app-brand" />
              <h2 className="truncate text-sm font-semibold text-app-text">רכישת יתרה</h2>
            </div>
            <span className="rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface-raised px-2 py-1 text-xs font-semibold text-app-text-secondary">
              {formatNumber(purchaseAmount)}
            </span>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {packageOptions.map((option) => {
                const selected = purchaseAmount === option.amount;

                return (
                  <button
                    key={option.amount}
                    type="button"
                    onClick={() => setPurchaseAmount(option.amount)}
                    className={`min-w-0 rounded-[var(--app-radius-sm)] border p-3 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
                      selected
                        ? 'border-app-brand bg-app-brand-subtle text-app-brand-text'
                        : 'border-app-border bg-app-background text-app-text hover:bg-app-surface-raised'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-current">{option.label}</span>
                      {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </div>
                    <div className="mt-3 text-2xl font-bold leading-none tabular-nums">
                      {formatNumber(option.amount)}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-app-text-secondary">
                      <span>{formatCurrency(getPricePerUnit(option.amount), 2)}</span>
                      {option.badge ? (
                        <span className="rounded-full bg-app-surface px-2 py-0.5 text-[11px] font-semibold text-app-text">
                          {option.badge}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="min-w-0 rounded-[var(--app-radius-sm)] border border-app-border bg-app-background p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label htmlFor="delivery-balance-amount" className="text-xs font-semibold text-app-text-secondary">
                    כמות לרכישה
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="הפחת כמות"
                      onClick={() => adjustAmount(-100)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface text-app-text-secondary transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="הוסף כמות"
                      onClick={() => adjustAmount(100)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-xs)] border border-app-border bg-app-surface text-app-text-secondary transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <input
                  id="delivery-balance-amount"
                  type="number"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  step={100}
                  value={purchaseAmount}
                  onChange={handleInputChange}
                  className="h-11 w-full rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-right text-lg font-semibold tabular-nums text-app-text outline-none transition-colors focus:border-app-border-strong focus:ring-2 focus:ring-app-brand/20"
                />

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={getSliderValue(purchaseAmount)}
                  onChange={handleSliderChange}
                  aria-label="בחירת כמות משלוחים"
                  className="mt-5 h-2 w-full cursor-pointer"
                />

                <div className="mt-2 flex justify-between text-[11px] font-semibold text-app-text-muted" dir="ltr">
                  <span>100</span>
                  <span>300K</span>
                </div>
              </div>

              <div className="rounded-[var(--app-radius-sm)] border border-app-border bg-app-background p-4">
                <div className="text-xs font-semibold text-app-text-secondary">מחירון</div>
                <div className="mt-3 space-y-2">
                  {priceTiers.map((tier) => {
                    const active = pricePerUnit === tier.price;

                    return (
                      <div
                        key={tier.label}
                        className={`flex items-center justify-between gap-2 rounded-[var(--app-radius-xs)] px-2 py-1.5 text-xs ${
                          active ? 'bg-app-brand-subtle text-app-brand-text' : 'text-app-text-secondary'
                        }`}
                      >
                        <span dir="ltr">{tier.label}</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(tier.price, 2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface xl:sticky xl:top-4">
          <div className="border-b border-app-border px-4 py-3">
            <h2 className="text-sm font-semibold text-app-text">סיכום רכישה</h2>
          </div>

          <div className="space-y-4 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-app-text-secondary">כמות</span>
                <span className="font-semibold tabular-nums text-app-text">{formatNumber(purchaseAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-app-text-secondary">מחיר למשלוח</span>
                <span className="font-semibold tabular-nums text-app-text">{formatCurrency(pricePerUnit, 2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-app-text-secondary">יתרה לאחר רכישה</span>
                <span className="font-semibold tabular-nums text-app-text">{formatNumber(balanceAfterPurchase)}</span>
              </div>
            </div>

            <div className="border-t border-app-border pt-4">
              <div className="flex items-end justify-between gap-3">
                <span className="pb-1 text-sm font-semibold text-app-text">סה״כ לתשלום</span>
                <span className="text-3xl font-bold leading-none tabular-nums text-app-text">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <div className="mt-1 text-xs text-app-text-muted">המחיר כולל מע״מ</div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--app-radius-sm)] bg-app-brand-solid px-4 text-sm font-semibold text-app-background transition-colors hover:bg-app-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/35"
            >
              <CreditCard className="h-4 w-4" />
              <span>רכוש יתרה</span>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
