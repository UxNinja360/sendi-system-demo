import React from 'react';
import { Calendar, CheckCircle2, FileText, Building2 } from 'lucide-react';

export const PayoutsPage: React.FC = () => {
  const currentMonth = 'ינואר 2026';
  const balance = 15430;
  const nextPaymentDate = '10/02/2026';
  const breakdown = [
    { label: 'משלוחים שבוצעו (450)', amount: 13500 },
    { label: 'תוספות מרחק', amount: 1200 },
    { label: 'בונוסים ותמריצים', amount: 730 },
    { label: 'קיזוזים / ביטולים', amount: 0 },
  ];
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(val);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>

        <p className="text-gray-500 dark:text-slate-400 text-sm">
          סיכום הפעילות הכספית לחודש {currentMonth}
        </p>
      </div>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-blue-900 dark:to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
        <div className="flex flex-col md:flex-row justify-between items-center relative z-10">
          <div>
            <p className="text-slate-400 font-medium mb-1">סכום לתשלום (משוער)</p>
            <div className="text-5xl font-bold tracking-tight mb-2">
              {formatCurrency(balance)}
            </div>
            <div className="inline-flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50 backdrop-blur-sm">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">תאריך העברה קרוב: {nextPaymentDate}</span>
            </div>
          </div>
          <div className="mt-6 md:mt-0 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="text-center">
              <div className="text-xs text-slate-300 uppercase tracking-wider mb-1">סטטוס</div>
              <div className="font-bold text-emerald-400 flex items-center gap-1 justify-center">
                <CheckCircle2 className="w-4 h-4" />
                פעיל וצובר
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">פירוט מרכיבי התשלום</h3>
          <div className="space-y-4">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-slate-700/50 last:border-0"
              >
                <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
            <div className="pt-4 mt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                סה"כ לתשלום
              </span>
              <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
            <div className="bg-blue-100 dark:bg-blue-900/50 w-10 h-10 rounded-full flex items-center justify-center text-blue-600 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">דוח מפורט</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              הורד גיליון אקסל עם פירוט כל המשלוחים שנכללים בחישוב זה.
            </p>
            <button className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              הורד דוח חודשי &larr;
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-white mb-3">פרטי חשבון בנק</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              התשלום יועבר לחשבון המוגדר במערכת:
            </p>
            <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded shadow-sm">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-sm">
                <div className="font-bold dark:text-white">בנק הפועלים (12)</div>
                <div className="text-xs text-gray-500">סניף 650 • ח-ן 123456</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
