import React from 'react';
import { Activity, Trash2 } from 'lucide-react';
import { PageToolbar } from '../components/common/page-toolbar';
import { useDelivery } from '../context/delivery-context-value';

const TEXT = {
  title: '\u05d9\u05d5\u05de\u05df\u0020\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea',
  clear: '\u05e0\u05e7\u05d4\u0020\u05dc\u05d5\u05d2',
  summarySuffix: '\u0020\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd\u0020\u05de\u05ea\u05d5\u05e2\u05d3\u05d9\u05dd',
  emptyTitle: '\u05e2\u05d3\u05d9\u05d9\u05df\u0020\u05d0\u05d9\u05df\u0020\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea\u0020\u05de\u05ea\u05d5\u05e2\u05d3\u05d5\u05ea',
  emptyDescription:
    '\u05db\u05e9\u05ea\u05ea\u05d7\u05d9\u05dc\u0020\u05dc\u05e2\u05d1\u05d5\u05d3\u0020\u05d1\u05de\u05e2\u05e8\u05db\u05ea\u002c\u0020\u05d4\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea\u0020\u05d4\u05de\u05e8\u05db\u05d6\u05d9\u05d5\u05ea\u0020\u05d9\u05d5\u05e4\u05d9\u05e2\u05d5\u0020\u05db\u05d0\u05df\u002e',
  categories: {
    navigation: '\u05e0\u05d9\u05d5\u05d5\u05d8',
    system: '\u05de\u05e2\u05e8\u05db\u05ea',
    delivery: '\u05de\u05e9\u05dc\u05d5\u05d7\u05d9\u05dd',
    courier: '\u05e9\u05dc\u05d9\u05d7\u05d9\u05dd',
    restaurant: '\u05de\u05e1\u05e2\u05d3\u05d5\u05ea',
    settings: '\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea',
    shift: '\u05de\u05e9\u05de\u05e8\u05d5\u05ea',
    general: '\u05db\u05dc\u05dc\u05d9',
  },
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
  const visibleLogs = state.activityLogs.filter(
    (entry) => entry.category !== 'navigation',
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111111] text-[#fafafa]">
      <PageToolbar
        headerActions={
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_ACTIVITY_LOGS' })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-2 text-sm font-medium text-[#0d0d12] transition-colors hover:bg-[#ececec] dark:border-[#2a2a2a] dark:bg-[#101010] dark:text-[#fafafa] dark:hover:bg-[#171717]"
          >
            <Trash2 className="h-4 w-4" />
            <span>{TEXT.clear}</span>
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
        {visibleLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2f2f2f] bg-[#171717] px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d1d1d]">
              <Activity className="h-5 w-5 text-[#737373]" />
            </div>
            <h2 className="text-lg font-semibold text-[#fafafa]">
              {TEXT.emptyTitle}
            </h2>
            <p className="mt-2 text-sm text-[#a3a3a3]">
              {TEXT.emptyDescription}
            </p>
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
                        {TEXT.categories[entry.category]}
                      </span>
                      <span className="text-xs text-[#737373]">
                        {entry.actionType}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[#fafafa]">
                      {entry.title}
                    </h3>
                    {entry.description ? (
                      <p className="mt-1 text-sm text-[#a3a3a3]">
                        {entry.description}
                      </p>
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
