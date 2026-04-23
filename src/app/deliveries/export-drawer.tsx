import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  Bike,
  Store,
  ToggleLeft,
  ToggleRight,
  Table2,
  Layers,
  Eye,
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
  { id: 'timeline', label: 'ציר זמן', emoji: '⏱️', columns: ['creation_time', 'push_time', 'coupled_time', 'started_pickup', 'arrived_at_rest', 'took_it_time', 'started_dropoff', 'arrived_at_client', 'delivered_time'] },
  { id: 'mechanics', label: 'ביצועים', emoji: '📊', columns: ['should_delivered_time', 'max_time_to_deliver', 'min_time_to_suplly', 'max_time_to_suplly', 'minutes_late', 'pickup_deviation', 'dropoff_deviation', 'delay_reason', 'delay_duration', 'delivery_distance', 'duration_to_client', 'eta_after_pickup', 'suplly_status', 'timeRemaining', 'estimatedTime'] },
  { id: 'economy', label: 'כלכלה', emoji: '💰', columns: ['rest_price', 'rest_polygon_price', 'runner_price', 'runner_tip', 'sum_cash', 'price', 'is_cash', 'commissionAmount'] },
  { id: 'meta', label: 'מטא', emoji: '📡', columns: ['api_type', 'api_source', 'source_platform', 'website_id', 'comax_id', 'parent_mishloha_order_id', 'associated_api_order_id', 'associated_short_api_order_id', 'sms_status', 'sms_code', 'tracker_viewed'] },
  { id: 'feedback', label: 'פידבק', emoji: '⭐', columns: ['runner_took_comment', 'runner_delivered_comment', 'client_runner_rank', 'client_remark', 'feedback_status', 'feedback_first_answer', 'feedback_second_answer', 'feedback_third_answer'] },
  { id: 'other', label: 'אחר', emoji: '📝', columns: ['cancelledAt', 'cancelledAfterPickup'] },
];

const COLUMN_LABEL_MAP = new Map(ALL_COLUMNS.map(c => [c.id, c.label]));

// Presets
interface ExportPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  config: Partial<ExportConfig>;
}

const BUILT_IN_PRESETS: ExportPreset[] = [
  {
    id: 'quick-table',
    label: 'טבלה נוכחית',
    emoji: '⚡',
    description: 'Excel עם העמודות המוצגות',
    config: { mode: 'simple', format: 'excel', columnMode: 'visible' },
  },
  {
    id: 'full-report',
    label: 'דוח מלא',
    emoji: '📋',
    description: 'Excel עם כל 130+ עמודות',
    config: { mode: 'simple', format: 'excel', columnMode: 'all' },
  },
  {
    id: 'pdf-print',
    label: 'PDF להדפסה',
    emoji: '🖨️',
    description: 'PDF עם העמודות המוצגות',
    config: { mode: 'simple', format: 'pdf', columnMode: 'visible' },
  },
  {
    id: 'csv-import',
    label: 'CSV לייבוא',
    emoji: '📊',
    description: 'CSV להעברה למערכות אחרות',
    config: { mode: 'simple', format: 'csv', columnMode: 'visible' },
  },
  {
    id: 'courier-report',
    label: 'דוח שליחים',
    emoji: '🚴',
    description: 'ZIP עם קובץ Excel לכל שליח',
    config: { mode: 'grouped', format: 'excel', groupBy: 'courier', columnMode: 'visible' },
  },
  {
    id: 'restaurant-report',
    label: 'דוח מסעדות',
    emoji: '🏪',
    description: 'ZIP עם קובץ Excel לכל מסעדה',
    config: { mode: 'grouped', format: 'excel', groupBy: 'restaurant', columnMode: 'visible' },
  },
];

// Saved templates persistence
const STORAGE_KEY = 'export-drawer-templates';

interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  config: {
    mode: 'simple' | 'grouped';
    format: 'excel' | 'csv' | 'pdf';
    columnMode: 'visible' | 'all' | 'custom';
    customColumns: string[];
    groupBy: 'courier' | 'restaurant';
    summaryFields: string[];
    includeMasterSummary: boolean;
    includeEntitySummary: boolean;
    includeEntityDetail: boolean;
  };
}

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(templates: SavedTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

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
  isEmbedded?: boolean;
}

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
  isEmbedded = false,
}) => {
  // Config state
  const [mode, setMode] = useState<'simple' | 'grouped'>('simple');
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [columnMode, setColumnMode] = useState<'visible' | 'all' | 'custom'>('visible');
  const [customColumns, setCustomColumns] = useState<Set<string>>(new Set(visibleColumns));
  const [groupBy, setGroupBy] = useState<'courier' | 'restaurant'>('courier');
  const [summaryFields, setSummaryFields] = useState<Set<string>>(new Set(DEFAULT_SUMMARY_IDS));
  const [includeMasterSummary, setIncludeMasterSummary] = useState(true);
  const [includeEntitySummary, setIncludeEntitySummary] = useState(true);
  const [includeEntityDetail, setIncludeEntityDetail] = useState(true);

  // UI state
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [columnSearch, setColumnSearch] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(loadTemplates);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
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
      setSavedTemplates(loadTemplates());
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
    setActivePreset(null);
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
    setActivePreset(null);
  }, []);

  const toggleSummaryField = useCallback((id: string) => {
    setSummaryFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setActivePreset(null);
  }, []);

  // Apply a preset
  const applyPreset = useCallback((preset: ExportPreset | SavedTemplate) => {
    const cfg = 'emoji' in preset ? preset.config : {
      mode: preset.config.mode,
      format: preset.config.format,
      columnMode: preset.config.columnMode,
      groupBy: preset.config.groupBy,
      customColumns: new Set(preset.config.customColumns),
      summaryFields: new Set(preset.config.summaryFields),
      includeMasterSummary: preset.config.includeMasterSummary,
      includeEntitySummary: preset.config.includeEntitySummary,
      includeEntityDetail: preset.config.includeEntityDetail,
    };

    if (cfg.mode) setMode(cfg.mode);
    if (cfg.format) setFormat(cfg.format);
    if (cfg.columnMode) setColumnMode(cfg.columnMode);
    if (cfg.groupBy) setGroupBy(cfg.groupBy);
    if ('customColumns' in cfg && cfg.customColumns instanceof Set) {
      setCustomColumns(cfg.customColumns);
    }
    if ('summaryFields' in cfg && cfg.summaryFields instanceof Set) {
      setSummaryFields(cfg.summaryFields);
    }
    if ('includeMasterSummary' in cfg) setIncludeMasterSummary(cfg.includeMasterSummary ?? true);
    if ('includeEntitySummary' in cfg) setIncludeEntitySummary(cfg.includeEntitySummary ?? true);
    if ('includeEntityDetail' in cfg) setIncludeEntityDetail(cfg.includeEntityDetail ?? true);

    setActivePreset(preset.id);
  }, []);

  // Save template
  const handleSaveTemplate = useCallback(() => {
    if (!newTemplateName.trim()) return;
    const tmpl: SavedTemplate = {
      id: `tmpl_${Date.now()}`,
      name: newTemplateName.trim(),
      createdAt: new Date().toISOString(),
      config: {
        mode, format, columnMode, groupBy,
        customColumns: Array.from(customColumns),
        summaryFields: Array.from(summaryFields),
        includeMasterSummary, includeEntitySummary, includeEntityDetail,
      },
    };
    const updated = [...savedTemplates, tmpl];
    setSavedTemplates(updated);
    saveTemplates(updated);
    setNewTemplateName('');
    setShowSaveForm(false);
    setActivePreset(tmpl.id);
    toast.success(`תבנית "${tmpl.name}" נשמרה`);
  }, [newTemplateName, mode, format, columnMode, groupBy, customColumns, summaryFields, includeMasterSummary, includeEntitySummary, includeEntityDetail, savedTemplates]);

  const deleteTemplate = useCallback((id: string) => {
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    saveTemplates(updated);
    if (activePreset === id) setActivePreset(null);
  }, [savedTemplates, activePreset]);

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
    setActivePreset(null);
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
      return `${count} משלוחים · ${cols} עמודות · ${format === 'excel' ? 'Excel' : format === 'csv' ? 'CSV' : 'PDF'}`;
    }
    const entity = groupBy === 'courier' ? `${groupCounts.couriers} שליחים` : `${groupCounts.restaurants} מסעדות`;
    return `${count} משלוחים · ${entity} · ${format === 'excel' ? 'Excel ZIP' : 'PDF'}`;
  }, [mode, format, selectedCount, deliveryCount, exportColumnCount, groupBy, groupCounts]);

  const generalFields = SUMMARY_FIELDS.filter(f => f.category === 'general');
  const financialFields = SUMMARY_FIELDS.filter(f => f.category === 'financial');


  const exportContent = (
    <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-4 space-y-5">

      {/* ① סוג הייצוא — Mode cards with descriptions */}
      <div className="space-y-2">
        <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">סוג הייצוא</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('simple')}
            className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all border ${
              mode === 'simple'
                ? 'bg-[#9fe870]/10 border-[#9fe870]'
                : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] hover:border-[#9fe870]/60'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 ${mode === 'simple' ? 'text-[#5a9a30] dark:text-[#9fe870]' : 'text-[#a3a3a3]'}`} />
            <span className={`text-sm font-semibold ${mode === 'simple' ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#525252] dark:text-[#a3a3a3]'}`}>טבלה פשוטה</span>
            <span className="text-[11px] text-[#a3a3a3]">קובץ Excel אחד</span>
          </button>
          <button
            onClick={() => { setMode('grouped'); if (format === 'csv') setFormat('excel'); }}
            className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all border ${
              mode === 'grouped'
                ? 'bg-[#9fe870]/10 border-[#9fe870]'
                : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] hover:border-[#9fe870]/60'
            }`}
          >
            <Layers className={`w-5 h-5 ${mode === 'grouped' ? 'text-[#5a9a30] dark:text-[#9fe870]' : 'text-[#a3a3a3]'}`} />
            <span className={`text-sm font-semibold ${mode === 'grouped' ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#525252] dark:text-[#a3a3a3]'}`}>דוח מקובץ</span>
            <span className="text-[11px] text-[#a3a3a3]">ZIP לכל שליח/מסעדה</span>
          </button>
        </div>
      </div>

      {/* ③ הגדרות קיבוץ — מופיע רק במצב מקובץ, עם אנימציה */}
      {mode === 'grouped' && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200 p-3.5 bg-[#fafafa] dark:bg-[#141414] rounded-xl border border-[#e5e5e5] dark:border-[#262626]">
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
            <div className="border-t border-[#e5e5e5] dark:border-[#262626] pt-2.5">
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
                    <button onClick={() => setSummaryFields(new Set(ALL_SUMMARY_IDS))} className="text-[11px] text-[#a3a3a3] hover:text-[#9fe870] transition-colors">הכל</button>
                    <button onClick={() => setSummaryFields(new Set(['totalDeliveries', 'deliveredCount', 'totalRevenue', 'profit']))} className="text-[11px] text-[#a3a3a3] hover:text-[#9fe870] transition-colors">מינימום</button>
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
        <div className={`grid gap-1.5 ${mode === 'simple' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button
            onClick={() => setFormat('excel')}
            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border transition-all ${
              format === 'excel'
                ? 'bg-[#9fe870]/10 border-[#9fe870]'
                : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] hover:border-[#9fe870]/60'
            }`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${format === 'excel' ? 'text-[#5a9a30] dark:text-[#9fe870]' : 'text-[#a3a3a3]'}`} />
            <span className={`text-xs font-medium ${format === 'excel' ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#525252] dark:text-[#a3a3a3]'}`}>
              {mode === 'grouped' ? 'Excel ZIP' : 'Excel'}
            </span>
            <span className="text-[10px] text-[#a3a3a3]">עריכה</span>
          </button>
          {mode === 'simple' && (
            <button
              onClick={() => setFormat('csv')}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border transition-all ${
                format === 'csv'
                  ? 'bg-[#9fe870]/10 border-[#9fe870]'
                  : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] hover:border-[#9fe870]/60'
              }`}
            >
              <FileText className={`w-4 h-4 ${format === 'csv' ? 'text-[#5a9a30] dark:text-[#9fe870]' : 'text-[#a3a3a3]'}`} />
              <span className={`text-xs font-medium ${format === 'csv' ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#525252] dark:text-[#a3a3a3]'}`}>CSV</span>
              <span className="text-[10px] text-[#a3a3a3]">ייבוא</span>
            </button>
          )}
          <button
            onClick={() => setFormat('pdf')}
            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border transition-all ${
              format === 'pdf'
                ? 'bg-[#9fe870]/10 border-[#9fe870]'
                : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] hover:border-[#9fe870]/60'
            }`}
          >
            <FileDown className={`w-4 h-4 ${format === 'pdf' ? 'text-[#5a9a30] dark:text-[#9fe870]' : 'text-[#a3a3a3]'}`} />
            <span className={`text-xs font-medium ${format === 'pdf' ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#525252] dark:text-[#a3a3a3]'}`}>PDF</span>
            <span className="text-[10px] text-[#a3a3a3]">הדפסה</span>
          </button>
        </div>
      </div>

      {/* תבניות שמורות — בתחתית, אחרי כל ההגדרות */}
      <div className="space-y-2.5 pt-4 border-t border-[#e5e5e5] dark:border-[#262626]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">תבניות שמורות</span>
          <button
            onClick={() => setShowSaveForm(!showSaveForm)}
            className="text-[11px] text-[#9fe870] hover:text-[#b2ed8d] transition-colors font-medium"
          >
            {showSaveForm ? 'ביטול' : '+ שמור נוכחי'}
          </button>
        </div>
        {showSaveForm && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              placeholder="שם ההגדרה..."
              className="flex-1 px-3 py-1.5 bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#0d0d12] dark:text-[#fafafa] placeholder-[#a3a3a3] outline-none focus:border-[#9fe870] transition-colors"
              autoFocus
            />
            <button onClick={handleSaveTemplate} disabled={!newTemplateName.trim()} className="px-3 py-1.5 bg-[#9fe870] hover:bg-[#b2ed8d] text-[#0d0d12] rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors">שמור</button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {BUILT_IN_PRESETS.map(preset => (
            <button key={preset.id} onClick={() => applyPreset(preset)} title={preset.description}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                activePreset === preset.id
                  ? 'bg-[#9fe870] border-[#9fe870] text-[#0d0d12] shadow-sm'
                  : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:border-[#9fe870]/60 hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
              }`}>
              {preset.emoji} {preset.label}
            </button>
          ))}
        </div>
        {savedTemplates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#f5f5f5] dark:border-[#1a1a1a]">
            {savedTemplates.map(tmpl => (
              <div key={tmpl.id} className="flex items-center gap-0.5">
                <button onClick={() => applyPreset(tmpl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                    activePreset === tmpl.id
                      ? 'bg-[#9fe870] border-[#9fe870] text-[#0d0d12] shadow-sm'
                      : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:border-[#9fe870]/60 hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
                  }`}>
                  ★ {tmpl.name}
                </button>
                <button onClick={() => deleteTemplate(tmpl.id)} className="p-0.5 text-[#d4d4d4] hover:text-[#a3a3a3] dark:text-[#404040] dark:hover:text-[#737373] transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );

  const exportFooter = (
    <div className="shrink-0 border-t border-[#e5e5e5] dark:border-[#262626] px-4 py-3 bg-[#fafafa] dark:bg-[#141414]">
      <button
        onClick={handleExport}
        disabled={!canExport}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-[#0d0d12] bg-[#9fe870] hover:bg-[#b2ed8d] shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        הורד {format === 'excel' ? (mode === 'grouped' ? 'Excel ZIP' : 'Excel') : format === 'csv' ? 'CSV' : 'PDF'}
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
        className={`app-safe-side-panel fixed left-0 w-full sm:w-[420px] bg-white dark:bg-[#0a0a0a] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ direction: 'rtl' }}
      >
        {/* ====== Header ====== */}
        <div className="shrink-0 border-b border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#141414] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-[#0d0d12] dark:text-[#fafafa]" />
              <h3 className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                ייצוא
              </h3>
            </div>
            <button
              onClick={() => handleClose()}
              className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#737373] dark:text-[#a3a3a3]" />
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

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all text-right border ${
        enabled
          ? 'bg-[#9fe870]/10 dark:bg-[#9fe870]/10 border-[#9fe870]/40'
          : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] opacity-60'
      }`}
    >
      {enabled ? (
        <ToggleRight className="w-4 h-4 text-[#9fe870] shrink-0" />
      ) : (
        <ToggleLeft className="w-4 h-4 text-[#a3a3a3] shrink-0" />
      )}
      <span className={`flex-1 ${enabled ? 'text-[#0d0d12] dark:text-[#fafafa] font-medium' : 'text-[#a3a3a3]'}`}>{label}</span>
    </button>
  );
}

function FieldChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
        selected
          ? 'bg-[#9fe870] border-[#9fe870] text-[#0d0d12] shadow-sm'
          : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:border-[#9fe870]/60 hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
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
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        active
          ? 'bg-[#9fe870] border-[#9fe870] text-[#0d0d12] shadow-sm'
          : 'bg-white dark:bg-[#0f0f0f] border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#a3a3a3] hover:border-[#9fe870]/60 hover:text-[#0d0d12] dark:hover:text-[#fafafa]'
      }`}
    >
      {children}
    </button>
  );
}



