import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, FileText, Download } from 'lucide-react';

const invoices = [
  { id: 1, date: '15/02/2026', number: 'INV-2026-001', desc: 'רכישת 500 משלוחים', amount: 1500, status: 'שולם' },
  { id: 2, date: '10/02/2026', number: 'INV-2026-002', desc: 'רכישת 1000 משלוחים', amount: 2800, status: 'שולם' },
  { id: 3, date: '05/02/2026', number: 'INV-2026-003', desc: 'רכישת 250 משלוחים', amount: 800, status: 'שולם' },
  { id: 4, date: '01/02/2026', number: 'INV-2026-004', desc: 'רכישת 100 משלוחים', amount: 350, status: 'שולם' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
};

export const InvoicesHistory: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in">
      <button
        onClick={() => navigate('/business/shipments')}
        className="mb-6 text-slate-500 dark:text-slate-400 hover:text-blue-600 flex items-center gap-2"
      >
        <ArrowRight className="w-4 h-4" /> חזרה לכספים
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                היסטוריית רכישות
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                צפייה והורדה של חשבוניות מס עבור רכישות יתרה
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">תאריך</th>
                <th className="px-6 py-4">מספר חשבונית</th>
                <th className="px-6 py-4">תיאור</th>
                <th className="px-6 py-4">סכום</th>
                <th className="px-6 py-4">סטטוס</th>
                <th className="px-6 py-4">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm text-slate-700 dark:text-slate-300">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <td className="px-6 py-4 font-medium">{inv.date}</td>
                  <td className="px-6 py-4 font-mono text-gray-500 dark:text-slate-400">
                    {inv.number}
                  </td>
                  <td className="px-6 py-4">{inv.desc}</td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(inv.amount)}</td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full text-xs font-semibold">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-all font-medium">
                      <Download className="w-4 h-4" />
                      הורד
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};