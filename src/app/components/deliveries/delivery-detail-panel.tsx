import React from 'react';
import { X, Package, User, Store, Bike, ExternalLink, TrendingUp } from 'lucide-react';
import { Delivery, Courier } from '../../types/delivery.types';
import { STATUS_CONFIG } from './status-config';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface FilteredStats {
  total: number;
  delivered: number;
  cancelled: number;
  pending?: number;
  assigned?: number;
}

interface DeliveryDetailPanelProps {
  delivery: Delivery | null;
  courier: Courier | null;
  stats: FilteredStats;
  isOpen: boolean;
  onClearDelivery: () => void;
  onViewFull: () => void;
}

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; sub?: string }> = ({ icon, label, sub }) => (
  <div className="flex gap-2.5">
    <div className="w-6 h-6 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] flex items-center justify-center shrink-0 text-[#737373] dark:text-[#a3a3a3] mt-0.5">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa] truncate">{label}</div>
      {sub && <div className="text-[11px] text-[#a3a3a3] mt-0.5 truncate">{sub}</div>}
    </div>
  </div>
);

export const DeliveryDetailPanel: React.FC<DeliveryDetailPanelProps> = ({
  delivery,
  courier,
  stats,
  isOpen,
  onClearDelivery,
  onViewFull,
}) => {
  const active = (stats.pending ?? 0) + (stats.assigned ?? 0) + 0;
  const successRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;
  const statusCfg = delivery ? STATUS_CONFIG[delivery.status] : null;

  return (
    <div
      className={`flex flex-col shrink-0 h-full overflow-hidden bg-white dark:bg-[#0f0f0f] border-r border-[#e5e5e5] dark:border-[#262626] transition-[width] duration-300 ease-out ${
        isOpen ? 'w-[280px]' : 'w-0'
      }`}
    >
      <div className="min-w-[280px] flex flex-col h-full overflow-hidden" style={{ direction: 'rtl' }}>
        {delivery ? (
          <>
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#141414]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                      #{(delivery as any).orderNumber ?? delivery.id?.slice(-6)}
                    </span>
                    {statusCfg && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.badgeColor}`}>
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                  {delivery.creation_time && (
                    <div className="text-[10px] text-[#a3a3a3] mt-0.5">
                      {format(delivery.creation_time, 'dd/MM/yyyy HH:mm', { locale: he })}
                    </div>
                  )}
                </div>
                <button
                  onClick={onClearDelivery}
                  className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#262626] rounded-lg transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-[#a3a3a3]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4 space-y-4">
                {delivery.rest_name && (
                  <InfoRow
                    icon={<Store className="w-3.5 h-3.5" />}
                    label={delivery.rest_name}
                    sub={[delivery.rest_street, delivery.rest_city].filter(Boolean).join(', ')}
                  />
                )}
                {(delivery as any).client_name && (
                  <InfoRow
                    icon={<User className="w-3.5 h-3.5" />}
                    label={(delivery as any).client_name}
                    sub={(delivery as any).client_full_address}
                  />
                )}
                {courier && (
                  <InfoRow icon={<Bike className="w-3.5 h-3.5" />} label={courier.name} />
                )}

                {/* Timeline */}
                {(delivery.creation_time || delivery.coupled_time || delivery.took_it_time || delivery.delivered_time) && (
                  <div className="pt-2 border-t border-[#f0f0f0] dark:border-[#1e1e1e]">
                    <div className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-2.5">ציר זמן</div>
                    <div className="space-y-2">
                      {[
                        { label: 'נוצרה', time: delivery.creation_time },
                        { label: 'שויך', time: delivery.coupled_time },
                        { label: 'נאסף', time: delivery.took_it_time ?? delivery.arrived_at_rest },
                        { label: 'נמסרה', time: delivery.delivered_time },
                      ].filter(e => e.time).map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#9fe870] shrink-0" />
                          <span className="flex-1 text-[#737373] dark:text-[#a3a3a3]">{e.label}</span>
                          <span className="font-medium text-[#525252] dark:text-[#d4d4d4] tabular-nums">
                            {format(e.time as Date, 'HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prices */}
                {((delivery as any).price != null || (delivery as any).runner_price != null) && (
                  <div className="pt-2 border-t border-[#f0f0f0] dark:border-[#1e1e1e]">
                    <div className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-2">תשלומים</div>
                    {(delivery as any).price != null && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#a3a3a3]">ללקוח</span>
                        <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">₪{(delivery as any).price}</span>
                      </div>
                    )}
                    {(delivery as any).runner_price != null && (
                      <div className="flex justify-between text-[11px] mt-1">
                        <span className="text-[#a3a3a3]">לשליח</span>
                        <span className="font-semibold text-[#0d0d12] dark:text-[#fafafa]">₪{(delivery as any).runner_price}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-3 border-t border-[#e5e5e5] dark:border-[#262626]">
              <button
                onClick={onViewFull}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#ebebeb] dark:hover:bg-[#242424] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                פרטים מלאים
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Stats header */}
            <div className="shrink-0 px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#141414]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
                <span className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">סקירה</span>
              </div>
            </div>

            {/* Stats content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              <div className="bg-[#fafafa] dark:bg-[#141414] rounded-2xl p-4 border border-[#f0f0f0] dark:border-[#1e1e1e]">
                <div className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-widest mb-1">סה"כ משלוחים</div>
                <div className="text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] tabular-nums">{stats.total.toLocaleString()}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl p-3 bg-[#f0fdf4] dark:bg-[#0a1f12] border border-[#bbf7d0] dark:border-[#14532d]">
                  <div className="text-[9px] font-semibold text-[#16a34a] dark:text-[#4ade80] mb-1">נמסרו</div>
                  <div className="text-2xl font-bold text-[#15803d] dark:text-[#4ade80] tabular-nums">{stats.delivered.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl p-3 bg-[#fef2f2] dark:bg-[#1f0a0a] border border-[#fecaca] dark:border-[#7f1d1d]">
                  <div className="text-[9px] font-semibold text-[#dc2626] dark:text-[#f87171] mb-1">בוטלו</div>
                  <div className="text-2xl font-bold text-[#b91c1c] dark:text-[#fca5a5] tabular-nums">{stats.cancelled.toLocaleString()}</div>
                </div>
              </div>

              {active > 0 && (
                <div className="rounded-2xl p-3 bg-[#eff6ff] dark:bg-[#0a0f1f] border border-[#bfdbfe] dark:border-[#1e3a5f]">
                  <div className="text-[9px] font-semibold text-[#2563eb] dark:text-[#60a5fa] mb-1">פעילים</div>
                  <div className="text-2xl font-bold text-[#1d4ed8] dark:text-[#93c5fd] tabular-nums">{active.toLocaleString()}</div>
                </div>
              )}

              {stats.total > 0 && (
                <div className="pt-1 border-t border-[#f0f0f0] dark:border-[#1e1e1e]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-widest">אחוז הצלחה</div>
                    <span className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">{successRate}%</span>
                  </div>
                  <div className="h-1.5 bg-[#f0f0f0] dark:bg-[#262626] rounded-full overflow-hidden">
                    <div className="h-full bg-[#9fe870] rounded-full" style={{ width: `${successRate}%` }} />
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Package className="w-8 h-8 text-[#e5e5e5] dark:text-[#2a2a2a]" />
                <p className="text-[11px] text-[#a3a3a3] leading-relaxed">לחץ על שורה בטבלה<br />לצפייה בפרטי המשלוח</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
