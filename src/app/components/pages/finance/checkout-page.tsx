import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CreditCard } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-8 max-w-2xl mx-auto animate-in fade-in text-center">
      <button
        onClick={() => navigate('/business/shipments')}
        className="mb-6 text-slate-500 dark:text-slate-400 hover:text-blue-600 flex items-center justify-center gap-2"
      >
        <ArrowRight className="w-4 h-4" /> חזרה
      </button>
      <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">עמוד תשלום</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          סימולציה של תהליך סליקה מאובטח
        </p>
        <button
          onClick={() => alert('תשלום בוצע בהצלחה!')}
          className="bg-slate-900 dark:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold w-full"
        >
          שלם עכשיו
        </button>
      </div>
    </div>
  );
};