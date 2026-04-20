import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MapPin, Clock, DollarSign, Store, Plus, Check, X, Menu } from 'lucide-react';
import { DistancePricing } from './finance/distance-pricing';
import { useDelivery } from '../../context/delivery.context';
import { toast } from 'sonner';

export const BusinessManagement: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useDelivery();
  const activeTab = (tab as 'hours' | 'zones' | 'distance-pricing') || 'hours';

  const handleTabChange = (newTab: string) => {
    navigate(`/business/${newTab}`);
  };

  const handleSave = () => {
    toast.success('השינויים נשמרו בהצלחה!', {
      icon: '✅',
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#1f1f1f] px-5 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window as any).toggleMobileSidebar?.()}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#525252] dark:text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[15px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">ניהול עסק</span>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      <div className="flex-1 p-3 sm:p-4 md:p-6">
      <div className="max-w-[80rem] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0d0d12] dark:text-[#fafafa] mb-1">
                ניהול עסק
              </h1>
              <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                הגדרות שעות פעילות, אזורי משלוח ותמחור
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-[#737373] dark:text-[#a3a3a3] bg-[#f5f5f5] dark:bg-[#171717] px-3 py-2 rounded-lg border border-[#e5e5e5] dark:border-[#262626] flex items-center gap-2">
                <Store className="w-3.5 h-3.5" />
                Tel Aviv - Runners
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white dark:bg-[#171717] p-1.5 rounded-xl border border-[#e5e5e5] dark:border-[#262626]">
            <button
              onClick={() => handleTabChange('hours')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'hours'
                  ? 'bg-[#9fe870] text-[#0d0d12] shadow-sm'
                  : 'text-[#666d80] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <Clock className="w-4 h-4 inline-block ml-2" />
              שעות פעילות
            </button>
            <button
              onClick={() => handleTabChange('zones')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'zones'
                  ? 'bg-[#9fe870] text-[#0d0d12] shadow-sm'
                  : 'text-[#666d80] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <MapPin className="w-4 h-4 inline-block ml-2" />
              אזורי משלוח
            </button>
            <button
              onClick={() => handleTabChange('distance-pricing')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'distance-pricing'
                  ? 'bg-[#9fe870] text-[#0d0d12] shadow-sm'
                  : 'text-[#666d80] dark:text-[#a3a3a3] hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}
            >
              <DollarSign className="w-4 h-4 inline-block ml-2" />
              תמחור מרחק
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {/* Tab Content */}
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 md:p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#e5e5e5] dark:border-[#262626]">
                  <div className="bg-[#ecfae2] dark:bg-[#163300] p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-[#9fe870] dark:text-[#9fe870]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">שעות פעילות</h2>
                    <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                      הגדר את שעות הפעילות של העסק לכל יום בשבוע
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">{['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day, index) => (
                    <div key={day} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl border border-[#e5e5e5] dark:border-[#262626] gap-3 hover:border-[#9fe870]/30 dark:hover:border-[#9fe870]/30 transition-all">
                      <span className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] md:w-20">{day}</span>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="time"
                            defaultValue="09:00"
                            className="px-3 py-2 text-sm bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/20 flex-1 sm:flex-none transition-all"
                          />
                          <span className="text-[#666d80] dark:text-[#a3a3a3] font-medium">—</span>
                          <input
                            type="time"
                            defaultValue="22:00"
                            className="px-3 py-2 text-sm bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-[#0d0d12] dark:text-[#fafafa] focus:outline-none focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/20 flex-1 sm:flex-none transition-all"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={index < 6}
                            className="w-4 h-4 rounded accent-[#9fe870] cursor-pointer"
                          />
                          <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">פעיל</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                  <button 
                    onClick={handleSave}
                    className="px-6 py-3 bg-[#9fe870] hover:bg-[#8ed75f] text-[#0d0d12] font-medium rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    שמור שינויים
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'zones' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3 pb-4 border-b border-[#e5e5e5] dark:border-[#262626]">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#ecfae2] dark:bg-[#163300] p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-[#9fe870] dark:text-[#9fe870]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">אזורי משלוח</h2>
                      <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">
                        הגדר אזורי משלוח ומחירים לכל אזור
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toast.info('הוספת אזור חדש - בבנייה', { icon: '🚧' })}
                    className="px-4 py-2.5 bg-[#9fe870] hover:bg-[#8ed75f] text-[#0d0d12] font-medium rounded-lg transition-all text-sm w-full sm:w-auto flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף אזור
                  </button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { name: 'תל אביב מרכז', radius: '5 ק"מ', price: 15, active: true },
                    { name: 'תל אביב צפון', radius: '7 ק"מ', price: 20, active: true },
                    { name: 'תל אביב דרום', radius: '6 ק"מ', price: 18, active: false },
                    { name: 'רמת גן', radius: '10 ק"מ', price: 25, active: true },
                  ].map((zone, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border transition-all ${
                        zone.active
                          ? 'bg-[#ecfae2] dark:bg-[#163300] border-[#9fe870]/30 hover:border-[#9fe870]/50'
                          : 'bg-[#fafafa] dark:bg-[#0a0a0a] border-[#e5e5e5] dark:border-[#262626] opacity-60'
                      } gap-3`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          zone.active ? 'bg-[#9fe870]/20' : 'bg-[#e5e5e5] dark:bg-[#262626]'
                        }`}>
                          <MapPin size={20} className={zone.active ? 'text-[#9fe870]' : 'text-[#737373] dark:text-[#a3a3a3]'} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{zone.name}</p>
                          <p className="text-xs text-[#666d80] dark:text-[#a3a3a3]">רדיוס: {zone.radius}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-6">
                        <div className="text-left">
                          <div className="text-xs text-[#666d80] dark:text-[#a3a3a3] mb-0.5">מחיר</div>
                          <div className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">₪{zone.price}</div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={zone.active}
                            className="w-4 h-4 rounded accent-[#9fe870] cursor-pointer"
                          />
                          <span className="text-sm text-[#666d80] dark:text-[#a3a3a3]">פעיל</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                  <button 
                    onClick={handleSave}
                    className="px-6 py-3 bg-[#9fe870] hover:bg-[#8ed75f] text-[#0d0d12] font-medium rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    שמור שינויים
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'distance-pricing' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#171717] rounded-2xl border border-[#e5e5e5] dark:border-[#262626] p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3 pb-4 border-b border-[#e5e5e5] dark:border-[#262626]">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#ecfae2] dark:bg-[#163300] p-2 rounded-lg">
                      <DollarSign className="w-5 h-5 text-[#9fe870] dark:text-[#9fe870]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#0d0d12] dark:text-[#fafafa]">תמחור לפי מרחק</h2>
                      <p className="text-sm text-[#666d80] dark:text-[#a3a3a3]">הגדר מחירים שונים לטווחי מרחק שונים</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.info('הוספת טווח חדש - בבנייה', { icon: '🚧' })}
                    className="px-4 py-2.5 bg-[#9fe870] hover:bg-[#8ed75f] text-[#0d0d12] font-medium rounded-lg transition-all text-sm w-full sm:w-auto flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף טווח
                  </button>
                </div>
                <DistancePricing />
                <div className="mt-6 p-4 bg-[#ecfae2] dark:bg-[#163300] rounded-xl border border-[#9fe870]/30">
                  <p className="text-sm text-[#36394a] dark:text-[#d4d4d4]">
                    <span className="font-bold text-[#0d0d12] dark:text-[#fafafa]">💡 טיפ:</span> המערכת תחשב אוטומטית את המרחק בין הנקודות ותחיל את התעריף המתאים. ודא שאין חפיפות בין הטווחים.
                  </p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-[#9fe870] hover:bg-[#8ed75f] text-[#0d0d12] font-medium rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    שמור שינויים
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </div>
  );
};
