import React from 'react';
import { Clock } from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';
import { ModuleScaffold } from '../components/common/module-scaffold';

export const OperatingHoursPage: React.FC = () => {
  const { state } = useDelivery();
  const todayKey = new Date().toISOString().slice(0, 10);
  const activeRestaurants = state.restaurants.filter((restaurant) => restaurant.isActive).length;
  const activeCouriers = state.couriers.filter((courier) => courier.status !== 'offline').length;
  const todayShifts = state.shifts.filter((shift) => shift.date === todayKey).length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <ModuleScaffold
        icon={<Clock className="h-5 w-5" />}
        title="שעות פעילות"
        subtitle="כאן נגדיר מתי חברת המשלוחים מקבלת משלוחים, מה קורה מחוץ לשעות פעילות, ואיך חריגים משפיעים על מסעדות, שליחים ורשתות."
        statusLabel={state.isSystemOpen ? 'קבלת משלוחים פתוחה' : 'קבלת משלוחים סגורה'}
        statusTone={state.isSystemOpen ? 'connected' : 'warning'}
        metrics={[
          {
            label: 'מצב מערכת',
            value: state.isSystemOpen ? 'פתוח' : 'סגור',
            helper: 'לפי מתג קבלת משלוחים',
            tone: state.isSystemOpen ? 'success' : 'warning',
          },
          {
            label: 'מסעדות פעילות',
            value: activeRestaurants.toLocaleString('he-IL'),
            helper: `מתוך ${state.restaurants.length.toLocaleString('he-IL')}`,
          },
          {
            label: 'שליחים מחוברים',
            value: activeCouriers.toLocaleString('he-IL'),
            helper: 'זמינים או במהלך עבודה',
            tone: activeCouriers > 0 ? 'success' : 'warning',
          },
          {
            label: 'משמרות היום',
            value: todayShifts.toLocaleString('he-IL'),
            helper: 'לפי לוח המשמרות',
            tone: 'info',
          },
        ]}
        sections={[
          {
            title: 'כללי פעילות שצריך לחבר',
            description: 'המודול הזה צריך להחליט מתי משלוח חדש יכול להיכנס למערכת.',
            items: [
              'שעות פעילות לפי חברת משלוחים ואזור.',
              'חריגים לפי יום, חג, מזג אוויר או עומס.',
              'סגירה אוטומטית כאשר אין שליחים במשמרת.',
              'הבדל בין מסעדות רגילות לבין רשתות עם SLA קשיח.',
            ],
          },
          {
            title: 'השפעה על לייב ושיבוץ',
            description: 'ברגע שזה מחובר, המערכת תדע למנוע כאוס לפני שהוא נכנס ללייב.',
            items: [
              'לייב יציג למה קבלת משלוחים סגורה או מוגבלת.',
              'מסעדות לא ייצרו משלוחים אם החברה לא זמינה באזור.',
              'דוחות יראו שעות שבהן פספסנו ביקוש בגלל חוסר שליחים.',
            ],
          },
        ]}
        primaryActionLabel="הוסף כלל פעילות"
        primaryActionDisabled
      />
    </div>
  );
};
