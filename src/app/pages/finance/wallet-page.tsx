import React, { useMemo } from 'react';
import { Menu, Wallet, TrendingUp, Bike, Receipt, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDelivery } from '../../context/delivery.context';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useDelivery();

  const completedDeliveries = useMemo(
    () => state.deliveries.filter((delivery) => delivery.status === 'delivered'),
    [state.deliveries],
  );

  const walletStats = useMemo(() => {
    const totalRevenue = completedDeliveries.reduce((sum, delivery) => sum + (delivery.price ?? 0), 0);
    const totalCourierPay = completedDeliveries.reduce(
      (sum, delivery) => sum + (delivery.runner_price ?? delivery.courierPayment ?? 0),
      0,
    );
    const totalTips = completedDeliveries.reduce((sum, delivery) => sum + (delivery.runner_tip ?? 0), 0);
    const totalCommission = completedDeliveries.reduce((sum, delivery) => sum + (delivery.commissionAmount ?? 0), 0);
    const grossProfit = totalRevenue - totalCourierPay - totalCommission;
    const avgOrderValue = completedDeliveries.length > 0 ? totalRevenue / completedDeliveries.length : 0;

    return {
      totalRevenue,
      totalCourierPay,
      totalTips,
      totalCommission,
      grossProfit,
      avgOrderValue,
    };
  }, [completedDeliveries]);

  const recentCompleted = useMemo(
    () =>
      [...completedDeliveries]
        .sort((a, b) => new Date(b.deliveredAt ?? b.createdAt ?? 0).getTime() - new Date(a.deliveredAt ?? a.createdAt ?? 0).getTime())
        .slice(0, 6),
    [completedDeliveries],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626] md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">ארנק</span>
          <span className="text-[13px] text-[#737373] dark:text-[#a3a3a3]">סיכום כספי של המשלוחים שהושלמו</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/deliveries')}
          className="hidden items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#0a0a0a] dark:text-[#fafafa] dark:hover:bg-[#151515] md:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>למשלוחים</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">הכנסות מצטברות</span>
                <Wallet className="h-5 w-5 text-[#16a34a] dark:text-[#9fe870]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(walletStats.totalRevenue)}</div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">{completedDeliveries.length.toLocaleString('he-IL')} משלוחים הושלמו</div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">תשלומי שליחים</span>
                <Bike className="h-5 w-5 text-[#0fcdd3]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(walletStats.totalCourierPay)}</div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">כולל תשלום בסיסי לכל משלוח שהושלם</div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">רווח גולמי</span>
                <TrendingUp className="h-5 w-5 text-[#16a34a] dark:text-[#9fe870]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#166534] dark:text-[#4ade80]">{formatCurrency(walletStats.grossProfit)}</div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">הכנסות פחות שליחים ועמלות</div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">ממוצע להזמנה</span>
                <Receipt className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(walletStats.avgOrderValue)}</div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">טיפים: {formatCurrency(walletStats.totalTips)}</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-3 dark:border-[#1f1f1f] dark:bg-[#111111]">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">משלוחים אחרונים שנכנסו לארנק</div>
                <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">6 המשלוחים האחרונים שהושלמו במערכת</div>
              </div>
              <div className="divide-y divide-[#f1f1f1] dark:divide-[#1f1f1f]">
                {recentCompleted.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                        {delivery.client_name || 'לקוח'} • {delivery.rest_name || 'מסעדה'}
                      </div>
                      <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                        #{delivery.api_short_order_id || delivery.id} • {new Date(delivery.deliveredAt ?? delivery.createdAt ?? new Date()).toLocaleString('he-IL')}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-[#166534] dark:text-[#4ade80]">{formatCurrency(delivery.price ?? 0)}</div>
                      <div className="mt-1 text-xs text-[#737373] dark:text-[#a3a3a3]">
                        שליח: {formatCurrency(delivery.runner_price ?? delivery.courierPayment ?? 0)}
                      </div>
                    </div>
                  </div>
                ))}
                {recentCompleted.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[#737373] dark:text-[#a3a3a3]">
                    עדיין אין משלוחים שהושלמו, אז הארנק עוד ריק.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">פירוק כספי</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">הכנסות</span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(walletStats.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">תשלומי שליחים</span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(walletStats.totalCourierPay)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">עמלות</span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(walletStats.totalCommission)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">טיפים</span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">{formatCurrency(walletStats.totalTips)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-5 dark:border-[#1d4ed8]/30 dark:bg-[#0f172a]">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">מה מוצג כאן?</div>
                <div className="mt-2 text-sm leading-6 text-[#475569] dark:text-[#94a3b8]">
                  הארנק מציג כרגע את הכסף שנכנס מהמשלוחים שהושלמו בפועל. אם תרצה, בשלב הבא אפשר להוסיף גם משיכות,
                  העברות, יתרה זמינה ויסטוריית תנועות מלאה.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
