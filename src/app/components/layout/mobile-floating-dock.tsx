import { Map as MapIcon, Menu, X } from 'lucide-react';
import { useCallback, type FC } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  openDeliveriesMap,
  toggleDeliveriesMapOpen,
  useDeliveriesMapOpen,
} from '../../deliveries/use-deliveries-map-split';

const MAP_LABEL = '\u05de\u05e4\u05d4';
const OPEN_MAP_LABEL = '\u05e4\u05ea\u05d7 \u05de\u05e4\u05d4';
const CLOSE_MAP_LABEL = '\u05e1\u05d2\u05d5\u05e8 \u05de\u05e4\u05d4';
const OPEN_MENU_LABEL = '\u05e4\u05ea\u05d7 \u05ea\u05e4\u05e8\u05d9\u05d8';
const QUICK_ACTIONS_LABEL = '\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05d4\u05d9\u05e8\u05d5\u05ea';
const MAP_ENABLED_ROUTES = new Set(['/couriers', '/dashboard', '/deliveries', '/restaurants']);

type MobileFloatingDockProps = {
  onOpenMenu?: () => void;
};

export const MobileFloatingDock: FC<MobileFloatingDockProps> = ({ onOpenMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const mapOpen = useDeliveriesMapOpen();
  const isMapRoute = MAP_ENABLED_ROUTES.has(location.pathname);
  const mapButtonActive = isMapRoute && mapOpen;

  const handleOpenMap = useCallback(() => {
    if (isMapRoute) {
      toggleDeliveriesMapOpen();
      return;
    }

    openDeliveriesMap();

    navigate('/dashboard');
  }, [isMapRoute, navigate]);

  return (
    <div
      dir="ltr"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.875rem)] left-1/2 z-40 flex h-12 -translate-x-1/2 items-center overflow-hidden rounded-[18px] bg-[color-mix(in_srgb,var(--app-surface-raised)_92%,var(--app-text)_5%)] text-app-text shadow-[0_16px_40px_color-mix(in_srgb,var(--app-surface-inset)_58%,transparent)] backdrop-blur-xl lg:hidden"
      aria-label={QUICK_ACTIONS_LABEL}
    >
      <button
        type="button"
        data-haptic="selection"
        onClick={handleOpenMap}
        className="flex h-full min-w-[5.75rem] items-center justify-center gap-2 px-4 text-sm font-semibold text-app-text-secondary transition-colors hover:bg-[color-mix(in_srgb,var(--app-text-secondary)_12%,transparent)] hover:text-app-text"
        aria-label={mapButtonActive ? CLOSE_MAP_LABEL : OPEN_MAP_LABEL}
        aria-pressed={mapButtonActive}
      >
        {mapButtonActive ? <X className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
        <span>{MAP_LABEL}</span>
      </button>

      <span
        className="h-6 w-px bg-[color-mix(in_srgb,var(--app-text-secondary)_22%,transparent)]"
        aria-hidden="true"
      />

      <button
        type="button"
        data-haptic="medium"
        onClick={onOpenMenu}
        className="flex h-full w-12 items-center justify-center text-app-text-secondary transition-colors hover:bg-[color-mix(in_srgb,var(--app-text-secondary)_12%,transparent)] hover:text-app-text"
        aria-label={OPEN_MENU_LABEL}
      >
        <Menu className="h-5 w-5" />
      </button>
    </div>
  );
};
