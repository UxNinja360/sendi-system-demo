import React from 'react';
import { Check, ChevronDown, Users, Utensils, X } from 'lucide-react';
import { DeliveryStatus } from '../../types/delivery.types';

type FilterOption = {
  id: string;
  label: string;
};

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
  setDateOpen: React.Dispatch<React.SetStateAction<boolean>>;
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

type MultiSelectFilterProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeOtherMenus: () => void;
  selectedValues: Set<string>;
  setSelectedValues: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleValue: (id: string) => void;
  options: FilterOption[];
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  defaultLabel: string;
  pluralLabel: string;
  placeholder: string;
  setCurrentPage: (page: number) => void;
  icon?: React.ReactNode;
};

const getCheckboxClass = (isActive: boolean) =>
  `w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
    isActive ? 'bg-[#9fe870] border-[#9fe870]' : 'border-[#d4d4d4] dark:border-[#404040]'
  }`;

const getOptionButtonClass = (isActive: boolean) =>
  `w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right transition-colors ${
    isActive
      ? 'text-[#0d0d12] dark:text-[#fafafa] bg-[#f5f5f5] dark:bg-[#262626]'
      : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
  }`;

const getFilterButtonClass = (isActive: boolean) =>
  `h-9 flex items-center gap-1.5 px-3 rounded-[4px] border text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#9fe870]/15 border-[#9fe870]/40 text-[#6bc84a]'
      : 'bg-white dark:bg-[#171717] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#202020]'
  }`;

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  containerRef,
  isOpen,
  setOpen,
  closeOtherMenus,
  selectedValues,
  setSelectedValues,
  toggleValue,
  options,
  searchValue,
  setSearchValue,
  defaultLabel,
  pluralLabel,
  placeholder,
  setCurrentPage,
  icon,
}) => {
  const isActive = selectedValues.size > 0;
  const selectedLabel =
    selectedValues.size === 0
      ? defaultLabel
      : selectedValues.size === 1
        ? (options.find((option) => selectedValues.has(option.id))?.label ?? defaultLabel)
        : `${selectedValues.size} ${pluralLabel}`;

  const filteredOptions = options.filter((option) => !searchValue || option.label.includes(searchValue));

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setOpen((value) => !value);
          closeOtherMenus();
        }}
        className={getFilterButtonClass(isActive)}
      >
        {icon}
        <span>{selectedLabel}</span>
        {isActive ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              setSelectedValues(new Set());
              setOpen(false);
              setCurrentPage(1);
            }}
            className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
            role="button"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl flex flex-col min-w-[200px] max-h-[260px]">
          <div className="p-2 border-b border-[#f0f0f0] dark:border-[#262626]">
            <input
              autoFocus
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={placeholder}
              className="w-full px-2.5 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#141414] rounded-lg outline-none placeholder-[#a3a3a3] text-[#0d0d12] dark:text-[#fafafa]"
              style={{ direction: 'rtl' }}
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filteredOptions.map((option) => {
              const optionActive = selectedValues.has(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    toggleValue(option.id);
                    setCurrentPage(1);
                  }}
                  className={getOptionButtonClass(optionActive)}
                >
                  <span className={getCheckboxClass(optionActive)}>
                    {optionActive && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  setDateOpen,
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
    setDateOpen(false);
    setCourierOpen(false);
    setRestaurantOpen(false);
    setBranchOpen(false);
    setAreaOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromBranch = () => {
    setDateOpen(false);
    setStatusOpen(false);
    setCourierOpen(false);
    setRestaurantOpen(false);
    setAreaOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromArea = () => {
    setDateOpen(false);
    setStatusOpen(false);
    setCourierOpen(false);
    setRestaurantOpen(false);
    setBranchOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromRestaurant = () => {
    setDateOpen(false);
    setStatusOpen(false);
    setCourierOpen(false);
    setBranchOpen(false);
    setAreaOpen(false);
    setColumnsOpen(false);
  };

  const closeOtherMenusFromCourier = () => {
    setDateOpen(false);
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
            setStatusOpen((value) => !value);
            closeOtherMenusFromStatus();
          }}
          className={getFilterButtonClass(statusFilters.size > 0)}
        >
          <span>סטטוס</span>
          {statusFilters.size > 0 && (
            <span className="bg-[#9fe870] text-[#0d0d12] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
              {statusFilters.size}
            </span>
          )}
          {statusFilters.size === 0 ? (
            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
          ) : (
            <span
              onClick={(event) => {
                event.stopPropagation();
                setStatusFilters(new Set());
                setStatusOpen(false);
                setCurrentPage(1);
              }}
              className="p-0.5 rounded hover:bg-[#dcfce7] dark:hover:bg-[#052e16] transition-colors cursor-pointer"
              role="button"
              aria-label="נקה סטטוס"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
        {statusOpen && (
          <div className="absolute top-full mt-1.5 right-0 z-50 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-xl py-1 min-w-[150px]">
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
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'text-[#0d0d12] dark:text-[#fafafa] bg-[#f5f5f5] dark:bg-[#262626]'
                      : 'text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                      isActive
                        ? 'border-[#9fe870] bg-[#9fe870] text-[#0d0d12]'
                        : 'border-[#d4d4d4] dark:border-[#404040] bg-white dark:bg-[#171717] text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className={`w-2 h-2 rounded-full shrink-0 transition-opacity ${dot} ${isActive ? '' : 'opacity-50'}`} />
                  <span className={`flex-1 text-right ${isActive ? 'font-medium' : ''}`}>{label}</span>
                  <span className="text-xs text-[#a3a3a3] tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <MultiSelectFilter
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

      <MultiSelectFilter
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

      <MultiSelectFilter
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
        icon={<Utensils className="w-3.5 h-3.5" />}
      />

      <MultiSelectFilter
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
        icon={<Users className="w-3.5 h-3.5" />}
      />
    </div>
  );
};
