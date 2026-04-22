import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, MapPin, User, X, UserPlus, MoreVertical, Phone, Timer, CheckCircle, RotateCcw, Edit, ArrowLeft, MessageSquare, Package, Banknote, CreditCard, Info, Bike } from 'lucide-react';
import { Delivery } from '../../../types/delivery.types';

export interface UltraCompactStripOrder {
  id: string;
  deliveryId: string;
  restaurantName: string;
  customerName: string;
  address: string;
  status: string;
  createdAt: string;
  createdAtTimestamp: number;
  amountToCollect: number;
  courierName: string | null;
  phone?: string;
  prepTime?: number;
  estimatedDelivery?: string;
  pickedUpAt?: Date | null;
  deliveredAt?: Date | null;
  orderNotes?: string;
  paymentMethod?: 'cash' | 'credit';
  cashToCollect?: number;
  fullDelivery?: Delivery;
}

interface UltraCompactStripProps {
  order: UltraCompactStripOrder;
  routeEtaLabel?: string | null;
  isSelected: boolean;
  isChecked: boolean;
  onClick: () => void;
  onCancel: (deliveryId: string) => void;
  onAssignCourier: (deliveryId: string) => void;
  onUnassign: (deliveryId: string) => void;
  onToggleCheck: (deliveryId: string) => void;
  onHover?: (orderId: string | null) => void;
  isHovered?: boolean;
  onShowDetails?: (order: UltraCompactStripOrder) => void;
}

export const UltraCompactStrip: React.FC<UltraCompactStripProps> = ({
  order,
  routeEtaLabel,
  isSelected,
  isChecked,
  onClick,
  onCancel,
  onAssignCourier,
  onUnassign,
  onToggleCheck,
  onHover,
  isHovered,
  onShowDetails,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // Close the menu while scrolling.
  useEffect(() => {
    if (!showMenu) return;
    const close = () => {
      setShowMenu(false);
      setContextMenuPos(null);
    };
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [showMenu]);
  
  // Calculate elapsed minutes since order creation.
  const now = Date.now();
  const elapsed = Math.floor((now - order.createdAtTimestamp) / 60000);
  const isCritical = elapsed >= 7 && order.status !== 'delivered' && order.status !== 'cancelled';

  // Visual styles per order status.
  const statusColors = {
    pending: 'bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/40',
    assigned: 'bg-yellow-100 dark:bg-yellow-500/20 border-yellow-300 dark:border-yellow-500/40',
    picking_up: 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-300 dark:border-cyan-500/40',
    delivering: 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/40',
    delivered: 'bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/40',
    cancelled: 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/40',
  };

  const statusLabels = {
    pending: 'ממתין',
    assigned: 'שובץ',
    picking_up: 'אוסף',
    delivering: 'נאסף',
    delivered: 'נמסר',
    cancelled: 'בוטל',
  };

  const colorClass = statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 dark:bg-gray-500/20';

  const prepDurationLabel =
    typeof order.prepTime === 'number' && order.prepTime > 0
      ? `הכנה ${order.prepTime} דק׳`
      : null;

  // Format pickup / dropoff related timestamps.
  const formatTime = (date: Date | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const estimatedRestaurantTime = formatTime(order.fullDelivery?.estimatedArrivalAtRestaurant ?? null);
  const estimatedCustomerTime =
    formatTime(order.fullDelivery?.estimatedArrivalAtCustomer ?? null) ?? order.estimatedDelivery ?? null;
  const arrivedAtRestaurantTime = formatTime(order.fullDelivery?.arrivedAtRestaurantAt ?? null);
  const pickedUpAtTime = formatTime(order.fullDelivery?.pickedUpAt ?? order.pickedUpAt ?? null);
  const deliveredAtTime = formatTime(order.fullDelivery?.deliveredAt ?? order.deliveredAt ?? null);
  const hasPickedUp = Boolean(order.fullDelivery?.pickedUpAt ?? order.pickedUpAt);
  const hasDelivered = Boolean(order.fullDelivery?.deliveredAt ?? order.deliveredAt);
  const hasArrivedAtRestaurant = Boolean(order.fullDelivery?.arrivedAtRestaurantAt) && !hasPickedUp;
  const displayStatusKey: keyof typeof statusLabels = hasDelivered
    ? 'delivered'
    : hasPickedUp
      ? 'delivering'
      : order.status as keyof typeof statusLabels;
  const displayStatusLabel = hasArrivedAtRestaurant ? 'במסעדה' : statusLabels[displayStatusKey];

  const etaInlineLabel =
    deliveredAtTime
      ? `נמסר: ${deliveredAtTime}`
      : hasPickedUp && routeEtaLabel
      ? routeEtaLabel
      : hasPickedUp && estimatedCustomerTime
      ? `מגיע ללקוח ב־${estimatedCustomerTime}`
      : hasPickedUp && pickedUpAtTime
      ? `נאסף ${pickedUpAtTime}`
      : hasArrivedAtRestaurant && arrivedAtRestaurantTime
      ? `הגיע למסעדה ב־${arrivedAtRestaurantTime}`
      : routeEtaLabel
      ? routeEtaLabel
      : order.status === 'assigned' && estimatedRestaurantTime
      ? `מגיע למסעדה ב־${estimatedRestaurantTime}`
      : null;

  return (
    <>
      <div
        data-order-id={order.deliveryId}
        className={`border-b border-[#e5e5e5] dark:border-[#262626] transition-all cursor-pointer ${
          isSelected
            ? 'bg-[#e6fafa] dark:bg-[#0a2a2a]'
            : isChecked
            ? 'bg-[#e0f7f1] dark:bg-[#0a2f2f]'
            : isHovered
            ? 'bg-[#f5f5f5] dark:bg-[#1e1e1e]'
            : 'hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
        } relative`}
        onClick={() => { onClick(); onToggleCheck(order.deliveryId); }}
        onMouseEnter={() => onHover?.(order.id)}
        onMouseLeave={() => onHover?.(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const menuH = 180;
          const menuW = 150;
          const top = e.clientY + menuH > window.innerHeight ? Math.max(8, e.clientY - menuH) : e.clientY;
          const left = e.clientX + menuW > window.innerWidth ? Math.max(8, e.clientX - menuW) : e.clientX;
          setMenuPos(null);
          setContextMenuPos({ top, left });
          setShowMenu(true);
        }}
      >
        <div className="px-3 py-2 flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Header: order number, creation time and status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-[#0d0d12] dark:text-[#fafafa] text-[10px]">
                  {order.fullDelivery?.orderNumber ?? `#${order.id}`}
                </span>
                <span className="text-[#737373] dark:text-[#525252]">•</span>
                <span className="text-[#737373] dark:text-[#a3a3a3] text-[10px]">
                  {order.createdAt}
                </span>
                {prepDurationLabel && (
                  <>
                    <span className="text-[#737373] dark:text-[#525252]">•</span>
                    <span className="text-[#22c55e] dark:text-[#9fe870] font-medium text-[10px]">
                      {prepDurationLabel}
                    </span>
                  </>
                )}
              </div>
              {/* Compact status pill */}
              <span className={`px-1.5 py-0.5 font-bold rounded ${ displayStatusKey === 'pending' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' : displayStatusKey === 'assigned' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : displayStatusKey === 'delivering' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' : displayStatusKey === 'delivered' ? 'bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-600/20 text-red-700 dark:text-red-400' } text-[12px]`}>
                {displayStatusLabel}
              </span>
            </div>

            {/* Route: restaurant to customer address */}
            <div className="flex items-center gap-2 text-[11px] min-w-0">
              <Package className="w-3 h-3 text-[#22c55e] flex-shrink-0" />
              <span className="font-bold text-[#22c55e] text-[14px] truncate whitespace-nowrap shrink min-w-0">{order.restaurantName}</span>
              <span className="text-[#737373] dark:text-[#525252] text-[12px]">←</span>
              <MapPin className="w-3 h-3 text-[#ef4444] flex-shrink-0" />
              <span className="font-bold text-[#0d0d12] dark:text-[#fafafa] truncate text-[14px] min-w-0">{order.address}</span>
            </div>

            {/* Customer, courier and ETA row */}
            <div className="flex items-center gap-2 text-[10px] flex-wrap">
              <User className="w-3 h-3 text-[#737373] dark:text-[#a3a3a3]" />
              <span className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{order.customerName}</span>
              {order.courierName && (
                <>
                  <span className="text-[#737373] dark:text-[#525252]">•</span>
                  <Bike className="w-3 h-3 text-[#0fcdd3]" />
                  <span className="text-[#0fcdd3] font-medium">{order.courierName}</span>
                </>
              )}
              {etaInlineLabel && (
                <>
                  <span className="text-[#737373] dark:text-[#525252]">•</span>
                  <span className={`font-medium ${order.status === 'delivered' ? 'text-[#16a34a] dark:text-[#9fe870]' : 'text-[#0284c7] dark:text-[#7dd3fc]'} text-[10px]`}>
                    {etaInlineLabel}
                  </span>
                </>
              )}
            </div>

            {/* Payment / notes row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Notes */}
              {order.orderNotes && (
                <div className="flex items-center gap-1 rounded px-1.5 py-0.5 flex-1 min-w-0">
                  <MessageSquare className="w-2.5 h-2.5 text-[#a3a3a3] dark:text-[#525252] flex-shrink-0" />
                  <span className="text-[#737373] dark:text-[#737373] truncate text-[10px]">
                    {order.orderNotes}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions menu trigger */}
          <div className="relative">
            <button
              ref={menuBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                if (showMenu && !contextMenuPos) { setShowMenu(false); return; }
                if (menuBtnRef.current) {
                  const rect = menuBtnRef.current.getBoundingClientRect();
                  const menuH = 180;
                  const top = rect.bottom + menuH > window.innerHeight
                    ? rect.top - menuH
                    : rect.bottom + 4;
                  setContextMenuPos(null);
                  setMenuPos({ top, left: rect.left });
                }
                setShowMenu(true);
              }}
              className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
            </button>
            
            {showMenu && (contextMenuPos || menuPos) && createPortal(
              <>
                {/* Click-away backdrop */}
                <div
                  className="fixed inset-0 z-[9990]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setContextMenuPos(null);
                  }}
                />
                {/* Menu */}
                <div
                  style={{ position: 'fixed', top: (contextMenuPos || menuPos)!.top, left: (contextMenuPos || menuPos)!.left, zIndex: 9991 }}
                  className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg shadow-xl overflow-hidden min-w-[150px]"
                >
                  {/* Full details action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onShowDetails?.(order);
                    }}
                    className="w-full text-right px-3 py-2 text-xs font-medium text-[#16a34a] dark:text-[#9fe870] hover:bg-[#f0fdf4] dark:hover:bg-[#052e16] transition-colors flex items-center gap-2 border-b border-[#e5e5e5] dark:border-[#262626]"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>פרטים מלאים</span>
                  </button>

                  {/* Status-specific actions */}
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onAssignCourier(order.deliveryId);
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-[#0fcdd3] hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center gap-2"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>שיבוץ שליח</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          if (window.confirm('האם לבטל את המשלוח?')) {
                            onCancel(order.deliveryId);
                          }
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      >
                        <X className="w-3 h-3" />
                        <span>ביטול משלוח</span>
                      </button>
                    </>
                  )}

                  {order.status === 'assigned' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onAssignCourier(order.deliveryId);
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-[#0fcdd3] hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-3 h-3" />
                        <span>שינוי שליח</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onUnassign(order.deliveryId);
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>ביטול שיבוץ</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          if (window.confirm('האם לבטל את המשלוח?')) {
                            onCancel(order.deliveryId);
                          }
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      >
                        <X className="w-3 h-3" />
                        <span>ביטול משלוח</span>
                      </button>
                    </>
                  )}

                  {order.status === 'delivering' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onAssignCourier(order.deliveryId);
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-[#0fcdd3] hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-3 h-3" />
                        <span>שינוי שליח</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          if (window.confirm('לסמן כנמסר?')) {
                            // TODO: implement mark as delivered
                            alert('סימון כנמסר - בפיתוח');
                          }
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>סימון כנמסר</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          if (window.confirm('האם לבטל את המשלוח?')) {
                            onCancel(order.deliveryId);
                          }
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      >
                        <X className="w-3 h-3" />
                        <span>ביטול משלוח</span>
                      </button>
                    </>
                  )}

                  {order.status === 'cancelled' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        if (window.confirm('לשחזר את המשלוח?')) {
                          // TODO: implement restore delivery
                          alert('שחזור משלוח - בפיתוח');
                        }
                      }}
                      className="w-full text-right px-3 py-2 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>שחזור משלוח</span>
                    </button>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>
    </>
  );
};

