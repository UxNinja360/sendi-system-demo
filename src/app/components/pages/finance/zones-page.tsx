import React, { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';

interface Zone {
  id: number;
  name: string;
  active: boolean;
  priceMod: number;
  cities: string;
}

export const ZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([
    {
      id: 1,
      name: 'גוש דן',
      active: true,
      priceMod: 0,
      cities: 'תל אביב, רמת גן, גבעתיים, בני ברק',
    },
    {
      id: 2,
      name: 'שרון',
      active: true,
      priceMod: 15,
      cities: 'הרצליה, כפר סבא, רעננה, נתניה',
    },
    {
      id: 3,
      name: 'שפלה',
      active: false,
      priceMod: 20,
      cities: 'ראשון לציון, רחובות, נס ציונה',
    },
    {
      id: 4,
      name: 'ירושלים והסביבה',
      active: false,
      priceMod: 45,
      cities: 'ירושלים, מבשרת ציון, מעלה אדומים',
    },
  ]);

  const toggleZone = (id: number) =>
    setZones(zones.map((z) => (z.id === id ? { ...z, active: !z.active } : z)));

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>

          <p className="text-gray-500 dark:text-slate-400 text-sm">
            ניהול האזורים אליהם העסק מבצע משלוחים
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> הוסף אזור
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`bg-white dark:bg-slate-800 rounded-2xl border p-6 transition-all ${
              zone.active
                ? 'border-blue-200 dark:border-blue-900/50 shadow-sm'
                : 'border-gray-100 dark:border-slate-700 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    zone.active
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{zone.name}</h3>
              </div>
              <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  checked={zone.active}
                  onChange={() => toggleZone(zone.id)}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300"
                />
                <label
                  className={`toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
                    zone.active ? 'bg-blue-600' : ''
                  }`}
                ></label>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  ערים כלולות
                </span>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {zone.cities}
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-slate-400">תוספת מחיר</span>
                <span className="font-bold text-slate-800 dark:text-white">+{zone.priceMod} ₪</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
