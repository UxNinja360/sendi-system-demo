import React, { useRef, useEffect } from 'react';
import { AlignVerticalSpaceAround, X, Check } from 'lucide-react';

export type RowHeight = 'compact' | 'normal' | 'comfortable';

interface RowHeightOption {
  id: RowHeight;
  label: string;
  description: string;
  height: string;
}

const ROW_HEIGHT_OPTIONS: RowHeightOption[] = [
  { id: 'compact', label: 'קומפקטי', description: 'מקסימום מידע במסך', height: '32px' },
  { id: 'normal', label: 'רגיל', description: 'מאוזן וברור', height: '44px' },
  { id: 'comfortable', label: 'נוח', description: 'מרווח וקל לקריאה', height: '56px' },
];

interface RowHeightSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHeight: RowHeight;
  onHeightChange: (height: RowHeight) => void;
}

export const RowHeightSelector: React.FC<RowHeightSelectorProps> = ({
  isOpen,
  onClose,
  selectedHeight,
  onHeightChange,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="app-safe-side-panel fixed left-0 w-full sm:w-[380px] bg-white dark:bg-app-surface z-50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-300"
        style={{ direction: 'rtl' }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#e5e5e5] dark:border-app-border">
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] rounded-xl text-white">
                <AlignVerticalSpaceAround className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#0d0d12] dark:text-app-text">
                  גובה שורות
                </h3>
                <p className="text-[11px] text-[#a3a3a3] dark:text-[#737373]">
                  התאם את צפיפות התצוגה
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-[#737373]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          {ROW_HEIGHT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onHeightChange(option.id);
                onClose();
              }}
              className={`w-full group relative flex items-center gap-3 p-4 rounded-xl border transition-all ${
                selectedHeight === option.id
                  ? 'bg-[#f5f0ff] dark:bg-[#2e1065] border-[#8b5cf6] dark:border-[#a78bfa] shadow-sm'
                  : 'bg-[#fafafa] dark:bg-app-surface border-[#e5e5e5] dark:border-app-border hover:border-[#8b5cf6]/40 dark:hover:border-[#a78bfa]/40 hover:bg-[#faf5ff] dark:hover:bg-[#2e1065]/20'
              }`}
            >
              {/* Visual representation */}
              <div className="flex flex-col gap-1 shrink-0">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`rounded transition-all ${
                      selectedHeight === option.id
                        ? 'bg-[#8b5cf6] dark:bg-[#a78bfa]'
                        : 'bg-[#d4d4d4] dark:bg-[#404040] group-hover:bg-[#8b5cf6]/40 dark:group-hover:bg-[#a78bfa]/40'
                    }`}
                    style={{
                      width: '40px',
                      height: option.id === 'compact' ? '6px' : option.id === 'normal' ? '10px' : '14px',
                    }}
                  />
                ))}
              </div>

              {/* Text */}
              <div className="flex-1 text-right">
                <div className={`text-sm font-bold ${
                  selectedHeight === option.id
                    ? 'text-[#6d28d9] dark:text-[#c4b5fd]'
                    : 'text-[#0d0d12] dark:text-app-text'
                }`}>
                  {option.label}
                </div>
                <div className="text-xs text-[#a3a3a3] dark:text-[#737373]">
                  {option.description}
                </div>
                <div className="text-[10px] text-[#a3a3a3] dark:text-[#737373] mt-0.5 font-mono">
                  {option.height}
                </div>
              </div>

              {/* Check mark */}
              {selectedHeight === option.id && (
                <div className="absolute top-3 left-3 w-5 h-5 bg-[#8b5cf6] rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Info footer */}
        <div className="border-t border-[#e5e5e5] dark:border-app-border p-4">
          <div className="flex items-start gap-2 p-3 bg-[#f0f9ff] dark:bg-[#082f49] rounded-xl">
            <span className="text-lg shrink-0">💡</span>
            <p className="text-xs text-[#0369a1] dark:text-[#7dd3fc]">
              <strong>טיפ:</strong> גובה שורות קטן יותר מאפשר לראות יותר משלוחים במסך אחד, בעוד שגובה גדול יותר נוח יותר לקריאה.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
