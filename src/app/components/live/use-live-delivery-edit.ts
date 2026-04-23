import { useCallback, useMemo, useState } from 'react';
import { Delivery } from '../../types/delivery.types';

type UseLiveDeliveryEditParams = {
  deliveries: Delivery[];
  updateDelivery: (deliveryId: string, updates: Partial<Delivery>) => void;
};

export const useLiveDeliveryEdit = ({
  deliveries,
  updateDelivery,
}: UseLiveDeliveryEditParams) => {
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any | null>(null);
  const [editDeliveryId, setEditDeliveryId] = useState<string | null>(null);

  const editDelivery = useMemo(
    () => (editDeliveryId ? deliveries.find((delivery) => delivery.id === editDeliveryId) ?? null : null),
    [deliveries, editDeliveryId]
  );

  const handleOpenEditDelivery = useCallback((deliveryId: string) => {
    setEditDeliveryId(deliveryId);
  }, []);

  const handleCloseEditDelivery = useCallback(() => {
    setEditDeliveryId(null);
  }, []);

  const handleCloseOrderDetails = useCallback(() => {
    setSelectedOrderForDetails(null);
  }, []);

  const handleSaveEditDelivery = useCallback((deliveryId: string, updates: Partial<Delivery>) => {
    updateDelivery(deliveryId, updates);
  }, [updateDelivery]);

  return {
    editDelivery,
    editDeliveryId,
    handleCloseEditDelivery,
    handleCloseOrderDetails,
    handleOpenEditDelivery,
    handleSaveEditDelivery,
    selectedOrderForDetails,
    setSelectedOrderForDetails,
  };
};
