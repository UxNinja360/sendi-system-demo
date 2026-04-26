import React, { useState } from 'react';
import {
  Package,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  ChevronLeft,
  Minus,
  Plus,
  CircleDollarSign,
} from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';

export const DeliveryBalanceHub: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const [purchaseAmount, setPurchaseAmount] = useState(5000);
  const [isHovering, setIsHovering] = useState(false);

  const currentBalance = state.deliveryBalance;
  const minAmount = 100;
  const maxAmount = 300000;

  const minLog = Math.log(minAmount);
  const maxLog = Math.log(maxAmount);

  const getSliderValue = (value: number) => ((Math.log(value) - minLog) / (maxLog - minLog)) * 100;
  const getRealValue = (position: number) => {
    if (position === 0) return minAmount;
    return Math.round(Math.exp(minLog + (position / 100) * (maxLog - minLog)) / 100) * 100;
  };

  const getPricePerUnit = (amount: number) => {
    if (amount < 1000) return 0.5;
    if (amount < 10000) return 0.45;
    if (amount < 50000) return 0.4;
    return 0.35;
  };

  const pricePerUnit = getPricePerUnit(purchaseAmount);
  const totalPrice = purchaseAmount * pricePerUnit;
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('he-IL').format(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = getRealValue(Number(e.target.value));
    setPurchaseAmount(Math.min(Math.max(nextValue, minAmount), maxAmount));
  };

  const adjustAmount = (delta: number) => {
    setPurchaseAmount((prev) => Math.min(Math.max(prev + delta, minAmount), maxAmount));
  };

  const handleCheckout = () => {
    dispatch({
      type: 'ADD_DELIVERY_BALANCE',
      payload: purchaseAmount,
    });

    setPurchaseAmount(5000);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]" dir="rtl">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717]">
          <div className="grid grid-cols-1 divide-y divide-[#f1f1f1] dark:divide-[#1f1f1f] md:grid-cols-3 md:divide-x md:divide-y-0 md:[direction:ltr]">
            <div className="p-5 md:[direction:rtl]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#666d80] dark:text-[#a3a3a3]">
                <Package className="h-4 w-4" />
                יתרה נוכחית
              </div>
              <div className="text-3xl font-bold tabular-nums text-[#0d0d12] dark:text-[#fafafa]">
                {formatNumber(currentBalance)}
              </div>
              <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">משלוחים זמינים במערכת</div>
            </div>

            <div className="p-5 md:[direction:rtl]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#666d80] dark:text-[#a3a3a3]">
                <TrendingUp className="h-4 w-4" />
                צריכה חודשית
              </div>
              <div className="text-3xl font-bold tabular-nums text-[#0d0d12] dark:text-[#fafafa]">2,450</div>
              <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">לפי 30 הימים האחרונים</div>
            </div>

            <div className="p-5 md:[direction:rtl]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#666d80] dark:text-[#a3a3a3]">
                <CircleDollarSign className="h-4 w-4" />
                מחיר נוכחי
              </div>
              <div className="text-3xl font-bold tabular-nums text-[#0d0d12] dark:text-[#fafafa]">
                {formatCurrency(pricePerUnit)}
              </div>
              <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">למשלוח בכמות שנבחרה</div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717]">
          <div className="border-b border-[#e5e5e5] px-4 py-3 dark:border-[#1f1f1f]">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-[#16a34a] dark:text-[#9fe870]" />
              <span className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">רכישת חבילת משלוחים</span>
            </div>
          </div>

          <div className="space-y-5 p-4 md:p-5">
            <div className="rounded-xl border border-[#ececec] bg-[#fafafa] p-4 dark:border-[#202020] dark:bg-[#111111]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#666d80] dark:text-[#a3a3a3]">כמות להזמנה</div>
                  <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums text-[#0d0d12] dark:text-[#fafafa]">
                    {formatNumber(purchaseAmount)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustAmount(-100)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white text-[#666d80] transition-colors hover:border-[#d6d6d6] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => adjustAmount(100)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white text-[#666d80] transition-colors hover:border-[#d6d6d6] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#a3a3a3] dark:hover:bg-[#202020]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <input
                type="number"
                value={purchaseAmount}
                onChange={(e) => {
                  const value = Math.min(Math.max(Number(e.target.value), minAmount), maxAmount);
                  setPurchaseAmount(value);
                }}
                className="mb-4 w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-right text-base font-medium text-[#0d0d12] outline-none transition-colors placeholder:text-[#a3a3a3] focus:border-[#9fe870] dark:border-[#262626] dark:bg-[#171717] dark:text-[#fafafa]"
              />

              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={getSliderValue(purchaseAmount)}
                onChange={handleSliderChange}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#dddddd] accent-[#9fe870] dark:bg-[#2a2a2a]"
              />

              <div className="mt-2 flex justify-between text-[11px] font-medium text-[#737373] dark:text-[#a3a3a3]">
                <span>100</span>
                <span>300K</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[1000, 5000, 20000, 50000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setPurchaseAmount(amount)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                    purchaseAmount === amount
                      ? 'border-[#0d0d12] bg-[#0d0d12] text-white dark:border-[#fafafa] dark:bg-[#fafafa] dark:text-[#0d0d12]'
                      : 'border-[#e5e5e5] bg-white text-[#36394a] hover:bg-[#f5f5f5] dark:border-[#262626] dark:bg-[#171717] dark:text-[#d4d4d4] dark:hover:bg-[#202020]'
                  }`}
                >
                  +{formatNumber(amount)}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-dashed border-[#d7d7d7] px-4 py-3 text-xs text-[#666d80] dark:border-[#2a2a2a] dark:text-[#a3a3a3]">
              מדרגות מחיר:
              {' '}
              עד 999 ב־₪0.50,
              {' '}
              עד 9,999 ב־₪0.45,
              {' '}
              עד 49,999 ב־₪0.40,
              {' '}
              ומעל זה ב־₪0.35.
            </div>
          </div>
        </section>
      </div>

      <aside className="h-fit overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717] xl:sticky xl:top-6">
        <div className="border-b border-[#e5e5e5] px-4 py-3 dark:border-[#1f1f1f]">
          <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">סיכום רכישה</div>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-3 rounded-xl border border-[#ececec] bg-[#fafafa] p-4 dark:border-[#202020] dark:bg-[#111111]">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[#666d80] dark:text-[#a3a3a3]">כמות</span>
              <span className="font-semibold tabular-nums text-[#0d0d12] dark:text-[#fafafa]">{formatNumber(purchaseAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[#666d80] dark:text-[#a3a3a3]">מחיר ליחידה</span>
              <span className="font-semibold tabular-nums text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(pricePerUnit)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#e5e5e5] pt-3 text-sm dark:border-[#262626]">
              <span className="font-medium text-[#0d0d12] dark:text-[#fafafa]">סה"כ לתשלום</span>
              <span className="text-2xl font-bold tabular-nums text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#9fe870] px-4 py-3 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#8ed75f]"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <CreditCard className={`h-4 w-4 transition-transform ${isHovering ? 'rotate-12' : ''}`} />
            רכוש יתרה
            <ChevronLeft className={`h-4 w-4 transition-transform ${isHovering ? '-translate-x-1' : ''}`} />
          </button>

          <div className="text-center text-xs text-[#666d80] dark:text-[#a3a3a3]">
            המחיר כולל מע"מ
          </div>
        </div>
      </aside>
    </div>
  );
};
