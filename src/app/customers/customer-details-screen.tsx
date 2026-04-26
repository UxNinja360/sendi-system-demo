import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  TrendingUp,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

import { useDelivery } from '../context/delivery-context-value';
import { formatCurrency, getDeliveryCustomerCharge, sumDeliveryMoney } from '../utils/delivery-finance';

export function CustomerDetailsScreen() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { state } = useDelivery();

  const decodedCustomerName = customerId ? decodeURIComponent(customerId) : '';

  const customerDeliveries = state.deliveries.filter(
    (delivery) => delivery.customerName === decodedCustomerName,
  );

  const customer =
    customerDeliveries.length > 0
      ? {
          name: customerDeliveries[0].customerName,
          phone: customerDeliveries[0].customerPhone,
          address: customerDeliveries[0].address,
          area: customerDeliveries[0].area,
        }
      : null;

  const activeDeliveries = customerDeliveries.filter(
    (delivery) => delivery.status !== 'delivered' && delivery.status !== 'cancelled' && delivery.status !== 'expired',
  );
  const completedDeliveries = customerDeliveries.filter(
    (delivery) => delivery.status === 'delivered',
  );

  const totalSpent = sumDeliveryMoney(completedDeliveries, getDeliveryCustomerCharge);
  const averageOrderValue =
    completedDeliveries.length > 0 ? totalSpent / completedDeliveries.length : 0;

  const restaurantCounts = customerDeliveries.reduce<Record<string, number>>((acc, delivery) => {
    acc[delivery.restaurantName] = (acc[delivery.restaurantName] || 0) + 1;
    return acc;
  }, {});

  const favoriteRestaurants = Object.entries(restaurantCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 3);

  if (!customer) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <User className="mb-4 h-16 w-16 text-[#e5e5e5] dark:text-[#404040]" />
        <h2 className="mb-2 text-xl font-bold text-[#0d0d12] dark:text-app-text">
          לקוח לא נמצא
        </h2>
        <p className="mb-4 text-sm text-[#666d80] dark:text-app-text-secondary">
          הלקוח שחיפשת אינו קיים במערכת
        </p>
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 rounded-lg bg-[#0fcdd3] px-4 py-2 text-white transition-colors hover:bg-[#0ab8c5]"
        >
          <ArrowRight size={16} />
          <span>חזרה לרשימת הלקוחות</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-app-background">
      <div className="border-b border-[#e5e5e5] bg-white p-4 dark:border-app-border dark:bg-app-surface">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="rounded-lg p-2 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
          >
            <ArrowRight size={20} className="text-[#666d80] dark:text-app-text-secondary" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <User size={24} className="text-[#0fcdd3]" />
              <div>
                <h1 className="text-xl font-bold text-[#0d0d12] dark:text-app-text">
                  {customer.name}
                </h1>
                <p className="text-sm text-[#666d80] dark:text-app-text-secondary">{customer.phone}</p>
              </div>
            </div>
          </div>

          <div className="text-left">
            <div className="text-xs text-[#666d80] dark:text-app-text-secondary">משלוחים פעילים</div>
            <div className="text-2xl font-bold text-[#0fcdd3]">{activeDeliveries.length}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-app-border dark:bg-app-surface">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-500/20">
                  <Package size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-app-text-secondary">סה"כ הזמנות</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-app-text">
                    {customerDeliveries.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-app-border dark:bg-app-surface">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-500/20">
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-app-text-secondary">הושלמו</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-app-text">
                    {completedDeliveries.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-app-border dark:bg-app-surface">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-500/20">
                  <DollarSign size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-app-text-secondary">סה"כ הוצאות</div>
                  <div className="text-2xl font-bold text-[#16a34a] dark:text-[#22c55e]">
                    {formatCurrency(totalSpent)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-app-border dark:bg-app-surface">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-500/20">
                  <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-app-text-secondary">ממוצע הזמנה</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-app-text">
                    {formatCurrency(Math.round(averageOrderValue))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 dark:border-app-border dark:bg-app-surface">
            <h2 className="mb-4 text-lg font-bold text-[#0d0d12] dark:text-app-text">
              פרטי לקוח
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-[#666d80] dark:text-app-text-secondary" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-app-text-secondary">טלפון</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-app-text">
                    {customer.phone}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-[#666d80] dark:text-app-text-secondary" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-app-text-secondary">כתובת</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-app-text">
                    {customer.address}, {customer.area}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {favoriteRestaurants.length > 0 && (
            <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 dark:border-app-border dark:bg-app-surface">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#0d0d12] dark:text-app-text">
                <ShoppingBag size={18} />
                מסעדות מועדפות
              </h2>
              <div className="space-y-2">
                {favoriteRestaurants.map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg bg-[#f5f5f5] p-3 dark:bg-[#262626]"
                  >
                    <span className="text-sm font-medium text-[#0d0d12] dark:text-app-text">
                      {name}
                    </span>
                    <span className="text-xs text-[#666d80] dark:text-app-text-secondary">
                      {count} הזמנות
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 dark:border-app-border dark:bg-app-surface">
            <h2 className="mb-4 text-lg font-bold text-[#0d0d12] dark:text-app-text">
              היסטוריית הזמנות
            </h2>
            <div className="space-y-2">
              {customerDeliveries.map((delivery) => (
                <button
                  key={delivery.id}
                  onClick={() => navigate(`/delivery/${delivery.id}`)}
                  className="w-full rounded-lg p-3 text-right transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-[#666d80] dark:text-app-text-secondary" />
                      <div>
                        <div className="text-sm font-bold text-[#0d0d12] dark:text-app-text">
                          {delivery.orderNumber}
                        </div>
                        <div className="text-xs text-[#666d80] dark:text-app-text-secondary">
                          {delivery.restaurantName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          delivery.status === 'delivered'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                            : delivery.status === 'cancelled'
                              ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              : delivery.status === 'expired'
                                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-300'
                                : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                        }`}
                      >
                        {delivery.status === 'delivered'
                          ? 'נמסר'
                          : delivery.status === 'cancelled'
                            ? 'בוטל'
                            : delivery.status === 'expired'
                              ? 'פג תוקף'
                              : 'פעיל'}
                      </span>

                      <div className="text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">
                        {formatCurrency(getDeliveryCustomerCharge(delivery))}
                      </div>

                      <div className="text-xs text-[#666d80] dark:text-app-text-secondary">
                        {formatDistanceToNow(delivery.createdAt, {
                          addSuffix: true,
                          locale: he,
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
