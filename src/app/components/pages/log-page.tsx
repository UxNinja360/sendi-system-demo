import React from 'react';
import { Trash2, Activity } from 'lucide-react';
import { useDelivery } from '../../context/delivery.context';

const categoryLabels = {
  navigation: 'ניווט',
  system: 'מערכת',
  delivery: 'משלוחים',
  courier: 'שליחים',
  restaurant: 'מסעדות',
  settings: 'הגדרות',
  shift: 'משמרות',
  general: 'כללי',
} as const;

const categoryClasses = {
  navigation: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  system: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  delivery: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  courier: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  restaurant: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  settings: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  shift: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  general: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20',
} as const;

export const LogPage: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const visibleLogs = state.activityLogs.filter(entry => entry.category !== 'navigation');

  return (
    <div className="min-h-full bg-[#111111] text-[#fafafa]">
      <div className="border-b border-[#262626] bg-[#171717] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f2f2f] bg-[#1d1d1d]">
              <Activity className="h-5 w-5 text-[#9fe870]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">LOG</h1>
              <p className="text-sm text-[#a3a3a3]">יומן פעולות המשתמש במערכת</p>
            </div>
          </div>

          <button
            onClick={() => dispatch({ type: 'CLEAR_ACTIVITY_LOGS' })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#3a3a3a] bg-[#202020] px-4 py-2 text-sm font-medium text-[#fafafa] transition-colors hover:border-[#525252] hover:bg-[#262626]"
          >
            <Trash2 className="h-4 w-4" />
            נקה לוג
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {visibleLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2f2f2f] bg-[#171717] px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d1d1d]">
              <Activity className="h-5 w-5 text-[#737373]" />
            </div>
            <h2 className="text-lg font-semibold text-[#fafafa]">עדיין אין פעולות מתועדות</h2>
            <p className="mt-2 text-sm text-[#a3a3a3]">כשתתחיל לעבוד במערכת, הפעולות המרכזיות יופיעו כאן.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleLogs.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-[#262626] bg-[#171717] px-5 py-4 transition-colors hover:border-[#333333]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryClasses[entry.category]}`}
                      >
                        {categoryLabels[entry.category]}
                      </span>
                      <span className="text-xs text-[#737373]">{entry.actionType}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[#fafafa]">{entry.title}</h3>
                    {entry.description ? (
                      <p className="mt-1 text-sm text-[#a3a3a3]">{entry.description}</p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-left">
                    <div className="text-sm font-semibold text-[#fafafa]">
                      {entry.timestamp.toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className="mt-1 text-xs text-[#737373]">
                      {entry.timestamp.toLocaleDateString('he-IL')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
