import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown as ChevronDownIcon,
  Clock3,
  Package,
  Star,
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { Courier, Delivery, DeliveryStatus } from '../types/delivery.types';
import {
  DELIVERY_ASSIGNMENT_BLOCK_COPY,
  getDeliveryAssignmentBlockReason,
  getDeliveryOfferRemainingSeconds,
} from '../utils/delivery-assignment';
import { toValidDate } from '../utils/delivery-offers';

interface SharedDeliveryActionsProps {
  delivery: Delivery;
  allCouriers: Courier[];
  deliveryBalance: number;
  onAssignCourier: (deliveryId: string, courierId: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
}

const fmtSecs = (seconds: number) => {
  if (seconds < 60) return `${seconds}ש׳`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} דק׳` : `${minutes}:${String(rest).padStart(2, '0')} דק׳`;
};

export const SharedDeliveryActions: React.FC<SharedDeliveryActionsProps> = ({
  delivery,
  allCouriers,
  deliveryBalance,
  onAssignCourier,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
}) => {
  const [assignOpen, setAssignOpen] = useState(false);
  const [courierFilter, setCourierFilter] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!delivery.offerExpiresAt || delivery.status !== 'pending') return undefined;
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [delivery.offerExpiresAt, delivery.status]);

  const isFinal = delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'expired';
  const availableCouriers = allCouriers.filter(
    (item) => item.status !== 'offline' && (courierFilter === '' || item.name.includes(courierFilter))
  );
  const assignableCourierCount = allCouriers.filter((item) => item.status !== 'offline').length;
  const assignmentBlockReason = getDeliveryAssignmentBlockReason(delivery, {
    deliveryBalance,
    availableCourierCount: assignableCourierCount,
    now,
  });
  const assignmentBlockCopy = assignmentBlockReason
    ? DELIVERY_ASSIGNMENT_BLOCK_COPY[assignmentBlockReason]
    : null;
  const offerExpiresAt = toValidDate(delivery.offerExpiresAt);
  const offerRemainingSeconds = getDeliveryOfferRemainingSeconds(delivery, now);

  if (isFinal) return null;

  return (
    <div className="shrink-0 px-4 py-3 border-b border-[#f0f0f0] dark:border-app-border flex flex-wrap gap-2">
      {delivery.status === 'pending' && (
        <div className="relative flex flex-col gap-1.5">
          {offerExpiresAt && (
            <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
              assignmentBlockReason === 'offer_expired'
                ? 'border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300'
                : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300'
            }`}>
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              <span>
                {assignmentBlockReason === 'offer_expired'
                  ? 'הצעת רשת פגה'
                  : `הצעת רשת: ${offerRemainingSeconds !== null ? fmtSecs(offerRemainingSeconds) : '-'} לציוות`}
              </span>
            </div>
          )}

          <button
            disabled={Boolean(assignmentBlockReason)}
            onClick={() => {
              if (assignmentBlockReason) return;
              setAssignOpen((prev) => !prev);
              setCourierFilter('');
            }}
            title={assignmentBlockCopy ?? 'שבץ שליח'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              assignmentBlockReason
                ? 'cursor-not-allowed bg-[#f5f5f5] text-[#a3a3a3] dark:bg-[#1f1f1f] dark:text-[#737373]'
                : 'bg-[#9fe870] hover:bg-[#8dd960] text-[#0d0d12]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {assignmentBlockReason ? 'שיבוץ חסום' : 'שבץ שליח'}
            <ChevronDownIcon className={`w-3 h-3 transition-transform ${assignOpen ? 'rotate-180' : ''}`} />
          </button>

          {assignmentBlockCopy && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#737373] dark:text-app-text-secondary">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              <span>{assignmentBlockCopy}</span>
            </div>
          )}

          {assignOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 w-52 bg-white dark:bg-app-surface border border-[#e5e5e5] dark:border-app-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-[#f0f0f0] dark:border-app-border">
                <input
                  autoFocus
                  value={courierFilter}
                  onChange={(event) => setCourierFilter(event.target.value)}
                  placeholder="חפש שליח..."
                  className="w-full px-2 py-1.5 text-xs bg-[#f5f5f5] dark:bg-[#262626] rounded-lg outline-none text-[#0d0d12] dark:text-app-text placeholder-[#a3a3a3]"
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {availableCouriers.length === 0 ? (
                  <p className="text-xs text-[#a3a3a3] text-center py-3">אין שליחים זמינים</p>
                ) : (
                  availableCouriers.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAssignCourier(delivery.id, item.id);
                        setAssignOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors text-right"
                    >
                      <span className="font-medium text-[#0d0d12] dark:text-app-text">{item.name}</span>
                      <div className="flex items-center gap-1 text-[#a3a3a3]">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{item.rating}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {delivery.status === 'assigned' && (
        <button
          onClick={() => onStatusChange(delivery.id, 'delivering')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          סמן כנאסף
        </button>
      )}

      {delivery.status === 'delivering' && (
        <button
          onClick={() => onCompleteDelivery(delivery.id)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          סמן כנמסר
        </button>
      )}

      <button
        onClick={() => onCancelDelivery(delivery.id)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors ms-auto"
      >
        <XCircle className="w-3.5 h-3.5" />
        בטל
      </button>
    </div>
  );
};
