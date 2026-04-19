import React, { useState, useEffect, useMemo } from 'react';
import { useDelivery } from '../../context/delivery.context';
import { Delivery, Courier } from '../../types/delivery.types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Zap,
  Users,
  Package,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Keyboard,
  X,
  RefreshCw,
  Star,
  TrendingUp,
  Activity,
  Map,
  Grid3x3,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { SimpleMapPlaceholder } from '../simple-map-placeholder';

// Types for drag and drop
const ItemTypes = {
  DELIVERY: 'delivery',
};

interface DraggableDeliveryProps {
  delivery: Delivery;
  onAssign: (deliveryId: string, courierId: string) => void;
}

const DraggableDelivery: React.FC<DraggableDeliveryProps> = ({ delivery, onAssign }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.DELIVERY,
    item: { id: delivery.id, delivery },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'assigned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'picking_up': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'in_transit': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'ממתין';
      case 'assigned': return 'שובץ';
      case 'picking_up': return 'באיסוף';
      case 'in_transit': return 'בדרך';
      case 'delivered': return 'נמסר';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  return (
    <div
      ref={drag}
      className={`
        p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-[#e5e5e5] dark:border-[#262626]
        cursor-move hover:shadow-lg transition-all
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa] truncate">
            #{delivery.id}
          </div>
          <div className="text-xs text-[#737373] dark:text-[#a3a3a3] truncate">
            {delivery.customerName}
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(delivery.status)}`}>
          {getStatusLabel(delivery.status)}
        </div>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-[#737373] dark:text-[#a3a3a3] mb-1">
        <MapPin size={12} />
        <span className="truncate">{delivery.area}</span>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-[#737373] dark:text-[#a3a3a3]">
        <Clock size={12} />
        <span>{format(delivery.createdAt, 'HH:mm', { locale: he })}</span>
      </div>

      <div className="mt-2 pt-2 border-t border-[#e5e5e5] dark:border-[#262626] flex items-center justify-between">
        <span className="text-xs text-[#737373] dark:text-[#a3a3a3]">
          {delivery.restaurantName}
        </span>
        <span className="text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">
          ₪{delivery.price}
        </span>
      </div>
    </div>
  );
};

interface CourierDropZoneProps {
  courier: Courier;
  deliveries: Delivery[];
  onDrop: (deliveryId: string, courierId: string) => void;
  onViewDetails: (courierId: string) => void;
}

const CourierDropZone: React.FC<CourierDropZoneProps> = ({ courier, deliveries, onDrop, onViewDetails }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.DELIVERY,
    drop: (item: { id: string; delivery: Delivery }) => {
      onDrop(item.id, courier.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const courierDeliveries = deliveries.filter(d => d.courierId === courier.id);
  const activeDeliveries = courierDeliveries.filter(d => 
    d.status === 'assigned' || d.status === 'picking_up' || d.status === 'in_transit'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'busy': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'offline': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'busy': return 'עסוק';
      case 'offline': return 'לא מחובר';
      default: return status;
    }
  };

  return (
    <div
      ref={drop}
      className={`
        bg-white dark:bg-[#171717] rounded-xl border-2 transition-all
        ${isOver 
          ? 'border-[#16a34a] dark:border-[#22c55e] shadow-lg scale-[1.02]' 
          : 'border-[#e5e5e5] dark:border-[#262626]'
        }
      `}
    >
      {/* Courier Header */}
      <div 
        className="p-4 border-b border-[#e5e5e5] dark:border-[#262626] cursor-pointer hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
        onClick={() => onViewDetails(courier.id)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#16a34a] to-[#22c55e] flex items-center justify-center text-white font-bold">
              {courier.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                {courier.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#737373] dark:text-[#a3a3a3]">
                <Phone size={12} />
                {courier.phone}
              </div>
            </div>
          </div>
          <div className={`text-xs px-3 py-1.5 rounded-full border ${getStatusColor(courier.status)}`}>
            {getStatusLabel(courier.status)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
              {courier.rating}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#737373] dark:text-[#a3a3a3]">
            <Package size={12} />
            <span>{activeDeliveries.length} פעילים</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#737373] dark:text-[#a3a3a3]">
            <CheckCircle2 size={12} />
            <span>{courier.completedDeliveries} הושלמו</span>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
        {courierDeliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="w-8 h-8 text-[#737373] dark:text-[#a3a3a3] mb-2" />
            <p className="text-sm text-[#737373] dark:text-[#a3a3a3]">
              אין משלוחים פעילים
            </p>
            <p className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-1">
              גרור משלוחים לכאן לשיבוץ
            </p>
          </div>
        ) : (
          courierDeliveries.map(delivery => (
            <DraggableDelivery
              key={delivery.id}
              delivery={delivery}
              onAssign={onDrop}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const AdminMode: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [courierSortBy, setCourierSortBy] = useState<'status' | 'deliveries' | 'name' | 'rating'>('status');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      toast.success('נתונים עודכנו', { duration: 1000 });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K - Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('admin-search')?.focus();
      }
      
      // Ctrl/Cmd + R - Refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        toast.success('נתונים עודכנו', { duration: 1000 });
      }
      
      // Ctrl/Cmd + / - Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
      }
      
      // Escape - Clear search / Close shortcuts
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          setSearchTerm('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showShortcuts]);

  const handleAssignDelivery = (deliveryId: string, courierId: string) => {
    dispatch({
      type: 'ASSIGN_COURIER',
      payload: { deliveryId, courierId },
    });
    toast.success('משלוח שובץ בהצלחה!');
  };

  const handleViewCourierDetails = (courierId: string) => {
    // Navigate to courier details
    window.open(`/courier/${courierId}`, '_blank');
  };

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    return state.deliveries.filter(delivery => {
      const matchesSearch = 
        delivery.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.area.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        filterStatus === 'all' ||
        delivery.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [state.deliveries, searchTerm, filterStatus]);

  // Unassigned deliveries
  const unassignedDeliveries = useMemo(() => {
    return filteredDeliveries.filter(d => d.status === 'pending');
  }, [filteredDeliveries]);

  // Sort couriers
  const sortedCouriers = useMemo(() => {
    const sorted = [...state.couriers];
    
    switch (courierSortBy) {
      case 'status':
        // זמינו קודם, אחר כך עסוקים, אחר כך לא מחוברים
        return sorted.sort((a, b) => {
          const statusOrder = { available: 0, busy: 1, offline: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
      
      case 'deliveries':
        // פחות משלוחים פעילים קודם
        return sorted.sort((a, b) => {
          const aActive = state.deliveries.filter(d => d.courierId === a.id && 
            (d.status === 'assigned' || d.status === 'picking_up' || d.status === 'in_transit')).length;
          const bActive = state.deliveries.filter(d => d.courierId === b.id && 
            (d.status === 'assigned' || d.status === 'picking_up' || d.status === 'in_transit')).length;
          return aActive - bActive;
        });
      
      case 'name':
        // מיון לפי שם (א-ת)
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      
      case 'rating':
        // דירוג גבוה לנמוך
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      default:
        return sorted;
    }
  }, [state.couriers, state.deliveries, courierSortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = state.deliveries.length;
    const pending = state.deliveries.filter(d => d.status === 'pending').length;
    const active = state.deliveries.filter(d => 
      d.status === 'assigned' || d.status === 'picking_up' || d.status === 'in_transit'
    ).length;
    const completed = state.deliveries.filter(d => d.status === 'delivered').length;
    const availableCouriers = state.couriers.filter(c => c.status === 'available').length;
    
    return { total, pending, active, completed, availableCouriers };
  }, [state.deliveries, state.couriers]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen dark:bg-[#0a0a0a] bg-[#fafafa] p-3 sm:p-4 md:p-6">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>

                  <p className="text-sm text-[#737373] dark:text-[#a3a3a3]">
                    God Mode - שליטה מלאה על המערכת
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
                >
                  <Keyboard size={16} />
                  <span className="text-sm hidden sm:inline">קיצורים</span>
                </button>

                <button
                  onClick={() => dispatch({ type: 'TOGGLE_AUTO_ASSIGN' })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    state.autoAssignEnabled
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                      : 'bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Activity size={16} />
                  <span className="text-sm hidden sm:inline">
                    {state.autoAssignEnabled ? 'שיבוץ אוטומטי ON' : 'שיבוץ אוטומטי OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="bg-white dark:bg-[#171717] rounded-lg border border-[#e5e5e5] dark:border-[#262626] p-3">
                <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                  {stats.total}
                </div>
                <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">סה"כ משלוחים</div>
              </div>

              <div className="bg-white dark:bg-[#171717] rounded-lg border border-orange-500/20 p-3">
                <div className="text-2xl font-bold text-orange-500">
                  {stats.pending}
                </div>
                <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">ממתינים</div>
              </div>

              <div className="bg-white dark:bg-[#171717] rounded-lg border border-blue-500/20 p-3">
                <div className="text-2xl font-bold text-blue-500">
                  {stats.active}
                </div>
                <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">פעילים</div>
              </div>

              <div className="bg-white dark:bg-[#171717] rounded-lg border border-green-500/20 p-3">
                <div className="text-2xl font-bold text-green-500">
                  {stats.completed}
                </div>
                <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">הושלמו</div>
              </div>

              <div className="bg-white dark:bg-[#171717] rounded-lg border border-purple-500/20 p-3">
                <div className="text-2xl font-bold text-purple-500">
                  {stats.availableCouriers}
                </div>
                <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">שליחים זמינו</div>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
                <input
                  id="admin-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חיפוש משלוחים... (Ctrl+K)"
                  className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm focus:outline-none focus:border-[#16a34a] dark:focus:border-[#22c55e]"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm focus:outline-none focus:border-[#16a34a] dark:focus:border-[#22c55e]"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="pending">ממתינים</option>
                <option value="assigned">שובצו</option>
                <option value="picking_up">באיסוף</option>
                <option value="in_transit">בדרך</option>
                <option value="delivered">נמסרו</option>
                <option value="cancelled">בוטלו</option>
              </select>

              <select
                value={courierSortBy}
                onChange={(e) => setCourierSortBy(e.target.value as 'status' | 'deliveries' | 'name' | 'rating')}
                className="px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-sm focus:outline-none focus:border-[#16a34a] dark:focus:border-[#22c55e]"
              >
                <option value="status">מיון: זמינו קודם ⚡</option>
                <option value="deliveries">מיון: פחות משלוחים 📦</option>
                <option value="name">מיון: שם (א-ת) 🔤</option>
                <option value="rating">מיון: דירוג ⭐</option>
              </select>

              <div className="flex items-center gap-1 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-[#16a34a] dark:bg-[#22c55e] text-white' : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]'}`}
                >
                  <Grid3x3 size={16} />
                  <span className="hidden sm:inline">רשת</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-[#16a34a] dark:bg-[#22c55e] text-white' : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]'}`}
                >
                  <Map size={16} />
                  <span className="hidden sm:inline">מפה</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Grid or Map */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Unassigned Deliveries */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#e5e5e5] dark:border-[#262626] p-4">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    משלוחים לשיבוץ ({unassignedDeliveries.length})
                  </h3>
                  <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {unassignedDeliveries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                        <p className="text-sm text-[#737373] dark:text-[#a3a3a3]">
                          כל המשלוחים שובצו!
                        </p>
                      </div>
                    ) : (
                      unassignedDeliveries.map(delivery => (
                        <DraggableDelivery
                          key={delivery.id}
                          delivery={delivery}
                          onAssign={handleAssignDelivery}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Couriers Grid */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedCouriers.map(courier => (
                    <CourierDropZone
                      key={courier.id}
                      courier={courier}
                      deliveries={filteredDeliveries}
                      onDrop={handleAssignDelivery}
                      onViewDetails={handleViewCourierDetails}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 bg-blue-500/10 dark:bg-blue-900/20 rounded-lg border border-blue-500/20 p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  🗺️ <strong>מפה חיה:</strong> צפה בכל השליחים והמשלוחים במיקום בזמן אמת כדי לקבל החלטות חכמות על שיבוץ משלוחים
                </p>
              </div>
              <div className="bg-white dark:bg-[#171717] rounded-xl border border-[#e5e5e5] dark:border-[#262626] overflow-hidden">
                <SimpleMapPlaceholder height="calc(100vh - 350px)" />
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  קיצורי מקלדת
                </h3>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="w-8 h-8 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg">
                  <span className="text-sm text-[#0d0d12] dark:text-[#fafafa]">חיפוש</span>
                  <kbd className="px-3 py-1 bg-white dark:bg-[#262626] rounded border border-[#e5e5e5] dark:border-[#404040] text-xs font-mono">
                    Ctrl + K
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg">
                  <span className="text-sm text-[#0d0d12] dark:text-[#fafafa]">רענון</span>
                  <kbd className="px-3 py-1 bg-white dark:bg-[#262626] rounded border border-[#e5e5e5] dark:border-[#404040] text-xs font-mono">
                    Ctrl + R
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg">
                  <span className="text-sm text-[#0d0d12] dark:text-[#fafafa]">קיצורים</span>
                  <kbd className="px-3 py-1 bg-white dark:bg-[#262626] rounded border border-[#e5e5e5] dark:border-[#404040] text-xs font-mono">
                    Ctrl + /
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-lg">
                  <span className="text-sm text-[#0d0d12] dark:text-[#fafafa]">ביטול / סגירה</span>
                  <kbd className="px-3 py-1 bg-white dark:bg-[#262626] rounded border border-[#e5e5e5] dark:border-[#404040] text-xs font-mono">
                    Esc
                  </kbd>
                </div>
              </div>

              <div className="mt-6 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 <strong>טיפ:</strong> גרור משלו��ים מהעמודה השמאלית לשליח כדי לשבץ אותם במהירות
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};