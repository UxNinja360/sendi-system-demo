import type { Dispatch, FC, SetStateAction } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { useAppFeaturePreferences } from '../preferences/app-feature-preferences';

type DeliveriesMapFabProps = {
  mapOpen: boolean;
  setMapOpen: Dispatch<SetStateAction<boolean>>;
};

export const DeliveriesMapFab: FC<DeliveriesMapFabProps> = ({ mapOpen, setMapOpen }) => {
  const { preferences } = useAppFeaturePreferences();

  if (!preferences.roundMapFabEnabled || mapOpen) return null;

  return (
    <button
      type="button"
      className="deliveries-map-fab fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-app-border bg-app-surface/95 text-app-text shadow-[0_14px_34px_rgba(0,0,0,0.35)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-app-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand/30 md:bottom-5 md:left-5"
      data-haptic="selection"
      onClick={() => setMapOpen(true)}
      aria-label="פתח מפה"
      title="פתח מפה"
    >
      <MapIcon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
};
