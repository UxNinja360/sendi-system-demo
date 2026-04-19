import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, Menu, User, Moon, Sun, LogOut, Signal, Package } from 'lucide-react';
import { useDelivery } from '../../context/delivery.context';
import { AppLogo } from '../icons/app-logo';
import { NotificationCenter } from '../notifications/notification-center';
import { useTheme } from '../../context/theme.context';

interface TopBarProps {
  title: string;
  balance?: number;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, balance = 0, onLogout: propOnLogout }) => {
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();
  const { isDark, toggleDark } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const formatNumber = (val: number) => new Intl.NumberFormat('he-IL').format(val);

  const handleLogout = () => {
    if (propOnLogout) {
      propOnLogout();
    } else {
      localStorage.removeItem('isAuthenticated');
      navigate('/login', { replace: true });
    }
  };

  // Calculate today's delivery status for dynamic bar
  const todayDeliveries = React.useMemo(() => {
    const today = new Date();
    const deliveriesToday = state.deliveries.filter(d => {
      const deliveryDate = new Date(d.createdAt);
      return deliveryDate.toDateString() === today.toDateString();
    });

    const pending = deliveriesToday.filter(d => d.status === 'pending').length;
    const assigned = deliveriesToday.filter(d => d.status === 'assigned').length;
    const pickingUp = deliveriesToday.filter(d => d.status === 'delivering').length;
    const delivered = deliveriesToday.filter(d => d.status === 'delivered').length;
    const cancelled = deliveriesToday.filter(d => d.status === 'cancelled').length;
    const total = deliveriesToday.length;

    return { pending, assigned, pickingUp, delivered, cancelled, total };
  }, [state.deliveries]);

  return (
    <header className="h-[64px] bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#262626] flex items-center justify-between px-4 md:px-6 lg:px-8 flex-shrink-0 relative z-[100]">
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        {/* Mobile Menu Button with Logo */}
        <button
          className="md:hidden p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-xl transition-colors flex-shrink-0"
          onClick={() => {
            if ((window as any).toggleMobileSidebar) {
              (window as any).toggleMobileSidebar();
            }
          }}
        >
          <AppLogo size={24} className="text-[#02B74F]" />
        </button>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-[#0d0d12] dark:text-[#fafafa] truncate">
            {title}
          </h1>
          
          {/* בר דינמי מוקטן - רק במסכים גדולים */}
          {todayDeliveries.total > 0 && (
            <div className="hidden lg:flex gap-0.5 h-1.5 w-64 rounded-full overflow-hidden mt-2 bg-[#e5e5e5] dark:bg-[#404040]">
              {/* ממתין - כתום */}
              {todayDeliveries.pending > 0 && (
                <div 
                  key="pending"
                  className="bg-[#f59e0b] dark:bg-[#f59e0b] transition-all duration-300"
                  style={{ width: `${(todayDeliveries.pending / todayDeliveries.total) * 100}%` }}
                  title={`Pending: ${todayDeliveries.pending}`}
                />
              )}
              
              {/* שובץ - צהוב */}
              {todayDeliveries.assigned > 0 && (
                <div 
                  key="assigned"
                  className="bg-[#fbc740] dark:bg-[#fbc740] transition-all duration-300"
                  style={{ width: `${(todayDeliveries.assigned / todayDeliveries.total) * 100}%` }}
                  title={`Assigned: ${todayDeliveries.assigned}`}
                />
              )}
              
              {/* נאסף - טורקיז */}
              {todayDeliveries.pickingUp > 0 && (
                <div 
                  key="delivering"
                  className="bg-[#0fcdd3] dark:bg-[#0fcdd3] transition-all duration-300"
                  style={{ width: `${(todayDeliveries.pickingUp / todayDeliveries.total) * 100}%` }}
                  title={`Picking Up: ${todayDeliveries.pickingUp}`}
                />
              )}
              
              {/* נמסר - ירוק */}
              {todayDeliveries.delivered > 0 && (
                <div 
                  key="delivered"
                  className="bg-[#16a34a] dark:bg-[#16a34a] transition-all duration-300 opacity-60"
                  style={{ width: `${(todayDeliveries.delivered / todayDeliveries.total) * 100}%` }}
                  title={`Delivered: ${todayDeliveries.delivered}`}
                />
              )}
              
              {/* בוטל - אדום */}
              {todayDeliveries.cancelled > 0 && (
                <div 
                  key="cancelled"
                  className="bg-[#dc2626] dark:bg-[#dc2626] transition-all duration-300 opacity-60"
                  style={{ width: `${(todayDeliveries.cancelled / todayDeliveries.total) * 100}%` }}
                  title={`Cancelled: ${todayDeliveries.cancelled}`}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-4">
        {/* Delivery Balance Indicator */}
        

        {/* System Control Menu (Traffic Light) - Only shows status, control moved to sidebar */}
        <div className="relative">
          
        </div>
        
        {/* Notifications Bell */}
        <div className="relative">
          <button
            className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-xl transition-colors relative"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell className="w-6 h-6 text-[#737373] dark:text-[#a3a3a3]" />
            <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#171717]" />
          </button>
        </div>

        {/* Notification Center Panel */}
        <NotificationCenter 
          isOpen={showNotifications} 
          onClose={() => setShowNotifications(false)} 
        />
        
        {/* User Menu */}
        <div className="relative">
          <button
            className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-xl transition-colors"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="User Menu"
          >
            <User className="w-6 h-6 text-[#737373] dark:text-[#a3a3a3]" />
          </button>
          
          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-[10000]" 
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-xl shadow-2xl w-64 z-[10001] overflow-hidden">
                <div className="p-4 border-b border-[#e5e5e5] dark:border-[#262626]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#02B74F] flex items-center justify-center text-white font-bold text-lg">
                      M
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0d0d12] dark:text-[#fafafa]">System Admin</p>
                      <p className="text-xs text-[#737373] dark:text-[#a3a3a3]">admin@system.com</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#262626] transition-colors text-right"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/account');
                    }}
                  >
                    <User className="w-5 h-5 text-[#737373] dark:text-[#a3a3a3]" />
                    <span className="text-sm text-[#0d0d12] dark:text-[#fafafa] font-medium">Account Settings</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#262626] transition-colors text-right"
                    onClick={toggleDark}
                  >
                    {isDark ? <Sun className="w-5 h-5 text-[#737373] dark:text-[#a3a3a3]" /> : <Moon className="w-5 h-5 text-[#737373] dark:text-[#a3a3a3]" />}
                    <span className="text-sm text-[#0d0d12] dark:text-[#fafafa] font-medium">
                      {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </span>
                  </button>
                </div>
                <div className="p-3 border-t border-[#e5e5e5] dark:border-[#262626]">
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg transition-colors font-medium"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};