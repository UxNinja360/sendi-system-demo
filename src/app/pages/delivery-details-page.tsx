import { useParams, useNavigate } from 'react-router';
import { useDelivery } from '../context/delivery-context-value';
import {
  MapPin, Phone, Clock,
  Bike, Package, CheckCircle2, XCircle, AlertCircle,
  Navigation, Store, User, ClockAlert
} from 'lucide-react';
import { formatCurrency, getDeliveryCustomerCharge } from '../utils/delivery-finance';
import { formatOrderNumber } from '../utils/order-number';

export function DeliveryDetailsPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const { state } = useDelivery();

  const delivery = state.deliveries.find(d => d.id === deliveryId);
  const courier = delivery?.courierId ? state.couriers.find(c => c.id === delivery.courierId) : null;
  const restaurant = state.restaurants.find(r => r.name === delivery?.restaurantName);

  if (!delivery || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <Package className="w-12 h-12 text-[#d4d4d4] dark:text-[#333]" />
        <p className="text-sm text-[#888] dark:text-[#666]">משלוח לא נמצא</p>
        <button onClick={() => navigate(-1)} className="text-xs text-[#9fe870] hover:underline">חזרה</button>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    pending:    { label: 'ממתין לשיבוץ', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', icon: AlertCircle },
    assigned:   { label: 'בדרך למסעדה',  color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', icon: Navigation },
    picking_up: { label: 'נאסף ממסעדה',  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10',  icon: Package },
    delivering: { label: 'בדרך ללקוח',   color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10',  icon: Bike },
    delivered:  { label: 'נמסר ללקוח',   color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10',    icon: CheckCircle2 },
    cancelled:  { label: 'בוטל',          color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-500/10',     icon: XCircle },
    expired:    { label: 'פג תוקף',       color: 'text-zinc-600 dark:text-zinc-300',   bg: 'bg-zinc-50 dark:bg-zinc-500/10',   icon: ClockAlert },
  };

  const cfg = statusConfig[delivery.status] ?? statusConfig.pending;
  const StatusIcon = cfg.icon;
  const orderNumberLabel = formatOrderNumber(delivery.orderNumber);

  const elapsedMinutes = Math.floor((Date.now() - new Date(delivery.createdAt).getTime()) / 60000);

  const timelineSteps = [
    { label: 'הזמנה התקבלה',  done: true },
    { label: 'שליח שובץ',      done: !['pending', 'expired'].includes(delivery.status) },
    { label: 'נאסף ממסעדה',    done: ['picking_up', 'delivering', 'delivered'].includes(delivery.status) },
    { label: 'בדרך ללקוח',     done: ['delivering', 'delivered'].includes(delivery.status) },
    { label: 'נמסר ללקוח',     done: delivery.status === 'delivered' },
  ];
  const doneCount = timelineSteps.filter(s => s.done).length;

  // initials avatar
  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const infoRows = [
    { label: 'מזהה הזמנה',   value: orderNumberLabel },
    { label: 'סטטוס',        value: cfg.label, statusBadge: true },
    { label: 'נוצר',          value: new Date(delivery.createdAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { label: 'זמן בטיפול',   value: `${elapsedMinutes} דק׳` },
    { label: 'כתובת מסירה',  value: delivery.address },
    { label: 'אזור',          value: delivery.area },
    { label: 'חיוב משלוח',    value: formatCurrency(getDeliveryCustomerCharge(delivery)), highlight: true },
    ...(delivery.notes ? [{ label: 'הערות', value: delivery.notes }] : []),
  ];

  return (
    <div className="min-h-full bg-app-background">

      <div className="p-6 max-w-4xl mx-auto space-y-4">

        {/* ── Main card ── */}
        <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border overflow-hidden">

          {/* card header */}
          <div className="px-6 py-4 border-b border-[#f0f0f0] dark:border-app-border flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">מידע כללי</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              <StatusIcon size={12} />
              {cfg.label}
            </span>
          </div>

          {/* info rows */}
          <div className="divide-y divide-[#f5f5f5] dark:divide-[#1f1f1f]">
            {infoRows.map(row => (
              <div key={row.label} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-sm text-[#888] dark:text-[#666]">{row.label}</span>
                {row.statusBadge ? (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{row.value}</span>
                ) : (
                  <span className={`text-sm font-medium ${(row as any).highlight ? 'text-green-600 dark:text-green-400' : 'text-[#0d0d12] dark:text-app-text'}`}>{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Entities row ── */}
        <div className={`grid gap-4 ${courier ? 'grid-cols-3' : 'grid-cols-2'}`}>

          {/* מסעדה */}
          <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-5">
            <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">פרטי מסעדה</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-sm font-bold text-orange-600 dark:text-orange-400 shrink-0">
                {initials(restaurant.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0d0d12] dark:text-app-text truncate">{restaurant.name}</p>
                <p className="text-xs text-[#a3a3a3]">{restaurant.type}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
                <Phone size={11} className="shrink-0 text-[#bbb]" />{restaurant.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
                <MapPin size={11} className="shrink-0 text-[#bbb]" />{restaurant.address}
              </div>
            </div>
            <button onClick={() => navigate(`/restaurant/${restaurant.id}`)} className="mt-4 text-xs text-[#9fe870] hover:text-[#8dd960] font-medium transition-colors">
              עבור לעמוד ←
            </button>
          </div>

          {/* לקוח */}
          <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-5">
            <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">פרטי לקוח</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                {initials(delivery.customerName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0d0d12] dark:text-app-text truncate">{delivery.customerName}</p>
                <p className="text-xs text-[#a3a3a3]">לקוח</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
                <Phone size={11} className="shrink-0 text-[#bbb]" />{delivery.customerPhone}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
                <MapPin size={11} className="shrink-0 text-[#bbb]" />{delivery.address}, {delivery.area}
              </div>
            </div>
            <button onClick={() => navigate(`/customer/${encodeURIComponent(delivery.customerName)}`)} className="mt-4 text-xs text-[#9fe870] hover:text-[#8dd960] font-medium transition-colors">
              עבור לעמוד ←
            </button>
          </div>

          {/* שליח */}
          {courier && (
            <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border p-5">
              <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-4">פרטי שליח</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400 shrink-0">
                  {initials(courier.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0d0d12] dark:text-app-text truncate">{courier.name}</p>
                  <span className={`text-xs font-medium ${courier.status === 'available' ? 'text-green-500' : courier.status === 'busy' ? 'text-orange-400' : 'text-[#a3a3a3]'}`}>
                    {courier.status === 'available' ? 'זמין' : courier.status === 'busy' ? 'עסוק' : 'לא מחובר'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
                  <Phone size={11} className="shrink-0 text-[#bbb]" />{courier.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
                  <span className="text-[#bbb] text-[10px]">★</span> דירוג {courier.rating}
                </div>
              </div>
              <button onClick={() => navigate(`/courier/${courier.id}`)} className="mt-4 text-xs text-[#9fe870] hover:text-[#8dd960] font-medium transition-colors">
                עבור לעמוד ←
              </button>
            </div>
          )}
        </div>

        {/* ── Tracking ── */}
        <div className="bg-white dark:bg-app-surface rounded-2xl border border-[#e5e5e5] dark:border-app-border overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0f0f0] dark:border-app-border flex items-center justify-between">
            <span className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">מעקב משלוח</span>
            <span className="text-xs text-[#a3a3a3]">{doneCount} / {timelineSteps.length} שלבים הושלמו</span>
          </div>
          {/* progress */}
          <div className="px-6 pt-4 pb-2">
            <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-[#262626] overflow-hidden">
              <div className="h-full rounded-full bg-[#9fe870] transition-all" style={{ width: `${Math.round((doneCount / timelineSteps.length) * 100)}%` }} />
            </div>
          </div>
          {/* steps */}
          <div className="divide-y divide-[#f5f5f5] dark:divide-[#1f1f1f]">
            {timelineSteps.map((step, i) => {
              const isDeliveredStep = step.label === 'נמסר ללקוח';
              const doneClassName = isDeliveredStep ? 'bg-blue-500' : 'bg-[#9fe870]';
              const doneIconClassName = isDeliveredStep ? 'text-white' : 'text-[#0d0d12]';

              return (
              <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? doneClassName : 'bg-[#f0f0f0] dark:bg-[#262626]'}`}>
                  {step.done
                    ? <CheckCircle2 size={13} className={doneIconClassName} />
                    : <Clock size={11} className="text-[#bbb]" />
                  }
                </div>
                <span className={`text-sm flex-1 ${step.done ? 'text-[#0d0d12] dark:text-app-text font-medium' : 'text-[#aaa] dark:text-[#555]'}`}>{step.label}</span>
                <span className="text-xs text-[#aaa] dark:text-[#555]">{step.done ? 'הושלם' : 'ממתין'}</span>
              </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
