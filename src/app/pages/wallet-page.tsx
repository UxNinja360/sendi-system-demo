import React, { useMemo } from 'react';
import { ArrowLeft, Bike, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageToolbar } from '../components/common/page-toolbar';
import { useDelivery } from '../context/delivery-context-value';
import {
  SENDI_PLUS_BASE_DELIVERY_CHARGE,
  SENDI_PLUS_DISTANCE_STEP_CHARGE,
  findDeliveryRestaurant,
  formatCurrency,
  getDeliveryWalletCharge,
  getSendiPlusBillableDistanceKm,
  sumDeliveryMoney,
} from '../utils/delivery-finance';

const TEXT = {
  title: '\u05d0\u05e8\u05e0\u05e7',
  summary:
    'סיכום חיובי סנדי פלוס שעוברים דרך האפליקציה',
  toDeliveries: '\u05dc\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
  totalRevenue: 'חיובי סנדי פלוס',
  completedDeliveries: 'משלוחי סנדי פלוס',
  courierPayments: 'משלוחים לחיוב',
  courierPaymentsHint:
    'רק משלוחים דרך סנדי פלוס נכנסים לארנק',
  grossProfit: 'ק״מ לחיוב',
  grossProfitHint:
    'כל ק״מ או חלק ממנו מעוגל כלפי מעלה',
  averageOrderValue: 'ממוצע למשלוח',
  tips: 'משלוחים רגילים שלא חויבו',
  latestDeliveries:
    'משלוחי סנדי פלוס אחרונים שנכנסו לארנק',
  latestDeliveriesHint:
    '6 משלוחי סנדי פלוס האחרונים שהושלמו וחויבו דרך האפליקציה',
  customer: '\u05dc\u05e7\u05d5\u05d7',
  restaurant: '\u05de\u05e1\u05e2\u05d3\u05d4',
  courier: '\u05e9\u05dc\u05d9\u05d7',
  emptyRecent:
    'עדיין אין משלוחי סנדי פלוס שהושלמו, אז הארנק עוד ריק.',
  financialBreakdown: 'פירוט חיוב סנדי פלוס',
  revenue: 'סה״כ חיוב',
  commissions: 'תוספת מרחק',
  baseCharges: 'חיוב בסיס',
  excludedRegularDeliveries: 'משלוחים רגילים מחוץ לארנק',
  whatIsShown: '\u05de\u05d4\u0020\u05de\u05d5\u05e6\u05d2\u0020\u05db\u05d0\u05df\u003f',
  whatIsShownDescription:
    'הארנק מציג רק משלוחים של סנדי פלוס. משלוחים רגילים לא נספרים כאן כי התשלום שלהם מתנהל ישירות בין חברת המשלוחים למסעדות שלה. חיוב סנדי פלוס מחושב לפי 22 ₪ בסיס ועוד 1 ₪ לכל ק״מ או חלק ממנו.',
} as const;

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useDelivery();

  const completedDeliveries = useMemo(
    () => state.deliveries.filter((delivery) => delivery.status === 'delivered'),
    [state.deliveries],
  );

  const sendiPlusCompletedDeliveries = useMemo(
    () =>
      completedDeliveries.filter((delivery) =>
        getDeliveryWalletCharge(delivery, findDeliveryRestaurant(delivery, state.restaurants)) > 0
      ),
    [completedDeliveries, state.restaurants],
  );

  const walletStats = useMemo(() => {
    const totalRevenue = sumDeliveryMoney(sendiPlusCompletedDeliveries, (delivery) =>
      getDeliveryWalletCharge(delivery, findDeliveryRestaurant(delivery, state.restaurants)),
    );
    const totalBillableDistanceKm = sumDeliveryMoney(
      sendiPlusCompletedDeliveries,
      getSendiPlusBillableDistanceKm,
    );
    const baseCharges = sendiPlusCompletedDeliveries.length * SENDI_PLUS_BASE_DELIVERY_CHARGE;
    const distanceCharges = totalBillableDistanceKm * SENDI_PLUS_DISTANCE_STEP_CHARGE;
    const excludedRegularDeliveries = completedDeliveries.length - sendiPlusCompletedDeliveries.length;
    const avgOrderValue =
      sendiPlusCompletedDeliveries.length > 0
        ? totalRevenue / sendiPlusCompletedDeliveries.length
        : 0;

    return {
      totalRevenue,
      totalBillableDistanceKm,
      baseCharges,
      distanceCharges,
      excludedRegularDeliveries,
      avgOrderValue,
    };
  }, [completedDeliveries.length, sendiPlusCompletedDeliveries, state.restaurants]);

  const recentCompleted = useMemo(
    () =>
      [...sendiPlusCompletedDeliveries]
        .sort(
          (a, b) =>
            new Date(b.deliveredAt ?? b.createdAt ?? 0).getTime() -
            new Date(a.deliveredAt ?? a.createdAt ?? 0).getTime(),
        )
        .slice(0, 6),
    [sendiPlusCompletedDeliveries],
  );

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-app-background"
      dir="rtl"
    >
      <PageToolbar
        headerActions={
          <button
            type="button"
            onClick={() => navigate('/deliveries')}
            className="hidden items-center gap-2 rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:bg-app-surface dark:text-app-text dark:hover:bg-app-surface-raised md:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{TEXT.toDeliveries}</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-app-border dark:bg-app-surface">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-app-text-secondary">
                  {TEXT.totalRevenue}
                </span>
                <Wallet className="h-5 w-5 text-app-brand" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-app-text">
                {formatCurrency(walletStats.totalRevenue)}
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-app-text-secondary">
                {sendiPlusCompletedDeliveries.length.toLocaleString('he-IL')} {TEXT.completedDeliveries}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-app-border dark:bg-app-surface">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-app-text-secondary">
                  {TEXT.courierPayments}
                </span>
                <Bike className="h-5 w-5 text-app-brand" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-app-text">
                {sendiPlusCompletedDeliveries.length.toLocaleString('he-IL')}
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-app-text-secondary">
                {TEXT.courierPaymentsHint}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-app-border dark:bg-app-surface">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-app-text-secondary">
                  {TEXT.grossProfit}
                </span>
                <TrendingUp className="h-5 w-5 text-app-brand" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#166534] dark:text-[#4ade80]">
                {walletStats.totalBillableDistanceKm.toLocaleString('he-IL')} ק״מ
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-app-text-secondary">
                {TEXT.grossProfitHint}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-app-border dark:bg-app-surface">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666d80] dark:text-app-text-secondary">
                  {TEXT.averageOrderValue}
                </span>
                <Receipt className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[#0d0d12] dark:text-app-text">
                {formatCurrency(walletStats.avgOrderValue)}
              </div>
              <div className="mt-2 text-xs text-[#737373] dark:text-app-text-secondary">
                {TEXT.tips}: {walletStats.excludedRegularDeliveries.toLocaleString('he-IL')}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white dark:border-app-border dark:bg-app-surface">
              <div className="border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-3 dark:border-app-border dark:bg-app-surface">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">
                  {TEXT.latestDeliveries}
                </div>
                <div className="mt-1 text-xs text-[#666d80] dark:text-app-text-secondary">
                  {TEXT.latestDeliveriesHint}
                </div>
              </div>
              <div className="divide-y divide-[#f1f1f1] dark:divide-[#1f1f1f]">
                {recentCompleted.map((delivery) => {
                  const restaurant = findDeliveryRestaurant(delivery, state.restaurants);
                  const billableDistanceKm = getSendiPlusBillableDistanceKm(delivery);
                  const walletCharge = getDeliveryWalletCharge(delivery, restaurant);

                  return (
                    <div
                      key={delivery.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#0d0d12] dark:text-app-text">
                          {delivery.client_name || TEXT.customer} •{' '}
                          {delivery.rest_name || TEXT.restaurant}
                        </div>
                        <div className="mt-1 text-xs text-[#666d80] dark:text-app-text-secondary">
                          #{delivery.api_short_order_id || delivery.id} •{' '}
                          {new Date(
                            delivery.deliveredAt ?? delivery.createdAt ?? new Date(),
                          ).toLocaleString('he-IL')}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-[#166534] dark:text-[#4ade80]">
                          {formatCurrency(walletCharge)}
                        </div>
                        <div className="mt-1 text-xs text-[#737373] dark:text-app-text-secondary">
                          {formatCurrency(SENDI_PLUS_BASE_DELIVERY_CHARGE)} +{' '}
                          {billableDistanceKm.toLocaleString('he-IL')} ק״מ
                        </div>
                      </div>
                    </div>
                  );
                })}
                {recentCompleted.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#737373] dark:text-app-text-secondary">
                    {TEXT.emptyRecent}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 dark:border-app-border dark:bg-app-surface">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">
                  {TEXT.financialBreakdown}
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-app-text-secondary">
                      {TEXT.baseCharges}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-app-text">
                      {formatCurrency(walletStats.baseCharges)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-app-text-secondary">
                      {TEXT.commissions}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-app-text">
                      {formatCurrency(walletStats.distanceCharges)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-app-text-secondary">
                      {TEXT.excludedRegularDeliveries}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-app-text">
                      {walletStats.excludedRegularDeliveries.toLocaleString('he-IL')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666d80] dark:text-app-text-secondary">
                      {TEXT.revenue}
                    </span>
                    <span className="font-semibold text-[#0d0d12] dark:text-app-text">
                      {formatCurrency(walletStats.totalRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-5 dark:border-[#1d4ed8]/30 dark:bg-[#0f172a]">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">
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
