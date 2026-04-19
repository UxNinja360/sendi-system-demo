import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, AlertCircle, Package, Bike, Clock, TrendingUp } from 'lucide-react';
import { useDelivery } from '../../context/delivery.context';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'delivery' | 'courier' | 'system' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { state } = useDelivery();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'delivery',
      title: 'משלוח חדש התקבל',
      message: 'משלוח #12345 הוזמן מ"פיצה דומינו"',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
      priority: 'high',
      actionUrl: '/deliveries'
    },
    {
      id: '2',
      type: 'courier',
      title: 'שליח התנתק',
      message: 'יוסי כהן שינה סטטוס ל"לא מחובר"',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
      priority: 'medium',
      actionUrl: '/couriers'
    },
    {
      id: '3',
      type: 'delivery',
      title: 'משלוח נמסר בהצלחה',
      message: 'משלוח #12340 נמסר ללקוח',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: true,
      priority: 'low',
    },
    {
      id: '4',
      type: 'alert',
      title: 'יתרת משלוחים נמוכה',
      message: 'נותרו רק 150 משלוחים ביתרה',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      read: true,
      priority: 'high',
      actionUrl: '/settings/shipments'
    },
    {
      id: '5',
      type: 'system',
      title: 'עדכון מערכת',
      message: 'גרסה חדשה זמינה למערכת',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      read: true,
      priority: 'low',
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <Package size={18} />;
      case 'courier': return <Bike size={18} />;
      case 'alert': return <AlertCircle size={18} />;
      case 'system': return <TrendingUp size={18} />;
      default: return <Bell size={18} />;
    }
  };

  const getColor = (type: string, priority: string) => {
    if (priority === 'high') {
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
    switch (type) {
      case 'delivery': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'courier': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'alert': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'system': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 bottom-0 w-full sm:w-[400px] bg-white dark:bg-[#171717] border-r border-[#e5e5e5] dark:border-[#262626] shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e5e5e5] dark:border-[#262626]">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#16a34a]" />
            <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">
              התראות
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="p-3 border-b border-[#e5e5e5] dark:border-[#262626]">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 text-sm text-[#16a34a] dark:text-[#22c55e] hover:underline"
            >
              <CheckCheck size={16} />
              סמן הכל כנקרא
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Bell className="w-16 h-16 text-[#737373] dark:text-[#a3a3a3] mb-4" />
              <p className="text-lg font-medium text-[#0d0d12] dark:text-[#fafafa] mb-2">
                אין התראות חדשות
              </p>
              <p className="text-sm text-[#737373] dark:text-[#a3a3a3]">
                כל ההתראות יופיעו כאן
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-500/5' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${getColor(notification.type, notification.priority)}`}>
                      {getIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-sm text-[#737373] dark:text-[#a3a3a3] mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-[#737373] dark:text-[#a3a3a3]">
                          <Clock size={12} />
                          {format(notification.timestamp, 'HH:mm', { locale: he })}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          מחק
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e5e5e5] dark:border-[#262626]">
          <button
            onClick={() => setNotifications([])}
            className="w-full py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            נקה את כל ההתראות
          </button>
        </div>
      </div>
    </>
  );
};
