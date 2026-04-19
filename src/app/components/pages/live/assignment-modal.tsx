import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Package, Star, CheckCircle, ArrowUp, ArrowDown, Store, User, MapPin, ChevronLeft } from 'lucide-react';
import { useDelivery } from '../../../context/delivery.context';
import { Delivery } from '../../../types/delivery.types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface RouteStop {
  id: string;
  deliveryId: string;
  type: 'pickup' | 'dropoff';
  order: Delivery;
  isPreview?: boolean;
}

function deliveriesToRouteStops(deliveries: Delivery[], isPreview = false): RouteStop[] {
  const stops: RouteStop[] = [];
  deliveries.forEach(order => {
    stops.push({ id: `${order.id}-pickup`, deliveryId: order.id, type: 'pickup', order, isPreview });
    stops.push({ id: `${order.id}-dropoff`, deliveryId: order.id, type: 'dropoff', order, isPreview });
  });
  return stops;
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface AssignmentModalProps {
  isOpen: boolean;
  selectedDeliveryIds: Set<string>;
  routeStopOrders: Record<string, string[]>;
  onClose: () => void;
  onConfirm: (courierId: string, newRouteOrder: string[] | null) => void;
}

// ─────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────
export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  selectedDeliveryIds,
  routeStopOrders,
  onClose,
  onConfirm,
}) => {
  const { state } = useDelivery();
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [routeOrder, setRouteOrder] = useState<string[] | null>(null);

  // Reset internal state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCourierId(null);
      setRouteOrder(null);
    }
  }, [isOpen]);

  // Reset route order when courier changes
  const handleSelectCourier = (courierId: string) => {
    setSelectedCourierId(prev => (prev === courierId ? null : courierId));
    setRouteOrder(null);
  };

  // ── Data ─────────────────────────────────────────────────
  const selectedDeliveries = useMemo(
    () => state.deliveries.filter(d => selectedDeliveryIds.has(d.id)),
    [state.deliveries, selectedDeliveryIds]
  );

  const couriers = useMemo(
    () =>
      state.couriers
        .filter(c => c.status !== 'offline')
        .map(c => ({
          ...c,
          activeOrders: state.deliveries.filter(
            d => d.courierId === c.id && ['assigned', 'delivering'].includes(d.status)
          ),
        }))
        .sort((a, b) => {
          if (a.status === 'available' && b.status !== 'available') return -1;
          if (a.status !== 'available' && b.status === 'available') return 1;
          return a.activeOrders.length - b.activeOrders.length;
        }),
    [state.couriers, state.deliveries]
  );

  const routeStops = useMemo((): RouteStop[] => {
    if (!selectedCourierId) return [];
    const courier = couriers.find(c => c.id === selectedCourierId);
    if (!courier) return [];

    const existing = deliveriesToRouteStops(courier.activeOrders, false);
    const preview = deliveriesToRouteStops(
      selectedDeliveries.filter(d => !courier.activeOrders.some(a => a.id === d.id)),
      true
    );

    // Merge, deduplicate
    const seen = new Set<string>();
    let stops = [...existing, ...preview].filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // Apply reorder (pending first, then saved)
    const order = routeOrder ?? routeStopOrders[selectedCourierId];
    if (order && order.length > 0) {
      const ordered = order.map(id => stops.find(s => s.id === id)).filter(Boolean) as RouteStop[];
      const orderedIds = new Set(order);
      stops = [...ordered, ...stops.filter(s => !orderedIds.has(s.id))];
    }

    return stops;
  }, [selectedCourierId, couriers, selectedDeliveries, routeStopOrders, routeOrder]);

  // ── Route reorder (simple up/down) ────────────────────────
  const moveStop = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= routeStops.length) return;
      const ids = routeStops.map(s => s.id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      setRouteOrder(ids);
    },
    [routeStops]
  );

  // ── Confirm ───────────────────────────────────────────────
  const handleConfirm = () => {
    if (!selectedCourierId) return;
    onConfirm(selectedCourierId, routeOrder);
  };

  const handleClose = () => {
    setSelectedCourierId(null);
    setRouteOrder(null);
    onClose();
  };

  if (!isOpen) return null;

  const selectedCourierName = couriers.find(c => c.id === selectedCourierId)?.name ?? '';

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full md:w-[540px] md:max-w-[92vw] max-h-[88vh] flex flex-col bg-white dark:bg-[#171717] rounded-t-2xl md:rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5] dark:border-[#262626] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-[#22c55e]" />
            </div>
            <div>
              <p className="font-bold text-[#0d0d12] dark:text-white text-sm leading-tight">שיבוץ שליח</p>
              <p className="text-[11px] text-[#737373] dark:text-[#a3a3a3]">
                {selectedDeliveryIds.size} {selectedDeliveryIds.size === 1 ? 'משלוח' : 'משלוחים'} לשיבוץ
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors"
          >
            <X className="w-4.5 h-4.5 text-[#737373]" style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Selected deliveries summary */}
          <div className="px-5 pt-4 pb-3 border-b border-[#f5f5f5] dark:border-[#262626]">
            <p className="text-[10px] font-bold text-[#a3a3a3] dark:text-[#525252] uppercase tracking-wider mb-2">משלוחים לשיבוץ</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedDeliveries.map(d => (
                <div
                  key={d.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f5f5f5] dark:bg-[#262626] rounded-lg"
                >
                  <span className="font-mono font-bold text-[11px] text-[#0d0d12] dark:text-white">#{d.orderNumber}</span>
                  <span className="text-[#d4d4d4] dark:text-[#404040]">·</span>
                  <span className="text-[11px] text-[#737373] dark:text-[#a3a3a3] max-w-[110px] truncate">{d.restaurantName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Courier grid */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-[10px] font-bold text-[#a3a3a3] dark:text-[#525252] uppercase tracking-wider mb-3">בחר שליח</p>
            <div className="grid grid-cols-2 gap-2">
              {couriers.map(courier => {
                const isSelected = selectedCourierId === courier.id;
                return (
                  <button
                    key={courier.id}
                    onClick={() => handleSelectCourier(courier.id)}
                    className={`text-right p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[#22c55e] bg-[#f0fdf4] dark:bg-[#0a2f1a]'
                        : 'border-[#e5e5e5] dark:border-[#262626] hover:border-[#22c55e]/50 hover:bg-[#fafafa] dark:hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-white font-bold text-xs">
                          {courier.name.charAt(0)}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#171717] ${
                            courier.status === 'available' ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'
                          }`}
                        />
                      </div>
                      <p className="font-bold text-sm text-[#0d0d12] dark:text-white truncate flex-1 leading-tight">
                        {courier.name}
                      </p>
                      {isSelected && <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#737373] dark:text-[#a3a3a3]">
                      <span
                        className={`font-semibold ${
                          courier.activeOrders.length === 0
                            ? 'text-[#22c55e]'
                            : 'text-[#f59e0b]'
                        }`}
                      >
                        {courier.activeOrders.length === 0 ? 'פנוי' : `${courier.activeOrders.length} פעיל`}
                      </span>
                      <span>·</span>
                      <Star className="w-3 h-3 fill-[#fbbf24] text-[#fbbf24]" />
                      <span>{courier.rating.toFixed(1)}</span>
                    </div>
                  </button>
                );
              })}

              {couriers.length === 0 && (
                <div className="col-span-2 text-center py-6 text-sm text-[#737373]">
                  אין שליחים זמינים כרגע
                </div>
              )}
            </div>
          </div>

          {/* Route preview — appears after courier selected */}
          {selectedCourierId && routeStops.length > 0 && (
            <div className="px-5 pt-3 pb-4 border-t border-[#f5f5f5] dark:border-[#262626]">
              <p className="text-[10px] font-bold text-[#a3a3a3] dark:text-[#525252] uppercase tracking-wider mb-3">
                מסלול — {routeStops.length} עצירות
              </p>
              <div className="space-y-1.5">
                {routeStops.map((stop, idx) => {
                  const isPickup = stop.type === 'pickup';
                  const isPreview = stop.isPreview;
                  return (
                    <div
                      key={stop.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                        isPreview
                          ? 'border-dashed border-[#22c55e]/50 bg-[#f0fdf4] dark:bg-[#0a2f1a]/40'
                          : 'border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#1a1a1a]'
                      }`}
                    >
                      {/* Index badge */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isPickup
                            ? 'bg-[#22c55e]/15 text-[#16a34a] dark:bg-[#22c55e]/20 dark:text-[#7bf1a8]'
                            : 'bg-[#ef4444]/15 text-[#dc2626] dark:bg-[#ef4444]/20 dark:text-[#fca5a5]'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Stop info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isPickup
                                ? 'bg-[#22c55e]/15 text-[#16a34a] dark:text-[#7bf1a8]'
                                : 'bg-[#ef4444]/15 text-[#dc2626] dark:text-[#fca5a5]'
                            }`}
                          >
                            {isPickup ? 'איסוף' : 'הורדה'}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[#0d0d12] dark:text-white">
                            #{stop.order.orderNumber}
                          </span>
                          {isPreview && (
                            <span className="text-[10px] font-bold text-[#16a34a] dark:text-[#7bf1a8] border border-[#22c55e]/30 px-1.5 py-0.5 rounded bg-[#22c55e]/10">
                              חדש
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#737373] dark:text-[#a3a3a3] truncate">
                          {isPickup ? stop.order.restaurantName : stop.order.customerName || stop.order.address}
                        </p>
                      </div>

                      {/* Up / Down buttons */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveStop(idx, -1)}
                          disabled={idx === 0}
                          className="w-6 h-5 flex items-center justify-center rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626] disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp className="w-3 h-3 text-[#737373]" />
                        </button>
                        <button
                          onClick={() => moveStop(idx, 1)}
                          disabled={idx === routeStops.length - 1}
                          className="w-6 h-5 flex items-center justify-center rounded hover:bg-[#f5f5f5] dark:hover:bg-[#262626] disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown className="w-3 h-3 text-[#737373]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#0a0a0a]/60 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#262626] text-[#0d0d12] dark:text-white font-semibold text-sm hover:bg-[#f0f0f0] dark:hover:bg-[#262626] transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCourierId}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              selectedCourierId
                ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-md shadow-[#22c55e]/20'
                : 'bg-[#e5e5e5] dark:bg-[#262626] text-[#a3a3a3] cursor-not-allowed'
            }`}
          >
            {selectedCourierId ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>שבץ ל{selectedCourierName}</span>
              </>
            ) : (
              <span>בחר שליח לאישור</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
