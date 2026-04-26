import React from 'react';
import { useDelivery } from '../context/delivery-context-value';

const TEXT = {
  title: '\u05d9\u05d5\u05de\u05df\u0020\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea',
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

type LogCategory = keyof typeof TEXT.categories;

const categoryStyles: Record<LogCategory, { dot: string; label: string }> = {
  navigation: { dot: 'bg-[#71717a]', label: 'text-[#a1a1aa]' },
  system: { dot: 'bg-[#22c55e]', label: 'text-[#86efac]' },
  delivery: { dot: 'bg-[#facc15]', label: 'text-[#fde047]' },
  courier: { dot: 'bg-[#38bdf8]', label: 'text-[#7dd3fc]' },
  restaurant: { dot: 'bg-[#fb923c]', label: 'text-[#fdba74]' },
  settings: { dot: 'bg-[#a78bfa]', label: 'text-[#c4b5fd]' },
  shift: { dot: 'bg-[#f472b6]', label: 'text-[#f9a8d4]' },
  general: { dot: 'bg-[#a3a3a3]', label: 'text-[#d4d4d4]' },
};

export const LogPage: React.FC = () => {
  const { state } = useDelivery();
  const visibleLogs = state.activityLogs.filter(
    (entry) => entry.category !== 'navigation',
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0a0a0a] font-mono text-[#fafafa]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#242424] px-4 py-2 text-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-[#737373]" dir="ltr">
          <div className="truncate">
            <span className="text-[#fafafa]">sendi-log&gt;</span>{' '}
            {visibleLogs.length.toLocaleString('he-IL')} entries
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {visibleLogs.length === 0 ? (
          <div className="px-4 py-3 text-xs leading-6 text-[#737373]" dir="ltr">
            <span className="text-[#fafafa]">sendi-log&gt;</span>{' '}
            <span dir="rtl">{TEXT.emptyTitle}</span>
          </div>
        ) : (
          <ol className="text-xs leading-5">
            {visibleLogs.map((entry) => {
              const style = categoryStyles[entry.category];

              return (
                <li
                  key={entry.id}
                  className="grid grid-cols-1 gap-1 border-b border-[#202020] px-4 py-2 text-[#d4d4d4] transition-colors hover:bg-white/[0.025] md:grid-cols-[1rem_8.5rem_15rem_minmax(0,1fr)] md:items-baseline md:gap-3"
                  dir="ltr"
                >
                  <span className="hidden items-center gap-2 text-[#525252] md:flex">
                    <span>&gt;</span>
                    <span className={`h-1.5 w-1.5 shrink-0 ${style.dot}`} />
                  </span>
                  <time className="text-[#fafafa]">
                    {entry.timestamp.toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                    <span className="ms-2 text-[#737373]">
                      {entry.timestamp.toLocaleDateString('he-IL')}
                    </span>
                  </time>
                  <span className="min-w-0 truncate text-[#737373]">
                    <span className={style.label}>[{TEXT.categories[entry.category]}]</span>{' '}
                    {entry.actionType}
                  </span>
                  <span className="min-w-0 truncate text-[#fafafa]" dir="rtl">
                    {entry.title}
                    {entry.description ? (
                      <span className="text-[#a3a3a3]"> :: {entry.description}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};
