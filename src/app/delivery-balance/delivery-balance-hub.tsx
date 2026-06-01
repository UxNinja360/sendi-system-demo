import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  CreditCard,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';

type PurchaseStep = 'amount' | 'payment';
type SelectDirection = 'down' | 'up';

type CreditPackage = {
  amount: number;
  price: number;
};

type PurchaseInvoice = {
  amount: number;
  balanceAfter: number;
  balanceBefore: number;
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  total: number;
  unitPrice: number;
};

const customMinAmount = 100;
const customStep = 100;
const defaultAmount = 100;

const creditPackages: CreditPackage[] = [
  { amount: 100, price: 221.2 },
  { amount: 1000, price: 1883.87 },
  { amount: 10000, price: 6563.16 },
  { amount: 100000, price: 35854.3 },
  { amount: 300000, price: 100270.5 },
];
const customMaxAmount = creditPackages[creditPackages.length - 1].amount;
const purchaseInvoicesStoragePrefix = 'sendi:delivery-balance-invoices';

const formatNumber = (value: number) => new Intl.NumberFormat('he-IL').format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('he-IL', {
    currency: 'ILS',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);

const formatTableCurrency = (value: number) =>
  `${new Intl.NumberFormat('he-IL', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} ₪`;

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date);

const normalizeCustomAmount = (value: number) =>
  Math.min(customMaxAmount, Math.max(customMinAmount, Number.isFinite(value) ? value : customMinAmount));

const limitCustomAmountInput = (value: number) =>
  Math.min(customMaxAmount, Math.max(0, Number.isFinite(value) ? value : 0));

const clampCustomAmount = (value: number) =>
  normalizeCustomAmount(Math.round(value / customStep) * customStep);

const roundPrice = (value: number) => Math.round(value * 100) / 100;

const getPackagePrice = (amount: number) => {
  const packagePrice = creditPackages.find((item) => item.amount === amount)?.price;
  if (packagePrice !== undefined) return packagePrice;

  const normalizedAmount = normalizeCustomAmount(amount);
  const lowerTier = [...creditPackages].reverse().find((item) => item.amount <= normalizedAmount);
  const upperTier = creditPackages.find((item) => item.amount >= normalizedAmount);

  if (!lowerTier) {
    return roundPrice(normalizedAmount * (creditPackages[0].price / creditPackages[0].amount));
  }

  if (!upperTier || lowerTier.amount === upperTier.amount) {
    return roundPrice(normalizedAmount * (lowerTier.price / lowerTier.amount));
  }

  const tierProgress =
    (normalizedAmount - lowerTier.amount) / (upperTier.amount - lowerTier.amount);

  return roundPrice(
    lowerTier.price + (upperTier.price - lowerTier.price) * tierProgress,
  );
};

const getPackageUnitPrice = (amount: number) => {
  const normalizedAmount = normalizeCustomAmount(amount);
  return getPackagePrice(normalizedAmount) / normalizedAmount;
};

const getPurchaseInvoicesStorageKey = (workspaceId?: string) =>
  `${purchaseInvoicesStoragePrefix}:${workspaceId || 'default'}`;

const isPurchaseInvoice = (value: unknown): value is PurchaseInvoice => {
  if (!value || typeof value !== 'object') return false;
  const invoice = value as Partial<PurchaseInvoice>;
  return (
    typeof invoice.id === 'string' &&
    typeof invoice.invoiceNumber === 'string' &&
    typeof invoice.issuedAt === 'string' &&
    typeof invoice.amount === 'number' &&
    typeof invoice.unitPrice === 'number' &&
    typeof invoice.total === 'number' &&
    typeof invoice.balanceBefore === 'number' &&
    typeof invoice.balanceAfter === 'number'
  );
};

const readStoredPurchaseInvoices = (storageKey: string): PurchaseInvoice[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isPurchaseInvoice).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
      : [];
  } catch {
    return [];
  }
};

const writeStoredPurchaseInvoices = (storageKey: string, invoices: PurchaseInvoice[]) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(invoices));
  } catch {
    // Invoice persistence is best-effort; the balance update itself still succeeds.
  }
};

const createInvoiceNumber = (issuedAt: Date, sequence: number) =>
  `INV-${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`;

export const DeliveryBalanceHub: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const amountDropdownRef = useRef<HTMLDivElement>(null);
  const amountSelectRef = useRef<HTMLDivElement>(null);
  const purchaseCardRef = useRef<HTMLDivElement>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('amount');
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectDirection, setSelectDirection] = useState<SelectDirection>('down');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState(defaultAmount);
  const invoicesStorageKey = useMemo(
    () => getPurchaseInvoicesStorageKey(state.workspaceId),
    [state.workspaceId],
  );
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() =>
    readStoredPurchaseInvoices(invoicesStorageKey)
  );

  useEffect(() => {
    setPurchaseInvoices(readStoredPurchaseInvoices(invoicesStorageKey));
  }, [invoicesStorageKey]);

  useLayoutEffect(() => {
    if (!selectOpen) return undefined;

    const updateSelectDirection = () => {
      const dropdown = amountDropdownRef.current;
      const select = amountSelectRef.current;
      if (!dropdown || !select) return;

      const viewportPadding = 16;
      const gap = 8;
      const selectRect = select.getBoundingClientRect();
      const dropdownHeight = dropdown.offsetHeight;
      const spaceBelow = window.innerHeight - selectRect.bottom - viewportPadding;
      const spaceAbove = selectRect.top - viewportPadding;
      const shouldOpenUp = spaceBelow < dropdownHeight + gap && spaceAbove + 32 >= spaceBelow;

      setSelectDirection(shouldOpenUp ? 'up' : 'down');
    };

    updateSelectDirection();
    window.addEventListener('resize', updateSelectDirection);

    return () => window.removeEventListener('resize', updateSelectDirection);
  }, [customMode, selectOpen]);

  const currentBalance = state.deliveryBalance;
  const deliveryBalanceTextClass =
    currentBalance <= 100
      ? 'text-[#dc2626] dark:text-[#f87171]'
      : 'text-[#f59e0b] dark:text-[#fbbf24]';
  const selectedPrice = selectedAmount === null ? 0 : getPackagePrice(selectedAmount);
  const selectedUnitPrice = selectedAmount === null ? 0 : getPackageUnitPrice(selectedAmount);
  const canContinuePurchase = selectedAmount !== null;
  const customDraftPrice = getPackagePrice(clampCustomAmount(customAmount));
  const customDraftUnitPrice = getPackageUnitPrice(clampCustomAmount(customAmount));
  const purchasedInvoiceAmount = useMemo(
    () => purchaseInvoices.reduce((total, invoice) => total + invoice.amount, 0),
    [purchaseInvoices],
  );
  const purchasedInvoiceTotal = useMemo(
    () => purchaseInvoices.reduce((total, invoice) => total + invoice.total, 0),
    [purchaseInvoices],
  );

  const openPurchaseDialog = () => {
    setPurchaseOpen(true);
    setPurchaseStep('amount');
    setSelectOpen(false);
    setSelectDirection('down');
    setSelectedAmount(null);
    setCustomAmount(defaultAmount);
    setCustomMode(false);
  };

  const closePurchaseDialog = () => {
    setPurchaseOpen(false);
    setPurchaseStep('amount');
    setSelectOpen(false);
    setSelectDirection('down');
  };

  useEffect(() => {
    if (!purchaseOpen) return undefined;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || purchaseCardRef.current?.contains(target)) {
        return;
      }

      closePurchaseDialog();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown);

    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
  }, [purchaseOpen]);

  const handlePurchaseBackdropInteraction = (event: React.MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) {
      closePurchaseDialog();
    }
  };

  const handlePurchaseCardMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectOpen) return;

    const target = event.target as Node;
    if (amountSelectRef.current?.contains(target) || amountDropdownRef.current?.contains(target)) {
      return;
    }

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

  const stepCustomAmount = (direction: -1 | 1) => {
    setCustomAmount((amount) => clampCustomAmount(amount + direction * customStep));
  };

  const completePurchase = () => {
    if (selectedAmount === null) return;

    const amount = selectedAmount;
    const price = getPackagePrice(amount);
    const unitPrice = getPackageUnitPrice(amount);
    const issuedAt = new Date();
    const invoice: PurchaseInvoice = {
      amount,
      balanceAfter: currentBalance + amount,
      balanceBefore: currentBalance,
      id: `invoice-${issuedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      invoiceNumber: createInvoiceNumber(issuedAt, purchaseInvoices.length + 1),
      issuedAt: issuedAt.toISOString(),
      total: price,
      unitPrice,
    };
    const nextInvoices = [invoice, ...purchaseInvoices].slice(0, 200);
    setPurchaseInvoices(nextInvoices);
    writeStoredPurchaseInvoices(invoicesStorageKey, nextInvoices);
    dispatch({
      payload: amount,
      type: 'ADD_DELIVERY_BALANCE',
    });
    closePurchaseDialog();
  };

  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-7 text-right" dir="rtl">
      <header className="pb-4">
        <div className="flex items-center justify-start">
          <div className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--app-radius-sm)] border border-app-border bg-app-background px-4 text-sm font-bold text-app-text">
            <span>קרדיטים</span>
            <span className={`tabular-nums ${deliveryBalanceTextClass}`}>
              {formatNumber(currentBalance)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 text-app-text-secondary">
              <Sparkles className="h-4 w-4 shrink-0 text-app-text-muted" />
              <p className="min-w-0 text-sm font-semibold leading-5 text-app-text-secondary">
                הוסף יתרה לחשבון כדי להמשיך לקבל ולשבץ משלוחים.
              </p>
            </div>

            <button
              type="button"
              onClick={openPurchaseDialog}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] bg-app-text px-5 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/35 max-sm:w-full"
            >
              רכישת יתרה
            </button>
          </div>
        </div>
      </header>

      <section className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <InvoiceSummaryCard label="חשבוניות" value={formatNumber(purchaseInvoices.length)} />
            <InvoiceSummaryCard label="משלוחים שנרכשו" value={formatNumber(purchasedInvoiceAmount)} />
            <InvoiceSummaryCard label="סכום רכישות" value={formatCurrency(purchasedInvoiceTotal)} />
          </div>

          <div className="overflow-hidden rounded-none border border-app-border bg-app-surface">
            {purchaseInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed border-collapse text-right">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[18%]" />
                    <col className="w-[14%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                  </colgroup>
                  <thead className="bg-app-background/35 text-xs font-bold text-app-text-secondary">
                    <tr className="border-b border-app-border">
                      <th scope="col" className="px-5 py-3 text-right">חשבונית</th>
                      <th scope="col" className="px-5 py-3 text-right">תאריך</th>
                      <th scope="col" className="px-5 py-3 text-right">כמות</th>
                      <th scope="col" className="px-5 py-3 text-right">מחיר למשלוח</th>
                      <th scope="col" className="px-5 py-3 text-right">סה״כ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {purchaseInvoices.map((invoice) => {
                      const issuedAt = new Date(invoice.issuedAt);

                      return (
                        <tr key={invoice.id} className="h-[72px] transition-colors hover:bg-app-surface-raised/30">
                          <td className="px-5 py-4 align-middle">
                            <div className="truncate text-sm font-bold text-app-text" dir="ltr">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-app-text-muted">
                              יתרה אחרי רכישה: {formatNumber(invoice.balanceAfter)}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 align-middle text-sm font-semibold tabular-nums text-app-text-secondary">
                            {formatDateTime(issuedAt)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 align-middle text-sm font-bold tabular-nums text-app-text-secondary">
                            {formatNumber(invoice.amount)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 align-middle text-sm font-bold tabular-nums text-app-text-secondary" dir="ltr">
                            {formatTableCurrency(invoice.unitPrice)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 align-middle text-sm font-bold tabular-nums text-app-text" dir="ltr">
                            {formatTableCurrency(invoice.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-44 items-center justify-center px-4 py-8 text-center text-sm text-app-text-secondary">
                עדיין אין חשבוניות רכישה.
              </div>
            )}
          </div>
      </section>

      {purchaseOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="סגירת פופאפ"
            tabIndex={-1}
            className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
            onClick={handlePurchaseBackdropInteraction}
            onMouseDown={handlePurchaseBackdropInteraction}
          />
          <div
            ref={purchaseCardRef}
            className="relative z-10 w-full max-w-[44rem] -translate-y-[6vh] overflow-visible rounded-[var(--app-radius-lg)] border border-app-border bg-app-surface p-6 shadow-2xl sm:p-7"
            onMouseDown={handlePurchaseCardMouseDown}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closePurchaseDialog}
                aria-label="סגירה"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 min-w-0">
              <h2 className="text-lg font-bold text-app-text">
                {purchaseStep === 'amount' ? 'רכישת משלוחים' : 'פרטי תשלום'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-app-text-secondary">
                {purchaseStep === 'amount'
                  ? 'המחיר מחושב לפי מדרגות: חבילה גדולה יותר מורידה את העלות לכל משלוח.'
                  : 'הכנס פרטי כרטיס אשראי כדי להשלים את הרכישה.'}
              </p>
            </div>

            {purchaseStep === 'amount' ? (
                <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-app-text">כמות להוספה</label>
                  <div ref={amountSelectRef} className="relative z-20">
                    <button
                      type="button"
                      aria-expanded={selectOpen}
                      onClick={() => setSelectOpen((open) => !open)}
                      className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-[var(--app-radius-md)] border bg-app-surface-raised px-4 py-2 text-right text-sm font-bold text-app-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
                        selectOpen ? 'border-app-border-strong' : 'border-app-border'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className={`block ${selectedAmount === null ? 'text-app-text-secondary' : 'text-app-text'}`}>
                          {selectedAmount === null ? 'בחר כמות משלוחים' : `${formatNumber(selectedAmount)} משלוחים`}
                        </span>
                        {selectedAmount !== null ? (
                          <span className="block text-xs font-semibold text-app-text-secondary">
                            {formatCurrency(selectedUnitPrice)} למשלוח
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-app-text-secondary">
                        {selectedAmount !== null ? (
                          <span className="tabular-nums">{formatCurrency(selectedPrice)}</span>
                        ) : null}
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </button>

                    {selectOpen ? (
                      <div
                        ref={amountDropdownRef}
                        className={`absolute right-0 z-50 w-full overflow-hidden rounded-[var(--app-radius-md)] border border-app-border bg-app-surface shadow-2xl ${
                          selectDirection === 'up' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'
                        }`}
                      >
                        {creditPackages.map((option) => {
                          const selected = !customMode && selectedAmount === option.amount;
                          const unitPrice = option.price / option.amount;

                          return (
                            <button
                              key={option.amount}
                              type="button"
                              onClick={() => selectPackage(option.amount)}
                              className={`grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-app-surface-raised ${
                                selected ? 'bg-app-surface-raised text-app-text' : 'text-app-text-secondary'
                              }`}
                            >
                              <span className="min-w-0 text-right">
                                <span className="block font-semibold">{formatNumber(option.amount)} משלוחים</span>
                                <span className="block text-xs font-semibold text-app-text-muted">
                                  {formatCurrency(unitPrice)} למשלוח
                                </span>
                              </span>
                              <span className="font-bold tabular-nums">{formatCurrency(option.price)}</span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setCustomMode(true);
                            setCustomAmount(selectedAmount ?? defaultAmount);
                          }}
                          className="flex h-12 w-full items-center gap-2 border-t border-app-border px-4 text-sm font-semibold text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
                        >
                          <Pencil className="h-4 w-4" />
                          כמות מותאמת
                        </button>

                        {customMode ? (
                          <div className="border-t border-app-border px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex min-w-0 items-center justify-end gap-1.5 text-sm font-bold text-app-text">
                                <span className="shrink-0 text-sm font-bold text-app-text">משלוחים</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  max={customMaxAmount}
                                  min={customMinAmount}
                                  step={customStep}
                                  value={customAmount}
                                  onBlur={() => setCustomAmount((amount) => clampCustomAmount(amount))}
                                  onChange={(event) =>
                                    setCustomAmount(limitCustomAmountInput(Number(event.target.value)))
                                  }
                                  onFocus={(event) => event.currentTarget.select()}
                                  className="h-8 w-14 border-0 bg-transparent px-0 text-left text-sm font-bold tabular-nums text-app-text outline-none transition-colors focus:ring-0 sm:h-9 sm:w-24"
                                  dir="ltr"
                                />
                              </label>
                              <div className="flex shrink-0 items-center justify-end gap-2">
                                <span className="max-w-20 shrink-0 text-left text-xs font-bold text-app-text-secondary sm:max-w-none sm:text-sm">
                                  <span className="block tabular-nums">{formatCurrency(customDraftPrice)}</span>
                                  <span className="hidden text-xs font-semibold text-app-text-muted sm:block">
                                    {formatCurrency(customDraftUnitPrice)} למשלוח
                                  </span>
                                </span>
                                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                                  <button
                                    type="button"
                                    onClick={() => stepCustomAmount(-1)}
                                    aria-label="הפחת כמות"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-sm)] border border-app-border bg-app-background text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:w-9"
                                    disabled={clampCustomAmount(customAmount) <= customMinAmount}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => stepCustomAmount(1)}
                                    aria-label="הוסף כמות"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--app-radius-sm)] border border-app-border bg-app-background text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:w-9"
                                    disabled={clampCustomAmount(customAmount) >= customMaxAmount}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={applyCustomAmount}
                                    className="h-8 rounded-full bg-app-text px-3 text-xs font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 sm:h-9 sm:px-4 sm:text-sm"
                                  >
                                    החל
                                  </button>
                                </div>
                              </div>
                            </div>
                            <p className="mt-3 text-xs text-app-text-muted">
                              הזן משלוחים בקפיצות של 100. מינימום רכישה: 100 משלוחים, מקסימום 300,000.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-1 max-sm:flex-col-reverse">
                  <button
                    type="button"
                    onClick={closePurchaseDialog}
                    className="h-10 rounded-full bg-app-background px-4 text-sm font-bold text-app-text transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 max-sm:w-full"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canContinuePurchase) return;
                      setPurchaseStep('payment');
                      setSelectOpen(false);
                    }}
                    disabled={!canContinuePurchase}
                    className="h-10 rounded-full bg-app-text px-5 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 disabled:cursor-not-allowed disabled:bg-app-surface-raised disabled:text-app-text-muted max-sm:w-full"
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
                  <span className="text-app-text-secondary">
                    {selectedAmount === null
                      ? 'בחר כמות משלוחים'
                      : `${formatNumber(selectedAmount)} משלוחים · ${formatCurrency(selectedUnitPrice)} למשלוח`}
                  </span>
                  <span className="font-bold tabular-nums text-app-text">
                    {selectedAmount === null ? '-' : formatCurrency(selectedPrice)}
                  </span>
                </div>

                <div className="flex justify-between gap-3 pt-1 max-sm:flex-col-reverse">
                  <button
                    type="button"
                    onClick={() => setPurchaseStep('amount')}
                    className="h-10 rounded-full bg-app-background px-4 text-sm font-bold text-app-text transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 max-sm:w-full"
                  >
                    חזרה
                  </button>
                  <button
                    type="button"
                    onClick={completePurchase}
                    disabled={!canContinuePurchase}
                    className="h-10 rounded-full bg-app-text px-5 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 disabled:cursor-not-allowed disabled:bg-app-surface-raised disabled:text-app-text-muted max-sm:w-full"
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

const InvoiceSummaryCard: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-none border border-app-border bg-app-surface p-4">
    <div className="text-xs font-bold text-app-text-secondary">{label}</div>
    <div className="mt-3 text-xl font-bold tabular-nums text-app-text">{value}</div>
  </div>
);

