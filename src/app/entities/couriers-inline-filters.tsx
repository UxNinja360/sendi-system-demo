import React, { useEffect, useRef, useState } from 'react';
import { ListSingleSelectFilter, SingleSelectFilterOption } from '../components/common/list-filter-controls';

interface CouriersInlineFiltersProps {
  statusFilter: 'all' | 'available' | 'busy' | 'offline';
  onStatusChange: (status: 'all' | 'available' | 'busy' | 'offline') => void;
  deliveryFilter: 'all' | 'with_delivery' | 'without_delivery';
  onDeliveryChange: (filter: 'all' | 'with_delivery' | 'without_delivery') => void;
  statusCounts: {
    all: number;
    available: number;
    busy: number;
    offline: number;
  };
}

const STATUS_OPTIONS: SingleSelectFilterOption[] = [
  { id: 'all', label: 'סטטוס' },
  { id: 'available', label: 'זמין' },
  { id: 'busy', label: 'תפוס' },
  { id: 'offline', label: 'לא מחובר' },
];

const DELIVERY_OPTIONS: SingleSelectFilterOption[] = [
  { id: 'all', label: 'משלוחים' },
  { id: 'with_delivery', label: 'עם משלוח פעיל' },
  { id: 'without_delivery', label: 'ללא משלוח' },
];

export const CouriersInlineFilters: React.FC<CouriersInlineFiltersProps> = ({
  statusFilter,
  onStatusChange,
  deliveryFilter,
  onDeliveryChange,
  statusCounts,
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!statusRef.current?.contains(event.target as Node)) setStatusOpen(false);
      if (!deliveryRef.current?.contains(event.target as Node)) setDeliveryOpen(false);
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeStatusSiblings = () => {
    setDeliveryOpen(false);
  };

  const closeDeliverySiblings = () => {
    setStatusOpen(false);
  };

  const statusOptionsWithCounts = STATUS_OPTIONS.map((option) => ({
    ...option,
    count: option.id === 'all' ? undefined : statusCounts[option.id as keyof typeof statusCounts],
  }));

  return (
    <div className="hidden md:contents">
      <ListSingleSelectFilter
        containerRef={statusRef}
        isOpen={statusOpen}
        setOpen={setStatusOpen}
        closeOtherMenus={closeStatusSiblings}
        value={statusFilter}
        onChange={(value) => onStatusChange(value as typeof statusFilter)}
        options={statusOptionsWithCounts}
        defaultLabel="סטטוס"
      />

      <ListSingleSelectFilter
        containerRef={deliveryRef}
        isOpen={deliveryOpen}
        setOpen={setDeliveryOpen}
        closeOtherMenus={closeDeliverySiblings}
        value={deliveryFilter}
        onChange={(value) => onDeliveryChange(value as typeof deliveryFilter)}
        options={DELIVERY_OPTIONS}
        defaultLabel="משלוחים"
      />
    </div>
  );
};
