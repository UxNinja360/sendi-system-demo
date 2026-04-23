import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from 'react';

type RouteStopRef = {
  id: string;
};

type SortableCourier = {
  id: string;
  name: string;
  status: string;
  isOnShift: boolean;
  activeOrders: Array<unknown>;
  totalDeliveries: number;
  rating: number;
  routeStops: RouteStopRef[];
};

type PendingRouteOrder = {
  courierId: string;
  order: string[];
} | null;

type UseLiveCouriersViewControlsParams<TCourier extends SortableCourier> = {
  couriersWithOrders: TCourier[];
  routeStopOrders: Record<string, string[]>;
  onRouteStopOrdersChange: (updater: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  quickFilter: 'all' | 'free' | 'busy';
  pendingRouteOrder: PendingRouteOrder;
  setPendingRouteOrder: Dispatch<SetStateAction<PendingRouteOrder>>;
};

export const useLiveCouriersViewControls = <TCourier extends SortableCourier>({
  couriersWithOrders,
  routeStopOrders,
  onRouteStopOrdersChange,
  quickFilter,
  pendingRouteOrder,
  setPendingRouteOrder,
}: UseLiveCouriersViewControlsParams<TCourier>) => {
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'active' | 'total' | 'rating' | 'available'>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [openMenuCourierId, setOpenMenuCourierId] = useState<string | null>(null);
  const [openMenuPosition, setOpenMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [openMenuSource, setOpenMenuSource] = useState<'button' | 'context' | null>(null);

  const couriersWithOrdersRef = useRef(couriersWithOrders);
  const routeStopOrdersRef = useRef(routeStopOrders);

  useEffect(() => {
    couriersWithOrdersRef.current = couriersWithOrders;
  }, [couriersWithOrders]);

  useEffect(() => {
    routeStopOrdersRef.current = routeStopOrders;
  }, [routeStopOrders]);

  useEffect(() => {
    if (!openMenuCourierId) return;

    const close = () => {
      setOpenMenuCourierId(null);
      setOpenMenuPosition(null);
      setOpenMenuSource(null);
    };

    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [openMenuCourierId]);

  const sortedCouriers = useMemo(() => {
    const sorted = [...couriersWithOrders].sort((left, right) => {
      let comparison = 0;

      if (sortBy === 'status') {
        const statusOrder = (courier: SortableCourier) => {
          if (courier.activeOrders.length > 0) return 0;
          if (courier.status !== 'offline' && courier.isOnShift) return 1;
          if (courier.status !== 'offline') return 2;
          return 3;
        };

        comparison = statusOrder(left) - statusOrder(right);
        if (comparison === 0) {
          comparison = right.activeOrders.length - left.activeOrders.length;
        }
      } else if (sortBy === 'name') {
        comparison = left.name.localeCompare(right.name, 'he');
      } else if (sortBy === 'active') {
        comparison = right.activeOrders.length - left.activeOrders.length;
      } else if (sortBy === 'total') {
        comparison = right.totalDeliveries - left.totalDeliveries;
      } else if (sortBy === 'rating') {
        comparison = right.rating - left.rating;
      } else if (sortBy === 'available') {
        const leftAssignable = left.status !== 'offline' && left.isOnShift;
        const rightAssignable = right.status !== 'offline' && right.isOnShift;

        if (leftAssignable && !rightAssignable) comparison = -1;
        else if (!leftAssignable && rightAssignable) comparison = 1;
        else comparison = left.activeOrders.length - right.activeOrders.length;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [couriersWithOrders, sortBy, sortDirection]);

  const displayedCouriers = useMemo(() => {
    if (quickFilter === 'free') {
      return sortedCouriers.filter((courier) => courier.isOnShift && courier.activeOrders.length === 0);
    }

    if (quickFilter === 'busy') {
      return sortedCouriers.filter((courier) => courier.activeOrders.length > 0);
    }

    return sortedCouriers;
  }, [quickFilter, sortedCouriers]);

  const moveStop = useCallback((courierId: string, fromIndex: number, toIndex: number) => {
    const courier = couriersWithOrdersRef.current.find((item) => item.id === courierId);
    if (!courier) return;

    setPendingRouteOrder((previous) => {
      const currentOrder =
        previous?.courierId === courierId
          ? previous.order
          : routeStopOrdersRef.current[courierId] || courier.routeStops.map((stop) => stop.id);

      const nextOrder = [...currentOrder];
      const [movedItem] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, movedItem);

      return { courierId, order: nextOrder };
    });
  }, []);

  const confirmRouteOrder = useCallback(() => {
    if (!pendingRouteOrder) return;

    const courier = couriersWithOrdersRef.current.find((item) => item.id === pendingRouteOrder.courierId);
    const validRouteStopIds = new Set((courier?.routeStops ?? []).map((stop) => stop.id));
    const normalizedOrder = pendingRouteOrder.order.filter(
      (stopId, index) => validRouteStopIds.has(stopId) && pendingRouteOrder.order.indexOf(stopId) === index
    );

    onRouteStopOrdersChange((previous) => ({
      ...previous,
      [pendingRouteOrder.courierId]: normalizedOrder,
    }));
    setPendingRouteOrder(null);
  }, [onRouteStopOrdersChange, pendingRouteOrder]);

  const cancelRouteOrder = useCallback(() => {
    setPendingRouteOrder(null);
  }, []);

  const closeCourierMenu = useCallback(() => {
    setOpenMenuCourierId(null);
    setOpenMenuPosition(null);
    setOpenMenuSource(null);
  }, []);

  const handleOpenCourierContextMenu = useCallback((courierId: string, event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 176;
    const menuHeight = 96;

    setOpenMenuCourierId(courierId);
    setOpenMenuSource('context');
    setOpenMenuPosition({
      top: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
      left: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
    });
  }, []);

  const handleToggleCourierMenu = useCallback((courierId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const isClosing = openMenuCourierId === courierId && openMenuSource === 'button';

    setOpenMenuCourierId(isClosing ? null : courierId);
    setOpenMenuSource(isClosing ? null : 'button');
    setOpenMenuPosition(
      isClosing
        ? null
        : {
            top: Math.min(rect.bottom + 8, window.innerHeight - 56),
            left: Math.max(12, rect.left - 144 + rect.width),
          }
    );
  }, [openMenuCourierId, openMenuSource]);

  return {
    sortBy,
    sortDirection,
    showSortMenu,
    openMenuCourierId,
    openMenuPosition,
    sortedCouriers,
    displayedCouriers,
    setSortBy,
    setSortDirection,
    setShowSortMenu,
    moveStop,
    confirmRouteOrder,
    cancelRouteOrder,
    closeCourierMenu,
    handleOpenCourierContextMenu,
    handleToggleCourierMenu,
  };
};
