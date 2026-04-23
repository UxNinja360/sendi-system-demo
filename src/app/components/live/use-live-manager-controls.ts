import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';

const LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY = 'sendi-live-manager-on-shift-only';
const LIVE_MANAGER_PANEL_SIZE_STORAGE_KEY = 'liveManagerPanelSize';

type TabType = 'deliveries' | 'couriers';
type SortBy = 'time' | 'status' | 'restaurant' | 'address' | 'ready';
type SortDirection = 'asc' | 'desc';
type ShiftFilter = 'all' | 'shift' | 'no_shift';
type CourierQuickFilter = 'all' | 'free' | 'busy';
type PanelHeight = 'half' | 'full';
type PanelSize = 'normal' | 'medium' | 'large' | 'minimized';

export const useLiveManagerControls = () => {
  const location = useLocation();
  const [statusFilters, setStatusFilters] = useState<string[]>(['pending', 'assigned', 'delivering']);
  const [sortBy, setSortBy] = useState<SortBy>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('deliveries');
  const [courierQuickFilter, setCourierQuickFilter] = useState<CourierQuickFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>(() => {
    if (typeof window === 'undefined') return 'all';

    const saved = window.localStorage.getItem(LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY);
    if (saved === 'shift' || saved === 'no_shift') return saved;
    return 'all';
  });
  const [panelHeight, setPanelHeight] = useState<PanelHeight>('half');
  const [panelSize, setPanelSize] = useState<PanelSize>(() => {
    if (typeof window === 'undefined') return 'normal';

    const saved = window.localStorage.getItem(LIVE_MANAGER_PANEL_SIZE_STORAGE_KEY);
    return (
      saved === 'normal' ||
      saved === 'medium' ||
      saved === 'large' ||
      saved === 'minimized'
    )
      ? saved
      : 'normal';
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState<PanelHeight>('half');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LIVE_MANAGER_ON_SHIFT_ONLY_STORAGE_KEY, shiftFilter);
  }, [shiftFilter]);

  useEffect(() => {
    if (shiftFilter === 'no_shift' && courierQuickFilter !== 'all') {
      setCourierQuickFilter('all');
    }
  }, [shiftFilter, courierQuickFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LIVE_MANAGER_PANEL_SIZE_STORAGE_KEY, panelSize);
  }, [panelSize]);

  useEffect(() => {
    const locationState = location.state as { activeTab?: string } | null;
    if (!locationState?.activeTab) return;

    setActiveTab('deliveries');
    setStatusFilters([locationState.activeTab]);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSetShiftFilter = useCallback((nextFilter: ShiftFilter) => {
    setShiftFilter(nextFilter);
    if (nextFilter === 'all' || nextFilter === 'no_shift') {
      setCourierQuickFilter('all');
    }
  }, []);

  const handleToggleShiftFilter = useCallback((target: 'shift' | 'no_shift') => {
    handleSetShiftFilter(shiftFilter === target ? 'all' : target);
  }, [handleSetShiftFilter, shiftFilter]);

  const handleToggleCourierQuickFilter = useCallback((target: 'free' | 'busy') => {
    if (shiftFilter !== 'shift') {
      setShiftFilter('shift');
    }
    setCourierQuickFilter((current) => (current === target ? 'all' : target));
  }, [shiftFilter]);

  const toggleStatusFilter = useCallback((status: string) => {
    setStatusFilters((current) => (
      current.includes(status)
        ? current.filter((value) => value !== status)
        : [...current, status]
    ));
  }, []);

  const sortLabel = useCallback(() => {
    if (sortBy === 'time') {
      return sortDirection === 'desc' ? 'זמן (חדש -> ישן)' : 'זמן (ישן -> חדש)';
    }
    if (sortBy === 'status') {
      return sortDirection === 'asc' ? 'סטטוס (↑)' : 'סטטוס (↓)';
    }
    if (sortBy === 'restaurant') {
      return sortDirection === 'asc' ? 'מסעדה (א→ת)' : 'מסעדה (ת→א)';
    }
    if (sortBy === 'address') {
      return sortDirection === 'asc' ? 'כתובת (א→ת)' : 'כתובת (ת→א)';
    }
    if (sortBy === 'ready') {
      return sortDirection === 'asc' ? 'מוכן (↑)' : 'מוכן (↓)';
    }
    return 'סטטוס';
  }, [sortBy, sortDirection]);

  const handleToggleSortMenu = useCallback(() => {
    setShowSortMenu((current) => !current);
  }, []);

  const handleCloseSortMenu = useCallback(() => {
    setShowSortMenu(false);
  }, []);

  const handleSelectSort = useCallback((value: SortBy) => {
    setSortBy(value);
    setShowSortMenu(false);
  }, []);

  const handleToggleSortDirection = useCallback(() => {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleExpandPanel = useCallback(() => {
    setPanelSize('normal');
  }, []);

  const handleCyclePanelSize = useCallback(() => {
    setPanelSize((current) => (
      current === 'normal'
        ? 'medium'
        : current === 'medium'
        ? 'large'
        : 'normal'
    ));
  }, []);

  const handleMinimizePanel = useCallback(() => {
    setPanelSize('minimized');
  }, []);

  const handleMobilePanelTouchStart = useCallback((clientY: number) => {
    setIsDragging(true);
    setDragStartY(clientY);
    setDragStartHeight(panelHeight);
  }, [panelHeight]);

  const handleMobilePanelTouchMove = useCallback((clientY: number) => {
    if (!isDragging) return;

    const deltaY = dragStartY - clientY;
    if (deltaY > 50 && dragStartHeight === 'half') {
      setPanelHeight('full');
      setIsDragging(false);
    } else if (deltaY < -50 && dragStartHeight === 'full') {
      setPanelHeight('half');
      setIsDragging(false);
    }
  }, [dragStartHeight, dragStartY, isDragging]);

  const handleMobilePanelTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTogglePanelHeight = useCallback(() => {
    setPanelHeight((current) => (current === 'half' ? 'full' : 'half'));
  }, []);

  return {
    activeTab,
    courierQuickFilter,
    dragStartHeight,
    dragStartY,
    handleCloseSortMenu,
    handleCyclePanelSize,
    handleExpandPanel,
    handleSetShiftFilter,
    handleMinimizePanel,
    handleMobilePanelTouchEnd,
    handleMobilePanelTouchMove,
    handleMobilePanelTouchStart,
    handleSelectSort,
    handleToggleCourierQuickFilter,
    handleTogglePanelHeight,
    handleToggleSortDirection,
    handleToggleSortMenu,
    handleToggleShiftFilter,
    isDragging,
    panelHeight,
    panelSize,
    searchQuery,
    setActiveTab,
    setDragStartHeight,
    setDragStartY,
    setIsDragging,
    setPanelHeight,
    setPanelSize,
    setSearchQuery,
    setShowSortMenu,
    setSortBy,
    setSortDirection,
    shiftFilter,
    showSortMenu,
    sortBy,
    sortDirection,
    sortLabel,
    statusFilters,
    toggleStatusFilter,
  };
};
