import React from 'react';
import { LiveCouriersView } from './live-couriers-view';
import { LiveDeliveriesTab } from './live-deliveries-tab';
import { LiveManagerControlsProps } from './live-manager-desktop-controls';
import { LiveManagerMobileControls } from './live-manager-mobile-controls';

type LiveManagerMobilePanelProps = {
  panelHeight: 'half' | 'full';
  controlsProps: LiveManagerControlsProps;
  deliveriesTabProps: React.ComponentProps<typeof LiveDeliveriesTab>;
  couriersViewProps: React.ComponentProps<typeof LiveCouriersView>;
  onTouchStart: (clientY: number) => void;
  onTouchMove: (clientY: number) => void;
  onTouchEnd: () => void;
  onToggleHeight: () => void;
};

export const LiveManagerMobilePanel: React.FC<LiveManagerMobilePanelProps> = ({
  panelHeight,
  controlsProps,
  deliveriesTabProps,
  couriersViewProps,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onToggleHeight,
}) => (
  <div
    className={`md:hidden absolute bottom-[72px] left-0 right-0 z-20 transition-all duration-300 ease-out ${
      panelHeight === 'half'
        ? 'h-[45vh]'
        : 'h-[calc(100vh-96px)]'
    }`}
  >
    <div className="h-full bg-white/95 dark:bg-app-surface/95 backdrop-blur-lg border-t border-[#e5e5e5] dark:border-t-[#262626] shadow-2xl flex flex-col overflow-hidden rounded-t-[24px]">
      <div
        className="flex-shrink-0 py-2 flex justify-center cursor-pointer active:cursor-grabbing"
        onTouchStart={(event) => onTouchStart(event.touches[0].clientY)}
        onTouchMove={(event) => onTouchMove(event.touches[0].clientY)}
        onTouchEnd={onTouchEnd}
        onClick={onToggleHeight}
      >
        <div className="w-10 h-1 bg-[#d4d4d4] dark:bg-[#404040] rounded-full" />
      </div>

      {(controlsProps.activeTab === 'deliveries' || controlsProps.activeTab === 'couriers') && (
        <LiveManagerMobileControls {...controlsProps} />
      )}

      <div className="flex-1 overflow-y-auto relative">
        {controlsProps.activeTab === 'deliveries' ? (
          <LiveDeliveriesTab {...deliveriesTabProps} />
        ) : (
          <LiveCouriersView {...couriersViewProps} />
        )}
      </div>
    </div>
  </div>
);

