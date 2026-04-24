import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useDelivery } from '../context/delivery-context-value';
import type { Delivery } from '../types/delivery.types';

interface NewDeliveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantOptions: { id: string; label: string }[];
  courierOptions: { id: string; label: string }[];
}

const AREAS = ['תל אביב', 'רמת גן', 'גבעתיים', 'בני ברק', 'חולון', 'בת ים'];

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-[#737373] dark:text-[#a3a3a3] flex items-center gap-1">
      {label}
      {required && <span className="text-[#ef4444]">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm bg-[#f5f5f5] dark:bg-[#141414] text-[#0d0d12] dark:text-[#fafafa] border border-transparent focus:border-[#9fe870]/50 outline-none transition-all placeholder-[#a3a3a3]";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

export const NewDeliveryDialog: React.FC<NewDeliveryDialogProps> = ({
  isOpen, onClose, restaurantOptions, courierOptions,
}) => {
  const { state, dispatch } = useDelivery();

  const [restaurantId, setRestaurantId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('תל אביב');
  const [price, setPrice] = useState('');
  const [courierPayment, setCourierPayment] = useState('');
  const [courierId, setCourierId] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const selectedRestaurantOption = restaurantOptions.find(r => r.id === restaurantId);
  const selectedRestaurant = state.restaurants.find((restaurant) => restaurant.id === restaurantId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !customerName || !address) {
      toast.error('נא למלא את כל השדות החובה');
      return;
    }

    const now = new Date();
    const id = `D${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;
    const preparationTime = selectedRestaurant?.defaultPreparationTime ?? 15;
    const orderReadyTime = new Date(now.getTime() + preparationTime * 60000);

    const newDelivery: Delivery = {
      id,
      orderNumber,
      api_short_order_id: orderNumber.replace('#', ''),
      status: 'pending',

      // Restaurant
      restaurantId,
      restaurantName: selectedRestaurant?.name ?? selectedRestaurantOption?.label ?? '',
      rest_name: selectedRestaurant?.name ?? selectedRestaurantOption?.label ?? '',
      rest_id: restaurantId,
      restaurantAddress: selectedRestaurant?.address ?? '',
      restaurantCity: selectedRestaurant?.city ?? city,
      restaurantStreet: selectedRestaurant?.street ?? '',
      rest_city: selectedRestaurant?.city ?? city,
      rest_street: selectedRestaurant?.street ?? '',

      // Customer
      customerName,
      client_name: customerName,
      customerPhone,
      client_phone: customerPhone,
      address: `${address}, ${city}`,
      client_full_address: `${address}, ${city}`,
      customerCity: city,
      client_city: city,
      customerStreet: address,
      client_street: address,
      customerBuilding: '',
      client_building: '',

      // Pricing
      price: parseFloat(price) || 0,
      sum_cash: parseFloat(price) || 0,
      restaurantPrice: parseFloat(price) || 0,
      rest_price: parseFloat(price) || 0,
      courierPayment: parseFloat(courierPayment) || 0,
      runner_price: parseFloat(courierPayment) || 0,
      commissionAmount: 0,

      // Courier
      courierId: courierId || null,
      runner_id: courierId || null,
      courierName: courierOptions.find(c => c.id === courierId)?.label,
      courierRating: undefined,

      // Timeline
      createdAt: now,
      creation_time: now,
      assignedAt: null,
      coupled_time: null,
      pickedUpAt: null,
      took_it_time: null,
      deliveredAt: null,
      delivered_time: null,
      arrivedAtRestaurantAt: null,
      arrived_at_rest: null,
      arrivedAtCustomerAt: null,
      arrived_at_client: null,
      cancelledAt: null,

      // Estimates
      estimatedTime: 30,
      estimatedArrivalAtRestaurant: new Date(now.getTime() + 10 * 60000),
      estimatedArrivalAtCustomer: new Date(now.getTime() + (preparationTime + 15) * 60000),
      orderReadyTime,

      // Mechanics
      preparationTime,
      cook_time: preparationTime,
      origin_cook_time: preparationTime,
      maxDeliveryTime: 45,
      max_time_to_deliver: 45,
      orderPriority: 1,
      priority: 1,
      cancelledAfterPickup: false,
      reportedOrderIsReady: false,

      // Notes
      deliveryNotes: notes,
      comment: notes,
      orderNotes: '',
      client_comment: '',

      // Meta
      branchName: '',
      branch_id: '',
      customerRating: undefined,
      client_runner_rank: undefined,
      customerFeedback: '',
      client_remark: '',
      customerFeedbackQuestion1: '',
      feedback_first_answer: '',
      customerFeedbackQuestion2: '',
      feedback_second_answer: '',
      customerFeedbackQuestion3: '',
      feedback_third_answer: '',
      courierEmploymentType: undefined,
    } as unknown as Delivery;

    dispatch({ type: 'ADD_DELIVERY', payload: newDelivery });
    toast.success(`משלוח ${orderNumber} נוצר בהצלחה`);
    handleClose();
  };

  const handleClose = () => {
    setRestaurantId(''); setCustomerName(''); setCustomerPhone('');
    setAddress(''); setCity('תל אביב'); setPrice('');
    setCourierPayment(''); setCourierId(''); setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#1f1f1f] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9fe870]/15 flex items-center justify-center">
              <Package className="w-4 h-4 text-[#6bc84a]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">משלוח חדש</h2>
              <p className="text-[11px] text-[#a3a3a3]">מלא את פרטי המשלוח</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Restaurant */}
            <Field label="מסעדה" required>
              <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)} className={selectCls} style={{ direction: 'rtl' }} required>
                <option value="">בחר מסעדה...</option>
                {restaurantOptions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              {selectedRestaurant && (
                <p className="text-[11px] text-[#737373] dark:text-[#a3a3a3] pt-1">
                  זמן הכנה ברירת מחדל למסעדה: {selectedRestaurant.defaultPreparationTime} דקות
                </p>
              )}
            </Field>

            {/* Customer */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="שם לקוח" required>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} className={inputCls} placeholder="ישראל ישראלי" required style={{ direction: 'rtl' }} />
              </Field>
              <Field label="טלפון">
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={inputCls} placeholder="050-0000000" type="tel" style={{ direction: 'ltr' }} />
              </Field>
            </div>

            {/* Address */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="כתובת" required>
                  <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="רחוב ומספר בית" required style={{ direction: 'rtl' }} />
                </Field>
              </div>
              <Field label="עיר">
                <select value={city} onChange={e => setCity(e.target.value)} className={selectCls} style={{ direction: 'rtl' }}>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="מחיר ללקוח (₪)">
                <input value={price} onChange={e => setPrice(e.target.value)} className={inputCls} placeholder="0" type="number" min="0" step="0.5" style={{ direction: 'ltr' }} />
              </Field>
              <Field label="תשלום לשליח (₪)">
                <input value={courierPayment} onChange={e => setCourierPayment(e.target.value)} className={inputCls} placeholder="0" type="number" min="0" step="0.5" style={{ direction: 'ltr' }} />
              </Field>
            </div>

            {/* Courier (optional) */}
            <Field label="שליח (אופציונלי)">
              <select value={courierId} onChange={e => setCourierId(e.target.value)} className={selectCls} style={{ direction: 'rtl' }}>
                <option value="">שיבוץ אוטומטי</option>
                {courierOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>

            {/* Notes */}
            <Field label="הערות">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} resize-none`} placeholder="הערות למשלוח..." rows={2} style={{ direction: 'rtl' }} />
            </Field>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#f0f0f0] dark:border-[#1f1f1f]">
          <button type="button" onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#737373] dark:text-[#a3a3a3] bg-[#f5f5f5] dark:bg-[#141414] hover:bg-[#e5e5e5] dark:hover:bg-[#1f1f1f] transition-colors">
            ביטול
          </button>
          <button
            onClick={handleSubmit as any}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0d0d12] bg-[#9fe870] hover:bg-[#8dd960] transition-colors"
          >
            צור משלוח
          </button>
        </div>
      </div>
    </div>
  );
};

