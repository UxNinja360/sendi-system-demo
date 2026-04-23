import React from 'react';
import { Check, ChevronDown, Users, Utensils, X } from 'lucide-react';
import { DeliveryStatus } from '../types/delivery.types';
import { FilterOption, ListMultiSelectFilter, getListFilterButtonClass } from '../components/common/list-filter-controls';

type StatusChipConfigItem = {
  status: DeliveryStatus;
  label: string;
  dot: string;
};

type DeliveriesDesktopFiltersProps = {
  statusRef: React.RefObject<HTMLDivElement | null>;
  branchRef: React.RefObject<HTMLDivElement | null>;
  areaRef: React.RefObject<HTMLDivElement | null>;
  restaurantRef: React.RefObject<HTMLDivElement | null>;
  courierRef: React.RefObject<HTMLDivElement | null>;
  statusOpen: boolean;
  setStatusOpen: React.Dispatch<React.SetStateAction<boolean>>;
  branchOpen: boolean;
  setBranchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  areaOpen: boolean;
  setAreaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  restaurantOpen: boolean;
  setRestaurantOpen: React.Dispatch<React.SetStateAction<boolean>>;
  courierOpen: boolean;
  setCourierOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setColumnsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statusFilters: Set<DeliveryStatus>;
  setStatusFilters: React.Dispatch<React.SetStateAction<Set<DeliveryStatus>>>;
  toggleStatusFilter: (status: DeliveryStatus) => void;
  statusCounts: Record<DeliveryStatus, number>;
  statusChipConfig: StatusChipConfigItem[];
  selectedBranches: Set<string>;
  setSelectedBranches: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleBranch: (branchId: string) => void;
  branchOptions: FilterOption[];
  branchSearch: string;
  setBranchSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedAreas: Set<string>;
  setSelectedAreas: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleArea: (areaId: string) => void;
  areaOptions: FilterOption[];
  areaSearch: string;
  setAreaSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedRestaurants: Set<string>;
  setSelectedRestaurants: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleRestaurant: (restaurantId: string) => void;
  restaurantOptions: FilterOption[];
  restaurantSearch: string;
  setRestaurantSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedCouriers: Set<string>;
  setSelectedCouriers: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleCourier: (courierId: string) => void;
  courierOptions: FilterOption[];
  courierSearch: string;
  setCourierSearch: React.Dispatch<React.SetStateAction<string>>;
  setCurrentPage: (page: number) => void;
};

export const DeliveriesDesktopFilters: React.FC<DeliveriesDesktopFiltersProps> = ({
  statusRef,
  branchRef,
  areaRef,
  restaurantRef,
  courierRef,
  statusOpen,
  setStatusOpen,
  branchOpen,
  setBranchOpen,
  areaOpen,
  setAreaOpen,
  restaurantOpen,
  setRestaurantOpen,
  courierOpen,
  setCourierOpen,
  setColumnsOpen,
  statusFilters,
  setStatusFilters,
  toggleStatusFilter,
  statusCounts,
  statusChipConfig,
  selectedBranches,
  setSelectedBranches,
  toggleBranch,
  branchOptions,
  branchSearch,
  setBranchSearch,
  selectedAreas,
  setSelectedAreas,
  toggleArea,
  areaOptions,
  areaSearch,
  setAreaSearch,
  selectedRestaurants,
  setSelectedRestaurants,
  toggleRestaurant,
  restaurantOptions,
  restaurantSearch,
  setRestaurantSearch,
  selectedCouriers,
  setSelectedCouriers,
  toggleCourier,
  courierOptions,
  courierSearch,
  setCourierSearch,
  setCurrentPage,
}) => {
  const closeOtherMenusFromStatus = () => {
    setCourierOpen(false);
    setRestaurantOpen(false);
    setBranchOpen(false);
    setAreaOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromBranch = () => {
    setStatusOpen(false);
    setCourierOpen(false);
    setRestaurantOpen(false);
    setAreaOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromArea = () => {
    setStatusOpen(false);
    setCourierOpen(false);
    setRestaurantOpen(false);
    setBranchOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromRestaurant = () => {
    setStatusOpen(false);
    setCourierOpen(false);
    setBranchOpen(false);
    setAreaOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromCourier = () => {
    setStatusOpen(false);
    setRestaurantOpen(false);
    setBranchOpen(false);
    setAreaOpen(false);
    setColumnsOpen(false);
  };

  return (
    <div className="hidden md:contents">
      <div className="relative" ref={statusRef}>
        <button
          onClick={() => {
            setStatusOpen(value => !value);
            closeOtherMenusFromStatus();
          }}
          className={getListFilterButtonClass(statusFilters.size > 0)}
        >
          <span>סטטוס</span>
          {statusFilters.size > 0 && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#9fe870] text-[10px] font-bold text-[#0d0d12]">
              {statusFilters.size}
            </span>
          )}
          {statusFilters.size === 0 ? (
            <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
          ) : (
            <span
              onClick={event => {
                event.stopPropagation();
                setStatusFilters(new Set());
                setStatusOpen(false);
                setCurrentPage(1);
              }}
              className="cursor-pointer rounded p-0.5 transition-colors hover:bg-[#dcfce7] dark:hover:bg-[#052e16]"
              role="button"
              aria-label="נקה סטטוס"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>

        {statusOpen && (
          <div className="absolute top-full right-0 z-50 mt-1.5 min-w-[150px] rounded-xl border border-[#e5e5e5] bg-white py-1 shadow-xl dark:border-[#262626] dark:bg-[#171717]">
            {statusChipConfig.map(({ status, label, dot }) => {
              const isActive = statusFilters.has(status);
              const count = statusCounts[status] ?? 0;
              return (
                <button
                  key={status}
                  onClick={() => {
                    toggleStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-[#f5f5f5] text-[#0d0d12] dark:bg-[#262626] dark:text-[#fafafa]'
                      : 'text-[#525252] hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#262626]'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                      isActive
                        ? 'border-[#9fe870] bg-[#9fe870] text-[#0d0d12]'
                        : 'border-[#d4d4d4] bg-white text-transparent dark:border-[#404040] dark:bg-[#171717]'
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className={`h-2 w-2 shrink-0 rounded-full transition-opacity ${dot} ${isActive ? '' : 'opacity-50'}`} />
                  <span className={`flex-1 text-right ${isActive ? 'font-medium' : ''}`}>{label}</span>
                  <span className="tabular-nums text-xs text-[#a3a3a3]">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ListMultiSelectFilter
        containerRef={branchRef}
        isOpen={branchOpen}
        setOpen={setBranchOpen}
        closeOtherMenus={closeOtherMenusFromBranch}
        selectedValues={selectedBranches}
        setSelectedValues={setSelectedBranches}
        toggleValue={toggleBranch}
        options={branchOptions}
        searchValue={branchSearch}
        setSearchValue={setBranchSearch}
        defaultLabel="סניף"
        pluralLabel="סניפים"
        placeholder="חפש סניף..."
        setCurrentPage={setCurrentPage}
      />

      <ListMultiSelectFilter
        containerRef={areaRef}
        isOpen={areaOpen}
        setOpen={setAreaOpen}
        closeOtherMenus={closeOtherMenusFromArea}
        selectedValues={selectedAreas}
        setSelectedValues={setSelectedAreas}
        toggleValue={toggleArea}
        options={areaOptions}
        searchValue={areaSearch}
        setSearchValue={setAreaSearch}
        defaultLabel="אזור"
        pluralLabel="אזורים"
        placeholder="חפש אזור..."
        setCurrentPage={setCurrentPage}
      />

      <ListMultiSelectFilter
        containerRef={restaurantRef}
        isOpen={restaurantOpen}
        setOpen={setRestaurantOpen}
        closeOtherMenus={closeOtherMenusFromRestaurant}
        selectedValues={selectedRestaurants}
        setSelectedValues={setSelectedRestaurants}
        toggleValue={toggleRestaurant}
        options={restaurantOptions}
        searchValue={restaurantSearch}
        setSearchValue={setRestaurantSearch}
        defaultLabel="מסעדה"
        pluralLabel="מסעדות"
        placeholder="חפש מסעדה..."
        setCurrentPage={setCurrentPage}
        icon={<Utensils className="h-3.5 w-3.5" />}
      />

      <ListMultiSelectFilter
        containerRef={courierRef}
        isOpen={courierOpen}
        setOpen={setCourierOpen}
        closeOtherMenus={closeOtherMenusFromCourier}
        selectedValues={selectedCouriers}
        setSelectedValues={setSelectedCouriers}
        toggleValue={toggleCourier}
        options={courierOptions}
        searchValue={courierSearch}
        setSearchValue={setCourierSearch}
        defaultLabel="שליח"
        pluralLabel="שליחים"
        placeholder="חפש שליח..."
        setCurrentPage={setCurrentPage}
        icon={<Users className="h-3.5 w-3.5" />}
      />
    </div>
  );
};

