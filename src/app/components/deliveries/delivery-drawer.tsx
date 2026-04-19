import React, { useEffect, useCallback } from 'react';
import { Delivery, Courier, DeliveryStatus } from '../../types/delivery.types';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  X,
  ChevronUp,
  ChevronDown,
  Store,
  User,
  MapPin,
  Phone,
  Bike,
  Timer,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  UserPlus,
  Navigation,
  FileText,
  DollarSign,
  MessageSquare,
  ArrowLeftRight,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryDrawerProps {
  delivery: Delivery | null;
  courier: Courier | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onAssignCourier: (deliveryId: string) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onNavigateToDetail: (deliveryId: string) => void;
  onEditDelivery: (deliveryId: string) => void;
  currentIndex: number;
  totalCount: number;
}

const statusConfig: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: any; borderColor: string }> = {
  pending: { label: 'ממתין', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10', icon: AlertCircle, borderColor: 'border-orange-300 dark:border-orange-700' },
  assigned: { label: 'שובץ', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-500/10', icon: Bike, borderColor: 'border-yellow-300 dark:border-yellow-700' },
  delivered: { label: 'נמסר', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-600/10', icon: CheckCircle2, borderColor: 'border-green-300 dark:border-green-700' },
  cancelled: { label: 'בוטל', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-600/10', icon: XCircle, borderColor: 'border-red-300 dark:border-red-700' },
};

// חישוב זמן שנותר
const calculateTimeRemaining = (delivery: Delivery): number | null => {
  if (delivery.status === 'delivered' || delivery.status === 'cancelled') return null;
  const now = new Date();
  if (delivery.status === 'assigned' && delivery.estimatedArrivalAtRestaurant) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtRestaurant.getTime() - now.getTime()) / 1000));
  }
  if (delivery.status === 'delivering' && delivery.estimatedArrivalAtCustomer) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtCustomer.getTime() - now.getTime()) / 1000));
  }
  if (delivery.status === 'pending') return delivery.estimatedTime * 60;
  return null;
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds} שניות`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes} דקות`;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} דקות`;
};

// חישוב אחוז התקדמות
const calculateProgress = (delivery: Delivery): number => {
  const statuses: DeliveryStatus[] = ['pending', 'assigned', 'delivering', 'delivered'];
  const currentIndex = statuses.indexOf(delivery.status);
  if (currentIndex === -1) return 0;
  return ((currentIndex + 1) / statuses.length) * 100;
};

export const DeliveryDrawer: React.FC<DeliveryDrawerProps> = ({
  delivery,
  courier,
  isOpen,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
  onStatusChange,
  onAssignCourier,
  onCancelDelivery,
  onCompleteDelivery,
  onNavigateToDetail,
  onEditDelivery,
  currentIndex,
  totalCount,
}) => {
  // ESC to close + arrows to navigate
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowUp' && hasPrev) onNavigatePrev();
    if (e.key === 'ArrowDown' && hasNext) onNavigateNext();
  }, [onClose, onNavigatePrev, onNavigateNext, hasPrev, hasNext]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !delivery) return null;

  const config = statusConfig[delivery.status];
  const StatusIcon = config.icon;
  const timeRemaining = calculateTimeRemaining(delivery);
  const progress = calculateProgress(delivery);

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(delivery.orderNumber);
    toast.success(`מספר הזמנה ${delivery.orderNumber} הועתק`);
  };

  // Status flow - what's the next logical status
  const getNextStatuses = (): { status: DeliveryStatus; label: string; icon: any; color: string }[] => {
    const options: { status: DeliveryStatus; label: string; icon: any; color: string }[] = [];
    if (delivery.status === 'pending') {
      options.push({ status: 'assigned', label: 'שבץ שליח', icon: Bike, color: 'text-yellow-600' });
    }
    if (delivery.status === 'assigned') {
      options.push({ status: 'delivering', label: 'סמן כנאסף', icon: Package, color: 'text-blue-600' });
    }
    if (delivery.status === 'delivering') {
      options.push({ status: 'delivered', label: 'סמן כנמסר', icon: CheckCircle2, color: 'text-green-600' });
    }
    if (delivery.status !== 'delivered' && delivery.status !== 'cancelled') {
      options.push({ status: 'cancelled', label: 'בטל משלוח', icon: XCircle, color: 'text-red-600' });
    }
    return options;
  };

  const nextStatuses = getNextStatuses();

  // Timeline steps
  const timelineSteps = [
    { label: 'נוצר', time: delivery.createdAt, done: true },
    { label: 'שובץ', time: delivery.assignedAt, done: !!delivery.assignedAt },
    { label: 'הגיע למסעדה', time: delivery.arrivedAtRestaurantAt, done: !!delivery.arrivedAtRestaurantAt },
    { label: 'נאסף', time: delivery.pickedUpAt, done: !!delivery.pickedUpAt },
    { label: 'הגיע ללקוח', time: delivery.arrivedAtCustomerAt, done: !!delivery.arrivedAtCustomerAt },
    { label: 'נמסר', time: delivery.deliveredAt, done: !!delivery.deliveredAt },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-[64px] left-0 h-[calc(100vh-64px)] w-full sm:w-[420px] sm:max-w-[90vw] bg-white dark:bg-[#0f0f0f] border-r border-[#e5e5e5] dark:border-[#262626] shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="shrink-0 border-b border-[#e5e5e5] dark:border-[#262626]">
          <div className="flex items-center justify-between gap-2 p-4 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`${config.bg} p-2 rounded-xl ${config.borderColor} border`}>
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-[#0d0d12] dark:text-[#fafafa]">{delivery.orderNumber}</span>
                  <button onClick={handleCopyOrderNumber} className="text-[#a3a3a3] hover:text-[#737373] transition-colors" title="העתק">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-[#a3a3a3] dark:text-[#737373]">
                  {formatDistanceToNow(delivery.createdAt, { addSuffix: true, locale: he })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Navigation arrows */}
              <div className="flex flex-col gap-0.5 ml-2">
                <button
                  onClick={onNavigatePrev}
                  disabled={!hasPrev}
                  className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-default transition-colors"
                  title="הקודם (↑)"
                >
                  <ChevronUp className="w-4 h-4 text-[#737373]" />
                </button>
                <button
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  className="p-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-default transition-colors"
                  title="הבא (↓)"
                >
                  <ChevronDown className="w-4 h-4 text-[#737373]" />
                </button>
              </div>
              <span className="text-[10px] text-[#a3a3a3] tabular-nums mx-1">{currentIndex + 1}/{totalCount}</span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#737373] transition-colors"
                title="סגור (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status + progress */}
          <div className={`p-3 rounded-xl ${config.bg} border ${config.borderColor}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
              <span className={`text-xs ${config.color}`}>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-current rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, color: delivery.status === 'cancelled' ? '#dc2626' : '#16a34a' }}
              />
            </div>
          </div>

          {/* Quick actions */}
          {nextStatuses.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-[#a3a3a3] font-medium">פעולות מהירות</span>
              <div className="flex flex-wrap gap-2">
                {delivery.status === 'pending' && (
                  <button
                    onClick={() => onAssignCourier(delivery.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#86efac] rounded-lg text-xs font-medium hover:bg-[#bbf7d0] dark:hover:bg-[#166534] transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    שבץ שליח
                  </button>
                )}
                {nextStatuses.filter(s => s.status !== 'cancelled').map(({ status, label, icon: Icon, color }) => (
                  <button
                    key={status}
                    onClick={() => {
                      if (status === 'delivered') {
                        onCompleteDelivery(delivery.id);
                      } else {
                        onStatusChange(delivery.id, status);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#f5f5f5] dark:bg-[#262626] text-[#0d0d12] dark:text-[#fafafa] rounded-lg text-xs font-medium hover:bg-[#e5e5e5] dark:hover:bg-[#404040] transition-colors"
                  >
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    {label}
                  </button>
                ))}
                {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                  <button
                    onClick={() => onCancelDelivery(delivery.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#fee2e2] dark:bg-[#450a0a] text-[#dc2626] dark:text-[#fca5a5] rounded-lg text-xs font-medium hover:bg-[#fecaca] dark:hover:bg-[#7f1d1d] transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    בטל
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Time remaining */}
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 p-3 bg-[#dbeafe] dark:bg-[#1e3a8a] rounded-xl">
              <Timer className="w-4 h-4 text-[#3b82f6] dark:text-[#60a5fa] shrink-0" />
              <span className="text-xs text-[#1e40af] dark:text-[#93c5fd]">
                {delivery.status === 'pending' ? 'זמן משוער:' : delivery.status === 'assigned' ? 'הגעה למסעדה:' : 'הגעה ללקוח:'}
              </span>
              <span className="text-sm font-bold text-[#1e40af] dark:text-[#93c5fd] mr-auto">{formatTime(timeRemaining)}</span>
            </div>
          )}

          {/* Restaurant */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] font-medium">
              <Store className="w-3.5 h-3.5" />
              מסעדה
            </div>
            <div className="p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl space-y-1.5">
              <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{delivery.restaurantName}</div>
              {delivery.restaurantAddress && (
                <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#a3a3a3]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {delivery.restaurantAddress}
                </div>
              )}
              {delivery.branchName && (
                <div className="text-xs text-[#a3a3a3]">סניף: {delivery.branchName}</div>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] font-medium">
              <User className="w-3.5 h-3.5" />
              לקוח
            </div>
            <div className="p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl space-y-1.5">
              <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{delivery.customerName}</div>
              <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#a3a3a3]">
                <Phone className="w-3 h-3 shrink-0" />
                <a href={`tel:${delivery.customerPhone}`} className="hover:text-[#16a34a] transition-colors">
                  {delivery.customerPhone}
                </a>
              </div>
              <div className="flex items-start gap-1.5 text-xs text-[#737373] dark:text-[#a3a3a3]">
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                <span>{delivery.address}{delivery.area ? `, ${delivery.area}` : ''}</span>
              </div>
              {(delivery.customerBuilding || delivery.client_entry || delivery.client_floor || delivery.client_apartment) && (
                <div className="text-xs text-[#a3a3a3] pr-4">
                  {[
                    delivery.customerBuilding && `בניין ${delivery.customerBuilding}`,
                    delivery.client_entry && `כניסה ${delivery.client_entry}`,
                    delivery.client_floor && `קומה ${delivery.client_floor}`,
                    delivery.client_apartment && `דירה ${delivery.client_apartment}`,
                  ].filter(Boolean).join(' | ')}
                </div>
              )}
            </div>
          </div>

          {/* Courier */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] font-medium">
              <Bike className="w-3.5 h-3.5" />
              שליח
            </div>
            {courier ? (
              <div className="p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{courier.name}</span>
                  <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">⭐ {courier.rating}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#a3a3a3]">
                  <Phone className="w-3 h-3 shrink-0" />
                  <a href={`tel:${courier.phone}`} className="hover:text-[#16a34a] transition-colors">
                    {courier.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#a3a3a3]">
                  <span>{courier.totalDeliveries} משלוחים</span>
                  <span>{courier.activeDeliveryIds.length} פעילים</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl text-center">
                <span className="text-xs text-[#a3a3a3]">לא שובץ שליח</span>
                {delivery.status === 'pending' && (
                  <button
                    onClick={() => onAssignCourier(delivery.id)}
                    className="block mx-auto mt-2 text-xs text-[#16a34a] dark:text-[#22c55e] font-medium hover:underline"
                  >
                    + שבץ שליח
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] font-medium">
              <DollarSign className="w-3.5 h-3.5" />
              כספים
            </div>
            <div className="p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-[#a3a3a3]">מחיר משלוח</div>
                  <div className="text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">₪{delivery.price}</div>
                </div>
                {delivery.restaurantPrice && (
                  <div>
                    <div className="text-[10px] text-[#a3a3a3]">חיוב מסעדה</div>
                    <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">₪{delivery.restaurantPrice}</div>
                  </div>
                )}
                {delivery.courierPayment && (
                  <div>
                    <div className="text-[10px] text-[#a3a3a3]">תשלום שליח</div>
                    <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">₪{delivery.courierPayment}</div>
                  </div>
                )}
                {delivery.commissionAmount && (
                  <div>
                    <div className="text-[10px] text-[#a3a3a3]">עמלה</div>
                    <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">₪{delivery.commissionAmount}</div>
                  </div>
                )}
              </div>
              {delivery.is_cash && (
                <div className="mt-2 pt-2 border-t border-[#e5e5e5] dark:border-[#262626] flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#166534] dark:text-[#86efac]">💵 לגבות במזומן: ₪{delivery.sum_cash || delivery.price}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(delivery.deliveryNotes || delivery.orderNotes || delivery.comment) && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                הערות
              </div>
              <div className="p-3 bg-[#fef3c7] dark:bg-[#422006] border border-[#fcd34d] dark:border-[#78350f] rounded-xl space-y-1.5">
                {delivery.deliveryNotes && <div className="text-xs text-[#92400e] dark:text-[#fcd34d]">📝 {delivery.deliveryNotes}</div>}
                {delivery.orderNotes && <div className="text-xs text-[#92400e] dark:text-[#fcd34d]">📋 {delivery.orderNotes}</div>}
                {delivery.comment && <div className="text-xs text-[#92400e] dark:text-[#fcd34d]">💬 {delivery.comment}</div>}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] font-medium">
              <Clock className="w-3.5 h-3.5" />
              ציר זמן
            </div>
            <div className="space-y-0">
              {timelineSteps.map((step, i) => (
                <div key={step.label} className="flex items-start gap-3 relative">
                  {/* Line */}
                  {i < timelineSteps.length - 1 && (
                    <div className={`absolute right-[9px] top-5 w-0.5 h-full ${step.done ? 'bg-[#16a34a]' : 'bg-[#e5e5e5] dark:bg-[#262626]'}`} />
                  )}
                  {/* Dot */}
                  <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                    step.done
                      ? 'bg-[#16a34a] border-[#16a34a]'
                      : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#404040]'
                  }`}>
                    {step.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  {/* Content */}
                  <div className="pb-4 min-w-0">
                    <div className={`text-xs font-medium ${step.done ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#a3a3a3]'}`}>
                      {step.label}
                    </div>
                    {step.time && (
                      <div className="text-[10px] text-[#a3a3a3]">
                        {format(step.time, 'dd/MM/yy HH:mm:ss', { locale: he })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distance info */}
          {delivery.deliveryDistance && (
            <div className="flex items-center gap-2 p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl">
              <Navigation className="w-4 h-4 text-[#737373] shrink-0" />
              <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">מרחק משלוח:</span>
              <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{delivery.deliveryDistance.toFixed(1)} ק"מ</span>
            </div>
          )}

          {/* Feedback */}
          {delivery.customerRating && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] font-medium">
                <span>⭐</span>
                פידבק לקוח
              </div>
              <div className="p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl space-y-1">
                <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                  {'⭐'.repeat(delivery.customerRating)} {delivery.customerRating}/5
                </div>
                {delivery.customerFeedback && (
                  <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">"{delivery.customerFeedback}"</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#e5e5e5] dark:border-[#262626] flex items-center gap-2">
          <button
            onClick={() => onNavigateToDetail(delivery.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9fe870] hover:bg-[#8fd65f] text-[#0d0d12] rounded-xl text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            צפה בעמוד מלא
          </button>
          <button
            onClick={() => onEditDelivery(delivery.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9fe870] hover:bg-[#8fd65f] text-[#0d0d12] rounded-xl text-sm font-medium transition-colors"
          >
            <Edit className="w-4 h-4" />
            ערוך משלוח
          </button>
        </div>
      </div>
    </>
  );
};