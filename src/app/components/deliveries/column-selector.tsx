import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Columns, X, Check, Search, ChevronDown } from 'lucide-react';
import { DEFAULT_VISIBLE_COLUMNS } from './status-config';

interface ColumnSelectorProps {
  visibleColumns: Set<string>;
  setVisibleColumns: (columns: Set<string>) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isEmbedded?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  categories?: ColumnCategory[];
  defaultVisibleColumns?: string[];
  title?: string;
  description?: string;
  presetsKey?: string;
  allowPresets?: boolean;
}

interface ColumnCategory {
  id: string;
  label: string;
  emoji?: string;
  columns: Array<{ id: string; label: string }>;
}

export const COLUMN_CATEGORIES: ColumnCategory[] = [
  {
    id: 'core', label: 'ליבה', emoji: '⚙️',
    columns: [
      { id: 'orderNumber', label: 'מספר הזמנה' },
      { id: 'status', label: 'סטטוס' },
      { id: 'priority', label: 'עדיפות' },
      { id: 'pack_num', label: 'מספר חבילות' },
      { id: 'comment', label: 'הערת מערכת' },
      { id: 'coupled_by', label: 'שויך על ידי' },
    ],
  },
  {
    id: 'restaurant', label: 'מסעדה', emoji: '🏪',
    columns: [
      { id: 'rest_name', label: 'שם מסעדה' },
      { id: 'restaurant_chain_id', label: 'מזהה רשת' },
      { id: 'rest_city', label: 'עיר מסעדה' },
      { id: 'rest_street', label: 'רחוב מסעדה' },
      { id: 'rest_building', label: 'בניין מסעדה' },
      { id: 'restaurantAddress', label: 'כתובת מסעדה מלאה' },
      { id: 'pickup_coords', label: 'נ.צ מסעדה' },
      { id: 'cook_time', label: 'זמן הכנה' },
    ],
  },
  {
    id: 'customer', label: 'לקוח', emoji: '🎯',
    columns: [
      { id: 'client_name', label: 'שם לקוח' },
      { id: 'client_phone', label: 'טלפון לקוח' },
      { id: 'client_full_address', label: 'כתובת לקוח מלאה' },
      { id: 'client_city', label: 'עיר לקוח' },
      { id: 'client_street', label: 'רחוב לקוח' },
      { id: 'client_building', label: 'בניין לקוח' },
      { id: 'client_entry', label: 'כניסה' },
      { id: 'client_floor', label: 'קומה' },
      { id: 'client_apartment', label: 'דירה' },
      { id: 'zipcode', label: 'מיקוד' },
      { id: 'dropoff_coords', label: 'נ.צ לקוח' },
      { id: 'client_comment', label: 'הערת לקוח' },
      { id: 'client_agree_to_place', label: 'לקוח הסכים להניח' },
    ],
  },
  {
    id: 'courier', label: 'שליח', emoji: '🚴',
    columns: [
      { id: 'courier', label: 'שם שליח' },
      { id: 'vehicle_type', label: 'סוג רכב' },
      { id: 'runner_assigning_coords', label: 'נ.צ שיוך' },
      { id: 'courierEmploymentType', label: 'שיטת העסקה' },
      { id: 'courierRating', label: 'דירוג שליח' },
    ],
  },
  {
    id: 'timeline', label: 'ציר זמן', emoji: '⏱️',
    columns: [
      { id: 'creation_time', label: 'זמן יצירה' },
      { id: 'coupled_time', label: 'זמן שיוך לשליח' },
      { id: 'started_pickup', label: 'התחיל איסוף' },
      { id: 'arrived_at_rest', label: 'הגעה למסעדה' },
      { id: 'took_it_time', label: 'זמן איסוף' },
      { id: 'started_dropoff', label: 'התחיל מסירה' },
      { id: 'arrived_at_client', label: 'הגעה ללקוח' },
      { id: 'delivered_time', label: 'זמן מסירה' },
    ],
  },
  {
    id: 'mechanics', label: 'ביצועים', emoji: '📊',
    columns: [
      { id: 'should_delivered_time', label: 'זמן יעד למסירה' },
      { id: 'max_time_to_deliver', label: 'זמן מקסימלי למשלוח (דקות)' },
      { id: 'minutes_late', label: 'דקות איחור' },
      { id: 'pickup_deviation', label: 'סטיית איסוף (דקות)' },
      { id: 'dropoff_deviation', label: 'סטיית מסירה (דקות)' },
      { id: 'delay_reason', label: 'סיבת עיכוב' },
      { id: 'delay_duration', label: 'משך עיכוב (דקות)' },
      { id: 'delivery_distance', label: 'מרחק משלוח (ק"מ)' },
      { id: 'timeRemaining', label: 'זמן עד למסירה' },
    ],
  },
  {
    id: 'economy', label: 'כלכלה', emoji: '💰',
    columns: [
      { id: 'rest_price', label: 'מחיר מסעדה' },
      { id: 'rest_polygon_price', label: 'מחיר פוליגון מסעדה' },
      { id: 'runner_price', label: 'תשלום לשליח' },
      { id: 'runner_tip', label: 'טיפ לשליח' },
      { id: 'sum_cash', label: 'סכום מזומן' },
      { id: 'price', label: 'מחיר ללקוח' },
      { id: 'is_cash', label: 'תשלום במזומן' },
      { id: 'commissionAmount', label: 'עמלה' },
    ],
  },
  {
    id: 'meta', label: 'מטא', emoji: '📡',
    columns: [
      { id: 'api_type', label: 'סוג API' },
      { id: 'api_source', label: 'מקור API' },
      { id: 'source_platform', label: 'פלטפורמת מקור' },
      { id: 'website_id', label: 'מזהה אתר' },
      { id: 'comax_id', label: 'מזהה Comax' },
      { id: 'parent_mishloha_order_id', label: 'מזהה הזמנה אב' },
      { id: 'associated_api_order_id', label: 'מזהה הזמנה משויך (API)' },
      { id: 'associated_short_api_order_id', label: 'מזהה קצר משויך (API)' },
      { id: 'sms_status', label: 'סטטוס SMS' },
      { id: 'sms_code', label: 'קוד SMS' },
      { id: 'tracker_viewed', label: 'מעקב נצפה' },
    ],
  },
  {
    id: 'feedback', label: 'פידבק', emoji: '⭐',
    columns: [
      { id: 'runner_took_comment', label: 'הערת שליח באיסוף' },
      { id: 'runner_delivered_comment', label: 'הערת שליח במסירה' },
      { id: 'client_runner_rank', label: 'דירוג שליח מהלקוח' },
      { id: 'client_remark', label: 'הערת לקוח' },
      { id: 'feedback_status', label: 'סטטוס פידבק' },
      { id: 'feedback_first_answer', label: 'תשובה פידבק 1' },
      { id: 'feedback_second_answer', label: 'תשובה פידבק 2' },
      { id: 'feedback_third_answer', label: 'תשובה פידבק 3' },
    ],
  },
  {
    id: 'advanced', label: 'מתקדם', emoji: '🧩',
    columns: [
      { id: 'id', label: 'מזהה סנדי' },
      { id: 'rest_id', label: 'מזהה מסעדה' },
      { id: 'branch_id', label: 'מזהה סניף' },
      { id: 'client_id', label: 'מזהה לקוח' },
      { id: 'runner_id', label: 'מזהה שליח' },
      { id: 'pending_runner_id', label: 'שליח ממתין' },
      { id: 'shift_runner_id', label: 'שליח במשמרת' },
      { id: 'arrived_at_rest_runner_id', label: 'שליח שהגיע למסעדה' },
      { id: 'is_orbit_start', label: 'התחלת מסלול' },
      { id: 'area', label: 'אזור' },
      { id: 'area_id', label: 'מזהה אזור' },
      { id: 'delivery_area_id', label: 'מזהה אזור משלוח' },
      { id: 'main_polygon_name', label: 'שם פוליגון ראשי' },
      { id: 'push_time', label: 'זמן דחיפה' },
      { id: 'min_time_to_suplly', label: 'זמן מינימלי לאספקה (דקות)' },
      { id: 'max_time_to_suplly', label: 'זמן מקסימלי לאספקה (דקות)' },
      { id: 'algo_runner', label: 'שויך באלגוריתם' },
      { id: 'suplly_status', label: 'סטטוס אספקה' },
      { id: 'duration_to_client', label: 'משך זמן ללקוח (דקות)' },
      { id: 'eta_after_pickup', label: 'ETA אחרי איסוף (דקות)' },
      { id: 'estimatedTime', label: 'זמן משוער' },
      { id: 'branchName', label: 'שם סניף' },
      { id: 'cook_type', label: 'סוג הכנה' },
      { id: 'order_ready', label: 'ההזמנה מוכנה' },
      { id: 'wrong_address', label: 'כתובת שגויה' },
      { id: 'dropoff_latitude', label: 'קואורדינטת מסירה - רוחב' },
      { id: 'dropoff_longitude', label: 'קואורדינטת מסירה - אורך' },
      { id: 'signature_url', label: 'חתימה' },
      { id: 'rest_approve', label: 'המסעדה אישרה' },
      { id: 'rest_waits_for_cook_time', label: 'מסעדה מחכה לזמן הכנה' },
      { id: 'reported_order_is_ready', label: 'דווח שההזמנה מוכנה' },
      { id: 'rest_last_eta', label: 'ETA אחרון מהמסעדה' },
      { id: 'rest_approved_eta', label: 'ETA מאושר מהמסעדה' },
      { id: 'pickup_latitude', label: 'קואורדינטת איסוף - רוחב' },
      { id: 'pickup_longitude', label: 'קואורדינטת איסוף - אורך' },
      { id: 'api_short_order_id', label: 'מזהה API קצר' },
      { id: 'api_str_order_id', label: 'מזהה API ארוך' },
      { id: 'is_api', label: 'הזמנה מ-API' },
      { id: 'is_started', label: 'התחיל משלוח' },
      { id: 'is_approved', label: 'אושר' },
      { id: 'is_requires_approval', label: 'דורש אישור' },
      { id: 'close_order', label: 'הזמנה סגורה' },
      { id: 'is_drinks_exist', label: 'יש משקאות' },
      { id: 'is_sauces_exist', label: 'יש רטבים' },
      { id: 'cancelledAt', label: 'זמן ביטול' },
      { id: 'cancelledAfterPickup', label: 'בוטל אחרי איסוף' },
    ],
  },
];

interface SavedColumnPreset {
  id: string;
  name: string;
  columns: string[];
  createdAt: number;
}

const PRESETS_KEY = 'column_presets_v1';
function loadColumnPresets(): SavedColumnPreset[] {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]'); } catch { return []; }
}
function saveColumnPresets(presets: SavedColumnPreset[], storageKey: string = PRESETS_KEY) {
  localStorage.setItem(storageKey, JSON.stringify(presets));
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  visibleColumns,
  setVisibleColumns,
  isOpen,
  setIsOpen,
  isEmbedded = false,
  searchQuery: externalSearchQuery,
  onSearchChange,
  categories = COLUMN_CATEGORIES,
  defaultVisibleColumns = DEFAULT_VISIBLE_COLUMNS,
  title = 'עמודות',
  description = 'בחר אילו פרטים יופיעו בטבלת המשלוחים',
  presetsKey = PRESETS_KEY,
  allowPresets = true,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchChange ?? setInternalSearchQuery;

  // Accordion: expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(['core']));

  const [savedPresets, setSavedPresets] = useState<SavedColumnPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem(presetsKey) ?? '[]'); } catch { return []; }
  });
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    try {
      setSavedPresets(JSON.parse(localStorage.getItem(presetsKey) ?? '[]'));
    } catch {
      setSavedPresets([]);
    }
  }, [presetsKey]);

  useEffect(() => { if (isOpen) setIsAnimating(true); }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 300);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  const toggleExpanded = useCallback((catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    const newSet = new Set(visibleColumns);
    let label = columnId;
    for (const cat of categories) {
      const col = cat.columns.find(c => c.id === columnId);
      if (col) { label = col.label; break; }
    }
    if (newSet.has(columnId)) {
      if (newSet.size <= 1) return;
      newSet.delete(columnId);
    } else {
      newSet.add(columnId);
    }
    setVisibleColumns(newSet);
  }, [visibleColumns, setVisibleColumns]);

  const toggleAllInCategory = useCallback((cat: ColumnCategory) => {
    const allSelected = cat.columns.every(c => visibleColumns.has(c.id));
    const newSet = new Set(visibleColumns);
    if (allSelected) {
      cat.columns.forEach(c => { if (newSet.size > 1) newSet.delete(c.id); });
    } else {
      cat.columns.forEach(c => newSet.add(c.id));
    }
    setVisibleColumns(newSet);
  }, [visibleColumns, setVisibleColumns]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) handleClose();
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, handleClose]);

  // Column row (single-line, full width)
  const ColumnRow = ({ col }: { col: { id: string; label: string } }) => {
    const isSelected = visibleColumns.has(col.id);
    return (
      <button
        key={col.id}
        onClick={() => toggleColumn(col.id)}
        className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-right transition-all ${
          isSelected
            ? 'bg-transparent text-[#fafafa]'
            : 'hover:bg-[#131313] text-[#6b7280] hover:text-[#e5e7eb]'
        }`}
      >
        <div className={`w-4 h-4 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-[#9fe870] border-[#9fe870]'
            : 'border-[#3a3a3a] bg-[#111111] group-hover:border-[#525252]'
        }`}>
          {isSelected && <Check className="w-2.5 h-2.5 text-[#0d0d12]" />}
        </div>
        <span className={`flex-1 text-[13px] text-right transition-colors ${
          isSelected ? 'text-[#fafafa]' : 'text-[#d4d4d8] group-hover:text-[#fafafa]'
        }`}>{col.label}</span>
      </button>
    );
  };

  const contentAndFooter = (
    <>
      {/* Search */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[#222222] bg-[#111111]">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
          <input
            type="text"
            placeholder="חפש עמודה..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-9 py-3 bg-[#0b0b0b] border border-[#2a2a2a] rounded-xl text-sm text-[#fafafa] placeholder:text-[#6b7280] outline-none focus:ring-2 focus:ring-[#9fe870]/15 focus:border-[#3a5327] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-lg hover:bg-[#171717] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#737373] hover:text-[#d4d4d4]" />
            </button>
          )}
        </div>
      </div>

      {/* Top action bar */}
      <div className="shrink-0 border-b border-[#222222] bg-[#101010]">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-[#9ca3af]">
            <span className="font-medium">עמודות פעילות</span>
            <span className="inline-flex min-w-[28px] items-center justify-center rounded-full border border-[#2d3b21] px-2 py-0.5 font-semibold text-[#9fe870]">
              {visibleColumns.size}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVisibleColumns(new Set(defaultVisibleColumns))}
              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-[#e5e7eb] hover:text-[#fafafa] transition-colors"
            >
              ברירת מחדל
            </button>
            {allowPresets && (
              <>
                <span className="h-3.5 w-px bg-[#2a2a2a]" />
                <button
                  onClick={() => { setShowSaveForm(v => !v); setNewPresetName(''); }}
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-[#9fe870] hover:text-[#b5f27d] transition-colors"
                >
                  + שמור פריסט
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {searchQuery.trim() ? (
          // Search mode: flat list
          <div className="p-3">
            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const matches = categories.flatMap(cat =>
                cat.columns.filter(col => col.label.toLowerCase().includes(q) || col.id.toLowerCase().includes(q))
              );
              if (matches.length === 0) {
                return <p className="text-xs text-[#a3a3a3] text-center py-8">לא נמצאו עמודות</p>;
              }
              return <div className="space-y-1">{matches.map(col => <ColumnRow key={col.id} col={col} />)}</div>;
            })()}
          </div>
        ) : (
          // Accordion mode
          <div>
            {categories.map(cat => {
              const selected = cat.columns.filter(c => visibleColumns.has(c.id)).length;
              const allSelected = selected === cat.columns.length;
              const isExpanded = expandedCategories.has(cat.id);
              return (
                <div key={cat.id} className="border-b border-[#1f1f1f] last:border-b-0">
                  {/* Category header */}
                  <button
                    onClick={() => toggleExpanded(cat.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#131313] transition-colors text-right"
                  >
                    {cat.emoji && <span className="text-sm shrink-0 opacity-90">{cat.emoji}</span>}
                    <span className="flex-1 text-sm font-semibold tracking-tight text-[#fafafa]">{cat.label}</span>
                    {selected > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-transparent text-[#9fe870] shrink-0">
                        {selected}/{cat.columns.length}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6b7280] shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Columns */}
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      {/* Select all row */}
                      <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                        <span className="text-[11px] text-[#6b7280]">{selected} מתוך {cat.columns.length} נבחרו</span>
                        <button
                          onClick={e => { e.stopPropagation(); toggleAllInCategory(cat); }}
                          className="text-[11px] font-medium text-[#9ca3af] hover:text-[#9fe870] transition-colors"
                        >
                          {allSelected ? 'הסר הכל' : 'בחר הכל'}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {cat.columns.map(col => <ColumnRow key={col.id} col={col} />)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#222222] bg-[#111111]">
        {/* Presets section */}
        {allowPresets && savedPresets.length > 0 && (
          <div className="px-4 py-3 border-b border-[#222222]">
            <p className="text-[11px] font-semibold text-[#6b7280] mb-2">פריסטים שמורים</p>
            <div className="space-y-1.5">
              {savedPresets.map(preset => (
                <div key={preset.id} className="flex items-center gap-1.5">
                  <button
                    onClick={() => setVisibleColumns(new Set(preset.columns))}
                    className="flex-1 text-right text-xs px-3 py-2 rounded-xl bg-[#161616] border border-[#262626] text-[#fafafa] hover:border-[#3a5327] transition-colors truncate"
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={() => {
                      const next = savedPresets.filter(p => p.id !== preset.id);
                      setSavedPresets(next);
                      saveColumnPresets(next, presetsKey);
                    }}
                    className="p-1 text-[#d4d4d4] hover:text-[#a3a3a3] dark:text-[#404040] dark:hover:text-[#737373] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save form */}
        {allowPresets && showSaveForm && (
          <div className="px-4 py-3 border-b border-[#222222]">
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="שם הפריסט..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && newPresetName.trim()) {
                    const preset: SavedColumnPreset = {
                      id: Date.now().toString(),
                      name: newPresetName.trim(),
                      columns: Array.from(visibleColumns),
                      createdAt: Date.now(),
                    };
                    const next = [...savedPresets, preset];
                    setSavedPresets(next);
                    saveColumnPresets(next, presetsKey);
                    setNewPresetName('');
                    setShowSaveForm(false);
                  }
                  if (e.key === 'Escape') { setShowSaveForm(false); setNewPresetName(''); }
                }}
                className="flex-1 text-xs px-3 py-2 bg-[#161616] border border-[#262626] rounded-xl text-[#fafafa] placeholder-[#6b7280] outline-none focus:border-[#3a5327]"
                style={{ direction: 'rtl' }}
              />
              <button
                onClick={() => {
                  if (newPresetName.trim()) {
                    const preset: SavedColumnPreset = {
                      id: Date.now().toString(),
                      name: newPresetName.trim(),
                      columns: Array.from(visibleColumns),
                      createdAt: Date.now(),
                    };
                    const next = [...savedPresets, preset];
                    setSavedPresets(next);
                    saveColumnPresets(next, presetsKey);
                    setNewPresetName('');
                    setShowSaveForm(false);
                  }
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-[#9fe870] text-[#0d0d12] hover:bg-[#8dd960] transition-colors"
              >
                שמור
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (isEmbedded) {
    return <div className="flex flex-col flex-1 min-h-0">{contentAndFooter}</div>;
  }

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed top-[64px] left-0 h-[calc(100vh-64px)] w-full sm:w-[460px] bg-[#0f0f0f] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
        isAnimating ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ direction: 'rtl' }}
    >
      <div className="shrink-0 border-b border-[#222222] bg-[#101010] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#262626] bg-[#151515]">
              <Columns className="w-4 h-4 text-[#9fe870]" />
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-[#fafafa]">{title}</h3>
              <p className="text-[11px] text-[#6b7280]">{description}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-[#171717] rounded-xl transition-colors">
            <X className="w-4 h-4 text-[#737373]" />
          </button>
        </div>
      </div>
      {contentAndFooter}
    </div>
  );
};
