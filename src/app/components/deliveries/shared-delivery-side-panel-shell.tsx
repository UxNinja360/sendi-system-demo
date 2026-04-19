import React, { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  X,
  ChevronUp,
  ChevronDown,
  Package,
  Copy,
  FileText,
  Edit,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Delivery, Courier, DeliveryStatus } from '../../types/delivery.types';
import { STATUS_CONFIG, STATUS_ORDER } from './status-config';
import { SharedDeliveryDetailsContent } from './shared-delivery-details-content';
import { SharedDeliveryActions } from './shared-delivery-actions';

interface SharedDeliverySidePanelShellProps {
  delivery: Delivery | null;
  courier: Courier | null;
  allCouriers: Courier[];
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onAssignCourier: (deliveryId: string, courierId: string) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
  stats?: { total: number; delivered: number; cancelled: number; pending: number; revenue: number };
}

const calcProgress = (delivery: Delivery) => {
  if (delivery.status === 'cancelled') return 0;
  const index = STATUS_ORDER.indexOf(delivery.status);
  return index === -1 ? 0 : Math.round(((index + 1) / STATUS_ORDER.length) * 100);
};

const calcTimeRemaining = (delivery: Delivery): number | null => {
  if (delivery.status === 'delivered' || delivery.status === 'cancelled') return null;
  const now = new Date();
  if (delivery.status === 'assigned' && delivery.estimatedArrivalAtRestaurant) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtRestaurant.getTime() - now.getTime()) / 1000));
  }
  if ((delivery.status === 'delivering') && delivery.estimatedArrivalAtCustomer) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtCustomer.getTime() - now.getTime()) / 1000));
  }
  if (delivery.status === 'pending') return delivery.estimatedTime * 60;
  return null;
};

const fmtSecs = (seconds: number) => {
  if (seconds < 60) return `${seconds}ש׳`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} דק׳` : `${minutes}:${String(rest).padStart(2, '0')} דק׳`;
};

export const SharedDeliverySidePanelShell: React.FC<SharedDeliverySidePanelShellProps> = ({
  delivery,
  courier,
  allCouriers,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
  currentIndex = 0,
  totalCount = 1,
  onStatusChange,
  onAssignCourier,
  onCancelDelivery,
  onCompleteDelivery,
  onEditDelivery,
  stats,
}) => {
  const navigate = useNavigate();

  const handleCopy = useCallback(() => {
    if (!delivery) return;
    navigator.clipboard.writeText(delivery.orderNumber);
    toast.success(`${delivery.orderNumber} הועתק`);
  }, [delivery]);

  if (!delivery) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-[#f5f5f5] dark:bg-[#1a1a1a] flex items-center justify-center">
          <Package className="w-7 h-7 text-[#d4d4d4] dark:text-[#404040]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#737373] dark:text-[#a3a3a3]">בחר משלוח מהרשימה</p>
          <p className="text-xs text-[#a3a3a3] dark:text-[#525252] mt-1">לצפייה בפרטים ולניהול מלא</p>
        </div>

        {stats && (
          <div className="w-full mt-2 grid grid-cols-2 gap-2">
            {[
              { label: 'סה"כ', value: stats.total, color: 'text-[#0d0d12] dark:text-[#fafafa]' },
              { label: 'נמסרו', value: stats.delivered, color: 'text-green-600 dark:text-green-400' },
              { label: 'ממתינים', value: stats.pending, color: 'text-orange-600 dark:text-orange-400' },
              { label: 'בוטלו', value: stats.cancelled, color: 'text-red-600 dark:text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-xl p-3 text-center">
                <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
                <div className="text-[10px] text-[#a3a3a3]">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const cfg = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const progress = calcProgress(delivery);
  const timeRemaining = calcTimeRemaining(delivery);
  const isFinal = delivery.status === 'delivered' || delivery.status === 'cancelled';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f0f0f]" dir="rtl">
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[#f0f0f0] dark:border-[#1f1f1f]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.sidePanelBg} ${cfg.sidePanelBorder} border`}>
              <StatusIcon className={`w-4.5 h-4.5 ${cfg.sidePanelColor}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#0d0d12] dark:text-[#fafafa] truncate">{delivery.orderNumber}</span>
                <button onClick={handleCopy} className="shrink-0 text-[#a3a3a3] hover:text-[#525252] transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-[#a3a3a3]">
                {formatDistanceToNow(delivery.createdAt, { addSuffix: true, locale: he })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onNavigatePrev}
              disabled={!hasPrev}
              title="הקודם"
              className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-25 disabled:cursor-default transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5 text-[#737373]" />
            </button>
            <span className="text-[10px] text-[#a3a3a3] tabular-nums">{currentIndex + 1}/{totalCount}</span>
            <button
              onClick={onNavigateNext}
              disabled={!hasNext}
              title="הבא"
              className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-25 disabled:cursor-default transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 text-[#737373]" />
            </button>
            <button
              onClick={onClose}
              title="סגור"
              className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa] transition-colors ms-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`rounded-xl px-3 py-2 ${cfg.sidePanelBg} ${cfg.sidePanelBorder} border`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${cfg.sidePanelColor}`}>{cfg.label}</span>
            {!isFinal && <span className={`text-[10px] tabular-nums ${cfg.sidePanelColor}`}>{progress}%</span>}
          </div>
          {!isFinal ? (
            <div className="h-1.5 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: delivery.status === 'cancelled' ? '#dc2626' : '#16a34a' }}
              />
            </div>
          ) : (
            <div className="flex gap-1">
              {STATUS_ORDER.map((status, index) => (
                <div
                  key={status}
                  className={`h-1.5 flex-1 rounded-full ${index <= STATUS_ORDER.indexOf('delivered') ? (delivery.status === 'delivered' ? 'bg-green-500' : 'bg-red-400') : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>

        {timeRemaining !== null && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <Timer className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {delivery.status === 'pending' ? 'זמן משוער' : delivery.status === 'assigned' ? 'הגעה למסעדה' : 'הגעה ללקוח'}:
            </span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 mr-auto tabular-nums">{fmtSecs(timeRemaining)}</span>
          </div>
        )}
      </div>

      <SharedDeliveryActions
        delivery={delivery}
        allCouriers={allCouriers}
        onAssignCourier={onAssignCourier}
        onStatusChange={onStatusChange}
        onCancelDelivery={onCancelDelivery}
        onCompleteDelivery={onCompleteDelivery}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        <SharedDeliveryDetailsContent delivery={delivery} courier={courier} />
        <div className="h-2" />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-[#f0f0f0] dark:border-[#1f1f1f] grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate(`/delivery/${delivery.id}`)}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#e5e5e5] dark:hover:bg-[#262626] hover:text-[#0d0d12] dark:hover:text-[#fafafa] transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          עמוד מלא
        </button>
        <button
          onClick={() => onEditDelivery(delivery.id)}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#9fe870] hover:bg-[#8dd960] text-[#0d0d12] transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          ערוך משלוח
        </button>
      </div>
    </div>
  );
};
