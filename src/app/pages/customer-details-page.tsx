import { useParams, useNavigate } from 'react-router';
import { useDelivery } from '../context/delivery.context';
import { 
  ArrowRight, User, MapPin, Phone, Clock, TrendingUp,
  Package, CheckCircle2, DollarSign, Calendar, ShoppingBag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export function CustomerDetailsPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { state } = useDelivery();

  // מציאת לקוח לפי שם (כי אין לנו ID ייעודי ללקוח)
  // נחפש את כל המשלוחים של הלקוח
  const customerDeliveries = state.deliveries.filter(d => {
    // customerId זה בעצם שם הלקוח מקודד
    const decodedName = decodeURIComponent(customerId);
    return d.customerName === decodedName;
  });

  const customer = customerDeliveries.length > 0 ? {
    name: customerDeliveries[0].customerName,
    phone: customerDeliveries[0].customerPhone,
    address: customerDeliveries[0].address,
    area: customerDeliveries[0].area
  } : null;

  const activeDeliveries = customerDeliveries.filter(d => 
    d.status !== 'delivered' && d.status !== 'cancelled'
  );
  const completedDeliveries = customerDeliveries.filter(d => d.status === 'delivered');

  // חישב סטט��סטיקות
  const totalSpent = completedDeliveries.reduce((sum, d) => sum + d.price, 0);
  const averageOrderValue = completedDeliveries.length > 0 
    ? totalSpent / completedDeliveries.length 
    : 0;

  // מסעדות מועדפות
  const restaurantCounts = customerDeliveries.reduce((acc, d) => {
    acc[d.restaurantName] = (acc[d.restaurantName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const favoriteRestaurants = Object.entries(restaurantCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <User className="w-16 h-16 text-[#e5e5e5] dark:text-[#404040] mb-4" />
        <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-2">
          לקוח לא נמצא
        </h2>
        <p className="text-sm text-[#666d80] dark:text-[#a3a3a3] mb-4">
          הלקוח שחיפשת אינו קיים במערכת
        </p>
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0fcdd3] text-white rounded-lg hover:bg-[#0ab8c5] transition-colors"
        >
          <ArrowRight size={16} />
          <span>חזרה להיסטוריה</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#262626] p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors"
          >
            <ArrowRight size={20} className="text-[#666d80] dark:text-[#d4d4d4]" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <User size={24} className="text-[#0fcdd3]" />
              <div>
                <h1 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                  {customer.name}
                </h1>
                <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                  {customer.phone}
                </p>
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">משלוחים פעילים</div>
            <div className="text-2xl font-bold text-[#0fcdd3]">
              {activeDeliveries.length}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div key="total-orders" className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                  <Package size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">סה"כ הזמנות</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {customerDeliveries.length}
                  </div>
                </div>
              </div>
            </div>

            <div key="completed-orders" className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">הושלמו</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {completedDeliveries.length}
                  </div>
                </div>
              </div>
            </div>

            <div key="total-spent" className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                  <DollarSign size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">סה"כ הוצאות</div>
                  <div className="text-2xl font-bold text-[#16a34a] dark:text-[#22c55e]">
                    ₪{totalSpent}
                  </div>
                </div>
              </div>
            </div>

            <div key="average-order" className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
                  <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">ממוצע הזמנה</div>
                  <div className="text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    ₪{Math.round(averageOrderValue)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6">
            <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
              פרטי לקוח
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div key="customer-phone" className="flex items-center gap-3">
                <Phone size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">טלפון</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {customer.phone}
                  </div>
                </div>
              </div>
              <div key="customer-address" className="flex items-center gap-3">
                <MapPin size={20} className="text-[#666d80] dark:text-[#a3a3a3]" />
                <div>
                  <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">כתובת</div>
                  <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                    {customer.address}, {customer.area}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Favorite Restaurants */}
          {favoriteRestaurants.length > 0 && (
            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6">
              <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4 flex items-center gap-2">
                <ShoppingBag size={18} />
                מסעדות מועדפות
              </h2>
              <div className="space-y-2">
                {favoriteRestaurants.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-[#f5f5f5] dark:bg-[#262626] rounded-lg">
                    <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                      {name}
                    </span>
                    <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                      {count} הזמנות
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order History */}
          <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-6">
            <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa] mb-4">
              היסטוריית הזמנות
            </h2>
            <div className="space-y-2">
              {customerDeliveries.map((delivery) => (
                <button
                  key={delivery.id}
                  onClick={() => navigate(`/delivery/${delivery.id}`)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors text-right"
                >
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-[#666d80] dark:text-[#a3a3a3]" />
                    <div>
                      <div className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                        {delivery.orderNumber}
                      </div>
                      <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                        {delivery.restaurantName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      delivery.status === 'delivered' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                      delivery.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                      'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {delivery.status === 'delivered' ? 'נמסר' :
                       delivery.status === 'cancelled' ? 'בוטל' : 'פעיל'}
                    </span>
                    <div className="text-sm font-bold text-[#16a34a] dark:text-[#22c55e]">
                      ₪{delivery.price}
                    </div>
                    <div className="text-xs text-[#666d80] dark:text-[#a3a3a3]">
                      {formatDistanceToNow(delivery.createdAt, { addSuffix: true, locale: he })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
