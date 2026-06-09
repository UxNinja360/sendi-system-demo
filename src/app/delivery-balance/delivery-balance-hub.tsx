import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Info,
  LoaderCircle,
  Minus,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Receipt,
  X,
} from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';

type PurchaseStep = 'amount' | 'payment';
type SelectDirection = 'down' | 'up';
type BalancePageTab = 'purchase' | 'invoices';

type CreditPackage = {
  amount: number;
  price: number;
};

type CouponPromotion = {
  code: string;
  discountPercent?: number;
  fixedUnitPrice?: number;
  label: string;
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
const couponPromotions: CouponPromotion[] = [
  { code: 'SENDI10', discountPercent: 10, label: '10% הנחה' },
  { code: 'PLUS20', discountPercent: 20, label: '20% הנחה' },
  { code: 'STARTER', fixedUnitPrice: 0.33, label: '0.33 ₪ למשלוח' },
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

const formatUnitCurrencyWithPrecision = (value: number, fractionDigits: number) =>
  new Intl.NumberFormat('he-IL', {
    currency: 'ILS',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: 'currency',
  }).format(value);

const formatOriginalUnitPriceForDiscount = (originalUnitPrice: number, finalUnitPrice: number) =>
  formatCurrency(originalUnitPrice) === formatCurrency(finalUnitPrice) &&
  Math.abs(originalUnitPrice - finalUnitPrice) > 0.0001
    ? formatUnitCurrencyWithPrecision(originalUnitPrice, 3)
    : formatCurrency(originalUnitPrice);

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

const invoiceGridClassName =
  'grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-[2.75rem_minmax(0,1.65fr)_minmax(6.5rem,0.85fr)_minmax(4.5rem,0.55fr)_minmax(6.5rem,0.8fr)_minmax(6.5rem,0.8fr)_2.5rem] md:items-center';

const normalizeCustomAmount = (value: number) =>
  Math.min(customMaxAmount, Math.max(customMinAmount, Number.isFinite(value) ? value : customMinAmount));

const limitCustomAmountInput = (value: number) =>
  Math.min(customMaxAmount, Math.max(0, Number.isFinite(value) ? value : 0));

const clampCustomAmount = (value: number) =>
  normalizeCustomAmount(Math.round(value / customStep) * customStep);

const roundPrice = (value: number) => Math.round(value * 100) / 100;

const normalizeCouponCode = (value: string) => value.trim().toUpperCase();

const getCouponPromotion = (code: string) =>
  couponPromotions.find((promotion) => promotion.code === normalizeCouponCode(code));

const getCouponDiscount = (price: number, amount: number, promotion?: CouponPromotion) => {
  if (!promotion) return 0;

  if (promotion.fixedUnitPrice !== undefined) {
    return roundPrice(Math.max(0, price - amount * promotion.fixedUnitPrice));
  }

  return promotion.discountPercent ? roundPrice(price * (promotion.discountPercent / 100)) : 0;
};

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
  const couponApplyTimerRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<BalancePageTab>('purchase');
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('amount');
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectDirection, setSelectDirection] = useState<SelectDirection>('down');
  const [selectDropdownFixed, setSelectDropdownFixed] = useState(false);
  const [selectDropdownStyle, setSelectDropdownStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [selectMaxHeight, setSelectMaxHeight] = useState<number | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customAmountDialogOpen, setCustomAmountDialogOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState(defaultAmount);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<'invalid' | 'missing' | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
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

  useEffect(
    () => () => {
      if (couponApplyTimerRef.current !== null) {
        window.clearTimeout(couponApplyTimerRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (!selectOpen) return undefined;

    let frame = 0;

    const updateSelectLayout = () => {
      const dropdown = amountDropdownRef.current;
      const select = amountSelectRef.current;
      if (!dropdown || !select) return;

      const viewportPadding = 16;
      const gap = 8;
      const visualViewport = window.visualViewport;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
      const selectRect = select.getBoundingClientRect();
      const dropdownHeight = dropdown.scrollHeight;
      const spaceBelow = viewportBottom - selectRect.bottom - viewportPadding;
      const spaceAbove = selectRect.top - viewportTop - viewportPadding;
      const fitsBelow = spaceBelow >= dropdownHeight + gap;
      const fitsAbove = spaceAbove >= dropdownHeight + gap;
      const shouldOpenUp = !fitsBelow && (fitsAbove || spaceAbove > spaceBelow);
      const availableSpace = Math.max(0, (shouldOpenUp ? spaceAbove : spaceBelow) - gap);
      const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;

      setSelectDirection(shouldOpenUp ? 'up' : 'down');
      setSelectMaxHeight(Math.floor(availableSpace));
      setSelectDropdownFixed(isSmallScreen);
      setSelectDropdownStyle(
        isSmallScreen
          ? (() => {
              const minComfortableHeight = 260;
              const bestSpace = Math.max(spaceAbove, spaceBelow);
              const useFullScreenPanel = bestSpace - gap < minComfortableHeight;
              const horizontalInset = Math.max(14, viewportPadding);
              const left = Math.max(horizontalInset, Math.floor(selectRect.left));
              const right = Math.max(horizontalInset, Math.floor(window.innerWidth - selectRect.right));

              if (useFullScreenPanel) {
                const fullHeight = Math.max(160, window.innerHeight - viewportPadding * 2);
                const height = Math.min(fullHeight, dropdownHeight);

                return {
                  height,
                  left: horizontalInset,
                  maxHeight: fullHeight,
                  position: 'fixed',
                  right: horizontalInset,
                  top: viewportPadding,
                  width: 'auto',
                };
              }

              if (shouldOpenUp) {
                const bottom = Math.max(
                  viewportPadding,
                  Math.ceil(window.innerHeight - selectRect.top + gap),
                );
                const availableHeight = Math.max(160, window.innerHeight - viewportPadding - bottom);
                const height = Math.min(availableHeight, dropdownHeight);

                return {
                  bottom,
                  height,
                  left,
                  maxHeight: availableHeight,
                  position: 'fixed',
                  right,
                  width: 'auto',
                };
              }

              const top = Math.max(viewportPadding, Math.floor(selectRect.bottom + gap));
              const availableHeight = Math.max(160, window.innerHeight - top - viewportPadding);
              const height = Math.min(availableHeight, dropdownHeight);

              return {
                height,
                left,
                maxHeight: availableHeight,
                position: 'fixed',
                right,
                top,
                width: 'auto',
              };
            })()
          : { maxHeight: Math.floor(availableSpace) },
      );
    };

    const scheduleSelectLayoutUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateSelectLayout);
    };

    updateSelectLayout();
    window.addEventListener('resize', scheduleSelectLayoutUpdate);
    window.addEventListener('scroll', scheduleSelectLayoutUpdate, true);
    window.visualViewport?.addEventListener('resize', scheduleSelectLayoutUpdate);
    window.visualViewport?.addEventListener('scroll', scheduleSelectLayoutUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleSelectLayoutUpdate);
      window.removeEventListener('scroll', scheduleSelectLayoutUpdate, true);
      window.visualViewport?.removeEventListener('resize', scheduleSelectLayoutUpdate);
      window.visualViewport?.removeEventListener('scroll', scheduleSelectLayoutUpdate);
    };
  }, [selectOpen]);

  const currentBalance = state.deliveryBalance;
  const deliveryBalanceTextClass =
    currentBalance <= 100
      ? 'text-[#dc2626] dark:text-[#f87171]'
      : 'text-[#f59e0b] dark:text-[#fbbf24]';
  const selectedPrice = selectedAmount === null ? 0 : getPackagePrice(selectedAmount);
  const appliedCoupon = appliedCouponCode ? getCouponPromotion(appliedCouponCode) : undefined;
  const selectedDiscount =
    selectedAmount === null ? 0 : getCouponDiscount(selectedPrice, selectedAmount, appliedCoupon);
  const selectedFinalPrice =
    selectedAmount === null ? 0 : roundPrice(Math.max(0, selectedPrice - selectedDiscount));
  const selectedUnitPrice = selectedAmount === null ? 0 : selectedFinalPrice / selectedAmount;
  const selectedOriginalUnitPrice = selectedAmount === null ? 0 : selectedPrice / selectedAmount;
  const hasSelectedDiscount = selectedDiscount > 0;
  const couponButtonAriaLabel = couponChecking
    ? 'בודק קופון'
    : appliedCoupon
      ? 'הקופון הוחל'
      : couponFeedback === 'invalid'
        ? 'קוד הקופון לא תקף'
        : couponFeedback === 'missing'
          ? 'חסר קוד קופון'
          : 'הפעל קופון';
  const appliedCouponNoticeText = appliedCoupon
    ? appliedCoupon.fixedUnitPrice !== undefined
      ? `הקופון ${appliedCoupon.code} פעיל. מחיר מבצע ${formatCurrency(appliedCoupon.fixedUnitPrice)} למשלוח.`
      : `הקופון ${appliedCoupon.code} פעיל. ${appliedCoupon.label}.`
    : null;
  const canContinuePurchase = selectedAmount !== null;
  const showPurchaseDock = activeTab === 'purchase' && purchaseStep === 'amount' && selectedAmount !== null;
  const customDraftUnitPrice = getPackageUnitPrice(clampCustomAmount(customAmount));

  const clearCouponApplyTimer = () => {
    if (couponApplyTimerRef.current !== null) {
      window.clearTimeout(couponApplyTimerRef.current);
      couponApplyTimerRef.current = null;
    }
  };

  const resetPurchaseSelection = () => {
    setPurchaseStep('amount');
    setSelectOpen(false);
    setSelectDirection('down');
    setSelectDropdownFixed(false);
    setSelectDropdownStyle(undefined);
    setSelectMaxHeight(null);
    setSelectedAmount(null);
    setCustomAmount(defaultAmount);
    setCustomMode(false);
    setCustomAmountDialogOpen(false);
    setCouponCode('');
    setAppliedCouponCode(null);
    setCouponFeedback(null);
    setCouponChecking(false);
    clearCouponApplyTimer();
  };

  const openPurchaseDialog = () => {
    resetPurchaseSelection();
    setActiveTab('purchase');
    setPurchaseDialogOpen(true);
  };

  const closePurchaseDialog = () => {
    setPurchaseDialogOpen(false);
    setPurchaseStep('amount');
    setSelectOpen(false);
    setSelectDirection('down');
    setSelectDropdownFixed(false);
    setSelectDropdownStyle(undefined);
    setSelectMaxHeight(null);
    setCustomAmountDialogOpen(false);
  };

  useEffect(() => {
    if (!purchaseDialogOpen) return undefined;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || purchaseCardRef.current?.contains(target)) {
        return;
      }

      closePurchaseDialog();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown);

    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
  }, [purchaseDialogOpen]);

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
    setSelectDropdownFixed(false);
    setSelectDropdownStyle(undefined);
    setSelectMaxHeight(null);
  };

  const openCustomAmountDialog = () => {
    setCustomAmount(selectedAmount ?? defaultAmount);
    setSelectOpen(false);
    setSelectDropdownFixed(false);
    setSelectDropdownStyle(undefined);
    setSelectMaxHeight(null);
    setCustomAmountDialogOpen(true);
  };

  const closeCustomAmountDialog = () => {
    setCustomAmountDialogOpen(false);
  };

  const selectPackage = (amount: number) => {
    const shouldClearSelection = !customMode && selectedAmount === amount;

    if (shouldClearSelection) {
      setSelectedAmount(null);
      setCustomMode(false);
      setSelectOpen(false);
      setSelectDropdownFixed(false);
      setSelectDropdownStyle(undefined);
      setSelectMaxHeight(null);
      return;
    }

    setSelectedAmount(amount);
    setCustomAmount(amount);
    setCustomMode(false);
    setSelectOpen(false);
    setSelectDropdownFixed(false);
    setSelectDropdownStyle(undefined);
    setSelectMaxHeight(null);
  };

  const applyCustomAmount = () => {
    const amount = clampCustomAmount(customAmount);
    setSelectedAmount(amount);
    setCustomAmount(amount);
    setCustomMode(true);
    setCustomAmountDialogOpen(false);
    setSelectOpen(false);
    setSelectDropdownFixed(false);
    setSelectDropdownStyle(undefined);
    setSelectMaxHeight(null);
  };

  const stepCustomAmount = (direction: -1 | 1) => {
    setCustomAmount((amount) => clampCustomAmount(amount + direction * customStep));
  };

  const handleCouponCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    clearCouponApplyTimer();
    setCouponCode(event.target.value.toUpperCase());
    setAppliedCouponCode(null);
    setCouponFeedback(null);
    setCouponChecking(false);
  };

  const applyCouponCode = () => {
    const normalizedCode = normalizeCouponCode(couponCode);

    setCouponCode(normalizedCode);
    setAppliedCouponCode(null);
    setCouponFeedback(null);
    setCouponChecking(true);
    clearCouponApplyTimer();

    couponApplyTimerRef.current = window.setTimeout(() => {
      if (!normalizedCode) {
        setAppliedCouponCode(null);
        setCouponFeedback('missing');
        setCouponChecking(false);
        couponApplyTimerRef.current = null;
        return;
      }

      const promotion = getCouponPromotion(normalizedCode);
      if (!promotion) {
        setAppliedCouponCode(null);
        setCouponFeedback('invalid');
        setCouponChecking(false);
        couponApplyTimerRef.current = null;
        return;
      }

      setAppliedCouponCode(normalizedCode);
      setCouponFeedback(null);
      setCouponChecking(false);
      couponApplyTimerRef.current = null;
    }, 450);
  };

  const completePurchase = () => {
    if (selectedAmount === null) return;

    const amount = selectedAmount;
    const price = selectedFinalPrice;
    const unitPrice = selectedUnitPrice;
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
    setActiveTab('invoices');
  };

  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-3 text-right" dir="rtl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal text-app-text">
            יתרת משלוחים
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-app-text-secondary">
            יתרת משלוחים משמשת לחיוב משלוחים במערכת, עם חבילות שמוזילות את העלות לפי נפח.
            <a
              href="/delivery-balance/pricing"
              target="_blank"
              rel="noreferrer"
              aria-label="למד עוד על יתרת משלוחים"
              className="ms-1 inline-flex items-center gap-1 text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/35"
            >
              <span>למד עוד</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-app-border bg-app-background px-4 text-sm font-bold text-app-text">
            <span className={`tabular-nums ${deliveryBalanceTextClass}`}>
              {formatNumber(currentBalance)}
            </span>
            <Package aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${deliveryBalanceTextClass}`} />
          </div>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="ניהול יתרת משלוחים"
        className="flex w-full items-end gap-7 border-b border-app-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'purchase'}
          onClick={() => setActiveTab('purchase')}
          className={`relative -mb-px h-10 px-0 text-sm font-bold transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/35 ${
            activeTab === 'purchase'
              ? 'text-app-text after:bg-app-text'
              : 'text-app-text-secondary after:bg-transparent hover:text-app-text'
          }`}
        >
          רכישה
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'invoices'}
          onClick={() => setActiveTab('invoices')}
          className={`relative -mb-px h-10 px-0 text-sm font-bold transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/35 ${
            activeTab === 'invoices'
              ? 'text-app-text after:bg-app-text'
              : 'text-app-text-secondary after:bg-transparent hover:text-app-text'
          }`}
        >
          חשבוניות
        </button>
      </div>

      {activeTab === 'purchase' ? (
        <section className="mt-3" aria-label="רכישת יתרה">
          <div className="p-0">
            {purchaseStep === 'amount' ? (
              <div className="space-y-5">
                {appliedCouponNoticeText ? (
                  <div
                    role="status"
                    className="flex min-h-10 items-center gap-2 rounded-[4px] bg-[#1F1F1F] px-3 py-2 text-xs font-medium leading-5 text-[#EDEDED] ring-1 ring-white/5"
                  >
                    <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-[#A1A1A1]" />
                    <span>{appliedCouponNoticeText}</span>
                  </div>
                ) : null}

                <div>
                  <div className="flex flex-col overflow-hidden border border-app-border bg-app-background">
                    {creditPackages.map((option) => {
                      const selected = !customMode && selectedAmount === option.amount;
                      const unitPrice = option.price / option.amount;
                      const optionDiscount = getCouponDiscount(option.price, option.amount, appliedCoupon);
                      const optionFinalPrice = roundPrice(Math.max(0, option.price - optionDiscount));
                      const optionFinalUnitPrice = optionFinalPrice / option.amount;
                      const hasOptionDiscount = optionDiscount > 0;
                      const optionOriginalUnitPriceLabel = formatOriginalUnitPriceForDiscount(
                        unitPrice,
                        optionFinalUnitPrice,
                      );

                      return (
                        <button
                          key={option.amount}
                          type="button"
                          onClick={() => selectPackage(option.amount)}
                          aria-pressed={selected}
                          className={`grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-app-border px-4 py-3 text-right transition-colors last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
                            selected
                              ? 'bg-app-surface-raised text-app-text'
                              : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-base font-bold text-app-text">
                              {formatNumber(option.amount)} משלוחים
                            </span>
                            {hasOptionDiscount ? (
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
                                <span className="text-app-text-muted line-through decoration-app-text-muted/70">
                                  {optionOriginalUnitPriceLabel}
                                </span>
                                <span className="text-app-text-secondary">
                                  {formatCurrency(optionFinalUnitPrice)} למשלוח
                                </span>
                              </span>
                            ) : (
                              <span className="mt-1 block text-xs font-semibold text-app-text-muted">
                                {formatCurrency(unitPrice)} למשלוח
                              </span>
                            )}
                          </span>
                          <span className="flex flex-col items-end gap-1 font-bold tabular-nums text-app-text">
                            {hasOptionDiscount ? (
                              <span className="text-xs font-semibold text-app-text-muted line-through decoration-app-text-muted/70">
                                {formatCurrency(option.price)}
                              </span>
                            ) : null}
                            <span>{formatCurrency(optionFinalPrice)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`border transition-colors ${
                    customMode
                      ? 'border-app-border-strong bg-app-surface-raised'
                      : 'border-app-border bg-app-background'
                  }`}
                >
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={customAmountDialogOpen}
                    onClick={openCustomAmountDialog}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                  >
                    <span className="inline-flex min-w-0 items-center text-sm font-bold text-app-text">
                      <span className="truncate">כמות מותאמת אישית</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-app-text-secondary">
                      {customMode && selectedAmount !== null ? (
                        <span>{formatNumber(selectedAmount)} משלוחים</span>
                      ) : null}
                      <Pencil className="h-4 w-4 shrink-0 text-app-brand-text" />
                    </span>
                  </button>
                </div>

                <div className="px-1 py-0">
                  <div
                    className="flex h-9 w-full min-w-0 overflow-hidden rounded-none border border-app-border bg-transparent focus-within:border-app-text focus-within:ring-0 md:w-96"
                    dir="rtl"
                  >
                    <input
                      type="text"
                      value={couponCode}
                      onChange={handleCouponCodeChange}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          applyCouponCode();
                        }
                      }}
                      placeholder="קוד קופון"
                      className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-right text-xs font-bold tracking-normal text-app-text outline-none focus:ring-0"
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={applyCouponCode}
                      disabled={couponChecking}
                      aria-label={couponButtonAriaLabel}
                      aria-live="polite"
                      className={`h-full min-w-[3.5rem] shrink-0 border-r border-app-border bg-transparent px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-app-border-strong ${
                        couponFeedback === 'invalid'
                          ? 'text-[#ef4444]'
                          : 'text-app-text-secondary hover:text-app-text'
                      } ${couponChecking ? 'cursor-wait' : ''}`}
                    >
                      {couponChecking ? (
                        <LoaderCircle aria-hidden="true" className="mx-auto h-3.5 w-3.5 animate-spin" />
                      ) : appliedCoupon ? (
                        <Check aria-hidden="true" className="mx-auto h-3.5 w-3.5 text-app-text" />
                      ) : couponFeedback === 'invalid' ? (
                        'לא תקף'
                      ) : couponFeedback === 'missing' ? (
                        'חסר'
                      ) : (
                        'הפעל'
                      )}
                    </button>
                  </div>
                </div>

                {showPurchaseDock ? (
                  <div
                    className="delivery-balance-purchase-dock fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-background shadow-[0_18px_48px_rgba(0,0,0,0.36)] md:sticky md:bottom-4 md:left-auto md:right-auto md:z-10 md:mt-1 md:shadow-none"
                    aria-label="שורת תשלום"
                  >
                    <div className="flex items-center justify-between gap-3 px-3 py-3 md:px-4">
                      <div className="min-w-0 flex-1 text-right">
                        {hasSelectedDiscount ? (
                          <span className="mb-0.5 block text-xs font-semibold tabular-nums text-app-text-muted line-through decoration-app-text-muted/70">
                            {formatCurrency(selectedPrice)}
                          </span>
                        ) : null}
                        <span className="block text-base font-bold tabular-nums text-app-text">
                          {formatCurrency(selectedFinalPrice)}
                        </span>
                        <div className="mt-1 flex flex-row flex-wrap items-center justify-start gap-x-2 gap-y-0.5 text-xs text-app-text-secondary min-[380px]:gap-x-3">
                          <span className="whitespace-nowrap">{formatNumber(selectedAmount)} משלוחים</span>
                          <span className="hidden h-3 w-px bg-app-border min-[380px]:block" aria-hidden="true" />
                          {hasSelectedDiscount ? (
                            <>
                              <span className="whitespace-nowrap text-app-text-muted line-through decoration-app-text-muted/70">
                                {formatOriginalUnitPriceForDiscount(selectedOriginalUnitPrice, selectedUnitPrice)}
                              </span>
                              <span className="hidden h-3 w-px bg-app-border min-[380px]:block" aria-hidden="true" />
                            </>
                          ) : null}
                          <span className="whitespace-nowrap">{formatCurrency(selectedUnitPrice)} למשלוח</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPurchaseStep('payment')}
                        className="h-10 shrink-0 rounded-none bg-app-text px-5 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
                      >
                        המשך לתשלום
                      </button>
                    </div>
                  </div>
                ) : null}
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
                      className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        inputMode="numeric"
                        placeholder="MM / YY"
                        className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
                      />
                      <input
                        inputMode="numeric"
                        placeholder="CVC"
                        className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
                      />
                    </div>
                    <input
                      placeholder="שם בעל הכרטיס"
                      className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-[var(--app-radius-sm)] bg-app-background px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-app-text-secondary">
                    {selectedAmount === null
                      ? 'בחר כמות משלוחים'
                      : `${formatNumber(selectedAmount)} משלוחים · ${formatCurrency(selectedUnitPrice)} למשלוח`}
                  </span>
                  <span className="font-bold tabular-nums text-app-text">
                    {selectedAmount === null ? '-' : formatCurrency(selectedFinalPrice)}
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
        </section>
      ) : (
        <section className="mt-3 space-y-3" aria-label="חשבוניות">
          {purchaseInvoices.length > 0 ? (
            <div className="md:overflow-hidden md:rounded-none md:border md:border-app-border md:bg-app-surface">
              <div role="table" aria-label="חשבוניות רכישת יתרה">
                <div
                  role="row"
                  className={`${invoiceGridClassName} hidden border-b border-app-border bg-app-background/35 px-5 py-3 text-xs font-bold text-app-text-secondary md:grid`}
                >
                  <div role="columnheader" aria-label="סוג חשבונית" />
                  <div role="columnheader">חשבונית</div>
                  <div role="columnheader">תאריך</div>
                  <div role="columnheader">כמות</div>
                  <div role="columnheader">מחיר למשלוח</div>
                  <div role="columnheader">סה״כ</div>
                  <div role="columnheader" aria-label="פעולות" />
                </div>

                <div role="rowgroup" className="space-y-3 md:space-y-0 md:divide-y md:divide-app-border">
                  {purchaseInvoices.map((invoice) => (
                    <InvoiceLedgerRow key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-44 items-center justify-center rounded-none border border-app-border bg-app-surface px-4 py-8 text-center text-sm text-app-text-secondary">
              עדיין אין חשבוניות רכישה.
            </div>
          )}
        </section>
      )}

      {customAmountDialogOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCustomAmountDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-amount-dialog-title"
            className="relative w-full max-w-[44rem] overflow-hidden rounded-[var(--app-radius-lg)] border border-app-border bg-app-background text-right shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeCustomAmountDialog}
              aria-label="סגירה"
              className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-5 pb-6 pt-6 sm:px-7 sm:pt-7">
              <h2 id="custom-amount-dialog-title" className="text-xl font-bold text-app-text">
                כמות מותאמת אישית
              </h2>
              <p className="mt-2 text-sm leading-6 text-app-text-secondary">
                בחר כמות משלוחים בקפיצות של 100.
              </p>

              <div className="mt-6 grid grid-cols-2 border-y border-app-border py-5">
                <div className="border-l border-app-border px-4 text-center">
                  <div className="text-sm font-semibold text-app-text-secondary">כמות משלוחים</div>
                  <div className="mt-3 text-2xl font-bold tabular-nums text-app-text">
                    {formatNumber(clampCustomAmount(customAmount))}
                  </div>
                </div>
                <div className="px-4 text-center">
                  <div className="text-sm font-semibold text-app-text-secondary">מחיר למשלוח</div>
                  <div className="mt-3 text-2xl font-bold tabular-nums text-app-text">
                    {formatCurrency(customDraftUnitPrice)}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-semibold text-app-text-secondary" htmlFor="custom-delivery-amount">
                  כמות משלוחים
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => stepCustomAmount(-1)}
                    aria-label="הפחת כמות"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-app-border bg-app-background text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={clampCustomAmount(customAmount) <= customMinAmount}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <label className="flex h-12 min-w-0 flex-1 overflow-hidden rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface focus-within:border-app-text focus-within:ring-0">
                    <input
                      id="custom-delivery-amount"
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
                      className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-base font-bold tabular-nums text-app-text outline-none focus:ring-0"
                      dir="ltr"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => stepCustomAmount(1)}
                    aria-label="הוסף כמות"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-none border border-app-border bg-app-background text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={clampCustomAmount(customAmount) >= customMaxAmount}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {creditPackages.map((option) => {
                  const active = clampCustomAmount(customAmount) === option.amount;

                  return (
                    <button
                      key={option.amount}
                      type="button"
                      onClick={() => setCustomAmount(option.amount)}
                      className={`h-11 rounded-[var(--app-radius-sm)] border px-3 text-sm font-bold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 ${
                        active
                          ? 'border-app-border-strong bg-app-surface-raised text-app-text'
                          : 'border-app-border bg-app-background text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
                      }`}
                    >
                      {formatNumber(option.amount)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-app-border px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={closeCustomAmountDialog}
                className="h-11 rounded-none border border-app-border bg-app-background px-5 text-sm font-bold text-app-text transition-colors hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={applyCustomAmount}
                className="h-11 rounded-none bg-app-text px-6 text-sm font-bold text-app-background transition-colors hover:bg-app-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
              >
                בחר כמות
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {purchaseDialogOpen ? (
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-dialog-title"
            className="relative z-10 w-full max-w-[44rem] overflow-visible rounded-[var(--app-radius-lg)] border border-app-border bg-app-surface p-6 text-right shadow-2xl sm:p-7"
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
              <h2 id="purchase-dialog-title" className="text-lg font-bold text-app-text">
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
                      onClick={() => {
                        setSelectOpen((open) => !open);
                        setSelectDropdownFixed(false);
                        setSelectDropdownStyle(undefined);
                        setSelectMaxHeight(null);
                      }}
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
                          <span className="tabular-nums">{formatCurrency(selectedFinalPrice)}</span>
                        ) : null}
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </button>

                    {selectOpen ? (
                      <div
                        ref={amountDropdownRef}
                        className={`z-50 overflow-y-auto overscroll-contain rounded-[var(--app-radius-md)] border border-app-border bg-app-surface shadow-2xl ${
                          selectDropdownStyle === undefined ? 'invisible pointer-events-none' : ''
                        } ${
                          selectDropdownFixed
                            ? 'fixed'
                            : `absolute right-0 w-full ${
                                selectDirection === 'up' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'
                              }`
                        }`}
                        style={selectDropdownStyle}
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
                          aria-haspopup="dialog"
                          aria-expanded={customAmountDialogOpen}
                          onClick={openCustomAmountDialog}
                          className={`flex h-12 w-full items-center justify-between gap-3 border-t border-app-border px-4 text-sm font-semibold transition-colors hover:bg-app-surface-raised hover:text-app-text ${
                            customMode
                              ? 'bg-app-surface-raised text-app-text'
                              : 'text-app-text-secondary'
                          }`}
                        >
                          <span className="inline-flex min-w-0 items-center">
                            <span className="truncate">כמות מותאמת</span>
                          </span>
                          <Pencil className="h-4 w-4 shrink-0" />
                        </button>
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
              <div className="mt-5 space-y-5">
                <div className="rounded-[var(--app-radius-md)] border border-app-border bg-app-background p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-app-text">
                    <CreditCard className="h-4 w-4 text-app-brand-text" />
                    כרטיס אשראי
                  </div>
                  <div className="mt-4 grid gap-3">
                    <input
                      inputMode="numeric"
                      placeholder="מספר כרטיס"
                      className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        inputMode="numeric"
                        placeholder="MM / YY"
                        className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
                      />
                      <input
                        inputMode="numeric"
                        placeholder="CVC"
                        className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
                      />
                    </div>
                    <input
                      placeholder="שם בעל הכרטיס"
                      className="h-11 rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none focus:border-app-text focus:ring-0"
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
                    {selectedAmount === null ? '-' : formatCurrency(selectedFinalPrice)}
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

const InvoiceLedgerRow: React.FC<{
  invoice: PurchaseInvoice;
}> = ({ invoice }) => {
  const issuedAt = new Date(invoice.issuedAt);
  const issuedAtText = formatDateTime(issuedAt);
  const amountText = formatNumber(invoice.amount);
  const unitPriceText = formatTableCurrency(invoice.unitPrice);
  const totalText = formatTableCurrency(invoice.total);

  return (
    <div role="row">
      <div className={`${invoiceGridClassName} hidden px-5 py-4 transition-colors hover:bg-app-surface-raised/30 md:grid md:min-h-[72px]`}>
        <div role="cell" className="flex items-center justify-start">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-background text-app-text-secondary">
            <Receipt className="h-4 w-4" />
          </span>
        </div>
        <div role="cell" className="min-w-0">
          <div className="truncate text-sm font-bold text-app-text" dir="ltr">
            {invoice.invoiceNumber}
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-app-text-muted">
            יתרה אחרי רכישה: {formatNumber(invoice.balanceAfter)}
          </div>
        </div>
        <InvoiceDesktopCell value={issuedAtText} />
        <InvoiceDesktopCell value={amountText} />
        <InvoiceDesktopCell dir="ltr" value={unitPriceText} />
        <InvoiceDesktopCell dir="ltr" emphasis value={totalText} />
        <div role="cell" className="flex items-center justify-end">
          <button
            type="button"
            aria-label={`פעולות חשבונית ${invoice.invoiceNumber}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded-[var(--app-radius-sm)] border border-app-border bg-app-surface md:hidden">
        <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-background text-app-text-secondary">
              <Receipt className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-app-text" dir="ltr">
                {invoice.invoiceNumber}
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-app-text-muted">
                יתרה אחרי רכישה: {formatNumber(invoice.balanceAfter)}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label={`פעולות חשבונית ${invoice.invoiceNumber}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--app-radius-sm)] text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-app-border px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InvoiceMobileMetric label="תאריך" value={issuedAtText} />
            <InvoiceMobileMetric label="כמות" value={amountText} />
            <InvoiceMobileMetric dir="ltr" label="מחיר למשלוח" value={unitPriceText} />
            <InvoiceMobileMetric dir="ltr" emphasis label="סה״כ" value={totalText} />
          </dl>
        </div>
      </article>
    </div>
  );
};

const InvoiceDesktopCell: React.FC<{
  dir?: 'auto' | 'ltr' | 'rtl';
  emphasis?: boolean;
  value: string;
}> = ({ dir, emphasis = false, value }) => (
  <div role="cell" className="min-w-0">
    <div
      className={`truncate text-sm font-bold tabular-nums ${
        emphasis ? 'text-app-text' : 'text-app-text-secondary'
      }`}
      dir={dir}
    >
      {value}
    </div>
  </div>
);

const InvoiceMobileMetric: React.FC<{
  dir?: 'auto' | 'ltr' | 'rtl';
  emphasis?: boolean;
  label: string;
  value: string;
}> = ({ dir, emphasis = false, label, value }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-bold text-app-text-muted">
      {label}
    </dt>
    <dd
      className={`mt-1 truncate text-sm font-bold tabular-nums ${
        emphasis ? 'text-app-text' : 'text-app-text-secondary'
      }`}
      dir={dir}
    >
      {value}
    </dd>
  </div>
);
