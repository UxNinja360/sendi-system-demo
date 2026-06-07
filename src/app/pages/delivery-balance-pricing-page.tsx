import React from 'react';
import { BadgePercent, CheckCircle2, Package, Receipt } from 'lucide-react';

const pricingNotes = [
  {
    icon: <Package className="h-4 w-4" />,
    title: 'יתרה זמינה',
    description: 'כל רכישה מוסיפה מכסת משלוחים לחשבון, והיתרה משמשת את תהליך החיוב והשיבוץ.',
  },
  {
    icon: <BadgePercent className="h-4 w-4" />,
    title: 'מחיר לפי נפח',
    description: 'חבילה גדולה יותר יכולה להוריד את המחיר הממוצע לכל משלוח.',
  },
  {
    icon: <Receipt className="h-4 w-4" />,
    title: 'חשבוניות',
    description: 'לאחר רכישה נשמרת חשבונית עם הכמות, המחיר למשלוח והסכום הכולל.',
  },
];

const pricingSteps = [
  'בוחרים חבילת משלוחים או כמות מותאמת.',
  'אם יש קוד קופון, מפעילים אותו לפני הסיכום.',
  'הסיכום מציג כמות, מחיר למשלוח וסכום לתשלום.',
  'לאחר אישור הרכישה היתרה מתעדכנת ונוצרת חשבונית.',
];

export const DeliveryBalancePricingPage: React.FC = () => {
  return (
    <div className="min-h-full bg-app-background" dir="rtl">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <header className="border-b border-app-border pb-5">
          <div className="inline-flex border border-app-border bg-app-surface px-2.5 py-1 text-xs font-bold text-app-text-secondary">
            עמוד הסבר זמני
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-normal text-app-text">
            תמחור יתרת משלוחים
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-app-text-secondary">
            יתרת משלוחים היא מכסה תפעולית שמאפשרת לחברת המשלוחים לרכוש מראש כמות משלוחים,
            לעקוב אחרי העלות לכל משלוח, ולשמור מסמכי חיוב במקום אחד.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3" aria-label="עיקרי יתרת משלוחים">
          {pricingNotes.map((note) => (
            <article key={note.title} className="border border-app-border bg-app-surface p-4">
              <div className="flex h-9 w-9 items-center justify-center border border-app-border bg-app-background text-app-text-secondary">
                {note.icon}
              </div>
              <h2 className="mt-4 text-sm font-bold text-app-text">{note.title}</h2>
              <p className="mt-2 text-sm leading-6 text-app-text-secondary">{note.description}</p>
            </article>
          ))}
        </section>

        <section className="border border-app-border bg-app-surface p-5">
          <h2 className="text-base font-bold text-app-text">איך הרכישה עובדת</h2>
          <div className="mt-4 grid gap-3">
            {pricingSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 border-b border-app-border pb-3 last:border-b-0 last:pb-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-app-border bg-app-background text-xs font-bold tabular-nums text-app-text">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm leading-6 text-app-text-secondary">{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-app-border bg-app-background p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16a34a] dark:text-[#86efac]" />
            <div>
              <h2 className="text-sm font-bold text-app-text">מה יתחבר בהמשך</h2>
              <p className="mt-2 text-sm leading-6 text-app-text-secondary">
                בהמשך הקישור יכול לעבור לעמוד תמחור חיצוני אמיתי עם תנאי חבילות,
                מדרגות מחיר, מבצעים, ומדיניות חשבוניות. כרגע זהו עמוד הסבר פנימי לדמו.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
