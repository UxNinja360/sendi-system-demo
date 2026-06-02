import { Map as MapIcon, Menu } from 'lucide-react';
import { useCallback, type FC } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  openDeliveriesMap,
  useDeliveriesMapOpen,
} from '../../deliveries/use-deliveries-map-split';

const MAP_LABEL = '\u05de\u05e4\u05d4';
const OPEN_MAP_LABEL = '\u05e4\u05ea\u05d7 \u05de\u05e4\u05d4';
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
    openDeliveriesMap();

    if (!isMapRoute) {
      navigate('/dashboard');
    }
  }, [isMapRoute, navigate]);

  return (
    <div
      dir="ltr"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.875rem)] left-1/2 z-40 flex h-12 -translate-x-1/2 items-center overflow-hidden rounded-[18px] border border-app-border bg-app-surface/95 text-app-text shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden"
      aria-label={QUICK_ACTIONS_LABEL}
    >
      <button
        type="button"
        data-haptic="selection"
        onClick={handleOpenMap}
        className={`flex h-full min-w-[5.75rem] items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors ${
          mapButtonActive
            ? 'bg-app-accent/10 text-app-accent'
            : 'text-app-text-secondary hover:bg-app-surface-raised hover:text-app-text'
        }`}
        aria-label={OPEN_MAP_LABEL}
        aria-pressed={mapButtonActive}
      >
        <MapIcon className="h-4 w-4" />
        <span>{MAP_LABEL}</span>
      </button>

      <span className="h-6 w-px bg-app-border" aria-hidden="true" />

      <button
        type="button"
        data-haptic="medium"
        onClick={onOpenMenu}
        className="flex h-full w-12 items-center justify-center text-app-text-secondary transition-colors hover:bg-app-surface-raised hover:text-app-text"
        aria-label={OPEN_MENU_LABEL}
      >
        <Menu className="h-5 w-5" />
      </button>
    </div>
  );
};
