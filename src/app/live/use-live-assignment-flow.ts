import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Delivery } from '../types/delivery.types';
import {
  createPickupBatchId,
  getDeliveryPickupBatchKey,
  getPickupGroupStopId,
  getRestaurantPickupBaseKey,
} from '../utils/pickup-batches';
import { MAX_ACTIVE_DELIVERIES_PER_COURIER } from '../utils/courier-assignment';

type LiveTab = 'deliveries' | 'couriers';

type LiveCourierState = {
  id: string;
  isOnShift: boolean;
  name: string;
  status: string;
};

type LiveOrderItem = {
  courierId?: string;
  deliveryId: string;
  fullDelivery?: {
    courierId?: string;
    status?: string;
  };
  id: string;
  [key: string]: unknown;
};

type UseLiveAssignmentFlowParams = {
  allOrders: LiveOrderItem[];
  assignCourier: (deliveryId: string, courierId: string, pickupBatchId?: string) => void;
  clearCourierSelection: () => void;
  clearOrderSelection: () => void;
  couriers: LiveCourierState[];
  deliveries: Delivery[];
  focusOrderInDeliveries: (deliveryId: string) => void;
  isDeliveryAssignable: (delivery?: Delivery | null) => boolean;
  selectedCourierId: string | null;
  selectedOrderId: string | null;
  setActiveTab: Dispatch<SetStateAction<LiveTab>>;
  setMapHighlightedCourierId: Dispatch<SetStateAction<string | null>>;
  setPendingScrollCourierId: Dispatch<SetStateAction<string | null>>;
  setSelectedCourierId: Dispatch<SetStateAction<string | null>>;
  setSelectedOrderForDetails: Dispatch<SetStateAction<any | null>>;
  setSelectedOrderId: Dispatch<SetStateAction<string | null>>;
  setRouteStopOrders: Dispatch<SetStateAction<Record<string, string[]>>>;
};

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

export const useLiveAssignmentFlow = ({
  allOrders,
  assignCourier,
  clearCourierSelection,
  clearOrderSelection,
  couriers,
  deliveries,
  focusOrderInDeliveries,
  isDeliveryAssignable,
  selectedCourierId,
  selectedOrderId,
  setActiveTab,
  setMapHighlightedCourierId,
  setPendingScrollCourierId,
  setSelectedCourierId,
  setSelectedOrderForDetails,
  setSelectedOrderId,
  setRouteStopOrders,
}: UseLiveAssignmentFlowParams) => {
  const [assignmentMode, setAssignmentMode] = useState(false);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());

  const validSelectedDeliveryIds = useMemo(() => {
    return new Set(
      [...selectedDeliveryIds].filter((deliveryId) => {
        const delivery = deliveries.find((item) => item.id === deliveryId);
        return isDeliveryAssignable(delivery);
      })
    );
  }, [deliveries, isDeliveryAssignable, selectedDeliveryIds]);

  useEffect(() => {
    if (areSetsEqual(validSelectedDeliveryIds, selectedDeliveryIds)) return;
    setSelectedDeliveryIds(validSelectedDeliveryIds);
  }, [selectedDeliveryIds, validSelectedDeliveryIds]);

  const resetAssignmentFlow = useCallback((nextTab?: LiveTab) => {
    setAssignmentMode(false);
    setSelectedDeliveryIds(new Set());
    clearCourierSelection();
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [clearCourierSelection, setActiveTab]);

  useEffect(() => {
    if (!assignmentMode) return;
    if (validSelectedDeliveryIds.size > 0) return;

    resetAssignmentFlow('deliveries');
  }, [assignmentMode, resetAssignmentFlow, validSelectedDeliveryIds]);

  const previewRouteOrders = useMemo(() => {
    if (!assignmentMode || !selectedCourierId || validSelectedDeliveryIds.size === 0) {
      return allOrders;
    }

    const selectedIds = new Set(validSelectedDeliveryIds);
    return allOrders.map((order) => (
      selectedIds.has(order.deliveryId)
        ? { ...order, courierId: selectedCourierId }
        : order
    ));
  }, [allOrders, assignmentMode, selectedCourierId, validSelectedDeliveryIds]);

  const canCourierTakeSelectedDeliveries = useCallback((courierId: string) => {
    const courier = couriers.find((item) => item.id === courierId);
    if (!courier || courier.status === 'offline' || !courier.isOnShift) return false;

    const selectedDeliveries = [...validSelectedDeliveryIds]
      .map((deliveryId) => deliveries.find((delivery) => delivery.id === deliveryId))
      .filter((delivery): delivery is Delivery => Boolean(delivery));

    if (selectedDeliveries.length === 0) return false;

    const activeDeliveryIds = new Set(
      deliveries
        .filter((delivery) =>
          delivery.courierId === courierId &&
          delivery.status !== 'delivered' &&
          delivery.status !== 'cancelled'
        )
        .map((delivery) => delivery.id)
    );

    selectedDeliveries.forEach((delivery) => activeDeliveryIds.add(delivery.id));

    return activeDeliveryIds.size <= MAX_ACTIVE_DELIVERIES_PER_COURIER;
  }, [couriers, deliveries, validSelectedDeliveryIds]);

  useEffect(() => {
    if (!assignmentMode || !selectedCourierId) return;
    if (canCourierTakeSelectedDeliveries(selectedCourierId)) return;

    clearCourierSelection();
  }, [assignmentMode, canCourierTakeSelectedDeliveries, clearCourierSelection, selectedCourierId]);

  const handleOpenAssignMode = useCallback((deliveryId: string) => {
    const delivery = deliveries.find((item) => item.id === deliveryId);
    if (!isDeliveryAssignable(delivery)) return;

    setSelectedDeliveryIds(new Set([deliveryId]));
    clearCourierSelection();
    setAssignmentMode(true);
    setActiveTab('couriers');
  }, [clearCourierSelection, deliveries, isDeliveryAssignable, setActiveTab]);

  const handleOpenAssignForSelected = useCallback(() => {
    if (validSelectedDeliveryIds.size === 0) return;

    setSelectedDeliveryIds(new Set(validSelectedDeliveryIds));
    clearCourierSelection();
    setAssignmentMode(true);
    setActiveTab('couriers');
  }, [clearCourierSelection, setActiveTab, validSelectedDeliveryIds]);

  const handleToggleSelectedDelivery = useCallback((deliveryId: string) => {
    setSelectedDeliveryIds((current) => {
      const next = new Set(current);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      return next;
    });
  }, []);

  const handleMapOrderClick = useCallback((deliveryId: string) => {
    const delivery = deliveries.find((item) => item.id === deliveryId);
    if (!delivery) return;

    const isRoutedDelivery =
      Boolean(delivery.courierId) &&
      (delivery.status === 'assigned' || delivery.status === 'delivering');

    if (isRoutedDelivery && delivery.courierId) {
      setMapHighlightedCourierId(delivery.courierId);
      focusOrderInDeliveries(delivery.id);
      return;
    }

    focusOrderInDeliveries(delivery.id);

    setSelectedDeliveryIds((current) => {
      const next = new Set(current);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      return next;
    });
  }, [deliveries, focusOrderInDeliveries, setMapHighlightedCourierId]);

  const handleDeliveryRowClick = useCallback((order: LiveOrderItem) => {
    const isAlreadySelected = selectedOrderId === order.id || selectedOrderId === order.deliveryId;
    if (isAlreadySelected) {
      clearOrderSelection();
      setMapHighlightedCourierId(null);
      return;
    }

    setSelectedOrderId(order.id);

    const courierId = order.fullDelivery?.courierId;
    const status = order.fullDelivery?.status;
    const isActive = status === 'assigned' || status === 'delivering';
    if (courierId && isActive) {
      setMapHighlightedCourierId(courierId);
    } else {
      setMapHighlightedCourierId(null);
    }
  }, [clearOrderSelection, selectedOrderId, setMapHighlightedCourierId, setSelectedOrderId]);

  const handleSelectCourier = useCallback((courierId: string) => {
    if (!canCourierTakeSelectedDeliveries(courierId)) {
      toast.error('שליח זה לא זמין לשיבוץ (לא מחובר או לא במשמרת).', {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }

    setSelectedCourierId(courierId);
    setMapHighlightedCourierId(courierId);
    setPendingScrollCourierId(courierId);
  }, [
    canCourierTakeSelectedDeliveries,
    setMapHighlightedCourierId,
    setPendingScrollCourierId,
    setSelectedCourierId,
  ]);

  const handleMapOrderShowDetails = useCallback((deliveryId: string) => {
    const order = allOrders.find((item) => item.deliveryId === deliveryId || item.id === deliveryId);
    if (order) {
      setSelectedOrderForDetails(order);
    }
  }, [allOrders, setSelectedOrderForDetails]);

  const handleMapCourierClick = useCallback((courierId: string) => {
    if (assignmentMode) {
      const canTake = canCourierTakeSelectedDeliveries(courierId);
      if (!canTake) {
        toast.error('שליח זה לא זמין לשיבוץ (לא מחובר או לא במשמרת).', {
          duration: 2500,
          position: 'top-center',
        });
        setActiveTab('couriers');
        setPendingScrollCourierId(courierId);
        clearCourierSelection();
        return;
      }
    }

    setActiveTab('couriers');
    setMapHighlightedCourierId(courierId);
    setSelectedCourierId(courierId);
    setPendingScrollCourierId(courierId);
  }, [
    assignmentMode,
    canCourierTakeSelectedDeliveries,
    clearCourierSelection,
    setActiveTab,
    setMapHighlightedCourierId,
    setPendingScrollCourierId,
    setSelectedCourierId,
  ]);

  const handleConfirmAssignment = useCallback(() => {
    if (!selectedCourierId || validSelectedDeliveryIds.size === 0) return;
    if (!canCourierTakeSelectedDeliveries(selectedCourierId)) {
      clearCourierSelection();
      toast.error('לא ניתן לשבץ כרגע את המשלוחים לשליח הזה.', { duration: 2500 });
      return;
    }

    const courier = couriers.find((item) => item.id === selectedCourierId);
    const courierName = courier?.name || 'שליח';
    const deliveryCount = validSelectedDeliveryIds.size;
    const selectedPickupBatchIdsByRestaurant = new Map<string, string>();
    const selectedPickupBatchIdsByDeliveryId = new Map<string, string>();

    const existingActiveDeliveries = deliveries.filter(
      (delivery) => delivery.courierId === selectedCourierId &&
        delivery.status !== 'delivered' &&
        delivery.status !== 'cancelled'
    );
    const newDeliveryObjects = [...validSelectedDeliveryIds]
      .map((deliveryId) => deliveries.find((delivery) => delivery.id === deliveryId))
      .filter((delivery): delivery is Delivery => Boolean(delivery));

    const deliveringDeliveries = existingActiveDeliveries.filter((delivery) => delivery.status === 'delivering');
    const assignedDeliveries = existingActiveDeliveries.filter((delivery) => delivery.status === 'assigned');
    const existingAssignedPickupBatchIdsByRestaurant = new Map<string, string>();

    assignedDeliveries.forEach((delivery) => {
      const restaurantKey = getRestaurantPickupBaseKey(delivery);
      if (existingAssignedPickupBatchIdsByRestaurant.has(restaurantKey)) return;
      existingAssignedPickupBatchIdsByRestaurant.set(
        restaurantKey,
        getDeliveryPickupBatchKey(delivery)
      );
    });

    newDeliveryObjects.forEach((delivery) => {
      const restaurantKey = getRestaurantPickupBaseKey(delivery);
      let pickupBatchId =
        selectedPickupBatchIdsByRestaurant.get(restaurantKey) ??
        existingAssignedPickupBatchIdsByRestaurant.get(restaurantKey);

      if (!pickupBatchId) {
        pickupBatchId = createPickupBatchId(restaurantKey);
      }

      selectedPickupBatchIdsByRestaurant.set(restaurantKey, pickupBatchId);
      selectedPickupBatchIdsByDeliveryId.set(delivery.id, pickupBatchId);
    });

    const smartStops: string[] = [];
    const seenPickupGroups = new Set<string>();

    deliveringDeliveries.forEach((delivery) => {
      smartStops.push(`${delivery.id}-dropoff`);
    });

    assignedDeliveries.forEach((delivery) => {
      const key = getDeliveryPickupBatchKey(delivery);
      const stopId = getPickupGroupStopId(key);
      if (!seenPickupGroups.has(stopId)) {
        seenPickupGroups.add(stopId);
        smartStops.push(stopId);
      }
      smartStops.push(`${delivery.id}-dropoff`);
    });

    newDeliveryObjects.forEach((delivery) => {
      const key =
        selectedPickupBatchIdsByDeliveryId.get(delivery.id) ??
        createPickupBatchId(getRestaurantPickupBaseKey(delivery));
      const stopId = getPickupGroupStopId(key);
      if (!seenPickupGroups.has(stopId)) {
        seenPickupGroups.add(stopId);
        smartStops.push(stopId);
      }
      smartStops.push(`${delivery.id}-dropoff`);
    });

    if (smartStops.length > 0) {
      setRouteStopOrders((current) => ({
        ...current,
        [selectedCourierId]: smartStops,
      }));
    }

    validSelectedDeliveryIds.forEach((deliveryId) => {
      assignCourier(
        deliveryId,
        selectedCourierId,
        selectedPickupBatchIdsByDeliveryId.get(deliveryId)
      );
    });

    toast.success(
      deliveryCount === 1
        ? `משלוח שובץ ל${courierName} ✓`
        : `${deliveryCount} משלוחים שובצו ל${courierName} ✓`,
      { duration: 2500 }
    );

    setAssignmentMode(false);
    setSelectedDeliveryIds(new Set());
    clearCourierSelection();
  }, [
    assignCourier,
    canCourierTakeSelectedDeliveries,
    clearCourierSelection,
    couriers,
    deliveries,
    selectedCourierId,
    setRouteStopOrders,
    validSelectedDeliveryIds,
  ]);

  const handleCancelAssignment = useCallback(() => {
    resetAssignmentFlow('deliveries');
  }, [resetAssignmentFlow]);

  return {
    assignmentMode,
    handleCancelAssignment,
    handleConfirmAssignment,
    handleDeliveryRowClick,
    handleMapCourierClick,
    handleMapOrderClick,
    handleMapOrderShowDetails,
    handleOpenAssignForSelected,
    handleOpenAssignMode,
    handleSelectCourier,
    handleToggleSelectedDelivery,
    previewRouteOrders,
    resetAssignmentFlow,
    selectedDeliveryIds,
    setSelectedDeliveryIds,
    validSelectedDeliveryIds,
  };
};

