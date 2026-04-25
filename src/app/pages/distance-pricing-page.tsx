import React from 'react';
import { Ruler } from 'lucide-react';
import { useDelivery } from '../context/delivery-context-value';
import { ModuleScaffold } from '../components/common/module-scaffold';
import { getDeliveryCustomerCharge, sumDeliveryMoney } from '../utils/delivery-finance';

export const DistancePricingPage: React.FC = () => {
  const { state } = useDelivery();
  const deliveredDeliveries = state.deliveries.filter((delivery) => delivery.status === 'delivered');
  const chargedDeliveries = state.deliveries.filter((delivery) => delivery.status !== 'cancelled' && delivery.status !== 'expired');
  const areas = new Set(state.deliveries.map((delivery) => delivery.area).filter(Boolean));
  const totalCharge = sumDeliveryMoney(chargedDeliveries, getDeliveryCustomerCharge);
  const averageCharge = chargedDeliveries.length > 0 ? Math.round(totalCharge / chargedDeliveries.length) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]" dir="rtl">
      <ModuleScaffold
        icon={<Ruler className="h-5 w-5" />}
        title="תמחור לפי מרחק"
        subtitle="כאן נחבר את כללי החיוב של חברת המשלוחים: מחיר בסיס, תוספת לפי קילומטר, מינימום, חריגות עומס והבדלים בין מסעדות קטנות לרשתות."
        statusLabel="שלד מוצר"
        metrics={[
          {
            label: 'משלוחים לחיוב',
            value: chargedDeliveries.length.toLocaleString('he-IL'),
            helper: 'לא כולל בוטלו ופגי תוקף',
            tone: 'info',
          },
          {
            label: 'חיוב ממוצע',
            value: `₪${averageCharge.toLocaleString('he-IL')}`,
            helper: 'לפי נתוני הדמו הנוכחיים',
            tone: 'success',
          },
          {
            label: 'אזורים עם פעילות',
            value: Math.max(areas.size, 1).toLocaleString('he-IL'),
            helper: 'מבוסס על משלוחים קיימים',
          },
          {
            label: 'נמסרו',
            value: deliveredDeliveries.length.toLocaleString('he-IL'),
            helper: 'בסיס לדוחות חיוב',
          },
        ]}
        sections={[
          {
            title: 'מה יחובר כאן',
            description: 'המסך צריך להיות המקור לכל חישוב כספי של משלוח לפני דוחות וארנק.',
            items: [
              'מחיר בסיס לפי חברת משלוחים, אזור וסוג מסעדה.',
              'תוספת לפי מרחק, זמן חריג או עומס תפעולי.',
              'כללים שונים לרשתות כמו דומינוס ומקדונלדס מול מסעדות פרטיות.',
              'תיעוד שינויי מחיר כדי להבין למה משלוח חויב בצורה מסוימת.',
            ],
          },
          {
            title: 'איך זה ישפיע על המערכת',
            description: 'ברגע שהמודול מחובר, הטבלאות והדוחות לא יציגו “מחיר לקוח” אלא חיוב משלוח אמיתי.',
            items: [
              'עמוד משלוחים יקבל חיוב מחושב ולא ערך ידני.',
              'דוחות יוכלו לסכם הכנסות לפי מסעדה, רשת ואזור.',
              'שיבוץ אוטומטי יוכל לקחת בחשבון כדאיות כלכלית ולא רק זמן.',
            ],
          },
        ]}
        primaryActionLabel="הוסף כלל תמחור"
        primaryActionDisabled
      />
    </div>
  );
};
