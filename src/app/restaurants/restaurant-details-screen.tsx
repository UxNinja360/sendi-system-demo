import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDelivery } from '../context/delivery-context-value';
import {
  ArrowRight,
  Store,
  MapPin,
  Phone,
  Clock,
  TrendingUp,
  Package,
  CheckCircle2,
  DollarSign,
  Save,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency, getDeliveryCustomerCharge, sumDeliveryMoney } from '../utils/delivery-finance';
import { getRestaurantChainId } from '../utils/restaurant-branding';

export function RestaurantDetailsScreen() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();

  const restaurant = state.restaurants.find((r) => r.id === restaurantId);
  const [defaultPreparationTime, setDefaultPreparationTime] = useState('');
  const [maxDeliveryTime, setMaxDeliveryTime] = useState('');

  const restaurantDeliveries = state.deliveries.filter(
    (delivery) =>
      delivery.restaurantId === restaurant?.id ||
      delivery.rest_id === restaurant?.id ||
      delivery.restaurantName === restaurant?.name ||
      delivery.rest_name === restaurant?.name
  );
  const activeDeliveries = restaurantDeliveries.filter(
    (delivery) => delivery.status !== 'delivered' && delivery.status !== 'cancelled' && delivery.status !== 'expired'
  );
  const completedDeliveries = restaurantDeliveries.filter(
    (delivery) => delivery.status === 'delivered'
  );

  const totalRevenue = sumDeliveryMoney(completedDeliveries, getDeliveryCustomerCharge);
  const averagePrice =
    completedDeliveries.length > 0 ? totalRevenue / completedDeliveries.length : 0;

  useEffect(() => {
    if (!restaurant) return;
    setDefaultPreparationTime(String(restaurant.defaultPreparationTime ?? 15));
    setMaxDeliveryTime(String(restaurant.maxDeliveryTime ?? 30));
  }, [restaurant]);

  if (!restaurant) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Store className="mb-4 h-16 w-16 text-[#e5e5e5] dark:text-[#404040]" />
        <h2 className="mb-2 text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">מסעדה לא נמצאה</h2>
        <p className="mb-4 text-sm text-[#666d80] dark:text-[#a3a3a3]">
          המסעדה שחיפשת אינה קיימת במערכת
        </p>
        <button
          onClick={() => navigate('/restaurants')}
          className="flex items-center gap-2 rounded-lg bg-[#0fcdd3] px-4 py-2 text-white transition-colors hover:bg-[#0ab8c5]"
        >
          <ArrowRight size={16} />
          <span>חזרה למסעדות</span>
        </button>
      </div>
    );
  }

  const hasSettingsChanges =
    Number(defaultPreparationTime) !== restaurant.defaultPreparationTime ||
    Number(maxDeliveryTime) !== restaurant.maxDeliveryTime;

  const handleSaveRestaurantSettings = () => {
    const nextPreparationTime = Number(defaultPreparationTime);
    const nextMaxDeliveryTime = Number(maxDeliveryTime);

    if (!Number.isFinite(nextPreparationTime) || nextPreparationTime <= 0) {
      toast.error('יש להזין זמן הכנה תקין בדקות');
      return;
    }

    if (!Number.isFinite(nextMaxDeliveryTime) || nextMaxDeliveryTime <= 0) {
      toast.error('יש להזין זמן מקסימלי למשלוח תקין בדקות');
      return;
    }

    dispatch({
      type: 'UPDATE_RESTAURANT',
      payload: {
        restaurantId: restaurant.id,
        updates: {
          defaultPreparationTime: nextPreparationTime,
          maxDeliveryTime: nextMaxDeliveryTime,
        },
      },
    });

    toast.success('הגדרות הזמנים של המסעדה עודכנו');
  };

  return (
    <div className="flex h-full flex-col bg-[#fafafa] dark:bg-[#0a0a0a]">
      <div className="border-b border-[#e5e5e5] bg-white p-4 dark:border-[#262626] dark:bg-[#171717]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/restaurants')}
            className="rounded-lg p-2 transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
          >
            <ArrowRight size={20} className="text-[#666d80] dark:text-[#d4d4d4]" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Store size={24} className="text-[#0fcdd3]" />
              <div>
                <h1 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">{restaurant.name}</h1>
                <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">{restaurant.type}</p>
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">משלוחים פעילים</div>
            <div className="text-2xl font-bold text-[#0fcdd3]">{activeDeliveries.length}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-[#262626] dark:bg-[#171717]">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-500/20">
                  <Package size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">סה"כ משלוחים</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {restaurantDeliveries.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-[#262626] dark:bg-[#171717]">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-500/20">
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">הושלמו</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {completedDeliveries.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-[#262626] dark:bg-[#171717]">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-500/20">
                  <DollarSign size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">הכנסות</div>
                  <div className="text-2xl font-bold text-[#16a34a] dark:text-[#22c55e]">{formatCurrency(totalRevenue)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 dark:border-[#262626] dark:bg-[#171717]">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-500/20">
                  <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">ממוצע הזמנה</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {formatCurrency(Math.round(averagePrice))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 dark:border-[#262626] dark:bg-[#171717]">
            <h2 className="mb-4 text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">פרטי מסעדה</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">כתובת</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">{restaurant.address}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">טלפון</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">{restaurant.phone}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Store size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">סוג מסעדה</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">{restaurant.type}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Store size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">מזהה רשת</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {restaurant.chainId || getRestaurantChainId(restaurant.name)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">זמן הכנה ברירת מחדל</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {restaurant.defaultPreparationTime} דקות
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">זמן מקסימלי למשלוח</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {restaurant.maxDeliveryTime} דקות
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 dark:border-[#262626] dark:bg-[#171717]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">הגדרות תפעול</h2>
                <p className="mt-1 text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  זמן ההכנה וזמן היעד למשלוח ייכנסו אוטומטית לכל משלוח חדש של המסעדה.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[220px_220px_1fr]">
              <div className="space-y-1.5">
                <label className="text-xs text-[#666d80] dark:text-[#a3a3a3]">זמן הכנה (דקות)</label>
                <input
                  type="number"
                  min="1"
                  value={defaultPreparationTime}
                  onChange={(event) => setDefaultPreparationTime(event.target.value)}
                  className="w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5 text-[#0d0d12] outline-none focus:border-[#0fcdd3]/50 dark:border-[#262626] dark:bg-[#0f0f0f] dark:text-[#fafafa]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#666d80] dark:text-[#a3a3a3]">זמן מקסימלי למשלוח (דקות)</label>
                <input
                  type="number"
                  min="1"
                  value={maxDeliveryTime}
                  onChange={(event) => setMaxDeliveryTime(event.target.value)}
                  className="w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5 text-[#0d0d12] outline-none focus:border-[#0fcdd3]/50 dark:border-[#262626] dark:bg-[#0f0f0f] dark:text-[#fafafa]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  אפשר לשנות אותם ידנית בכל משלוח, אבל ברירת המחדל של המסעדה תגיע מכאן.
                </p>
                <button
                  onClick={handleSaveRestaurantSettings}
                  disabled={!hasSettingsChanges}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#9fe870] px-4 py-2.5 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#8fd65f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  שמור
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 dark:border-[#262626] dark:bg-[#171717]">
            <h2 className="mb-4 text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">משלוחים אחרונים</h2>
            <div className="space-y-2">
              {restaurantDeliveries.slice(0, 10).map((delivery) => (
                <button
                  key={delivery.id}
                  onClick={() => navigate(`/delivery/${delivery.id}`)}
                  className="w-full rounded-lg p-3 text-right transition-colors hover:bg-[#f5f5f5] dark:hover:bg-[#262626]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-[#666d80] dark:text-[#a3a3a3]" />
                      <div>
                        <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                          {delivery.orderNumber}
                        </div>
                        <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                          {delivery.customerName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          delivery.status === 'delivered'
                            ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
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
                      <div className="text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">{formatCurrency(getDeliveryCustomerCharge(delivery))}</div>
                      <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                        {formatDistanceToNow(delivery.createdAt, { addSuffix: true, locale: he })}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {restaurantDeliveries.length === 0 && (
                <div className="py-8 text-center text-[#666d80] dark:text-[#a3a3a3]">אין משלוחים עדיין</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
