import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Activity,
  Users,
  BarChart,
  CreditCard,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Sidebar as SidebarIcon,
  ChevronDown,
  Store,
  MapPin,
  HelpCircle,
  Building2,
  Radio,
  Package,
  Power,
  Bike,
  Calendar,
  UserCircle,
  Truck,
  Signal,
  TrendingUp,
  Ruler,
  Clock,
  Zap,

  FileText,
  Map,
  Palette,
  User,
  Wallet,
  // icons
} from 'lucide-react';
import { AppLogo } from '../icons/app-logo';
import { useDelivery } from '../../context/delivery.context';
import { useTheme } from '../../context/theme.context';
import { useLanguage } from '../../context/language.context';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useDelivery();
  const { isDark, toggleDark } = useTheme();
  const { t } = useLanguage();
  const activeDeliveriesCount = state.deliveries.filter(
    delivery => delivery.status !== 'delivered' && delivery.status !== 'cancelled'
  ).length;
  const walletRevenue = state.deliveries
    .filter(delivery => delivery.status === 'delivered')
    .reduce((sum, delivery) => sum + (delivery.price ?? 0), 0);
  
  // Load collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isBusinessPopupOpen, setIsBusinessPopupOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState('Tel Aviv - Runners');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [isBalancePopupOpen, setIsBalancePopupOpen] = useState(false);
  const [isTrackingExpanded, setIsTrackingExpanded] = useState(() => {
    // Auto-expand if we're inside tracking
    return location.pathname.startsWith('/tracking');
  });

  const businesses = [
    'Tel Aviv - Runners',
    'Mr. Delivery',
    'Delivery Champion',
    'Express Deliveries',
    'Jerusalem Couriers',
    'Haifa Delivery',
    'Beer Sheva Couriers',
    'Netanya Deliveries',
    'Petah Tikva Delivery',
    'Rishon LeZion Couriers',
    'Ashdod Express',
    'Ramat Gan Deliveries',
    'Bnei Brak Delivery',
  ];

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Expose toggle function globally for TopBar
  useEffect(() => {
    (window as any).toggleMobileSidebar = () => setIsCollapsed(prev => !prev);
    return () => {
      delete (window as any).toggleMobileSidebar;
    };
  }, []);

  interface MenuItem {
    id?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    label?: string;
    divider?: boolean;
  }

  const menuItems: MenuItem[] = [
    { id: '/live', icon: Activity, label: 'מנג׳ר לייב' },
    { id: '/dashboard', icon: LayoutDashboard, label: 'דשבורד' },
    { id: '/tracking', icon: Truck, label: 'מעקב משלוחים' },
    { divider: true },
    { id: '/deliveries', icon: Package, label: 'משלוחים' },
    { id: '/couriers', icon: Bike, label: 'שליחים' },
    { id: '/couriers/shifts', icon: Calendar, label: 'משמרות' },
    { divider: true },
  ];

  const toggleMobileMenu = () => setIsCollapsed(!isCollapsed);
  const closeMobileMenu = () => {
    // Close sidebar - set isCollapsed to false (in mobile this hides the sidebar)
    if (!isDesktop) {
      setIsCollapsed(false);
    }
  };
  const handleNav = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  // Helper to check if a menu item is active
  const isMenuItemActive = (menuPath: string) => {
    if (menuPath === '/dashboard' || menuPath === '/live' || menuPath === '/tracking') {
      return location.pathname === menuPath;
    }
    // Support for separate pages
    if (menuPath === '/deliveries' || menuPath === '/couriers' || menuPath === '/couriers/shifts' || menuPath === '/restaurants' || menuPath === '/customers' || menuPath === '/settings/zones' || menuPath === '/settings/distance-pricing' || menuPath === '/settings/hours' || menuPath === '/settings/managers' || menuPath === '/wallet') {
      return location.pathname === menuPath;
    }
    // /data pages removed - no longer needed
    return false;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!isDesktop && isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* Business Selector Popup - Full Screen Modal */}
      {isBusinessPopupOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm" 
            onClick={() => setIsBusinessPopupOpen(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#e5e5e5] dark:border-[#262626]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">{t('sidebar.selectBusiness')}</h3>
                  <button 
                    onClick={() => setIsBusinessPopupOpen(false)}
                    className="text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Business List */}
              <div className="flex-1 overflow-y-auto p-4">
                {businesses.map((business, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedBusiness(business);
                      setIsBusinessPopupOpen(false);
                    }}
                    className={`
                      px-4 py-3 rounded-lg cursor-pointer text-sm transition-colors mb-1
                      ${selectedBusiness === business 
                        ? 'bg-[#9fe870] text-[#0d0d12] font-medium' 
                        : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#262626]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Store size={18} className="shrink-0" />
                      <span className="truncate">{business}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop & Mobile Sidebar */}
      <div 
        onClick={(e) => {
          // Toggle sidebar when clicking on empty areas (not on interactive elements)
          if (e.target === e.currentTarget) {
            setIsCollapsed(!isCollapsed);
          }
        }}
        className={`
          fixed md:static inset-y-0 right-0 bg-[#fafafa] dark:bg-[#0a0a0a] border-l border-[#e5e5e5] dark:border-[#262626] flex flex-col shadow-xl md:shadow-none h-screen
          ${isCollapsed ? 'translate-x-0 z-[110] md:z-50' : 'translate-x-full md:translate-x-0 z-[110] md:z-50'}
        `}
        style={{
          width: isDesktop ? (isCollapsed ? '60px' : '200px') : '240px',
          transition: isDesktop ? 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        
        {/* Header / Logo Area */}
        <div 
          onClick={() => {
            // Toggle sidebar in both desktop and mobile
            setIsCollapsed(!isCollapsed);
          }}
          className="h-16 flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#262626] shrink-0 bg-[#fafafa] dark:bg-[#0a0a0a] cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[#111111] transition-colors px-[16px] py-[0px]"
        >
           <div className="flex items-center gap-2 md:hidden">
              <AppLogo size={20} className="text-[#02B74F]" />
              <span className="font-bold text-base text-[#0d0d12] dark:text-[#fafafa] tracking-tight">Sendi</span>
           </div>
           
           {!isCollapsed && (
             <div className="hidden md:flex items-center gap-2">
                <AppLogo size={20} className="text-[#02B74F]" />
                <span className="font-bold text-base text-[#0d0d12] dark:text-[#fafafa] tracking-tight">Sendi</span>
             </div>
           )}
           {isCollapsed && (
              <div className="hidden md:flex mx-auto">
                <AppLogo size={20} className="text-[#02B74F]" />
              </div>
           )}
           
           {/* Mobile Close Button */}
           <button 
             onClick={(e) => {
               e.stopPropagation(); // Prevent parent div onClick
               closeMobileMenu();
             }} 
             className="md:hidden text-[#737373] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]"
           >
             <X size={18} />
           </button>

            {/* Desktop Collapse Indicator */}
            {!isCollapsed && (
              <div className="hidden md:block text-[#737373] dark:text-[#a3a3a3]">
                 <SidebarIcon size={16} />
              </div>
            )}
        </div>

        {/* Menu Items */}
        <div 
          onClick={(e) => {
            // Toggle sidebar when clicking on empty space in menu area
            if (e.target === e.currentTarget) {
              if (!isDesktop) {
                setIsCollapsed(false); // Mobile: close
              } else {
                setIsCollapsed(!isCollapsed); // Desktop: toggle
              }
            }
          }}
          className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-[#d4d4d4] dark:scrollbar-thumb-[#404040] bg-[#fafafa] dark:bg-[#0a0a0a] cursor-pointer"
        >
          {/* ×ž× ×''×¨ ×œ×™×™×' */}
          <div
            data-onboarding="nav-live"
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/live');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/live'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]' 
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Activity size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t('nav.live')}</span>
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-[#a3a3a3] dark:text-[#737373]">
                  {activeDeliveriesCount}
                </span>
              </div>
            ) : (
              <div
                className="flex items-center justify-center py-2.5"
                title={`${t('nav.live')} • ${activeDeliveriesCount}`}
              >
                <Activity size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

          {/* ×ž×¤×¨×™×" */}
          <div className="my-2 mx-4 border-t border-[#e5e5e5] dark:border-[#262626]" />

          {/* ×"×©×'×•×¨×" */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/dashboard');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/dashboard'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]' 
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <LayoutDashboard size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="text-sm font-medium truncate">{t('nav.dashboard')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5" title={t('nav.dashboard')}>
                <LayoutDashboard size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

          {/* ×ž×¤×¨×™×" */}
          <div className="my-2 mx-4 border-t border-[#e5e5e5] dark:border-[#262626]" />

          {/* משלוחים */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/deliveries');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/deliveries'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Package size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="text-sm font-medium truncate">{t('nav.history')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5" title={t('nav.history')}>
                <Package size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

          {/* מסעדות */}
          <div
            data-onboarding="nav-restaurants"
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/restaurants');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/restaurants'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Store size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="text-sm font-medium truncate">מסעדות</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5" title="מסעדות">
                <Store size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

          {/* שליחים */}
          <div
            data-onboarding="nav-couriers"
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/couriers');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/couriers'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Bike size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="text-sm font-medium truncate">שליחים</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5" title="שליחים">
                <Bike size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

          <div className="my-2 mx-4 border-t border-[#e5e5e5] dark:border-[#262626]" />

          {/* משמרות */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/couriers/shifts');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/couriers/shifts'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Calendar size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="text-sm font-medium truncate">משמרות</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5" title="משמרות">
                <Calendar size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

          <div className="my-2 mx-4 border-t border-[#e5e5e5] dark:border-[#262626]" />

          {/* דוחות */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/reports');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/reports'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <FileText size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="text-sm font-medium truncate">{t('sidebar.reports')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5" title={t('sidebar.reports')}>
                <FileText size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

          {/* ביצועים */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNav('/performance');
            }}
            className={`
              mx-2 mb-1 rounded-lg cursor-pointer transition-all duration-200 relative
              ${location.pathname === '/performance'
                ? 'bg-[#f5f5f5] dark:bg-[#262626] text-[#16a34a] dark:text-[#22c55e]'
                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }
            `}
          >
            {!isCollapsed || !isDesktop ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <TrendingUp size={19} className="shrink-0 stroke-[1.8px]" />
                <span className="text-sm font-medium truncate">ביצועים</span>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5" title="ביצועים">
                <TrendingUp size={19} className="stroke-[1.8px]" />
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-[#e5e5e5] dark:border-[#262626] mt-auto shrink-0">
           {/* Business Selector - Mobile & Desktop combined */}
           {(!isCollapsed || !isDesktop) ? (
             <div className="px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626]">
               <div
                 onClick={() => setIsBusinessPopupOpen(!isBusinessPopupOpen)}
                 className="flex items-center gap-2 text-xs text-[#666d80] dark:text-[#a3a3a3] cursor-pointer hover:text-[#9fe870] dark:hover:text-[#9fe870] transition-colors"
               >
                 <Store size={14} className="shrink-0" />
                 <span className="truncate">{selectedBusiness}</span>
                 <ChevronLeft size={12} className="shrink-0" />
               </div>
             </div>
           ) : (
              <div className="hidden md:block px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626]">
               {!isCollapsed ? (
                 <div
                   onClick={() => setIsBusinessPopupOpen(!isBusinessPopupOpen)}
                   className="flex items-center gap-2 text-xs text-[#666d80] dark:text-[#a3a3a3] cursor-pointer hover:text-[#9fe870] dark:hover:text-[#9fe870] transition-colors"
                 >
                   <Store size={14} className="shrink-0" />
                   <span className="truncate">{selectedBusiness}</span>
                   <ChevronLeft size={12} className="shrink-0" />
                 </div>
               ) : (
                 <div
                   onClick={() => setIsBusinessPopupOpen(!isBusinessPopupOpen)}
                   className="flex justify-center cursor-pointer"
                 >
                   <Store size={15} className="text-[#666d80] dark:text-[#a3a3a3] hover:text-[#9fe870] dark:hover:text-[#9fe870] transition-colors" />
                 </div>
               )}
             </div>
           )}

           <div
             onClick={() => handleNav('/wallet')}
             className={`px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626] cursor-pointer transition-colors ${
               location.pathname === '/wallet'
                 ? 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
                 : 'hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]'
             }`}
           >
             {(!isCollapsed || !isDesktop) ? (
               <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-[#16a34a] dark:text-[#9fe870] shrink-0" />
                   <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">ארנק</span>
                 </div>
                 <span className="text-xs font-bold text-[#16a34a] dark:text-[#9fe870]">
                   ₪{Math.round(walletRevenue).toLocaleString('he-IL')}
                 </span>
               </div>
             ) : (
               <div className="hidden md:flex flex-col items-center gap-1" title="ארנק">
                 <Wallet size={16} className="text-[#16a34a] dark:text-[#9fe870]" />
                 <span className="text-[10px] font-bold text-[#16a34a] dark:text-[#9fe870]">
                   {walletRevenue > 999 ? `${Math.floor(walletRevenue / 1000)}K` : Math.round(walletRevenue)}
                 </span>
               </div>
             )}
           </div>

           {/* Delivery Balance Indicator */}
           <div 
            onClick={() => handleNav('/finances')}
            className="px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626] cursor-pointer hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
           >
             {(!isCollapsed || !isDesktop) ? (
               <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center gap-2">
                   <Package size={16} className="text-[#0fcdd3] shrink-0" />
                   <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">{t('sidebar.deliveryBalance')}</span>
                 </div>
                 <span className={`text-xs font-bold ${
                   state.deliveryBalance <= 100
                     ? 'text-[#dc2626] dark:text-[#f87171]' 
                     : 'text-[#f59e0b] dark:text-[#fbbf24]'
                 }`}>
                   {state.deliveryBalance.toLocaleString('he-IL')}
                 </span>
               </div>
             ) : (
               <div className="hidden md:flex flex-col items-center gap-1" title={t('sidebar.deliveryBalance')}>
                 <Package size={16} className="text-[#0fcdd3]" />
                 <span className={`text-[10px] font-bold ${
                   state.deliveryBalance <= 100
                     ? 'text-[#dc2626] dark:text-[#f87171]' 
                     : 'text-[#f59e0b] dark:text-[#fbbf24]'
                 }`}>
                   {state.deliveryBalance > 999 ? `${Math.floor(state.deliveryBalance / 1000)}K` : state.deliveryBalance}
                 </span>
               </div>
             )}
           </div>

           {/* System Control */}
           <div className="px-4 py-3 border-b border-[#e5e5e5] dark:border-[#262626]">
             {(!isCollapsed || !isDesktop) ? (
               <div className="space-y-3">
                 {/* ×§×'×œ×ª ×ž×©×œ×•×—×™× */}
                 <div data-onboarding="system-toggle" className="flex items-center justify-between">
                   <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">{t('sidebar.acceptDeliveries')}</span>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       if (!state.isSystemOpen && state.couriers.filter(c => c.status !== 'offline').length === 0) {
                         alert(t('sidebar.noActiveCouriers'));
                         return;
                       }
                       dispatch({ type: 'TOGGLE_SYSTEM' });
                     }}
                     disabled={!state.isSystemOpen && state.couriers.filter(c => c.status !== 'offline').length === 0}
                     className={`relative w-10 h-5 rounded-full transition-colors ${
                       state.isSystemOpen
                         ? 'bg-[#02B74F]'
                         : state.couriers.filter(c => c.status !== 'offline').length === 0
                         ? 'bg-[#e5e5e5] dark:bg-[#404040] opacity-50 cursor-not-allowed'
                         : 'bg-[#e5e5e5] dark:bg-[#404040] cursor-pointer'
                     }`}
                   >
                     <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                       state.isSystemOpen ? 'right-0.5' : 'left-0.5'
                     }`} />
                   </button>
                 </div>

                 {/* ×©×™×'×•×¥ ××•×˜×•×ž×˜×™ */}
                 <div className="flex items-center justify-between">
                   <span className="text-xs text-[#666d80] dark:text-[#a3a3a3]">{t('sidebar.autoAssign')}</span>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       dispatch({ type: 'TOGGLE_AUTO_ASSIGN' });
                     }}
                     className={`relative w-10 h-5 rounded-full transition-colors ${
                       state.autoAssignEnabled ? 'bg-[#02B74F]' : 'bg-[#e5e5e5] dark:bg-[#404040]'
                     }`}
                   >
                     <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                       state.autoAssignEnabled ? 'right-0.5' : 'left-0.5'
                     }`} />
                   </button>
                 </div>

               </div>
             ) : (
              <div
                className="hidden md:flex flex-col items-center gap-1"
                title={state.isSystemOpen ? t('sidebar.acceptDeliveries') : '���� ������� �����'}
              >
                <Power className={`w-4 h-4 transition-colors ${
                  state.isSystemOpen ? 'text-[#02B74F]' : 'text-[#dc2626]'
                }`} />
              </div>
            )}
          </div>

           {/* Help & Settings - Mobile */}
           <div className="md:hidden flex flex-col">
             <div 
               onClick={() => handleNav('/settings')}
               className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                 location.pathname.startsWith('/settings') ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
               }`}
             >
               <Settings size={20} className="stroke-[1.5px]" />
               <span className="text-sm font-medium">{t('sidebar.settings')}</span>
             </div>
             <div 
               onClick={() => handleNav('/help')}
               className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                 location.pathname === '/help' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
               }`}
             >
               <HelpCircle size={20} className="stroke-[1.5px]" />
               <span className="text-sm font-medium">{t('sidebar.help')}</span>
             </div>
           </div>
           
           {/* Help & Settings - Desktop Collapsed */}
           {isCollapsed ? (
             <div className="hidden md:flex flex-col p-2 gap-2">
               <div 
                 onClick={() => handleNav('/settings')}
                 className={`flex items-center justify-center p-2.5 cursor-pointer transition-colors rounded-md mx-1 ${
                   location.pathname.startsWith('/settings') ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                 }`}
                 title={t('sidebar.systemSettings')}
               >
                 <Settings size={20} className="stroke-[1.5px]" />
               </div>
               <div 
                 onClick={() => handleNav('/help')}
                 className={`flex items-center justify-center p-2.5 cursor-pointer transition-colors rounded-md mx-1 ${
                   location.pathname === '/help' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                 }`}
                 title={t('sidebar.help')}
               >
                 <HelpCircle size={20} className="stroke-[1.5px]" />
               </div>
             </div>
           ) : (
             /* Help & Settings - Desktop Expanded */
             <div className="hidden md:flex flex-col p-2">
               <div 
                 onClick={() => handleNav('/settings')}
                 className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                   location.pathname.startsWith('/settings') ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                 }`}
               >
                 <Settings size={20} className="stroke-[1.5px]" />
                 <span className="text-sm font-medium">{t('sidebar.systemSettings')}</span>
               </div>
               <div 
                 onClick={() => handleNav('/help')}
                 className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                   location.pathname === '/help' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                 }`}
               >
                 <HelpCircle size={20} className="stroke-[1.5px]" />
                 <span className="text-sm font-medium">{t('sidebar.help')}</span>
               </div>
             </div>
           )}
        </div>
      </div>
      
      <div id="mobile-menu-trigger" className="hidden" onClick={toggleMobileMenu}></div>
    </>
  );
};


