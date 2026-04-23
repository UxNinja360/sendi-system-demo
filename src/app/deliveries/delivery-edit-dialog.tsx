import React, { useState, useEffect } from 'react';
import { Delivery, DeliveryStatus } from '../types/delivery.types';
import { 
  X, 
  Save, 
  RotateCcw,
  Package,
  Store,
  User,
  Bike,
  Clock,
  Gauge,
  DollarSign,
  Signal,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryEditDialogProps {
  delivery: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deliveryId: string, updates: Partial<Delivery>) => void;
}

type TabId = 'core' | 'origin' | 'target' | 'actor' | 'timeline' | 'mechanics' | 'economy' | 'meta';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const tabs: Tab[] = [
  { id: 'core', label: 'ליבה', icon: Package, color: 'text-blue-600' },
  { id: 'origin', label: 'מסעדה', icon: Store, color: 'text-purple-600' },
  { id: 'target', label: 'לקוח', icon: User, color: 'text-green-600' },
  { id: 'actor', label: 'שליח', icon: Bike, color: 'text-orange-600' },
  { id: 'timeline', label: 'זמנים', icon: Clock, color: 'text-cyan-600' },
  { id: 'mechanics', label: 'ביצועים', icon: Gauge, color: 'text-pink-600' },
  { id: 'economy', label: 'כספים', icon: DollarSign, color: 'text-emerald-600' },
  { id: 'meta', label: 'מטא', icon: Signal, color: 'text-indigo-600' },
];

export const DeliveryEditDialog: React.FC<DeliveryEditDialogProps> = ({
  delivery,
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [formData, setFormData] = useState<Partial<Delivery>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when delivery changes
  useEffect(() => {
    if (delivery) {
      setFormData({ ...delivery });
      setHasChanges(false);
    }
  }, [delivery]);

  // Close with ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !delivery) return null;

  const handleChange = (field: keyof Delivery, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!hasChanges) {
      toast.info('לא בוצעו שינויים');
      return;
    }
    onSave(delivery.id, formData);
    toast.success('המשלוח עודכן בהצלחה');
    onClose();
  };

  const handleReset = () => {
    setFormData({ ...delivery });
    setHasChanges(false);
    toast.info('השינויים אופסו');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-[#e5e5e5] dark:border-[#262626] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#9fe870]/10 rounded-xl">
                <Package className="w-5 h-5 text-[#9fe870]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0d0d12] dark:text-[#fafafa]">עריכת משלוח</h2>
                <p className="text-xs text-[#737373] dark:text-[#a3a3a3]">הזמנה #{delivery.orderNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#262626] text-[#737373] transition-colors"
              title="סגור (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="shrink-0 px-6 border-b border-[#e5e5e5] dark:border-[#262626] flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? `border-[#9fe870] ${tab.color} bg-[#9fe870]/5`
                      : 'border-transparent text-[#737373] hover:text-[#0d0d12] dark:hover:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeTab === 'core' && <CoreTab formData={formData} onChange={handleChange} />}
            {activeTab === 'origin' && <OriginTab formData={formData} onChange={handleChange} />}
            {activeTab === 'target' && <TargetTab formData={formData} onChange={handleChange} />}
            {activeTab === 'actor' && <ActorTab formData={formData} onChange={handleChange} />}
            {activeTab === 'timeline' && <TimelineTab formData={formData} onChange={handleChange} />}
            {activeTab === 'mechanics' && <MechanicsTab formData={formData} onChange={handleChange} />}
            {activeTab === 'economy' && <EconomyTab formData={formData} onChange={handleChange} />}
            {activeTab === 'meta' && <MetaTab formData={formData} onChange={handleChange} />}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-[#e5e5e5] dark:border-[#262626] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#737373]">
              {hasChanges && (
                <>
                  <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                  <span>יש שינויים שלא נשמרו</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={!hasChanges}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#737373] hover:text-[#0d0d12] dark:hover:text-[#fafafa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                איפוס
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[#0d0d12] dark:text-[#fafafa] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] rounded-lg transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-[#9fe870] hover:bg-[#8fd65f] text-[#0d0d12] rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ========================================
// Tab Components
// ========================================

interface TabProps {
  formData: Partial<Delivery>;
  onChange: (field: keyof Delivery, value: any) => void;
}

const FormField: React.FC<{
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'select' | 'checkbox' | 'datetime-local' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, type = 'text', options, placeholder, disabled }) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#737373] dark:text-[#a3a3a3]">{label}</label>
      {type === 'select' && options ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9fe870] disabled:opacity-50"
        >
          <option value="">בחר...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded border-[#e5e5e5] dark:border-[#262626] text-[#9fe870] focus:ring-2 focus:ring-[#9fe870] disabled:opacity-50"
          />
          <span className="text-xs text-[#0d0d12] dark:text-[#fafafa]">{value ? 'כן' : 'לא'}</span>
        </div>
      ) : type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9fe870] disabled:opacity-50 resize-none"
        />
      ) : type === 'datetime-local' ? (
        <input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9fe870] disabled:opacity-50"
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9fe870] disabled:opacity-50"
        />
      )}
    </div>
  );
};

const CoreTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="מספר הזמנה" value={formData.orderNumber} onChange={(v) => onChange('orderNumber', v)} disabled />
    <FormField label="מזהה קצר API" value={formData.api_short_order_id} onChange={(v) => onChange('api_short_order_id', v)} />
    <FormField label="מזהה ארוך API" value={formData.api_str_order_id} onChange={(v) => onChange('api_str_order_id', v)} />
    <FormField
      label="סטטוס"
      value={formData.status}
      onChange={(v) => onChange('status', v)}
      type="select"
      options={[
        { value: 'pending', label: 'ממתין' },
        { value: 'assigned', label: 'שובץ' },
        { value: 'delivered', label: 'נמסר' },
        { value: 'cancelled', label: 'בוטל' },
      ]}
    />
    <FormField label="עדיפות" value={formData.priority} onChange={(v) => onChange('priority', v)} type="number" />
    <FormField label="מספר חבילה" value={formData.pack_num} onChange={(v) => onChange('pack_num', v)} />
    <FormField label="משלוח API" value={formData.is_api} onChange={(v) => onChange('is_api', v)} type="checkbox" />
    <FormField label="הופעל" value={formData.is_started} onChange={(v) => onChange('is_started', v)} type="checkbox" />
    <FormField label="אושר" value={formData.is_approved} onChange={(v) => onChange('is_approved', v)} type="checkbox" />
    <FormField label="דורש אישור" value={formData.is_requires_approval} onChange={(v) => onChange('is_requires_approval', v)} type="checkbox" />
    <FormField label="הזמנה סגורה" value={formData.close_order} onChange={(v) => onChange('close_order', v)} type="checkbox" />
    <div className="md:col-span-2">
      <FormField label="הערה" value={formData.comment} onChange={(v) => onChange('comment', v)} type="textarea" />
    </div>
  </div>
);

const OriginTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="שם מסעדה" value={formData.rest_name} onChange={(v) => onChange('rest_name', v)} />
    <FormField label="מזהה מסעדה" value={formData.rest_id} onChange={(v) => onChange('rest_id', v)} />
    <FormField label="מזהה סניף" value={formData.branch_id} onChange={(v) => onChange('branch_id', v)} />
    <FormField label="שם סניף" value={formData.branchName} onChange={(v) => onChange('branchName', v)} />
    <FormField label="עיר" value={formData.rest_city} onChange={(v) => onChange('rest_city', v)} />
    <FormField label="רחוב" value={formData.rest_street} onChange={(v) => onChange('rest_street', v)} />
    <FormField label="בניין" value={formData.rest_building} onChange={(v) => onChange('rest_building', v)} />
    <FormField label="כתובת מלאה" value={formData.restaurantAddress} onChange={(v) => onChange('restaurantAddress', v)} />
    <FormField label="קו רוחב (Latitude)" value={formData.pickup_latitude} onChange={(v) => onChange('pickup_latitude', v)} type="number" />
    <FormField label="קו אורך (Longitude)" value={formData.pickup_longitude} onChange={(v) => onChange('pickup_longitude', v)} type="number" />
    <FormField label="סוג הכנה" value={formData.cook_type} onChange={(v) => onChange('cook_type', v)} />
    <FormField label="זמן הכנה" value={formData.cook_time} onChange={(v) => onChange('cook_time', v)} type="number" />
    <FormField label="הזמנה מוכנה" value={formData.order_ready} onChange={(v) => onChange('order_ready', v)} type="checkbox" />
    <FormField label="דווח כמוכן" value={formData.reported_order_is_ready} onChange={(v) => onChange('reported_order_is_ready', v)} type="checkbox" />
    <FormField label="אושר על ידי מסעדה" value={formData.rest_approve} onChange={(v) => onChange('rest_approve', v)} type="checkbox" />
    <FormField label="מסעדה ממתינה לזמן הכנה" value={formData.rest_waits_for_cook_time} onChange={(v) => onChange('rest_waits_for_cook_time', v)} type="checkbox" />
    <FormField label="משקאות" value={formData.is_drinks_exist} onChange={(v) => onChange('is_drinks_exist', v)} type="checkbox" />
    <FormField label="רטבים" value={formData.is_sauces_exist} onChange={(v) => onChange('is_sauces_exist', v)} type="checkbox" />
    <FormField label="ETA אחרון מסעדה" value={formData.rest_last_eta} onChange={(v) => onChange('rest_last_eta', v)} type="datetime-local" />
    <FormField label="ETA מאושר מסעדה" value={formData.rest_approved_eta} onChange={(v) => onChange('rest_approved_eta', v)} type="datetime-local" />
  </div>
);

const TargetTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="שם לקוח" value={formData.client_name} onChange={(v) => onChange('client_name', v)} />
    <FormField label="טלפון לקוח" value={formData.client_phone} onChange={(v) => onChange('client_phone', v)} />
    <FormField label="מזהה לקוח" value={formData.client_id} onChange={(v) => onChange('client_id', v)} />
    <div className="md:col-span-2">
      <FormField label="כתובת מלאה" value={formData.client_full_address} onChange={(v) => onChange('client_full_address', v)} />
    </div>
    <FormField label="עיר" value={formData.client_city} onChange={(v) => onChange('client_city', v)} />
    <FormField label="רחוב" value={formData.client_street} onChange={(v) => onChange('client_street', v)} />
    <FormField label="בניין" value={formData.client_building} onChange={(v) => onChange('client_building', v)} />
    <FormField label="כניסה" value={formData.client_entry} onChange={(v) => onChange('client_entry', v)} />
    <FormField label="קומה" value={formData.client_floor} onChange={(v) => onChange('client_floor', v)} />
    <FormField label="דירה" value={formData.client_apartment} onChange={(v) => onChange('client_apartment', v)} />
    <FormField label="מיקוד" value={formData.zipcode} onChange={(v) => onChange('zipcode', v)} />
    <FormField label="קו רוחב (Latitude)" value={formData.dropoff_latitude} onChange={(v) => onChange('dropoff_latitude', v)} type="number" />
    <FormField label="קו אורך (Longitude)" value={formData.dropoff_longitude} onChange={(v) => onChange('dropoff_longitude', v)} type="number" />
    <div className="md:col-span-2">
      <FormField label="הערת לקוח" value={formData.client_comment} onChange={(v) => onChange('client_comment', v)} type="textarea" />
    </div>
    <FormField label="כתובת שגויה" value={formData.wrong_address} onChange={(v) => onChange('wrong_address', v)} type="checkbox" />
    <FormField label="לקוח הסכים למקום" value={formData.client_agree_to_place} onChange={(v) => onChange('client_agree_to_place', v)} type="checkbox" />
    <FormField label="URL חתימה" value={formData.signature_url} onChange={(v) => onChange('signature_url', v)} />
  </div>
);

const ActorTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="מזהה שליח" value={formData.runner_id} onChange={(v) => onChange('runner_id', v)} />
    <FormField label="שם שליח" value={formData.courierName} onChange={(v) => onChange('courierName', v)} />
    <FormField label="מזהה שליח ממתין" value={formData.pending_runner_id} onChange={(v) => onChange('pending_runner_id', v)} />
    <FormField label="מזהה שליח משמרת" value={formData.shift_runner_id} onChange={(v) => onChange('shift_runner_id', v)} />
    <FormField label="מזהה שליח שהגיע למסעדה" value={formData.arrived_at_rest_runner_id} onChange={(v) => onChange('arrived_at_rest_runner_id', v)} />
    <FormField
      label="סוג רכב"
      value={formData.vehicle_type}
      onChange={(v) => onChange('vehicle_type', v)}
      type="select"
      options={[
        { value: 'bike', label: 'אופניים' },
        { value: 'scooter', label: 'קטנוע' },
        { value: 'car', label: 'רכב' },
      ]}
    />
    <FormField
      label="סוג העסקה"
      value={formData.courierEmploymentType}
      onChange={(v) => onChange('courierEmploymentType', v)}
      type="select"
      options={[
        { value: 'שעתי', label: 'שעתי' },
        { value: 'חודשי', label: 'חודשי' },
      ]}
    />
    <FormField label="דירוג שליח" value={formData.courierRating} onChange={(v) => onChange('courierRating', v)} type="number" />
    <FormField label="שויך באלגוריתם" value={formData.algo_runner} onChange={(v) => onChange('algo_runner', v)} type="checkbox" />
    <FormField label="צומד על ידי" value={formData.coupled_by} onChange={(v) => onChange('coupled_by', v)} />
    <FormField label="קו רוחב בעת שיוך" value={formData.runner_at_assigning_latitude} onChange={(v) => onChange('runner_at_assigning_latitude', v)} type="number" />
    <FormField label="קו אורך בעת שיוך" value={formData.runner_at_assigning_longitude} onChange={(v) => onChange('runner_at_assigning_longitude', v)} type="number" />
    <FormField label="התחלת מסלול" value={formData.is_orbit_start} onChange={(v) => onChange('is_orbit_start', v)} type="checkbox" />
    <FormField label="אזור" value={formData.area} onChange={(v) => onChange('area', v)} />
    <FormField label="מזהה אזור" value={formData.area_id} onChange={(v) => onChange('area_id', v)} />
    <FormField label="מזהה אזור משלוח" value={formData.delivery_area_id} onChange={(v) => onChange('delivery_area_id', v)} />
    <FormField label="שם פוליגון ראשי" value={formData.main_polygon_name} onChange={(v) => onChange('main_polygon_name', v)} />
  </div>
);

const TimelineTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="זמן יצירה" value={formData.creation_time} onChange={(v) => onChange('creation_time', v)} type="datetime-local" />
    <FormField label="זמן דחיפה" value={formData.push_time} onChange={(v) => onChange('push_time', v)} type="datetime-local" />
    <FormField label="זמן צוותים" value={formData.coupled_time} onChange={(v) => onChange('coupled_time', v)} type="datetime-local" />
    <FormField label="התחיל איסוף" value={formData.started_pickup} onChange={(v) => onChange('started_pickup', v)} type="datetime-local" />
    <FormField label="הגיע למסעדה" value={formData.arrived_at_rest} onChange={(v) => onChange('arrived_at_rest', v)} type="datetime-local" />
    <FormField label="לקח את ההזמנה" value={formData.took_it_time} onChange={(v) => onChange('took_it_time', v)} type="datetime-local" />
    <FormField label="התחיל מסירה" value={formData.started_dropoff} onChange={(v) => onChange('started_dropoff', v)} type="datetime-local" />
    <FormField label="הגיע ללקוח" value={formData.arrived_at_client} onChange={(v) => onChange('arrived_at_client', v)} type="datetime-local" />
    <FormField label="זמן מסירה" value={formData.delivered_time} onChange={(v) => onChange('delivered_time', v)} type="datetime-local" />
    <FormField label="זמן ביטול" value={formData.cancelledAt} onChange={(v) => onChange('cancelledAt', v)} type="datetime-local" />
    <FormField label="זמן משוער (דקות)" value={formData.estimatedTime} onChange={(v) => onChange('estimatedTime', v)} type="number" />
    <FormField label="ETA למסעדה" value={formData.estimatedArrivalAtRestaurant} onChange={(v) => onChange('estimatedArrivalAtRestaurant', v)} type="datetime-local" />
    <FormField label="ETA ללקוח" value={formData.estimatedArrivalAtCustomer} onChange={(v) => onChange('estimatedArrivalAtCustomer', v)} type="datetime-local" />
    <FormField label="זמן הכנת הזמנה" value={formData.orderReadyTime} onChange={(v) => onChange('orderReadyTime', v)} type="datetime-local" />
  </div>
);

const MechanicsTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="זמן מסירה מתוכנן" value={formData.should_delivered_time} onChange={(v) => onChange('should_delivered_time', v)} type="datetime-local" />
    <FormField label="זמן מקסימלי למסירה (דקות)" value={formData.max_time_to_deliver} onChange={(v) => onChange('max_time_to_deliver', v)} type="number" />
    <FormField label="זמן מינימלי לאספקה (דקות)" value={formData.min_time_to_suplly} onChange={(v) => onChange('min_time_to_suplly', v)} type="number" />
    <FormField label="זמן מקסימלי לאספקה (דקות)" value={formData.max_time_to_suplly} onChange={(v) => onChange('max_time_to_suplly', v)} type="number" />
    <FormField label="דקות איחור" value={formData.minutes_late} onChange={(v) => onChange('minutes_late', v)} type="number" />
    <FormField label="סטיית איסוף (דקות)" value={formData.pickup_deviation} onChange={(v) => onChange('pickup_deviation', v)} type="number" />
    <FormField label="סטיית מסירה (דקות)" value={formData.dropoff_deviation} onChange={(v) => onChange('dropoff_deviation', v)} type="number" />
    <FormField label="סיבת עיכוב" value={formData.delay_reason} onChange={(v) => onChange('delay_reason', v)} />
    <FormField label="משך עיכוב (דקות)" value={formData.delay_duration} onChange={(v) => onChange('delay_duration', v)} type="number" />
    <FormField label="מרחק משלוח (קמ)" value={formData.delivery_distance} onChange={(v) => onChange('delivery_distance', v)} type="number" />
    <FormField label="משך ללקוח (דקות)" value={formData.duration_to_client} onChange={(v) => onChange('duration_to_client', v)} type="number" />
    <FormField label="ETA לאחר איסוף (דקות)" value={formData.eta_after_pickup} onChange={(v) => onChange('eta_after_pickup', v)} type="number" />
    <FormField label="סטטוס אספקה" value={formData.suplly_status} onChange={(v) => onChange('suplly_status', v)} />
    <FormField label="בוטל לאחר איסוף" value={formData.cancelledAfterPickup} onChange={(v) => onChange('cancelledAfterPickup', v)} type="checkbox" />
  </div>
);

const EconomyTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="מחיר משלוח (₪)" value={formData.price} onChange={(v) => onChange('price', v)} type="number" />
    <FormField label="חיוב מסעדה (₪)" value={formData.rest_price} onChange={(v) => onChange('rest_price', v)} type="number" />
    <FormField label="מחיר פוליגון מסעדה (₪)" value={formData.rest_polygon_price} onChange={(v) => onChange('rest_polygon_price', v)} type="number" />
    <FormField label="תשלום שליח (₪)" value={formData.runner_price} onChange={(v) => onChange('runner_price', v)} type="number" />
    <FormField label="טיפ שליח (₪)" value={formData.runner_tip} onChange={(v) => onChange('runner_tip', v)} type="number" />
    <FormField label="סכום מזומן (₪)" value={formData.sum_cash} onChange={(v) => onChange('sum_cash', v)} type="number" />
    <FormField label="תשלום במזומן" value={formData.is_cash} onChange={(v) => onChange('is_cash', v)} type="checkbox" />
    <FormField label="עמלה (₪)" value={formData.commissionAmount} onChange={(v) => onChange('commissionAmount', v)} type="number" />
  </div>
);

const MetaTab: React.FC<TabProps> = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="סוג API" value={formData.api_type} onChange={(v) => onChange('api_type', v)} />
    <FormField label="מקור API" value={formData.api_source} onChange={(v) => onChange('api_source', v)} />
    <FormField label="פלטפורמת מקור" value={formData.source_platform} onChange={(v) => onChange('source_platform', v)} />
    <FormField label="מזהה אתר" value={formData.website_id} onChange={(v) => onChange('website_id', v)} />
    <FormField label="מזהה Comax" value={formData.comax_id} onChange={(v) => onChange('comax_id', v)} />
    <FormField label="מזהה הזמנת אב" value={formData.parent_mishloha_order_id} onChange={(v) => onChange('parent_mishloha_order_id', v)} />
    <FormField label="מזהה הזמנה משויכת" value={formData.associated_api_order_id} onChange={(v) => onChange('associated_api_order_id', v)} />
    <FormField label="מזהה קצר משויך" value={formData.associated_short_api_order_id} onChange={(v) => onChange('associated_short_api_order_id', v)} />
    <FormField label="סטטוס SMS" value={formData.sms_status} onChange={(v) => onChange('sms_status', v)} />
    <FormField label="קוד SMS" value={formData.sms_code} onChange={(v) => onChange('sms_code', v)} />
    <FormField label="נצפה במעקב" value={formData.tracker_viewed} onChange={(v) => onChange('tracker_viewed', v)} type="checkbox" />
    <div className="md:col-span-2">
      <FormField label="הערת שליח בלקיחה" value={formData.runner_took_comment} onChange={(v) => onChange('runner_took_comment', v)} type="textarea" />
    </div>
    <div className="md:col-span-2">
      <FormField label="הערת שליח במסירה" value={formData.runner_delivered_comment} onChange={(v) => onChange('runner_delivered_comment', v)} type="textarea" />
    </div>
    <FormField label="דירוג לקוח לשליח" value={formData.client_runner_rank} onChange={(v) => onChange('client_runner_rank', v)} type="number" />
    <div className="md:col-span-2">
      <FormField label="הערת לקוח" value={formData.client_remark} onChange={(v) => onChange('client_remark', v)} type="textarea" />
    </div>
    <FormField label="סטטוס פידבק" value={formData.feedback_status} onChange={(v) => onChange('feedback_status', v)} />
    <div className="md:col-span-2">
      <FormField label="תשובה ראשונה" value={formData.feedback_first_answer} onChange={(v) => onChange('feedback_first_answer', v)} type="textarea" />
    </div>
    <div className="md:col-span-2">
      <FormField label="תשובה שנייה" value={formData.feedback_second_answer} onChange={(v) => onChange('feedback_second_answer', v)} type="textarea" />
    </div>
    <div className="md:col-span-2">
      <FormField label="תשובה שלישית" value={formData.feedback_third_answer} onChange={(v) => onChange('feedback_third_answer', v)} type="textarea" />
    </div>
  </div>
);

