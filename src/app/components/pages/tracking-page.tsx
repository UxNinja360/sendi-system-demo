import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDelivery } from '../../context/delivery.context';
import { Delivery, DeliveryStatus } from '../../types/delivery.types';
import { 
  Package, 
  Clock, 
  User, 
  MapPin, 
  Phone,
  Store,
  CheckCircle2,
  XCircle,
  Bike,
  AlertCircle,
  Search,
  Filter,
  Timer,
  Activity,
  ArrowUpDown,
  LayoutGrid,
  List,
  LayoutDashboard,
  UserCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { RestaurantsPage } from './entities/restaurants-page';
import { CouriersPage } from './entities/couriers-page';
import { CustomersPage } from './entities/customers-page';
import { Card, StatCard, EmptyState, Input, Select, ButtonGroup, IconButton } from '../ui';

// פונקציה לחישוב זמן שנותר (בשניות) למשלוח
const calculateTimeRemaining = (delivery: Delivery): number | null => {
  if (delivery.status === 'delivered' || delivery.status === 'cancelled') {
    return null;
  }

  const now = new Date();
  
  // אם המשלוח במצב assigned - זמן נותר עד הגעה למסעדה
  if (delivery.status === 'assigned' && delivery.estimatedArrivalAtRestaurant) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtRestaurant.getTime() - now.getTime()) / 1000));
  }
  
  // אם המשלוח צב picking_up - זמן נותר עד הגעה ללקוח
  if (delivery.status === 'picking_up' && delivery.estimatedArrivalAtCustomer) {
    return Math.max(0, Math.floor((delivery.estimatedArrivalAtCustomer.getTime() - now.getTime()) / 1000));
  }
  
  // אם המשלוח ממתין - מציג זמן משוער כללי
  if (delivery.status === 'pending') {
    return delivery.estimatedTime * 60; // המרה מדקות לשניות
  }
  
  return null;
};

// פונקציה לחישוב אחוז התקדמות
const calculateProgress = (delivery: Delivery): number => {
  const statuses: DeliveryStatus[] = ['pending', 'assigned', 'picking_up', 'delivered'];
  const currentIndex = statuses.indexOf(delivery.status);
  if (currentIndex === -1) return 0;
  return ((currentIndex + 1) / statuses.length) * 100;
};

// פונקציה להמרת שניות לפורמט קריא
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} שניות`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} דקות`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} דקות`;
};

// קומפוננטת כרטיס משלוח
interface DeliveryCardProps {
  delivery: Delivery;
  courier: Courier | null;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, courier }) => {
  const navigate = useNavigate();
  const timeRemaining = calculateTimeRemaining(delivery);
  const progress = calculateProgress(delivery);
  
  // צבעים לסטטוס
  const statusConfig = {
    pending: {
      color: 'text-white',
      bg: 'bg-orange-500',
      icon: AlertCircle,
      label: 'ממתין',
    },
    assigned: {
      color: 'text-white',
      bg: 'bg-yellow-500',
      icon: Bike,
      label: 'שובץ',
    },
    picking_up: {
      color: 'text-white',
      bg: 'bg-blue-500',
      icon: Package,
      label: 'נאסף',
    },
    delivered: {
      color: 'text-white',
      bg: 'bg-green-600',
      icon: CheckCircle2,
      label: 'נמסר',
    },
    cancelled: {
      color: 'text-white',
      bg: 'bg-red-600',
      icon: XCircle,
      label: 'בוטל',
    },
  };

  const config = statusConfig[delivery.status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
      onClick={() => navigate(`/delivery/${delivery.id}`)}
    >
      {/* כותרת */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${config.bg} p-2 rounded-lg`}>
            <StatusIcon size={20} className={config.color} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0d0d12] dark:text-[#fafafa]">
                {delivery.orderNumber}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>
            <div className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-1">
              {formatDistanceToNow(delivery.createdAt, { addSuffix: true, locale: he })}
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-lg font-bold text-[#16a34a] dark:text-[#22c55e]">
            ₪{delivery.price}
          </div>
        </div>
      </div>

      {/* פס התקדמות */}
      <div className="mb-3">
        <div className="h-2 bg-[#f5f5f5] dark:bg-[#404040] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-l from-[#16a34a] to-[#22c55e] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* מידע מסעדה */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <Store size={16} className="text-[#737373] dark:text-[#a3a3a3]" />
        <span className="font-medium text-[#0d0d12] dark:text-[#fafafa]">
          {delivery.restaurantName}
        </span>
      </div>

      {/* מידע לקוח */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <User size={16} className="text-[#737373] dark:text-[#a3a3a3]" />
        <span className="text-[#666d80] dark:text-[#d4d4d4]">
          {delivery.customerName}
        </span>
        <Phone size={14} className="text-[#737373] dark:text-[#a3a3a3] mr-2" />
        <span className="text-[#666d80] dark:text-[#d4d4d4] text-xs">
          {delivery.customerPhone}
        </span>
      </div>

      {/* כתובת */}
      <div className="flex items-start gap-2 mb-3 text-sm">
        <MapPin size={16} className="text-[#737373] dark:text-[#a3a3a3] mt-0.5 shrink-0" />
        <span className="text-[#666d80] dark:text-[#d4d4d4]">
          {delivery.address}, {delivery.area}
        </span>
      </div>

      {/* שליח */}
      {courier && (
        <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#404040] rounded-lg mb-3">
          <Bike size={16} className="text-[#16a34a] dark:text-[#22c55e]" />
          <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
            {courier.name}
          </span>
          <span className="text-xs text-[#737373] dark:text-[#a3a3a3] mr-auto">
            ⭐ {courier.rating}
          </span>
        </div>
      )}

      {/* זמן נותר */}
      {timeRemaining !== null && delivery.status !== 'pending' && (
        <div className="flex items-center gap-2 p-2 bg-[#dbeafe] dark:bg-[#1e3a8a] rounded-lg">
          <Timer size={16} className="text-[#3b82f6] dark:text-[#60a5fa]" />
          <span className="text-sm font-medium text-[#1e40af] dark:text-[#93c5fd]">
            {delivery.status === 'assigned' ? 'זמן הגעה למסעדה:' : 'זמן הגעה ללקוח:'}
          </span>
          <span className="text-sm font-bold text-[#1e40af] dark:text-[#93c5fd] mr-auto">
            {formatTime(timeRemaining)}
          </span>
        </div>
      )}

      {/* זמן משוער למשלוח ממתין */}
      {delivery.status === 'pending' && timeRemaining !== null && (
        <div className="flex items-center gap-2 p-2 bg-[#fef3c7] dark:bg-[#78350f] rounded-lg">
          <Clock size={16} className="text-[#f59e0b] dark:text-[#fbbf24]" />
          <span className="text-sm font-medium text-[#92400e] dark:text-[#fef08a]">
            זמ משוער:
          </span>
          <span className="text-sm font-bold text-[#92400e] dark:text-[#fef08a] mr-auto">
            {formatTime(timeRemaining)}
          </span>
        </div>
      )}
    </div>
  );
};

// קומפוננטת שורת משלוח - תצוגת רשימה מצומצמת
const DeliveryListItem: React.FC<DeliveryCardProps> = ({ delivery, courier }) => {
  const navigate = useNavigate();
  const timeRemaining = calculateTimeRemaining(delivery);
  
  // צבעים לסטטוס
  const statusConfig = {
    pending: {
      color: 'text-white',
      bg: 'bg-orange-500',
      icon: AlertCircle,
      label: 'ממתין',
    },
    assigned: {
      color: 'text-white',
      bg: 'bg-yellow-500',
      icon: Bike,
      label: 'שובץ',
    },
    picking_up: {
      color: 'text-white',
      bg: 'bg-blue-500',
      icon: Package,
      label: 'נאסף',
    },
    delivered: {
      color: 'text-white',
      bg: 'bg-green-600',
      icon: CheckCircle2,
      label: 'נמסר',
    },
    cancelled: {
      color: 'text-white',
      bg: 'bg-red-600',
      icon: XCircle,
      label: 'בוטל',
    },
  };

  const config = statusConfig[delivery.status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-white dark:bg-[#262626] border border-[#e5e5e5] dark:border-[#404040] rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/delivery/${delivery.id}`)}
    >
      <div className="flex items-center gap-3">
        {/* אייקון סטטוס */}
        <div className={`${config.bg} p-2 rounded-lg shrink-0`}>
          <StatusIcon size={16} className={config.color} />
        </div>

        {/* מספר הזמנה וסטטוס */}
        <div className="min-w-[120px]">
          <div className="font-bold text-sm text-[#0d0d12] dark:text-[#fafafa]">
            {delivery.orderNumber}
          </div>
          <div className="text-xs font-medium text-[#737373] dark:text-[#a3a3a3]">
            {config.label}
          </div>
        </div>

        {/* מסעדה */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Store size={13} className="text-[#737373] dark:text-[#a3a3a3] shrink-0" />
            <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] truncate">
              {delivery.restaurantName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={13} className="text-[#737373] dark:text-[#a3a3a3] shrink-0" />
            <span className="text-xs text-[#737373] dark:text-[#a3a3a3] truncate">
              {delivery.customerName} • {delivery.area}
            </span>
          </div>
        </div>

        {/* שליח */}
        {courier && (
          <div className="hidden md:flex items-center gap-1.5 min-w-[100px]">
            <Bike size={13} className="text-[#16a34a] dark:text-[#22c55e] shrink-0" />
            <span className="text-xs text-[#737373] dark:text-[#a3a3a3] truncate">
              {courier.name}
            </span>
          </div>
        )}

        {/* זמן */}
        {timeRemaining !== null && (
          <div className="hidden sm:flex items-center gap-1.5 min-w-[80px]">
            <Timer size={13} className="text-[#3b82f6] dark:text-[#60a5fa] shrink-0" />
            <span className="text-xs font-medium text-[#3b82f6] dark:text-[#60a5fa]">
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}

        {/* מחיר */}
        <div className="text-left min-w-[60px]">
          <div className="text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">
            ₪{delivery.price}
          </div>
        </div>
      </div>
    </div>
  );
};

// קומפוננטת תוכן המשלוחים
const DeliveriesContent: React.FC = () => {
  const { state } = useDelivery();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'status' | 'restaurant'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // עדכון הזמן כל שנייה לעדכון הזמינו הנותרים
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // סינון משלוחים
  const filteredDeliveries = useMemo(() => {
    let filtered = state.deliveries;

    // סינון לפי השלמה
    if (!showCompleted) {
      filtered = filtered.filter(d => d.status !== 'delivered' && d.status !== 'cancelled');
    }

    // סינון לפי סטטוס
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // סינון לפי חיפוש
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.orderNumber.toLowerCase().includes(query) ||
        d.customerName.toLowerCase().includes(query) ||
        d.restaurantName.toLowerCase().includes(query) ||
        d.address.toLowerCase().includes(query) ||
        d.area.toLowerCase().includes(query)
      );
    }

    // מיון
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else if (sortBy === 'price') {
        return b.price - a.price;
      } else if (sortBy === 'status') {
        const statusOrder = { pending: 0, assigned: 1, picking_up: 2, delivered: 3, cancelled: 4 };
        return statusOrder[a.status] - statusOrder[b.status];
      } else if (sortBy === 'restaurant') {
        return a.restaurantName.localeCompare(b.restaurantName, 'he');
      }
      return 0;
    });
  }, [state.deliveries, searchQuery, statusFilter, showCompleted, sortBy]);

  // סטטיסטיקות
  const stats = useMemo(() => {
    const active = state.deliveries.filter(d => 
      d.status !== 'delivered' && d.status !== 'cancelled'
    );
    return {
      total: state.deliveries.length,
      active: active.length,
      pending: state.deliveries.filter(d => d.status === 'pending').length,
      assigned: state.deliveries.filter(d => d.status === 'assigned').length,
      picking_up: state.deliveries.filter(d => d.status === 'picking_up').length,
      delivered: state.deliveries.filter(d => d.status === 'delivered').length,
      cancelled: state.deliveries.filter(d => d.status === 'cancelled').length,
    };
  }, [state.deliveries]);

  return (
    <>
      {/* סטטיסטיקות */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Activity size={18} />}
          label="פעילים"
          value={stats.active}
          iconColor="text-[#3b82f6] dark:text-[#60a5fa]"
          iconBg="bg-[#dbeafe] dark:bg-[#1e3a8a]"
        />

        <StatCard
          icon={<AlertCircle size={18} />}
          label="ממתינים"
          value={stats.pending}
          iconColor="text-[#f59e0b] dark:text-[#fbbf24]"
          iconBg="bg-[#fef3c7] dark:bg-[#78350f]"
        />

        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="נמסרו"
          value={stats.delivered}
          iconColor="text-[#22c55e] dark:text-[#4ade80]"
          iconBg="bg-[#dcfce7] dark:bg-[#14532d]"
        />

        <StatCard
          icon={<Package size={18} />}
          label="סה״כ"
          value={stats.total}
          iconColor="text-[#737373] dark:text-[#a3a3a3]"
          iconBg="bg-[#f5f5f5] dark:bg-[#404040]"
        />
      </div>

      {/* Header with Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        {/* שורה ראשונה - חיפוש, סינון וכפתורים */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373] dark:text-[#a3a3a3]" />
            <input
              type="text"
              placeholder="חפש לפי מספר הזמנה, לקוח, מסעדה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] placeholder:text-[#737373] dark:placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:focus:ring-[#9fe870]"
            />
          </div>

          <div className="flex gap-3 items-center">
            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | 'all')}
              className="px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] text-sm focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:focus:ring-[#9fe870] cursor-pointer"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="pending">ממתין</option>
              <option value="assigned">שובץ</option>
              <option value="picking_up">נאסף</option>
              <option value="delivered">נמסר</option>
              <option value="cancelled">בוטל</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'price' | 'status' | 'restaurant')}
              className="px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] text-sm focus:outline-none focus:ring-2 focus:ring-[#9fe870] dark:focus:ring-[#9fe870] cursor-pointer"
            >
              <option value="date">תאריך</option>
              <option value="price">מחיר</option>
              <option value="status">סטטוס</option>
              <option value="restaurant">מסעדה</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-[#f5f5f5] dark:bg-[#404040] p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#525252] text-[#16a34a] dark:text-[#22c55e] shadow-sm'
                    : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
                }`}
                title="תצוגת כרטיסים"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#525252] text-[#16a34a] dark:text-[#22c55e] shadow-sm'
                    : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
                }`}
                title="תצוגת רשימה"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* שורה שנייה - הצג משלוחים שהושלמו */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showCompleted"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="w-4 h-4 rounded border-[#d4d4d4] dark:border-[#525252] text-[#16a34a] focus:ring-[#16a34a] cursor-pointer"
          />
          <label 
            htmlFor="showCompleted" 
            className="text-sm text-[#666d80] dark:text-[#d4d4d4] cursor-pointer select-none"
          >
            הצג משלוחים שהושלמו ובוטלו
          </label>
        </div>
      </div>

      {/* רשימת משלוחים */}
      {filteredDeliveries.length === 0 ? (
        <EmptyState
          icon={<Package size={48} className="mx-auto mb-4 text-[#d4d4d4] dark:text-[#525252]" />}
          title="אין משלוחים להצגה"
          description={
            searchQuery || statusFilter !== 'all' 
              ? 'נסה לשנות את קריטריוני החיפוש או הסינון'
              : 'המערכת עדיין לא יצרה משלוחים. הפעל מסעדות והמתן ליצירת משלוחים.'
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeliveries.map(delivery => {
            const courier = delivery.courierId 
              ? state.couriers.find(c => c.id === delivery.courierId)
              : null;
            
            return (
              <DeliveryCard 
                key={delivery.id} 
                delivery={delivery} 
                courier={courier}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.map(delivery => {
            const courier = delivery.courierId 
              ? state.couriers.find(c => c.id === delivery.courierId)
              : null;
            
            return (
              <DeliveryListItem
                key={delivery.id}
                delivery={delivery}
                courier={courier}
              />
            );
          })}
        </div>
      )}

      {/* מספר תוצאות */}
      {filteredDeliveries.length > 0 && (
        <div className="mt-6 text-center text-sm text-[#737373] dark:text-[#a3a3a3]">
          מציג {filteredDeliveries.length} מתוך {state.deliveries.length} משלוחים
        </div>
      )}
    </>
  );
};

export const TrackingPage: React.FC = () => {
  const { tab: urlTab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const tab = urlTab || 'deliveries';

  const handleTabChange = (newTab: string) => {
    if (newTab === 'dashboard') {
      navigate('/dashboard');
    } else {
      navigate(`/tracking/${newTab}`);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard },
    { id: 'deliveries', label: 'משלוחים', icon: Package },
    { id: 'couriers', label: 'שליחים', icon: Bike },
    { id: 'restaurants', label: 'מסעדות', icon: Store },
    { id: 'customers', label: 'לקוחות', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen dark:bg-[#0a0a0a] p-4 md:p-8 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* כותרת */}
        

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#e5e5e5] dark:border-[#262626] mb-6">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            return (
              <button
                key={tabItem.id}
                onClick={() => handleTabChange(tabItem.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-[2px]
                  ${tab === tabItem.id
                    ? 'border-[#16a34a] dark:border-[#22c55e] text-[#16a34a] dark:text-[#22c55e]'
                    : 'border-transparent text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
                  }
                `}
              >
                <Icon size={18} />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>

        {/* תוכן */}
        <div className="flex-1">
          {tab === 'deliveries' && <DeliveriesContent />}
          {tab === 'couriers' && <CouriersPage />}
          {tab === 'restaurants' && <RestaurantsPage />}
          {tab === 'customers' && <CustomersPage />}
        </div>
      </div>
    </div>
  );
};