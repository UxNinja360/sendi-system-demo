import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Bike,
  Store,
  ChevronDown,
  ChevronUp,
  Check,
  Download,
  RotateCcw,
  FolderArchive,
  ToggleLeft,
  ToggleRight,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Pencil,
  Plus,
  Zap,
  Star,
} from 'lucide-react';
import { ALL_COLUMNS } from './column-defs';
import { toast } from 'sonner';

// ═══════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════

export interface SummaryField {
  id: string;
  label: string;
  category: 'general' | 'financial';
  defaultEnabled: boolean;
}

export const SUMMARY_FIELDS: SummaryField[] = [
  { id: 'totalDeliveries', label: 'סה״כ משלוחים', category: 'general', defaultEnabled: true },
  { id: 'deliveredCount', label: 'נמסרו', category: 'general', defaultEnabled: true },
  { id: 'cancelledCount', label: 'בוטלו', category: 'general', defaultEnabled: true },
  { id: 'successRate', label: 'אחוז הצלחה', category: 'general', defaultEnabled: true },
  { id: 'avgTime', label: 'זמן ממצע (דק׳)', category: 'general', defaultEnabled: true },
  { id: 'totalRevenue', label: 'הכנסות', category: 'financial', defaultEnabled: true },
  { id: 'totalRestPrice', label: 'מחיר מסעדה', category: 'financial', defaultEnabled: true },
  { id: 'totalCourierPay', label: 'תשלום שליח', category: 'financial', defaultEnabled: true },
  { id: 'totalTips', label: 'טיפים', category: 'financial', defaultEnabled: true },
  { id: 'totalCash', label: 'מזומן', category: 'financial', defaultEnabled: true },
  { id: 'totalCommission', label: 'עמלות', category: 'financial', defaultEnabled: true },
  { id: 'profit', label: 'רווח נקי', category: 'financial', defaultEnabled: true },
];

export interface ReportConfig {
  groupBy: 'courier' | 'restaurant';
  format: 'excel-zip' | 'pdf';
  summaryFields: Set<string>;
  detailColumns: Set<string>;
  /** Include summary section at the top of each entity sheet */
  includeEntitySummary: boolean;
  /** Include detail delivery rows in each entity sheet */
  includeEntityDetail: boolean;
  /** Separate master summary file/sheet with all entities overview */
  includeMasterSummary: boolean;
}

interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  useCount: number;
  config: {
    groupBy: 'courier' | 'restaurant';
    format: 'excel-zip' | 'pdf';
    summaryFields: string[];
    detailColumns: string[];
    includeEntitySummary: boolean;
    includeEntityDetail: boolean;
    includeMasterSummary: boolean;
  };
}

interface ReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: ReportConfig) => void;
  visibleColumns: Set<string>;
  deliveryCount: number;
  groupCounts: { couriers: number; restaurants: number };
}

const STORAGE_KEY = 'report-builder-templates';
const DEFAULT_SUMMARY_IDS = new Set(SUMMARY_FIELDS.filter(f => f.defaultEnabled).map(f => f.id));

// ═══════════════════════════════════════
// Template persistence helpers
// ═══════════════════════════════════════

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedTemplate[];
  } catch {
    return [];
  }
}

function saveTemplates(templates: SavedTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function configToSerialized(config: ReportConfig): SavedTemplate['config'] {
  return {
    groupBy: config.groupBy,
    format: config.format,
    summaryFields: Array.from(config.summaryFields),
    detailColumns: Array.from(config.detailColumns),
    includeEntitySummary: config.includeEntitySummary,
    includeEntityDetail: config.includeEntityDetail,
    includeMasterSummary: config.includeMasterSummary,
  };
}

function serializedToConfig(s: SavedTemplate['config']): ReportConfig {
  return {
    groupBy: s.groupBy,
    format: s.format,
    summaryFields: new Set(s.summaryFields),
    detailColumns: new Set(s.detailColumns),
    includeEntitySummary: s.includeEntitySummary,
    includeEntityDetail: s.includeEntityDetail,
    includeMasterSummary: s.includeMasterSummary,
  };
}

// Short description for template card
function templateDescription(t: SavedTemplate): string {
  const group = t.config.groupBy === 'courier' ? 'שליח' : 'מסעדה';
  const fmt = t.config.format === 'excel-zip' ? 'Excel' : 'PDF';
  const sheets: string[] = [];
  if (t.config.includeMasterSummary) sheets.push('סיכום כללי');
  if (t.config.includeEntitySummary) sheets.push('סיכום');
  if (t.config.includeEntityDetail) sheets.push(`${t.config.detailColumns.length} עמודות`);
  return `${group} · ${fmt} · ${sheets.join(', ')}`;
}

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

export function ReportBuilder({
  isOpen,
  onClose,
  onGenerate,
  visibleColumns,
  deliveryCount,
  groupCounts,
}: ReportBuilderProps) {
  // Config state
  const [groupBy, setGroupBy] = useState<'courier' | 'restaurant'>('courier');
  const [format, setFormat] = useState<'excel-zip' | 'pdf'>('excel-zip');
  const [summaryFields, setSummaryFields] = useState<Set<string>>(new Set(DEFAULT_SUMMARY_IDS));
  const [detailColumns, setDetailColumns] = useState<Set<string>>(new Set(visibleColumns));
  const [includeEntitySummary, setIncludeEntitySummary] = useState(true);
  const [includeEntityDetail, setIncludeEntityDetail] = useState(true);
  const [includeMasterSummary, setIncludeMasterSummary] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');

  // Template state
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that triggered the modal & manage focus trap
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog container after open
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If editing template name or save form, let those handle it first
        if (editingTemplateId || showSaveForm) return;
        onClose();
      }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingTemplateId, showSaveForm]);

  // Load templates from localStorage on open
  useEffect(() => {
    if (isOpen) {
      setTemplates(loadTemplates());
    }
  }, [isOpen]);

  // Focus save input when form opens
  useEffect(() => {
    if (showSaveForm && saveInputRef.current) {
      saveInputRef.current.focus();
    }
  }, [showSaveForm]);

  // Focus edit input
  useEffect(() => {
    if (editingTemplateId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingTemplateId]);

  const generalFields = SUMMARY_FIELDS.filter(f => f.category === 'general');
  const financialFields = SUMMARY_FIELDS.filter(f => f.category === 'financial');
  const entityLabel = groupBy === 'courier' ? 'שליח' : 'מסעדה';
  const entityCount = groupBy === 'courier' ? groupCounts.couriers : groupCounts.restaurants;

  const currentConfig: ReportConfig = {
    groupBy, format, summaryFields, detailColumns,
    includeEntitySummary, includeEntityDetail, includeMasterSummary,
  };

  // ── Template actions ──

  const loadTemplate = useCallback((template: SavedTemplate) => {
    const config = serializedToConfig(template.config);
    setGroupBy(config.groupBy);
    setFormat(config.format);
    setSummaryFields(config.summaryFields);
    setDetailColumns(config.detailColumns);
    setIncludeEntitySummary(config.includeEntitySummary);
    setIncludeEntityDetail(config.includeEntityDetail);
    setIncludeMasterSummary(config.includeMasterSummary);
    setActiveTemplateId(template.id);
    toast.success(`תבנית "${template.name}" נטענה`);
  }, []);

  const saveTemplate = useCallback(() => {
    const name = newTemplateName.trim();
    if (!name) return;
    const newTemplate: SavedTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      useCount: 0,
      config: configToSerialized(currentConfig),
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates(updated);
    setActiveTemplateId(newTemplate.id);
    setShowSaveForm(false);
    setNewTemplateName('');
    toast.success(`תבנית "${name}" נשמרה`);
  }, [newTemplateName, currentConfig, templates]);

  const updateTemplate = useCallback((id: string) => {
    const updated = templates.map(t =>
      t.id === id ? { ...t, config: configToSerialized(currentConfig), lastUsedAt: new Date().toISOString() } : t
    );
    setTemplates(updated);
    saveTemplates(updated);
    const name = templates.find(t => t.id === id)?.name || '';
    toast.success(`תבנית "${name}" עודכנה`);
  }, [templates, currentConfig]);

  const deleteTemplate = useCallback((id: string) => {
    const name = templates.find(t => t.id === id)?.name || '';
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    if (activeTemplateId === id) setActiveTemplateId(null);
    setConfirmDeleteId(null);
    toast.success(`תבנית "${name}" נמחקה`);
  }, [templates, activeTemplateId]);

  const renameTemplate = useCallback((id: string) => {
    const name = editingName.trim();
    if (!name) return;
    const updated = templates.map(t => t.id === id ? { ...t, name } : t);
    setTemplates(updated);
    saveTemplates(updated);
    setEditingTemplateId(null);
    setEditingName('');
  }, [templates, editingName]);

  const markTemplateUsed = useCallback((id: string) => {
    const updated = templates.map(t =>
      t.id === id ? { ...t, useCount: t.useCount + 1, lastUsedAt: new Date().toISOString() } : t
    );
    setTemplates(updated);
    saveTemplates(updated);
  }, [templates]);

  // ── Field toggles ──

  const toggleSummaryField = (id: string) => {
    setSummaryFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setActiveTemplateId(null);
  };

  const toggleDetailColumn = (id: string) => {
    setDetailColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setActiveTemplateId(null);
  };

  // ── Generate ──

  const handleGenerate = () => {
    if (activeTemplateId) markTemplateUsed(activeTemplateId);
    onGenerate(currentConfig);
    onClose();
  };

  const handleReset = () => {
    setSummaryFields(new Set(DEFAULT_SUMMARY_IDS));
    setDetailColumns(new Set(visibleColumns));
    setIncludeEntitySummary(true);
    setIncludeEntityDetail(true);
    setIncludeMasterSummary(true);
    setActiveTemplateId(null);
  };

  if (!isOpen) return null;

  // Sort templates: most recently used first
  const sortedTemplates = [...templates].sort((a, b) =>
    new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-[680px] max-h-[88vh] bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#262626] flex flex-col overflow-hidden mx-4"
        dir="rtl"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-builder-title"
        aria-describedby="report-builder-desc"
      >

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between p-5 border-b border-[#e5e5e5] dark:border-[#262626]">
          <div>
            <h2 id="report-builder-title" className="font-bold text-[#0d0d12] dark:text-[#fafafa]">בונה דוחות</h2>
            <p id="report-builder-desc" className="text-xs text-[#a3a3a3] mt-0.5">
              {activeTemplateId
                ? <>טוען תבנית: <span className="text-[#7c3aed] dark:text-[#c4b5fd]">{templates.find(t => t.id === activeTemplateId)?.name}</span></>
                : 'הגדר בדיוק מה נכנס לדוח'
              }
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors" aria-label="סגור חלון בונה דוחות">
            <X className="w-4 h-4 text-[#a3a3a3]" />
          </button>
        </div>

        {/* ═══ Scrollable content ═══ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── תבניות שמורות ── */}
          {(sortedTemplates.length > 0 || showSaveForm) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span className="text-[11px] text-[#a3a3a3]">תבניות שמורות</span>
                  <span className="text-[10px] text-[#a3a3a3] bg-[#f5f5f5] dark:bg-[#262626] px-1.5 py-0.5 rounded">{sortedTemplates.length}</span>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {sortedTemplates.map(t => (
                  <div
                    key={t.id}
                    className={`group relative shrink-0 w-[200px] rounded-xl border transition-all cursor-pointer ${
                      activeTemplateId === t.id
                        ? 'border-[#7c3aed] dark:border-[#7c3aed] bg-[#f5f3ff] dark:bg-[#2e1065]/40 shadow-sm ring-1 ring-[#7c3aed]/20'
                        : 'border-[#e5e5e5] dark:border-[#262626] bg-[#fafafa] dark:bg-[#0a0a0a] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
                    }`}
                  >
                    {/* Card main area - clickable to load */}
                    <button
                      onClick={() => loadTemplate(t)}
                      className="w-full p-3 text-right"
                      aria-label={`טען תבנית ${t.name} — ${templateDescription(t)}`}
                    >
                      {editingTemplateId === t.id ? (
                        <div onClick={e => e.stopPropagation()}>
                          <input
                            ref={editInputRef}
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') renameTemplate(t.id);
                              if (e.key === 'Escape') { setEditingTemplateId(null); setEditingName(''); }
                            }}
                            onBlur={() => renameTemplate(t.id)}
                            aria-label="שם חדש לתבנית"
                            className="w-full text-xs font-medium bg-white dark:bg-[#171717] border border-[#7c3aed] rounded px-2 py-1 text-[#0d0d12] dark:text-[#fafafa] outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1">
                          {activeTemplateId === t.id
                            ? <BookmarkCheck className="w-3 h-3 text-[#7c3aed] shrink-0" />
                            : <Bookmark className="w-3 h-3 text-[#a3a3a3] shrink-0" />
                          }
                          <span className={`text-xs font-medium truncate ${
                            activeTemplateId === t.id ? 'text-[#7c3aed] dark:text-[#c4b5fd]' : 'text-[#0d0d12] dark:text-[#fafafa]'
                          }`}>
                            {t.name}
                          </span>
                        </div>
                      )}
                      <div className="text-[10px] text-[#a3a3a3] leading-relaxed truncate">{templateDescription(t)}</div>
                      {t.useCount > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Zap className="w-2.5 h-2.5 text-[#f59e0b]" />
                          <span className="text-[9px] text-[#a3a3a3]">שימוש {t.useCount} פעמים</span>
                        </div>
                      )}
                    </button>

                    {/* Action buttons - top-left corner */}
                    <div className="absolute top-1.5 left-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activeTemplateId === t.id && (
                        <button
                          onClick={e => { e.stopPropagation(); updateTemplate(t.id); }}
                          className="p-1 rounded bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 transition-colors"
                          aria-label={`עדכן תבנית ${t.name} עם ההגדרות הנוכחיות`}
                          title="עדכן תבנית עם ההגדרות הנוכחיות"
                        >
                          <Star className="w-2.5 h-2.5 text-[#7c3aed]" />
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingTemplateId(t.id);
                          setEditingName(t.name);
                        }}
                        className="p-1 rounded bg-[#f5f5f5] dark:bg-[#262626] hover:bg-[#e5e5e5] dark:hover:bg-[#404040] transition-colors"
                        aria-label={`שנה שם תבנית ${t.name}`}
                        title="שנה שם"
                      >
                        <Pencil className="w-2.5 h-2.5 text-[#737373]" />
                      </button>
                      {confirmDeleteId === t.id ? (
                        <button
                          onClick={e => { e.stopPropagation(); deleteTemplate(t.id); }}
                          className="p-1 rounded bg-[#dc2626]/10 hover:bg-[#dc2626]/20 transition-colors"
                          aria-label={`אשר מחיקת תבנית ${t.name}`}
                          title="אישור מחיקה"
                        >
                          <Check className="w-2.5 h-2.5 text-[#dc2626]" />
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(t.id); setTimeout(() => setConfirmDeleteId(null), 3000); }}
                          className="p-1 rounded bg-[#f5f5f5] dark:bg-[#262626] hover:bg-[#fee2e2] dark:hover:bg-[#450a0a] transition-colors"
                          aria-label={`מחק תבנית ${t.name}`}
                          title="מחק תבנית"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-[#a3a3a3] hover:text-[#dc2626]" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Row 1: קיבוץ + פורמט ── */}
          <div className="grid grid-cols-2 gap-3">
            <fieldset>
              <legend className="text-[11px] text-[#a3a3a3] mb-1.5 block">קיבוץ לפי</legend>
              <div className="flex gap-1.5" role="radiogroup" aria-label="קיבוץ לפי">
                <button
                  onClick={() => { setGroupBy('courier'); setActiveTemplateId(null); }}
                  role="radio"
                  aria-checked={groupBy === 'courier'}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs transition-all ${
                    groupBy === 'courier'
                      ? 'bg-[#2563eb] text-white shadow-sm'
                      : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4]'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  שליח
                  <span className="text-[10px] opacity-70">({groupCounts.couriers})</span>
                </button>
                <button
                  onClick={() => { setGroupBy('restaurant'); setActiveTemplateId(null); }}
                  role="radio"
                  aria-checked={groupBy === 'restaurant'}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs transition-all ${
                    groupBy === 'restaurant'
                      ? 'bg-[#dc2626] text-white shadow-sm'
                      : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  מסעדה
                  <span className="text-[10px] opacity-70">({groupCounts.restaurants})</span>
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[11px] text-[#a3a3a3] mb-1.5 block">פורמט</legend>
              <div className="flex gap-1.5" role="radiogroup" aria-label="פורמט קובץ">
                <button
                  onClick={() => { setFormat('excel-zip'); setActiveTemplateId(null); }}
                  role="radio"
                  aria-checked={format === 'excel-zip'}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs transition-all ${
                    format === 'excel-zip'
                      ? 'bg-[#16a34a] text-white shadow-sm'
                      : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4]'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  Excel ZIP
                </button>
                <button
                  onClick={() => { setFormat('pdf'); setActiveTemplateId(null); }}
                  role="radio"
                  aria-checked={format === 'pdf'}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs transition-all ${
                    format === 'pdf'
                      ? 'bg-[#dc2626] text-white shadow-sm'
                      : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#525252] dark:text-[#d4d4d4] hover:border-[#d4d4d4]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </fieldset>
          </div>

          {/* ── מבנה הדוח ── */}
          <div>
            <label className="text-[11px] text-[#a3a3a3] mb-2 block">מבנה הדוח</label>
            <div className="space-y-2">
              <ToggleRow
                label={`גיליון סיכום כללי (כל ה${groupBy === 'courier' ? 'שליחים' : 'מסעדות'} בטבלה אחת)`}
                enabled={includeMasterSummary}
                onToggle={() => { setIncludeMasterSummary(prev => !prev); setActiveTemplateId(null); }}
              />
              <div className="border border-[#e5e5e5] dark:border-[#262626] rounded-xl p-3 space-y-2">
                <div className="text-[10px] text-[#a3a3a3] mb-1">גיליון לכל {entityLabel} — מה ייכלל:</div>
                <ToggleRow
                  label={`סיכום בראש הגיליון (${summaryFields.size} שדות)`}
                  enabled={includeEntitySummary}
                  onToggle={() => { setIncludeEntitySummary(prev => !prev); setActiveTemplateId(null); }}
                />
                <ToggleRow
                  label={`פירוט משלוחים (${detailColumns.size} עמודות)`}
                  enabled={includeEntityDetail}
                  onToggle={() => { setIncludeEntityDetail(prev => !prev); setActiveTemplateId(null); }}
                />
                {!includeEntitySummary && !includeEntityDetail && (
                  <div role="alert" className="text-[10px] text-[#dc2626] bg-[#fee2e2] dark:bg-[#450a0a] dark:text-[#fca5a5] px-2 py-1 rounded">
                    יש לבחור לפחות אחד — סיכום או פירוט
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── שדות סיכום ── */}
          {(includeEntitySummary || includeMasterSummary) && (
            <CollapsibleSection
              title="שדות בגיליון סיכום"
              subtitle={`${summaryFields.size} מתוך ${SUMMARY_FIELDS.length}`}
              expanded={expandedSection === 'summary'}
              onToggle={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
              actions={
                <div className="flex gap-1">
                  <button
                    onClick={() => { setSummaryFields(new Set(SUMMARY_FIELDS.map(f => f.id))); setActiveTemplateId(null); }}
                    className="px-2 py-0.5 text-[10px] text-[#16a34a] bg-[#dcfce7] dark:bg-[#14532d] rounded hover:opacity-80"
                  >
                    הכל
                  </button>
                  <button
                    onClick={() => { setSummaryFields(new Set(['totalDeliveries', 'deliveredCount', 'totalRevenue', 'profit'])); setActiveTemplateId(null); }}
                    className="px-2 py-0.5 text-[10px] text-[#2563eb] bg-[#eff6ff] dark:bg-[#172554] rounded hover:opacity-80"
                  >
                    מינימום
                  </button>
                </div>
              }
            >
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-[#a3a3a3] mb-1.5">כללי</div>
                  <div className="flex flex-wrap gap-1.5">
                    {generalFields.map(field => (
                      <FieldChip key={field.id} label={field.label} selected={summaryFields.has(field.id)} onClick={() => toggleSummaryField(field.id)} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#a3a3a3] mb-1.5">כספי</div>
                  <div className="flex flex-wrap gap-1.5">
                    {financialFields.map(field => (
                      <FieldChip key={field.id} label={field.label} selected={summaryFields.has(field.id)} onClick={() => toggleSummaryField(field.id)} />
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* ── עמודות פירוט ── */}
          {includeEntityDetail && (
            <CollapsibleSection
              title="עמודות בגיליון פירוט"
              subtitle={`${detailColumns.size} מתוך ${ALL_COLUMNS.length}`}
              expanded={expandedSection === 'detail'}
              onToggle={() => setExpandedSection(expandedSection === 'detail' ? null : 'detail')}
              actions={
                <div className="flex gap-1">
                  <button
                    onClick={() => { setDetailColumns(new Set(ALL_COLUMNS.map(c => c.id))); setActiveTemplateId(null); }}
                    className="px-2 py-0.5 text-[10px] text-[#16a34a] bg-[#dcfce7] dark:bg-[#14532d] rounded hover:opacity-80"
                  >
                    הכל
                  </button>
                  <button
                    onClick={() => { setDetailColumns(new Set(visibleColumns)); setActiveTemplateId(null); }}
                    className="px-2 py-0.5 text-[10px] text-[#7c3aed] bg-[#f5f3ff] dark:bg-[#2e1065] rounded hover:opacity-80"
                  >
                    כמו טבלה
                  </button>
                  <button
                    onClick={() => { setDetailColumns(new Set(['orderNumber', 'status', 'rest_name', 'client_full_address', 'price', 'creation_time'])); setActiveTemplateId(null); }}
                    className="px-2 py-0.5 text-[10px] text-[#2563eb] bg-[#eff6ff] dark:bg-[#172554] rounded hover:opacity-80"
                  >
                    מינימום
                  </button>
                </div>
              }
            >
              <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                {ALL_COLUMNS.map(col => (
                  <FieldChip key={col.id} label={col.label} selected={detailColumns.has(col.id)} onClick={() => toggleDetailColumn(col.id)} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* ── תצוגה מקדימה ── */}
          <div className="bg-[#fafafa] dark:bg-[#0a0a0a] rounded-xl p-4 border border-[#e5e5e5] dark:border-[#262626]">
            <div className="text-[11px] text-[#a3a3a3] mb-2">תצוגה מקדימה של הדוח</div>
            <div className="space-y-1.5 text-xs text-[#525252] dark:text-[#d4d4d4]">
              <div className="flex items-center gap-2">
                {groupBy === 'courier' ? <Bike className="w-3.5 h-3.5 text-[#2563eb]" /> : <Store className="w-3.5 h-3.5 text-[#dc2626]" />}
                <span>מקובץ לפי <strong>{entityLabel}</strong> — {entityCount} {groupBy === 'courier' ? 'שליחים' : 'מסעדות'}</span>
              </div>
              <div className="flex items-center gap-2">
                {format === 'excel-zip' ? <FolderArchive className="w-3.5 h-3.5 text-[#16a34a]" /> : <FileText className="w-3.5 h-3.5 text-[#dc2626]" />}
                <span>פורמט: <strong>{format === 'excel-zip' ? 'ZIP עם קבצי Excel' : 'PDF'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#737373]" />
                <span>{deliveryCount} משלוחים (לפי הפילטרים הנוכחיים)</span>
              </div>
              <div className="border-t border-[#e5e5e5] dark:border-[#262626] mt-2 pt-2 text-[11px] text-[#a3a3a3]">
                {format === 'excel-zip' ? (
                  <div className="space-y-1">
                    <div>הקובץ יכיל:</div>
                    {includeMasterSummary && <div className="flex items-center gap-1.5 mr-2"><Check className="w-3 h-3 text-[#16a34a]" /> <span>קובץ סיכום כללי ({summaryFields.size} שדות x {entityCount} {groupBy === 'courier' ? 'שליחים' : 'מסעדות'})</span></div>}
                    {(includeEntitySummary || includeEntityDetail) && (
                      <>
                        <div className="flex items-center gap-1.5 mr-2"><Check className="w-3 h-3 text-[#16a34a]" /> <span>{entityCount} קבצי Excel — גיליון אחד לכל {entityLabel}:</span></div>
                        {includeEntitySummary && <div className="flex items-center gap-1.5 mr-6"><Check className="w-2.5 h-2.5 text-[#a3a3a3]" /> <span>סיכום בראש הגיליון ({summaryFields.size} שדות)</span></div>}
                        {includeEntityDetail && <div className="flex items-center gap-1.5 mr-6"><Check className="w-2.5 h-2.5 text-[#a3a3a3]" /> <span>פירוט משלוחים מתחת ({detailColumns.size} עמודות)</span></div>}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>קובץ PDF אחד עם:</div>
                    {includeMasterSummary && <div className="flex items-center gap-1.5 mr-2"><Check className="w-3 h-3 text-[#dc2626]" /> <span>עמוד סיכום כללי</span></div>}
                    {(includeEntitySummary || includeEntityDetail) && (
                      <div className="flex items-center gap-1.5 mr-2"><Check className="w-3 h-3 text-[#dc2626]" /> <span>עמוד לכל {entityLabel} — סיכום{includeEntitySummary && includeEntityDetail ? ' + ' : ''}פירוט</span></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Save template inline form ═══ */}
        {showSaveForm && (
          <div className="px-5 py-3 border-t border-[#e5e5e5] dark:border-[#262626] bg-[#f5f3ff]/50 dark:bg-[#2e1065]/20">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-[#7c3aed] shrink-0" />
              <input
                ref={saveInputRef}
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTemplate();
                  if (e.key === 'Escape') { setShowSaveForm(false); setNewTemplateName(''); }
                }}
                placeholder="שם התבנית, למשל: דוח סוף חודש שליחים"
                aria-label="שם תבנית חדשה"
                className="flex-1 text-xs bg-white dark:bg-[#171717] border border-[#c4b5fd] dark:border-[#5b21b6] rounded-lg px-3 py-2 text-[#0d0d12] dark:text-[#fafafa] outline-none focus:ring-2 focus:ring-[#7c3aed]/30 placeholder:text-[#a3a3a3]"
              />
              <button
                onClick={saveTemplate}
                disabled={!newTemplateName.trim()}
                aria-label="שמור תבנית"
                className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] transition-colors disabled:opacity-40"
              >
                שמור
              </button>
              <button
                onClick={() => { setShowSaveForm(false); setNewTemplateName(''); }}
                aria-label="ביטול שמירת תבנית"
                className="p-2 rounded-lg text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ Footer ═══ */}
        <div className="p-4 border-t border-[#e5e5e5] dark:border-[#262626] flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[#a3a3a3] hover:text-[#525252] hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            איפוס
          </button>

          <div className="flex-1" />

          {/* Save template button */}
          {!showSaveForm && (
            <button
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#7c3aed] dark:text-[#c4b5fd] bg-[#f5f3ff] dark:bg-[#2e1065]/50 hover:bg-[#ede9fe] dark:hover:bg-[#2e1065] border border-[#c4b5fd]/30 dark:border-[#5b21b6]/30 transition-colors"
            >
              <Plus className="w-3 h-3" />
              שמור כתבנית
            </button>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!includeEntitySummary && !includeEntityDetail && !includeMasterSummary}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#16a34a] to-[#22c55e] hover:from-[#15803d] hover:to-[#16a34a] shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            הורד דוח
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-all text-right ${
        enabled
          ? 'bg-[#dcfce7]/50 dark:bg-[#14532d]/30 border border-[#86efac]/50 dark:border-[#166534]/50'
          : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] opacity-60'
      }`}
    >
      {enabled ? (
        <ToggleRight className="w-5 h-5 text-[#16a34a] shrink-0" />
      ) : (
        <ToggleLeft className="w-5 h-5 text-[#a3a3a3] shrink-0" />
      )}
      <span className={`flex-1 ${enabled ? 'text-[#0d0d12] dark:text-[#fafafa]' : 'text-[#a3a3a3]'}`}>{label}</span>
    </button>
  );
}

function CollapsibleSection({
  title, subtitle, expanded, onToggle, children, actions,
}: {
  title: string; subtitle: string; expanded: boolean; onToggle: () => void; children: React.ReactNode; actions?: React.ReactNode;
}) {
  const sectionId = `section-${title.replace(/\s+/g, '-')}`;
  return (
    <div className="border border-[#e5e5e5] dark:border-[#262626] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={sectionId}
        className="w-full flex items-center gap-2 px-4 py-3 text-right hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[#a3a3a3] shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[#a3a3a3] shrink-0" />}
        <span className="flex-1 text-xs font-medium text-[#0d0d12] dark:text-[#fafafa]">{title}</span>
        <span className="text-[10px] text-[#a3a3a3] bg-[#f5f5f5] dark:bg-[#262626] px-2 py-0.5 rounded">{subtitle}</span>
      </button>
      {expanded && (
        <div id={sectionId} className="px-4 pb-3 pt-1">
          {actions && <div className="flex items-center gap-1 mb-2">{actions}</div>}
          {children}
        </div>
      )}
    </div>
  );
}

function FieldChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="checkbox"
      aria-checked={selected}
      aria-label={`${label}${selected ? ' — נבחר' : ''}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
        selected
          ? 'bg-[#0d0d12] dark:bg-[#fafafa] text-white dark:text-[#0d0d12]'
          : 'bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#262626] text-[#a3a3a3] hover:border-[#d4d4d4] dark:hover:border-[#404040]'
      }`}
    >
      {selected && <Check className="w-2.5 h-2.5" aria-hidden="true" />}
      {label}
    </button>
  );
}