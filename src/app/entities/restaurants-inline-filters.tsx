import React, { useEffect, useRef, useState } from 'react';
import { ListSingleSelectFilter, SingleSelectFilterOption } from '../components/common/list-filter-controls';

interface RestaurantsInlineFiltersProps {
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  cityFilter: string;
  onCityChange: (city: string) => void;
  typeFilter: string;
  onTypeChange: (type: string) => void;
  cityOptions: string[];
  typeOptions: string[];
  statusCounts: { all: number; active: number; inactive: number };
}

const STATUS_OPTIONS: SingleSelectFilterOption[] = [
  { id: 'all', label: 'סטטוס' },
  { id: 'active', label: 'פעיל' },
  { id: 'inactive', label: 'לא פעיל' },
];

export const RestaurantsInlineFilters: React.FC<RestaurantsInlineFiltersProps> = ({
  statusFilter,
  onStatusChange,
  cityFilter,
  onCityChange,
  typeFilter,
  onTypeChange,
  cityOptions,
  typeOptions,
  statusCounts,
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!statusRef.current?.contains(event.target as Node)) setStatusOpen(false);
      if (!cityRef.current?.contains(event.target as Node)) setCityOpen(false);
      if (!typeRef.current?.contains(event.target as Node)) setTypeOpen(false);
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeStatusSiblings = () => {
    setCityOpen(false);
    setTypeOpen(false);
  };

  const closeCitySiblings = () => {
    setStatusOpen(false);
    setTypeOpen(false);
  };

  const closeTypeSiblings = () => {
    setStatusOpen(false);
    setCityOpen(false);
  };

  const statusOptionsWithCounts = STATUS_OPTIONS.map((option) => ({
    ...option,
    count: option.id === 'all' ? undefined : statusCounts[option.id as keyof typeof statusCounts],
  }));

  const cityOptionsWithAll: SingleSelectFilterOption[] = [
    { id: 'all', label: 'עיר' },
    ...cityOptions.map((city) => ({ id: city, label: city })),
  ];

  const typeOptionsWithAll: SingleSelectFilterOption[] = [
    { id: 'all', label: 'סוג' },
    ...typeOptions.map((type) => ({ id: type, label: type })),
  ];

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
        containerRef={cityRef}
        isOpen={cityOpen}
        setOpen={setCityOpen}
        closeOtherMenus={closeCitySiblings}
        value={cityFilter}
        onChange={onCityChange}
        options={cityOptionsWithAll}
        defaultLabel="עיר"
      />

      <ListSingleSelectFilter
        containerRef={typeRef}
        isOpen={typeOpen}
        setOpen={setTypeOpen}
        closeOtherMenus={closeTypeSiblings}
        value={typeFilter}
        onChange={onTypeChange}
        options={typeOptionsWithAll}
        defaultLabel="סוג"
      />
    </div>
  );
};
