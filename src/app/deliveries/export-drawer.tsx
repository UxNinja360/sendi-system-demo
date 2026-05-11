import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileDown,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Bike,
  Store,
  ToggleLeft,
  ToggleRight,
  Table2,
  Layers,
  Eye,
  Columns3,
} from 'lucide-react';
import { ALL_COLUMNS } from './column-defs';
import {
  ALL_SUMMARY_IDS,
  DEFAULT_SUMMARY_IDS,
  SUMMARY_FIELDS,
  type ExportConfig,
} from './export-config';
import { toast } from 'sonner';

// Column categories (same as column-selector)
const COLUMN_CATEGORIES = [
  { id: 'core', label: 'ליבה', emoji: '⚙️', columns: ['id', 'api_short_order_id', 'api_str_order_id', 'orderNumber', 'status', 'priority', 'is_api', 'is_started', 'is_approved', 'is_requires_approval', 'close_order', 'comment', 'pack_num'] },
  { id: 'restaurant', label: 'מסעדה', emoji: '🏪', columns: ['rest_id', 'branch_id', 'rest_name', 'branchName', 'rest_city', 'rest_street', 'rest_building', 'restaurantAddress', 'pickup_latitude', 'pickup_longitude', 'cook_type', 'cook_time', 'order_ready', 'reported_order_is_ready', 'rest_approve', 'rest_waits_for_cook_time', 'rest_last_eta', 'rest_approved_eta', 'is_drinks_exist', 'is_sauces_exist'] },
  { id: 'customer', label: 'לקוח', emoji: '🎯', columns: ['client_id', 'client_name', 'client_phone', 'client_full_address', 'client_city', 'client_street', 'client_building', 'client_entry', 'client_floor', 'client_apartment', 'zipcode', 'dropoff_latitude', 'dropoff_longitude', 'client_comment', 'wrong_address', 'client_agree_to_place', 'signature_url'] },
  { id: 'courier', label: 'שליח', emoji: '🚴', columns: ['runner_id', 'courier', 'pending_runner_id', 'shift_runner_id', 'arrived_at_rest_runner_id', 'vehicle_type', 'algo_runner', 'coupled_by', 'runner_assigning_coords', 'is_orbit_start', 'area', 'area_id', 'delivery_area_id', 'main_polygon_name', 'courierEmploymentType', 'courierRating'] },
  { id: 'timeline', label: 'ציר זמן', emoji: '⏱️', columns: ['creation_time', 'offerExpiresAt', 'deliveryCreditConsumedAt', 'push_time', 'coupled_time', 'started_pickup', 'arrived_at_rest', 'took_it_time', 'started_dropoff', 'arrived_at_client', 'delivered_time'] },
  { id: 'mechanics', label: 'ביצועים', emoji: '📊', columns: ['should_delivered_time', 'max_time_to_deliver', 'min_time_to_suplly', 'max_time_to_suplly', 'minutes_late', 'pickup_deviation', 'dropoff_deviation', 'delay_reason', 'delay_duration', 'delivery_distance', 'duration_to_client', 'eta_after_pickup', 'suplly_status', 'timeRemaining', 'estimatedTime'] },
  { id: 'economy', label: 'כלכלה', emoji: '💰', columns: ['rest_price', 'rest_polygon_price', 'runner_price', 'runner_tip', 'sum_cash', 'price', 'is_cash', 'commissionAmount'] },
  { id: 'meta', label: 'מטא', emoji: '📡', columns: ['api_type', 'api_source', 'source_platform', 'website_id', 'comax_id', 'parent_mishloha_order_id', 'associated_api_order_id', 'associated_short_api_order_id', 'sms_status', 'sms_code', 'tracker_viewed'] },
  { id: 'feedback', label: 'פידבק', emoji: '⭐', columns: ['runner_took_comment', 'runner_delivered_comment', 'client_runner_rank', 'client_remark', 'feedback_status', 'feedback_first_answer', 'feedback_second_answer', 'feedback_third_answer'] },
  { id: 'other', label: 'אחר', emoji: '📝', columns: ['cancelledAt', 'cancelledAfterPickup'] },
];

const COLUMN_LABEL_MAP = new Map(ALL_COLUMNS.map(c => [c.id, c.label]));

// ═══════════════════════════════════════
// Props
// ═══════════════════════════════════════

interface ExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  visibleColumns: Set<string>;
  deliveryCount: number;
  selectedCount: number;
  groupCounts: { couriers: number; restaurants: number };
  scopeItems?: ExportScopeItem[];
  isEmbedded?: boolean;
}

export type ExportScopeItem = {
  id: string;
  label: string;
  value: string;
  tone?: 'default' | 'strong' | 'muted';
};

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

export const ExportDrawer: React.FC<ExportDrawerProps> = ({
  isOpen,
  onClose,
  onExport,
  visibleColumns,
  deliveryCount,
  selectedCount,
  groupCounts,
  scopeItems = [],
  isEmbedded = false,
}) => {
  // Config state
  const [mode, setMode] = useState<'simple' | 'grouped'>('simple');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [columnMode, setColumnMode] = useState<'visible' | 'all' | 'custom'>('visible');
  const [customColumns, setCustomColumns] = useState<Set<string>>(new Set(visibleColumns));
  const [groupBy, setGroupBy] = useState<'courier' | 'restaurant'>('courier');
  const [summaryFields, setSummaryFields] = useState<Set<string>>(new Set(DEFAULT_SUMMARY_IDS));
  const [includeMasterSummary, setIncludeMasterSummary] = useState(true);
  const [includeEntitySummary, setIncludeEntitySummary] = useState(true);
  const [includeEntityDetail, setIncludeEntityDetail] = useState(true);

  // UI state
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [columnSearch, setColumnSearch] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Close handler with animation
  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Sync customColumns with visibleColumns when opening
  useEffect(() => {
    if (isOpen) {
      setCustomColumns(new Set(visibleColumns));
    }
  }, [isOpen, visibleColumns]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, handleClose]);

  // Column count for display
  const exportColumnCount = useMemo(() => {
    if (columnMode === 'visible') return visibleColumns.size;
    if (columnMode === 'all') return ALL_COLUMNS.length;
    return customColumns.size;
  }, [columnMode, visibleColumns, customColumns]);

  // Filtered column categories
  const filteredCategories = useMemo(() => {
    const q = columnSearch.trim().toLowerCase();
    if (!q) return COLUMN_CATEGORIES;
    return COLUMN_CATEGORIES.map(cat => ({
      ...cat,
      columns: cat.columns.filter(colId => {
        const label = COLUMN_LABEL_MAP.get(colId) || colId;
        return label.includes(q) || colId.toLowerCase().includes(q);
      }),
    })).filter(cat => cat.columns.length > 0);
  }, [columnSearch]);

  const toggleCustomColumn = useCallback((colId: string) => {
    setCustomColumns(prev => {
      const next = new Set(prev);
      if (next.has(colId)) { if (next.size > 1) next.delete(colId); }
      else next.add(colId);
      return next;
    });
  }, []);

  const toggleCategoryColumns = useCallback((catColumns: string[]) => {
    setCustomColumns(prev => {
      const next = new Set(prev);
      const allSelected = catColumns.every(c => next.has(c));
      if (allSelected) {
        catColumns.forEach(c => { if (next.size > 1) next.delete(c); });
      } else {
        catColumns.forEach(c => next.add(c));
      }
      return next;
    });
  }, []);

  const toggleSummaryField = useCallback((id: string) => {
    setSummaryFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setMode('simple');
    setFormat('excel');
    setColumnMode('visible');
    setCustomColumns(new Set(visibleColumns));
    setGroupBy('courier');
    setSummaryFields(new Set(DEFAULT_SUMMARY_IDS));
    setIncludeMasterSummary(true);
    setIncludeEntitySummary(true);
    setIncludeEntityDetail(true);
    setExpandedSection(null);
    setColumnSearch('');
  }, [visibleColumns]);

  // Export
  const handleExport = useCallback(() => {
    onExport({
      mode, format, columnMode, customColumns, groupBy,
      summaryFields, includeMasterSummary, includeEntitySummary, includeEntityDetail,
    });
    handleClose();
  }, [mode, format, columnMode, customColumns, groupBy, summaryFields, includeMasterSummary, includeEntitySummary, includeEntityDetail, onExport, handleClose]);

  // Validation
  const canExport = mode === 'simple' || (includeEntitySummary || includeEntityDetail || includeMasterSummary);

  // Summary for footer
  const exportSummary = useMemo(() => {
    const count = selectedCount > 0 ? selectedCount : deliveryCount;
    const cols = exportColumnCount;
    if (mode === 'simple') {
      return `${count} משלוחים · ${cols} עמודות · ${format === 'excel' ? 'Excel' : 'PDF'}`;
    }
    const entity = groupBy === 'courier' ? `${groupCounts.couriers} שליחים` : `${groupCounts.restaurants} מסעדות`;
    return `${count} משלוחים · ${entity} · ${format === 'excel' ? 'Excel ZIP' : 'PDF'}`;
  }, [mode, format, selectedCount, deliveryCount, exportColumnCount, groupBy, groupCounts]);

  const columnScopeLabel = useMemo(() => {
    if (columnMode === 'visible') return `${visibleColumns.size.toLocaleString('he-IL')} מוצגות`;
    if (columnMode === 'all') return `כל העמודות (${ALL_COLUMNS.length.toLocaleString('he-IL')})`;
    return `${customColumns.size.toLocaleString('he-IL')} בבחירה`;
  }, [columnMode, customColumns.size, visibleColumns.size]);

  const normalizedScopeItems = useMemo<ExportScopeItem[]>(() => {
    if (scopeItems.length > 0) {
      return scopeItems.map((item) =>
        item.id === 'columns' ? { ...item, value: columnScopeLabel } : item,
      );
    }

    return [
      {
        id: 'deliveries',
        label: 'משלוחים',
        value: `${(selectedCount > 0 ? selectedCount : deliveryCount).toLocaleString('he-IL')} משלוחים`,
        tone: 'strong',
      },
      {
        id: 'columns',
        label: 'עמודות',
        value: columnScopeLabel,
      },
    ];
  }, [columnScopeLabel, deliveryCount, scopeItems, selectedCount]);

  const generalFields = SUMMARY_FIELDS.filter(f => f.category === 'general');
  const financialFields = SUMMARY_FIELDS.filter(f => f.category === 'financial');


  const exportContent = (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3.5 py-3.5">

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[#a3a3a3]">מה מיוצא</span>
          <span className="rounded-full border border-app-border bg-app-background px-2 py-0.5 text-[10px] text-app-text-secondary">
            {selectedCount > 0 ? 'בחירה ידנית' : 'הסינון הנוכחי'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {normalizedScopeItems.map((item) => (
            <ScopeItem key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* ① סוג הייצוא — Mode cards with descriptions */}
      <div className="space-y-2">
        <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">סוג הייצוא</span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setMode('simple')}
            className={`flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-[8px] border px-3 py-3 transition-all ${
              mode === 'simple'
                ? 'bg-app-brand-subtle border-app-brand'
                : 'bg-white dark:bg-app-surface border-[#e5e5e5] dark:border-app-border hover:border-app-brand'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 ${mode === 'simple' ? 'text-app-brand' : 'text-[#a3a3a3]'}`} />
            <span className={`text-sm font-semibold ${mode === 'simple' ? 'text-[#0d0d12] dark:text-app-text' : 'text-[#525252] dark:text-app-text-secondary'}`}>טבלה פשוטה</span>
            <span className="text-[11px] text-[#a3a3a3]">קובץ Excel אחד</span>
          </button>
          <button
            onClick={() => setMode('grouped')}
            className={`flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-[8px] border px-3 py-3 transition-all ${
              mode === 'grouped'
                ? 'bg-app-brand-subtle border-app-brand'
                : 'bg-white dark:bg-app-surface border-[#e5e5e5] dark:border-app-border hover:border-app-brand'
            }`}
          >
            <Layers className={`w-5 h-5 ${mode === 'grouped' ? 'text-app-brand' : 'text-[#a3a3a3]'}`} />
            <span className={`text-sm font-semibold ${mode === 'grouped' ? 'text-[#0d0d12] dark:text-app-text' : 'text-[#525252] dark:text-app-text-secondary'}`}>דוח מקובץ</span>
            <span className="text-[11px] text-[#a3a3a3]">ZIP לכל שליח/מסעדה</span>
          </button>
        </div>
      </div>

      {/* ③ הגדרות קיבוץ — מופיע רק במצב מקובץ, עם אנימציה */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[#a3a3a3]">עמודות</span>
          <span className="text-[11px] tabular-nums text-app-text-secondary">
            {exportColumnCount.toLocaleString('he-IL')} עמודות
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <ColumnModeButton
            active={columnMode === 'visible'}
            icon={<Eye className="h-3.5 w-3.5" />}
            label="מוצגות"
            onClick={() => setColumnMode('visible')}
          />
          <ColumnModeButton
            active={columnMode === 'all'}
            icon={<Columns3 className="h-3.5 w-3.5" />}
            label="הכל"
            onClick={() => setColumnMode('all')}
          />
          <ColumnModeButton
            active={columnMode === 'custom'}
            icon={<Table2 className="h-3.5 w-3.5" />}
            label="בחירה"
            onClick={() => setColumnMode('custom')}
          />
        </div>

        {columnMode === 'custom' && (
          <div className="animate-in rounded-[8px] border border-app-border bg-app-background p-2.5 duration-150 slide-in-from-top-1">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-muted" />
              <input
                ref={searchRef}
                value={columnSearch}
                onChange={(event) => setColumnSearch(event.target.value)}
                placeholder="חפש עמודה..."
                className="h-8 w-full rounded-[6px] border border-app-border bg-app-surface px-8 text-xs text-app-text outline-none transition-colors placeholder:text-app-text-muted focus:border-app-brand"
              />
            </div>
            <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-0.5">
              {filteredCategories.map((category) => {
                const selectedInCategory = category.columns.filter((columnId) => customColumns.has(columnId)).length;
                return (
                  <div key={category.id} className="rounded-[7px] border border-app-border bg-app-surface p-2">
                    <button
                      type="button"
                      onClick={() => toggleCategoryColumns(category.columns)}
                      className="mb-1.5 flex w-full items-center justify-between text-right"
                    >
                      <span className="text-xs font-medium text-app-text">{category.label}</span>
                      <span className="text-[10px] tabular-nums text-app-text-muted">
                        {selectedInCategory}/{category.columns.length}
                      </span>
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {category.columns.map((columnId) => (
                        <FieldChip
                          key={columnId}
                          label={COLUMN_LABEL_MAP.get(columnId) || columnId}
                          selected={customColumns.has(columnId)}
                          onClick={() => toggleCustomColumn(columnId)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {mode === 'grouped' && (
        <div className="animate-in space-y-3 rounded-[8px] border border-[#e5e5e5] bg-[#fafafa] p-3.5 duration-200 slide-in-from-top-2 dark:border-app-border dark:bg-app-surface">
          <OptionRow label="קיבוץ לפי">
            <OptionBtn active={groupBy === 'courier'} onClick={() => setGroupBy('courier')}>
              שליח <span className="opacity-60 mr-0.5">({groupCounts.couriers})</span>
            </OptionBtn>
            <OptionBtn active={groupBy === 'restaurant'} onClick={() => setGroupBy('restaurant')}>
              מסעדה <span className="opacity-60 mr-0.5">({groupCounts.restaurants})</span>
            </OptionBtn>
          </OptionRow>
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">כלול בדוח</span>
            <div className="space-y-1 mt-1">
              <ToggleRow label="סיכום כללי" enabled={includeMasterSummary} onToggle={() => setIncludeMasterSummary(p => !p)} />
              <ToggleRow label={`סיכום לכל ${groupBy === 'courier' ? 'שליח' : 'מסעדה'}`} enabled={includeEntitySummary} onToggle={() => setIncludeEntitySummary(p => !p)} />
              <ToggleRow label="פירוט משלוחים" enabled={includeEntityDetail} onToggle={() => setIncludeEntityDetail(p => !p)} />
              {!includeEntitySummary && !includeEntityDetail && !includeMasterSummary && (
                <p className="text-[10px] text-[#dc2626] pt-0.5">יש לבחור לפחות אחד</p>
              )}
            </div>
          </div>
          {/* שדות סיכום — accordion מתקפל */}
          {(includeEntitySummary || includeMasterSummary) && (
            <div className="border-t border-[#e5e5e5] dark:border-app-border pt-2.5">
              <button
                onClick={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
                className="w-full flex items-center justify-between text-[11px] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] transition-colors"
              >
                <span className="uppercase tracking-wide font-medium">שדות סיכום</span>
                <div className="flex items-center gap-1.5">
                  <span className="tabular-nums">{summaryFields.size}/{SUMMARY_FIELDS.length}</span>
                  {expandedSection === 'summary' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </button>
              {expandedSection === 'summary' && (
                <div className="mt-2.5 space-y-2 animate-in slide-in-from-top-1 duration-150">
                  <div className="flex gap-2">
                    <button onClick={() => setSummaryFields(new Set(ALL_SUMMARY_IDS))} className="text-[11px] text-[#a3a3a3] hover:text-app-brand transition-colors">הכל</button>
                    <button onClick={() => setSummaryFields(new Set(['totalDeliveries', 'deliveredCount', 'totalRevenue', 'profit']))} className="text-[11px] text-[#a3a3a3] hover:text-app-brand transition-colors">מינימום</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUMMARY_FIELDS.map(field => <FieldChip key={field.id} label={field.label} selected={summaryFields.has(field.id)} onClick={() => toggleSummaryField(field.id)} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ④ פורמט */}
      <div className="space-y-2">
        <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">פורמט</span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setFormat('excel')}
            className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-[8px] border px-2 py-2.5 transition-all ${
              format === 'excel'
                ? 'bg-app-brand-subtle border-app-brand'
                : 'bg-white dark:bg-app-surface border-[#e5e5e5] dark:border-app-border hover:border-app-brand'
            }`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${format === 'excel' ? 'text-app-brand' : 'text-[#a3a3a3]'}`} />
            <span className={`text-xs font-medium ${format === 'excel' ? 'text-[#0d0d12] dark:text-app-text' : 'text-[#525252] dark:text-app-text-secondary'}`}>
              {mode === 'grouped' ? 'Excel ZIP' : 'Excel'}
            </span>
            <span className="text-[10px] text-[#a3a3a3]">עריכה</span>
          </button>
          <button
            onClick={() => setFormat('pdf')}
            className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-[8px] border px-2 py-2.5 transition-all ${
              format === 'pdf'
                ? 'bg-app-brand-subtle border-app-brand'
                : 'bg-white dark:bg-app-surface border-[#e5e5e5] dark:border-app-border hover:border-app-brand'
            }`}
          >
            <FileDown className={`w-4 h-4 ${format === 'pdf' ? 'text-app-brand' : 'text-[#a3a3a3]'}`} />
            <span className={`text-xs font-medium ${format === 'pdf' ? 'text-[#0d0d12] dark:text-app-text' : 'text-[#525252] dark:text-app-text-secondary'}`}>PDF</span>
            <span className="text-[10px] text-[#a3a3a3]">הדפסה</span>
          </button>
        </div>
      </div>

    </div>
  );

  const exportFooter = (
    <div className="shrink-0 border-t border-[#e5e5e5] bg-app-surface px-3.5 py-3 dark:border-app-border">
      <button
        onClick={handleExport}
        disabled={!canExport}
        className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-app-brand-solid py-2.5 text-sm font-semibold text-app-background shadow-sm transition-all hover:bg-app-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download className="w-4 h-4" />
        הורד {format === 'excel' ? (mode === 'grouped' ? 'Excel ZIP' : 'Excel') : 'PDF'}
      </button>
      <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] text-[#a3a3a3]">
        <span className="tabular-nums">{(selectedCount > 0 ? selectedCount : deliveryCount).toLocaleString()} משלוחים</span>
        <span className="text-[#d4d4d4] dark:text-[#404040]">·</span>
        <span className="tabular-nums">{exportColumnCount} עמודות</span>
        {mode === 'grouped' && <>
          <span className="text-[#d4d4d4] dark:text-[#404040]">·</span>
          <span className="tabular-nums">{groupBy === 'courier' ? groupCounts.couriers : groupCounts.restaurants} {groupBy === 'courier' ? 'שליחים' : 'מסעדות'}</span>
        </>}
      </div>
      <button onClick={handleReset} className="w-full mt-1 text-center text-[11px] text-[#d4d4d4] dark:text-[#404040] hover:text-[#a3a3a3] dark:hover:text-[#737373] transition-colors py-1">
        איפוס הגדרות
      </button>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {exportContent}
        {exportFooter}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - removed to allow background scrolling */}

      {/* Slide-out Panel */}
      <div
        ref={panelRef}
        className={`app-safe-side-panel fixed left-0 w-full sm:w-[420px] bg-white dark:bg-app-surface shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ direction: 'rtl' }}
      >
        {/* ====== Header ====== */}
        <div className="shrink-0 border-b border-app-border bg-app-surface-raised px-4 py-3 dark:bg-app-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-app-text" />
              <h3 className="text-sm font-semibold text-app-text">
                ייצוא
              </h3>
            </div>
            <button
              onClick={() => handleClose()}
              className="p-1.5 hover:bg-app-interactive-hover rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-app-text-secondary" />
            </button>
          </div>

          </div>
      {exportContent}
      {exportFooter}
    </div>
  </>
  );
};

// ══════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════

function ScopeItem({ item }: { item: ExportScopeItem }) {
  const valueClass =
    item.tone === 'strong'
      ? 'text-app-text'
      : item.tone === 'muted'
        ? 'text-app-text-muted'
        : 'text-app-text-secondary';

  return (
    <div className="min-w-0 rounded-[8px] border border-app-border bg-app-background px-2.5 py-2">
      <div className="text-[10px] font-medium text-app-text-muted">{item.label}</div>
      <div className={`mt-0.5 truncate text-xs font-medium ${valueClass}`} title={item.value}>
        {item.value}
      </div>
    </div>
  );
}

function ColumnModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-[7px] border px-2 text-xs font-medium transition-all ${
        active
          ? 'border-app-brand bg-app-brand-subtle text-app-text'
          : 'border-app-border bg-app-surface text-app-text-secondary hover:border-app-brand hover:text-app-text'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2 rounded-[8px] border px-3 py-2 text-right text-[11px] transition-all ${
        enabled
          ? 'bg-app-brand-subtle dark:bg-app-brand-subtle border-app-brand'
          : 'bg-white dark:bg-app-surface border-[#e5e5e5] dark:border-app-border opacity-60'
      }`}
    >
      {enabled ? (
        <ToggleRight className="w-4 h-4 text-app-brand shrink-0" />
      ) : (
        <ToggleLeft className="w-4 h-4 text-[#a3a3a3] shrink-0" />
      )}
      <span className={`flex-1 ${enabled ? 'text-[#0d0d12] dark:text-app-text font-medium' : 'text-[#a3a3a3]'}`}>{label}</span>
    </button>
  );
}

function FieldChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-[10px] font-medium transition-all ${
        selected
          ? 'bg-app-brand-solid border-app-brand-solid text-app-background shadow-sm'
          : 'bg-white dark:bg-app-surface border-[#e5e5e5] dark:border-app-border text-[#525252] dark:text-app-text-secondary hover:border-app-brand hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
      }`}
    >
      {selected && <Check className="w-2.5 h-2.5" />}
      {label}
    </button>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[6px] border px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? 'bg-app-brand-solid border-app-brand-solid text-app-background shadow-sm'
          : 'bg-white dark:bg-app-surface border-[#e5e5e5] dark:border-app-border text-[#525252] dark:text-app-text-secondary hover:border-app-brand hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
      }`}
    >
      {children}
    </button>
  );
}



