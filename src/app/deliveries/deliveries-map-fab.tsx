import React from 'react';
import { Map as MapIcon } from 'lucide-react';

import { AppTooltip } from '../components/common/app-tooltip';

type DeliveriesMapFabProps = {
  mapOpen: boolean;
  setMapOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const DeliveriesMapFab: React.FC<DeliveriesMapFabProps> = ({ mapOpen, setMapOpen }) => {
  const handleOpenMap = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setMapOpen(true);

    const isTouchLikeDevice =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none), (pointer: coarse)').matches;

    if (isTouchLikeDevice) {
      event.currentTarget.blur();
    }
  }, [setMapOpen]);

  if (mapOpen) return null;

  return (
    <AppTooltip
      label="פתח מפה"
      side="right"
      sideOffset={10}
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 z-40 inline-flex md:left-6"
    >
      <button
        type="button"
        aria-label="פתח מפה"
        data-haptic="medium"
        onClick={handleOpenMap}
        className="dashboard-map-fab inline-flex h-12 w-12 items-center justify-center rounded-full border border-app-border bg-app-surface/95 text-app-text shadow-[0_12px_34px_rgba(0,0,0,0.34)] backdrop-blur transition-[background-color,border-color,box-shadow,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30"
      >
        <MapIcon className="h-5 w-5" />
      </button>
    </AppTooltip>
  );
};
