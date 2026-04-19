import React, { useState } from 'react';
import { CheckCircle2, Package, Star, UserPlus, XCircle, ChevronDown as ChevronDownIcon } from 'lucide-react';
import type { Courier, Delivery, DeliveryStatus } from '../../types/delivery.types';

interface SharedDeliveryActionsProps {
  delivery: Delivery;
  allCouriers: Courier[];
  onAssignCourier: (deliveryId: string, courierId: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
}

export const SharedDeliveryActions: React.FC<SharedDeliveryActionsProps> = ({
  delivery,
  allCouriers,
  onAssignCourier,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
}) => {
  const [assignOpen, setAssignOpen] = useState(false);
  const [courierFilter, setCourierFilter] = useState('');

  const isFinal = delivery.status === 'delivered' || delivery.status === 'cancelled';
  const availableCouriers = allCouriers.filter(
    (item) => item.status !== 'offline' && (courierFilter === '' || item.name.includes(courierFilter))
  );

  if (isFinal) return null;

  return (
    <div className="shrink-0 px-4 py-3 border-b border-[#f0f0f0] dark:border-[#1f1f1f] flex flex-wrap gap-2">
      {delivery.status === 'pending' && (
        <div className="relative">
          <button
            onClick={() => {
              setAssignOpen((prev) => !prev);
              setCourierFilter('');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#9fe870] hover:bg-[#8dd960] text-[#0d0d12] transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            שבץ שליח
            <ChevronDownIcon className={`w-3 h-3 transition-transform ${assignOpen ? 'rotate-180' : ''}`} />
          </button>
          {assignOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 w-52 bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-[#f0f0f0] dark:border-[#262626]">
                <input
                  autoFocus
                  value={courierFilter}
                  onChange={(event) => setCourierFilter(event.target.value)}
                  placeholder="חפש שליח..."
                  className="w-full px-2 py-1.5 text-xs bg-[#f5f5f5] dark:bg-[#262626] rounded-lg outline-none text-[#0d0d12] dark:text-[#fafafa] placeholder-[#a3a3a3]"
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
                      <span className="font-medium text-[#0d0d12] dark:text-[#fafafa]">{item.name}</span>
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          סמן כנאסף
        </button>
      )}

      {delivery.status === 'delivering' && (
        <button
          onClick={() => onCompleteDelivery(delivery.id)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
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
