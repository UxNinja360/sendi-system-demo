import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';

type LiveTab = 'deliveries' | 'couriers';

type CourierSelectionState = {
  id: string;
  status: string;
  isOnShift: boolean;
};

type UseLiveManagerSelectionParams = {
  activeTab: LiveTab;
  couriers: CourierSelectionState[];
  setActiveTab: Dispatch<SetStateAction<LiveTab>>;
};

export const useLiveManagerSelection = ({
  activeTab,
  couriers,
  setActiveTab,
}: UseLiveManagerSelectionParams) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pendingScrollOrderId, setPendingScrollOrderId] = useState<string | null>(null);
  const [pendingScrollCourierId, setPendingScrollCourierId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [mapHighlightedCourierId, setMapHighlightedCourierId] = useState<string | null>(null);

  const clearCourierSelection = useCallback(() => {
    setSelectedCourierId(null);
    setMapHighlightedCourierId(null);
  }, []);

  const clearOrderSelection = useCallback(() => {
    setSelectedOrderId(null);
    setPendingScrollOrderId(null);
  }, []);

  const focusOrderInDeliveries = useCallback((deliveryId: string) => {
    setSelectedOrderId(deliveryId);
    setActiveTab('deliveries');
    setPendingScrollOrderId(null);

    requestAnimationFrame(() => {
      setPendingScrollOrderId(deliveryId);
    });
  }, [setActiveTab]);

  useEffect(() => {
    if (activeTab !== 'deliveries' || !pendingScrollOrderId) return;

    const frame = requestAnimationFrame(() => {
      const target = document.querySelector(`[data-order-id="${pendingScrollOrderId}"]`) as HTMLElement | null;
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingScrollOrderId(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTab, pendingScrollOrderId]);

  useEffect(() => {
    if (!selectedCourierId) return;

    const selectedCourier = couriers.find((courier) => courier.id === selectedCourierId);
    if (selectedCourier && selectedCourier.status !== 'offline' && selectedCourier.isOnShift) return;

    clearCourierSelection();
  }, [clearCourierSelection, couriers, selectedCourierId]);

  return {
    clearCourierSelection,
    clearOrderSelection,
    focusOrderInDeliveries,
    mapHighlightedCourierId,
    pendingScrollCourierId,
    pendingScrollOrderId,
    selectedCourierId,
    selectedOrderId,
    setMapHighlightedCourierId,
    setPendingScrollCourierId,
    setPendingScrollOrderId,
    setSelectedCourierId,
    setSelectedOrderId,
  };
};
