import React from 'react';
import { LiveCouriersView } from './live-couriers-view';
import { LiveDeliveriesTab } from './live-deliveries-tab';
import { LiveManagerDesktopControls, LiveManagerControlsProps } from './live-manager-desktop-controls';
import { LiveManagerDesktopHeader } from './live-manager-desktop-header';
import { LiveManagerMinimizedWidget } from './live-manager-minimized-widget';

type LiveManagerDesktopPanelProps = {
  panelSize: 'normal' | 'medium' | 'large' | 'minimized';
  deliveriesCount: number;
  couriersCount: number;
  totalDeliveries: number;
  pendingCount: number;
  inProgressCount: number;
  deliveredCount: number;
  cancelledCount: number;
  availableCouriersCount: number;
  onExpand: () => void;
  onSelectDeliveries: () => void;
  onSelectCouriers: () => void;
  onCyclePanelSize: () => void;
  onMinimize: () => void;
  controlsProps: LiveManagerControlsProps;
  deliveriesTabProps: React.ComponentProps<typeof LiveDeliveriesTab>;
  couriersViewProps: React.ComponentProps<typeof LiveCouriersView>;
};

export const LiveManagerDesktopPanel: React.FC<LiveManagerDesktopPanelProps> = ({
  panelSize,
  deliveriesCount,
  couriersCount,
  totalDeliveries,
  pendingCount,
  inProgressCount,
  deliveredCount,
  cancelledCount,
  availableCouriersCount,
  onExpand,
  onSelectDeliveries,
  onSelectCouriers,
  onCyclePanelSize,
  onMinimize,
  controlsProps,
  deliveriesTabProps,
  couriersViewProps,
}) => (
  <div
    className={`hidden md:flex absolute top-4 right-4 z-20 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-lg border border-app-nav-border rounded-2xl shadow-2xl flex-col overflow-hidden transition-all duration-300 ${
      panelSize === 'minimized'
        ? 'cursor-pointer hover:shadow-3xl'
        : 'max-h-[calc(100vh-32px)]'
    } ${
      panelSize === 'minimized'
        ? 'w-auto'
        : panelSize === 'normal'
        ? 'w-[415px]'
        : panelSize === 'medium'
        ? 'w-[580px]'
        : 'w-[760px]'
    }`}
    onClick={panelSize === 'minimized' ? onExpand : undefined}
  >
    {panelSize === 'minimized' ? (
      <LiveManagerMinimizedWidget
        totalDeliveries={totalDeliveries}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        deliveredCount={deliveredCount}
        cancelledCount={cancelledCount}
        availableCouriersCount={availableCouriersCount}
        onExpand={(event) => {
          event.stopPropagation();
          onExpand();
        }}
      />
    ) : (
      <>
        <LiveManagerDesktopHeader
          activeTab={controlsProps.activeTab}
          deliveriesCount={deliveriesCount}
          couriersCount={couriersCount}
          panelSize={panelSize}
          onSelectDeliveries={onSelectDeliveries}
          onSelectCouriers={onSelectCouriers}
          onCyclePanelSize={onCyclePanelSize}
          onMinimize={onMinimize}
        />

        <LiveManagerDesktopControls {...controlsProps} />

        <div className="relative flex-1 overflow-y-auto bg-white dark:bg-app-surface">
          {controlsProps.activeTab === 'deliveries' ? (
            <LiveDeliveriesTab {...deliveriesTabProps} />
          ) : (
            <LiveCouriersView {...couriersViewProps} />
          )}
        </div>
      </>
    )}
  </div>
);

