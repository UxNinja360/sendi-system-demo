import React, { useMemo } from 'react';
import { ArrowLeft, Bike, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageToolbar } from '../components/common/page-toolbar';
import { useDelivery } from '../context/delivery-context-value';
import {
  formatCurrency,
  getDeliveryCommission,
  getDeliveryCourierBasePay,
  getDeliveryCourierTip,
  getDeliveryCustomerCharge,
  sumDeliveryMoney,
} from '../utils/delivery-finance';

const TEXT = {
  title: '\u05d0\u05e8\u05e0\u05e7',
  summary:
    '\u05e1\u05d9\u05db\u05d5\u05dd\u0020\u05db\u05e1\u05e4\u05d9\u0020\u05e9\u05dc\u0020\u05d4\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd\u0020\u05e9\u05d4\u05d5\u05e9\u05dc\u05de\u05d5',
  toDeliveries: '\u05dc\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  totalRevenue: '\u05d4\u05db\u05e0\u05e1\u05d5\u05ea\u0020\u05de\u05e6\u05d8\u05d1\u05e8\u05d5\u05ea',
  completedDeliveries: '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd\u0020\u05d4\u05d5\u05e9\u05dc\u05de\u05d5',
  courierPayments: '\u05ea\u05e9\u05dc\u05d5\u05de\u05d9\u0020\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
  courierPaymentsHint:
    '\u05db\u05d5\u05dc\u05dc\u0020\u05ea\u05e9\u05dc\u05d5\u05dd\u0020\u05d1\u05e1\u05d9\u05e1\u05d9\u0020\u05dc\u05db\u05dc\u0020\u05de\u05e9\u05dc\u05d5\u05d7\u0020\u05e9\u05d4\u05d5\u05e9\u05dc\u05dd',
  grossProfit: '\u05e8\u05d5\u05d5\u05d7\u0020\u05d2\u05d5\u05dc\u05de\u05d9',
  grossProfitHint:
    '\u05d4\u05db\u05e0\u05e1\u05d5\u05ea\u0020\u05e4\u05d7\u05d5\u05ea\u0020\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd\u0020\u05d5\u05e2\u05de\u05dc\u05d5\u05ea',
  averageOrderValue: '\u05de\u05de\u05d5\u05e6\u05e2\u0020\u05dc\u05d4\u05d6\u05de\u05e0\u05d4',
  tips: '\u05d8\u05d9\u05e4\u05d9\u05dd',
  latestDeliveries:
    '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd\u0020\u05d0\u05d7\u05e8\u05d5\u05e0\u05d9\u05dd\u0020\u05e9\u05e0\u05db\u05e0\u05e1\u05d5\u0020\u05dc\u05d0\u05e8\u05e0\u05e7',
  latestDeliveriesHint:
    '\u0036\u0020\u05d4\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd\u0020\u05d4\u05d0\u05d7\u05e8\u05d5\u05e0\u05d9\u05dd\u0020\u05e9\u05d4\u05d5\u05e9\u05dc\u05de\u05d5\u0020\u05d1\u05de\u05e2\u05e8\u05db\u05ea',
  customer: '\u05dc\u05e7\u05d5\u05d7',
  restaurant: '\u05de\u05e1\u05e2\u05d3\u05d4',
  courier: '\u05e9\u05dc\u05d9\u05d7',
  emptyRecent:
    '\u05e2\u05d3\u05d9\u05d9\u05df\u0020\u05d0\u05d9\u05df\u0020\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd\u0020\u05e9\u05d4\u05d5\u05e9\u05dc\u05de\u05d5\u002c\u0020\u05d0\u05d6\u0020\u05d4\u05d0\u05e8\u05e0\u05e7\u0020\u05e2\u05d5\u05d3\u0020\u05e8\u05d9\u05e7\u002e',
  financialBreakdown: '\u05e4\u05d9\u05e8\u05d5\u05e7\u0020\u05db\u05e1\u05e4\u05d9',
  revenue: '\u05d4\u05db\u05e0\u05e1\u05d5\u05ea',
  commissions: '\u05e2\u05de\u05dc\u05d5\u05ea',
  whatIsShown: '\u05de\u05d4\u0020\u05de\u05d5\u05e6\u05d2\u0020\u05db\u05d0\u05df\u003f',
  whatIsShownDescription:
    '\u05d4\u05d0\u05e8\u05e0\u05e7\u0020\u05de\u05e6\u05d9\u05d2\u0020\u05db\u05e8\u05d2\u05e2\u0020\u05d0\u05ea\u0020\u05d4\u05db\u05e1\u05e3\u0020\u05e9\u05e0\u05db\u05e0\u05e1\u0020\u05de\u05d4\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd\u0020\u05e9\u05d4\u05d5\u05e9\u05dc\u05de\u05d5\u0020\u05d1\u05e4\u05d5\u05e2\u05dc\u002e\u0020\u05d1\u05e9\u05dc\u05d1\u0020\u05d4\u05d1\u05d0\u0020\u05d0\u05e4\u05e9\u05e8\u0020\u05dc\u05d4\u05d5\u05e1\u05d9\u05e3\u0020\u05d2\u05dd\u0020\u05de\u05e9\u05d9\u05db\u05d5\u05ea\u002c\u0020\u05d4\u05e2\u05d1\u05e8\u05d5\u05ea\u002c\u0020\u05d9\u05ea\u05e8\u05d4\u0020\u05d6\u05de\u05d9\u05e0\u05d4\u0020\u05d5\u05d4\u05d9\u05e1\u05d8\u05d5\u05e8\u05d9\u05d9\u05ea\u0020\u05ea\u05e0\u05d5\u05e2\u05d5\u05ea\u0020\u05de\u05dc\u05d0\u05d4\u002e',
} as const;

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useDelivery();

  const completedDeliveries = useMemo(
    () => state.deliveries.filter((delivery) => delivery.status === 'delivered'),
    [state.deliveries],
  );

  const walletStats = useMemo(() => {
    const totalRevenue = sumDeliveryMoney(completedDeliveries, getDeliveryCustomerCharge);
    const totalCourierPay = sumDeliveryMoney(completedDeliveries, getDeliveryCourierBasePay);
    const totalTips = sumDeliveryMoney(completedDeliveries, getDeliveryCourierTip);
    const totalCommission = sumDeliveryMoney(completedDeliveries, getDeliveryCommission);
    const grossProfit = totalRevenue - totalCourierPay - totalCommission;
    const avgOrderValue =
      completedDeliveries.length > 0
        ? totalRevenue / completedDeliveries.length
        : 0;

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
        .sort(
          (a, b) =>
            new Date(b.deliveredAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.deliveredAt ?? a.createdAt ?? 0).getTime(),
        )
        .slice(0, 6),
    [completedDeliveries],
  );

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]"
      dir="rtl"
    >
      <PageToolbar
        title={TEXT.title}
        summary={TEXT.summary}
        onToggleMobileSidebar={() => (window as any).toggleMobileSidebar?.()}
        headerActions={
          <button
            type="button"
            onClick={() => navigate('/deliveries')}
            className="hidden items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-[#0a0a0a] dark:text-[#fafafa] dark:hover:bg-[#151515] md:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{TEXT.toDeliveries}</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  {TEXT.totalRevenue}
                </span>
                <Wallet className="h-5 w-5 text-[#16a34a] dark:text-[#9fe870]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                {formatCurrency(walletStats.totalRevenue)}
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">
                {completedDeliveries.length.toLocaleString('he-IL')} {TEXT.completedDeliveries}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  {TEXT.courierPayments}
                </span>
                <Bike className="h-5 w-5 text-[#0fcdd3]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                {formatCurrency(walletStats.totalCourierPay)}
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">
                {TEXT.courierPaymentsHint}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  {TEXT.grossProfit}
                </span>
                <TrendingUp className="h-5 w-5 text-[#16a34a] dark:text-[#9fe870]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#166534] dark:text-[#4ade80]">
                {formatCurrency(walletStats.grossProfit)}
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">
                {TEXT.grossProfitHint}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  {TEXT.averageOrderValue}
                </span>
                <Receipt className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                {formatCurrency(walletStats.avgOrderValue)}
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#a3a3a3]">
                {TEXT.tips}: {formatCurrency(walletStats.totalTips)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white dark:border-[#1f1f1f] dark:bg-[#171717]">
              <div className="border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-3 dark:border-[#1f1f1f] dark:bg-[#111111]">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                  {TEXT.latestDeliveries}
                </div>
                <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                  {TEXT.latestDeliveriesHint}
                </div>
              </div>
              <div className="divide-y divide-[#f1f1f1] dark:divide-[#1f1f1f]">
                {recentCompleted.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                        {delivery.client_name || TEXT.customer} •{' '}
                        {delivery.rest_name || TEXT.restaurant}
                      </div>
                      <div className="mt-1 text-xs text-[#666d80] dark:text-[#a3a3a3]">
                        #{delivery.api_short_order_id || delivery.id} •{' '}
                        {new Date(
                          delivery.deliveredAt ?? delivery.createdAt ?? new Date(),
                        ).toLocaleString('he-IL')}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-[#166534] dark:text-[#4ade80]">
                        {formatCurrency(getDeliveryCustomerCharge(delivery))}
                      </div>
                      <div className="mt-1 text-xs text-[#737373] dark:text-[#a3a3a3]">
                        {TEXT.courier}: {formatCurrency(getDeliveryCourierBasePay(delivery))}
                      </div>
                    </div>
                  </div>
                ))}
                {recentCompleted.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#737373] dark:text-[#a3a3a3]">
                    {TEXT.emptyRecent}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-[#1f1f1f] dark:bg-[#171717]">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                  {TEXT.financialBreakdown}
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">
                      {TEXT.revenue}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                      {formatCurrency(walletStats.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">
                      {TEXT.courierPayments}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                      {formatCurrency(walletStats.totalCourierPay)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">
                      {TEXT.commissions}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                      {formatCurrency(walletStats.totalCommission)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-[#a3a3a3]">
                      {TEXT.tips}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                      {formatCurrency(walletStats.totalTips)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-5 dark:border-[#1d4ed8]/30 dark:bg-[#0f172a]">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                  {TEXT.whatIsShown}
                </div>
                <div className="mt-2 text-sm leading-6 text-[#475569] dark:text-[#94a3b8]">
                  {TEXT.whatIsShownDescription}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
