import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, CalendarDays, CheckCircle, Clock, Menu, Minus, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDelivery } from '../context/delivery-context-value';
import { Courier, DayOfWeek, ShiftSlotTemplate, ShiftTemplate, ShiftType } from '../types/delivery.types';
import { formatWorkedDuration, getAssignmentWorkedMinutes } from '../utils/shift-work';
import { DELIVERY_STORAGE_KEYS } from '../context/delivery-storage';
import { PageToolbar } from '../components/common/page-toolbar';
import { ToolbarIconButton } from '../components/common/toolbar-icon-button';
import { ToolbarWeekPicker } from '../components/common/toolbar-date-picker';
import { InfoBar, type InfoBarItem } from '../components/common/info-bar';

const COLLAPSED_TEMPLATES_STORAGE_KEY = DELIVERY_STORAGE_KEYS.shiftsCollapsedTemplates;

// Time segment supports both arrow buttons and click-to-type input.
const TimeSegment: React.FC<{
  val: number;
  max: number;
  step?: number;
  onStep: (delta: number) => void;
  onSet: (v: number) => void;
}> = ({ val, max, step = 1, onStep, onSet }) => {
  const [editing, setEditing] = React.useState(false);
  const [raw, setRaw] = React.useState('');
  const ref = React.useRef<HTMLInputElement>(null);
  const btnCls =
    'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-[#b0b0b0] dark:text-[#555] hover:bg-[#ebebeb] dark:hover:bg-[#252525] hover:text-[#0d0d12] dark:hover:text-[#fafafa] active:scale-90 transition-all select-none';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button type="button" onClick={() => onStep(step)} className={btnCls}>
        <ArrowUp size={14} />
      </button>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={editing ? raw : String(val).padStart(2, '0')}
        onChange={(e) => setRaw(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onFocus={() => {
          setEditing(true);
          setRaw(String(val).padStart(2, '0'));
          setTimeout(() => ref.current?.select(), 0);
        }}
        onBlur={() => {
          setEditing(false);
          const n = parseInt(raw, 10);
          if (!isNaN(n)) onSet(Math.max(0, Math.min(max, n)));
          setRaw('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ref.current?.blur();
          if (e.key === 'ArrowUp') { e.preventDefault(); onStep(1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onStep(-1); }
        }}
        className="w-11 text-center text-[1.8rem] font-light leading-none bg-transparent outline-none cursor-pointer focus:cursor-text text-[#0d0d12] dark:text-[#fafafa] tabular-nums rounded-lg focus:bg-[#f0f0f0] dark:focus:bg-[#1e1e1e] transition-colors py-1 sm:w-14 sm:text-[2.25rem]"
      />
      <button type="button" onClick={() => onStep(-step)} className={btnCls}>
        <ArrowDown size={14} />
      </button>
    </div>
  );
};

// -- Custom time picker (24-hour) ---------------------------------------------
const TimePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const parts = value.split(':');
  const h = parseInt(parts[0] ?? '0', 10) || 0;
  const m = parseInt(parts[1] ?? '0', 10) || 0;

  const update = (newH: number, newM: number) => {
    const hh = ((newH % 24) + 24) % 24;
    const mm = ((newM % 60) + 60) % 60;
    onChange(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  };

  return (
    <div dir="ltr" className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-3 dark:border-app-border dark:bg-app-surface sm:gap-2 sm:px-5 sm:py-3.5">
      <TimeSegment val={h} max={23} step={1} onStep={(d) => update(h + d, m)} onSet={(v) => update(v, m)} />
      <span className="mb-1 select-none text-[1.8rem] font-light text-[#d4d4d4] dark:text-[#3a3a3a] sm:text-[2.25rem]">:</span>
      <TimeSegment val={m} max={59} step={15} onStep={(d) => update(h, m + d)} onSet={(v) => update(h, v)} />
    </div>
  );
};
// -----------------------------------------------------------------------------

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: '\u05d0\u05f3',
  1: '\u05d1\u05f3',
  2: '\u05d2\u05f3',
  3: '\u05d3\u05f3',
  4: '\u05d4\u05f3',
  5: '\u05d5\u05f3',
  6: '\u05e9\u05f3',
};

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  morning: '\u05d1\u05d5\u05e7\u05e8',
  afternoon: '\u05e6\u05d4\u05e8\u05d9\u05d9\u05dd',
  evening: '\u05e2\u05e8\u05d1',
  full: '\u05de\u05dc\u05d0',
};

const SHIFT_TYPE_TONES: Record<ShiftType, string> = {
  morning: 'bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#0d1b2d] dark:text-[#93c5fd]',
  afternoon: 'bg-[#fef3c7] text-[#b45309] dark:bg-[#2b1a0b] dark:text-[#fdba74]',
  evening: 'bg-[#ede9fe] text-[#6d28d9] dark:bg-[#201734] dark:text-[#c4b5fd]',
  full: 'bg-[#dcfce7] text-[#15803d] dark:bg-[#11210f] dark:text-[#86efac]',
};

const SHIFT_TYPE_ROW_STYLES: Record<ShiftType, { shell: string; name: string }> = {
  morning: {
    shell: 'bg-gradient-to-l from-[#edf5ff] via-[#e2efff] to-[#d8e9ff] dark:from-[#132235] dark:via-[#102033] dark:to-[#0d1a2a]',
    name: 'text-[#0f172a] dark:text-[#eff6ff]',
  },
  afternoon: {
    shell: 'bg-gradient-to-l from-[#fff8e8] via-[#fff2d1] to-[#ffebbf] dark:from-[#2c1b09] dark:via-[#251707] dark:to-[#1e1205]',
    name: 'text-[#422006] dark:text-[#fff7ed]',
  },
  evening: {
    shell: 'bg-gradient-to-l from-[#f5f1ff] via-[#ede5ff] to-[#e6dcff] dark:from-[#22173a] dark:via-[#1c1330] dark:to-[#160f27]',
    name: 'text-[#2e1065] dark:text-[#f5f3ff]',
  },
  full: {
    shell: 'bg-gradient-to-l from-[#eefcf2] via-[#e1f8e8] to-[#d5f4df] dark:from-[#132516] dark:via-[#102013] dark:to-[#0d1b10]',
    name: 'text-[#14532d] dark:text-[#f0fdf4]',
  },
};

const EMERGENCY_SHIFT_ROW_STYLE = {
  shell: 'bg-gradient-to-l from-[#3a1010] via-[#2f0d0d] to-[#250909] dark:from-[#3a1010] dark:via-[#2f0d0d] dark:to-[#250909]',
  name: 'text-[#fee2e2] dark:text-[#fecaca]',
};

const pad = (value: number) => value.toString().padStart(2, '0');
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const getWeekDates = (date: Date) => {
  const weekStart = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + index);
    return next;
  });
};

type SelectedCell = {
  shiftId: string;
  templateId: string;
  slotId: string;
  dayKey: string;
};

type TemplateDraftState = {
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  slots: ShiftSlotTemplate[];
};

const createSlot = (index: number): ShiftSlotTemplate => ({
  id: `slot-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  label: `\u05ea\u05d0 ${index + 1}`,
});

const getAssignmentStateLabel = (assignment: { startedAt: Date | null; endedAt: Date | null } | null) => {
  if (!assignment) return '\u05e4\u05e0\u05d5\u05d9';
  if (assignment.endedAt) return '\u05d4\u05e1\u05ea\u05d9\u05d9\u05dd';
  if (assignment.startedAt) return '\u05d1\u05de\u05e9\u05de\u05e8\u05ea';
  return '\u05de\u05ea\u05d5\u05db\u05e0\u05df';
};

const formatAssignmentTimeRange = (assignment: { startedAt: Date | null; endedAt: Date | null } | null) => {
  if (!assignment?.startedAt || !assignment.endedAt) return null;

  const formatTime = (value: Date) =>
    new Date(value).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return `${formatTime(assignment.startedAt)} - ${formatTime(assignment.endedAt)}`;
};

const getOpenSlotAssignment = <
  T extends { slotId: string; startedAt: Date | null; endedAt: Date | null }
>(
  assignments: T[],
  slotId: string
) => {
  for (let index = assignments.length - 1; index >= 0; index -= 1) {
    const assignment = assignments[index];
    if (assignment.slotId === slotId && !assignment.endedAt) {
      return assignment;
    }
  }

  return null;
};

const getLatestSlotAssignment = <
  T extends { slotId: string }
>(
  assignments: T[],
  slotId: string
) => {
  for (let index = assignments.length - 1; index >= 0; index -= 1) {
    const assignment = assignments[index];
    if (assignment.slotId === slotId) {
      return assignment;
    }
  }

  return null;
};

const getFloatingPanelStyle = (anchor: { cx: number; cy: number }): React.CSSProperties => {
  if (typeof window === 'undefined') {
    return { top: anchor.cy + 8, left: anchor.cx - 160 };
  }

  const width = Math.min(320, window.innerWidth - 16);
  const maxHeight = Math.min(520, window.innerHeight - 16);

  return {
    width,
    maxHeight,
    top: Math.max(8, Math.min(anchor.cy + 8, window.innerHeight - maxHeight - 8)),
    left: Math.max(8, Math.min(anchor.cx - width / 2, window.innerWidth - width - 8)),
  };
};

const getContextMenuStyle = (point: { x: number; y: number }): React.CSSProperties => {
  if (typeof window === 'undefined') {
    return { top: point.y, left: point.x };
  }

  return {
    top: Math.max(8, Math.min(point.y, window.innerHeight - 160)),
    left: Math.max(8, Math.min(point.x, window.innerWidth - 188)),
  };
};

export const CouriersShifts: React.FC = () => {
  const { state, dispatch } = useDelivery();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ cx: number; cy: number } | null>(null);
  const [popupSearch, setPopupSearch] = useState('');
  const [collapsedTemplates, setCollapsedTemplates] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_TEMPLATES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraftState>({
    name: '',
    type: 'morning',
    startTime: '08:00',
    endTime: '11:00',
    slots: [createSlot(0)],
  });
  const [newCourier, setNewCourier] = useState({ name: '', phone: '' });
  const [cellContextMenu, setCellContextMenu] = useState<{
    x: number;
    y: number;
    shiftId: string;
    assignmentId: string;
    started: boolean;
    ended: boolean;
    offline: boolean;
    dayKey: string;
  } | null>(null);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const weekStartKey = toDateKey(weekDates[0]);
  const weekEndKey = toDateKey(weekDates[6]);
  const selectedDateKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    dispatch({ type: 'ENSURE_WEEK_SHIFTS', payload: { startDate: weekStartKey, endDate: weekEndKey } });
  }, [dispatch, weekStartKey, weekEndKey, state.shiftTemplates, state.weeklyShiftConfig]);


  const weekDays = useMemo(
    () =>
      weekDates.map((date) => ({
        date,
        dayKey: toDateKey(date),
      })),
    [weekDates]
  );

  const visibleShiftTemplates = useMemo(
    () =>
      state.shiftTemplates.filter((template) => {
        const activeStartDate = template.activeStartDate ?? '0000-01-01';
        const activeEndDate = template.activeEndDate ?? '9999-12-31';
        return !(activeEndDate < weekStartKey || activeStartDate > weekEndKey);
      }),
    [state.shiftTemplates, weekEndKey, weekStartKey],
  );

  const shiftsByTemplateAndDay = useMemo(() => {
    const emergencyTemplateIds = new Set(
      visibleShiftTemplates
        .filter((template) => template.name === 'בלת"ם')
        .map((template) => template.id)
    );
    const map = new Map<string, typeof state.shifts[number]>();

    state.shifts
      .filter((shift) => shift.date >= weekStartKey && shift.date <= weekEndKey)
      .forEach((shift) => {
        if (shift.templateId) {
          map.set(`${shift.templateId}:${shift.date}`, shift);
          return;
        }

        if (shift.name !== 'בלת"ם') return;

        emergencyTemplateIds.forEach((templateId) => {
          map.set(`${templateId}:${shift.date}`, shift);
        });
      });

    return map;
  }, [state.shifts, visibleShiftTemplates, weekStartKey, weekEndKey]);

  const selectedShift = selectedCell ? state.shifts.find((shift) => shift.id === selectedCell.shiftId) ?? null : null;
  const selectedTemplate = selectedCell
    ? visibleShiftTemplates.find((template) => template.id === selectedCell.templateId) ?? null
    : null;
  const selectedSlot = selectedTemplate?.slots.find((slot) => slot.id === selectedCell?.slotId) ?? null;
  const selectedOpenAssignment =
    selectedShift && selectedCell
      ? getOpenSlotAssignment(selectedShift.courierAssignments, selectedCell.slotId)
      : null;
  const selectedAssignment =
    selectedShift && selectedCell
      ? getLatestSlotAssignment(selectedShift.courierAssignments, selectedCell.slotId)
      : null;
  const selectedCourier = selectedAssignment
    ? state.couriers.find((courier) => courier.id === selectedAssignment.courierId) ?? null
    : null;
  const selectedAssignmentCompleted = Boolean(selectedAssignment?.endedAt);

  // Couriers already assigned to another slot on the same day+time (and haven't ended that shift yet)
  const busyCourierIds = useMemo(() => {
    if (!selectedCell || !selectedShift) return new Set<string>();
    const busy = new Set<string>();
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const selStart = toMins(selectedShift.startTime);
    const selEnd   = toMins(selectedShift.endTime);
    state.shifts
      .filter(s => s.date === selectedCell.dayKey && s.id !== selectedCell.shiftId)
      .forEach(s => {
        const sStart = toMins(s.startTime);
        const sEnd   = toMins(s.endTime);
        const overlaps = sStart < selEnd && sEnd > selStart;
        if (!overlaps) return;
        s.courierAssignments.forEach(a => {
          // Couriers with an open assignment in overlapping shifts stay unavailable here.
          if (!a.endedAt) busy.add(a.courierId);
        });
      });
    // Also check other slots in the SAME shift (same day, same template, different slot)
    selectedShift.courierAssignments
      .filter(a => a.slotId !== selectedCell.slotId && !a.endedAt)
      .forEach(a => busy.add(a.courierId));
    return busy;
  }, [selectedCell, selectedShift, state.shifts]);

  const popupCouriers = useMemo(() => {
    const query = popupSearch.trim().toLowerCase();
    return state.couriers
      .filter((courier) => {
        if (!query) return true;
        return courier.name.toLowerCase().includes(query) || courier.phone.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        const aBusy = busyCourierIds.has(a.id);
        const bBusy = busyCourierIds.has(b.id);
        if (aBusy !== bBusy) return aBusy ? 1 : -1; // Busy couriers should appear last.
        return a.name.localeCompare(b.name, 'he');
      });
  }, [popupSearch, state.couriers, busyCourierIds]);

  const selectedDaySummary = useMemo(() => {
    const shiftsForDay = state.shifts.filter((shift) => shift.date === selectedDateKey);
    const assignments = shiftsForDay.flatMap((shift) =>
      shift.courierAssignments.filter((assignment) => !assignment.endedAt)
    );
    const totalSlots = visibleShiftTemplates.reduce((sum, template) => sum + template.slots.length, 0);
    const staffedSlots = assignments.length;
    const activeAssignments = assignments.filter((assignment) => assignment.startedAt && !assignment.endedAt).length;
    const plannedAssignments = assignments.filter((assignment) => assignment.courierId && !assignment.startedAt && !assignment.endedAt).length;

    return {
      totalSlots,
      staffedSlots,
      emptySlots: Math.max(totalSlots - staffedSlots, 0),
      activeAssignments,
      plannedAssignments,
    };
  }, [selectedDateKey, state.shifts, visibleShiftTemplates]);

  const selectedCellPopoverStyle = popoverAnchor ? getFloatingPanelStyle(popoverAnchor) : null;

  const handleOpenCreateTemplate = () => {
    openCreateTemplate();
  };

  const handleGoToCouriers = () => {
    setCourierModalOpen(true);
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateDraft({
      name: '',
      type: 'morning',
      startTime: '08:00',
      endTime: '11:00',
      slots: [createSlot(0)],
    });
    setTemplateModalOpen(true);
  };

  const openEditTemplate = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setTemplateDraft({
      name: template.name,
      type: template.type,
      startTime: template.startTime,
      endTime: template.endTime,
      slots: template.slots.map((slot) => ({ ...slot })),
    });
    setTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  const closeCourierModal = () => {
    setCourierModalOpen(false);
    setNewCourier({ name: '', phone: '' });
  };

  const saveTemplate = () => {
    const normalizedSlots = templateDraft.slots.map((slot, index) => ({
      ...slot,
      label: `\u05ea\u05d0 ${index + 1}`,
    }));
    const inferredType: ShiftType =
      editingTemplate?.type ||
      (templateDraft.name.includes('\u05e2\u05e8\u05d1') ? 'evening' : templateDraft.name.includes('\u05e6\u05d4\u05e8') ? 'afternoon' : 'morning');


    const payload = {
      name: templateDraft.name.trim() || `${'\u05de\u05e9\u05de\u05e8\u05ea'} ${SHIFT_TYPE_LABELS[inferredType]}`,
      type: inferredType,
      startTime: templateDraft.startTime,
      endTime: templateDraft.endTime,
      slots: normalizedSlots,
      requiredCouriers: normalizedSlots.length,
    };

    if (editingTemplate) {
      dispatch({ type: 'UPDATE_SHIFT_TEMPLATE', payload: { templateId: editingTemplate.id, updates: payload } });
    } else {
      dispatch({
        type: 'CREATE_SHIFT_TEMPLATE',
        payload: {
          id: `template-${Date.now()}`,
          ...payload,
          activeStartDate: weekStartKey,
          activeEndDate: weekEndKey,
        },
      });
    }

    closeTemplateModal();
  };

  const deleteTemplate = (templateId: string) => {
    dispatch({ type: 'DELETE_SHIFT_TEMPLATE', payload: { templateId, effectiveFromDate: weekStartKey } });
    closeTemplateModal();
  };

  const addCourier = () => {
    if (!newCourier.name.trim() || !newCourier.phone.trim()) return;

    const courier: Courier = {
      id: `c${Date.now()}`,
      name: newCourier.name.trim(),
      phone: newCourier.phone.trim(),
      status: 'available',
      isOnShift: false,
      shiftStartedAt: null,
      shiftEndedAt: null,
      currentShiftAssignmentId: null,
      activeDeliveryIds: [],
      totalDeliveries: 0,
      rating: 5,
    };

    dispatch({ type: 'ADD_COURIER', payload: courier });
    closeCourierModal();
  };

  const assignCourierToSelectedCell = (courierId: string) => {
    if (!selectedCell || selectedAssignmentCompleted) return;
    dispatch({
      type: 'ASSIGN_COURIER_TO_SHIFT',
      payload: {
        shiftId: selectedCell.shiftId,
        courierId,
        slotId: selectedCell.slotId,
      },
    });
    setSelectedCell(null);
    setPopupSearch('');
  };

  const clearSelectedAssignment = () => {
    if (!selectedShift || !selectedOpenAssignment) return;
    dispatch(
      selectedOpenAssignment.startedAt && !selectedOpenAssignment.endedAt
        ? {
            type: 'END_SHIFT_ASSIGNMENT',
            payload: {
              shiftId: selectedShift.id,
              assignmentId: selectedOpenAssignment.id,
            },
          }
        : {
            type: 'REMOVE_COURIER_FROM_SHIFT',
            payload: {
              shiftId: selectedShift.id,
              assignmentId: selectedOpenAssignment.id,
            },
          }
    );
    setSelectedCell(null);
    setPopupSearch('');
  };

  const endSelectedAssignment = () => {
    if (!selectedShift || !selectedOpenAssignment) return;
    dispatch({
      type: 'END_SHIFT_ASSIGNMENT',
      payload: {
        shiftId: selectedShift.id,
        assignmentId: selectedOpenAssignment.id,
      },
    });
    setSelectedCell(null);
    setPopupSearch('');
  };

  const closeSelectedCell = () => {
    setSelectedCell(null);
    setPopoverAnchor(null);
    setPopupSearch('');
  };

  const addDraftSlot = () => {
    setTemplateDraft((prev) => ({
      ...prev,
      slots: [...prev.slots, createSlot(prev.slots.length)],
    }));
  };

  const removeDraftSlot = (slotId: string) => {
    setTemplateDraft((prev) => ({
      ...prev,
      slots: prev.slots.filter((slot) => slot.id !== slotId),
    }));
  };

  const toggleTemplateCollapsed = (templateId: string) => {
    setCollapsedTemplates((prev) => {
      const next = { ...prev, [templateId]: !prev[templateId] };
      try { localStorage.setItem(COLLAPSED_TEMPLATES_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const moveTemplate = (templateId: string, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_SHIFT_TEMPLATE', payload: { templateId, direction } });
  };

  const handleAutoArrange = () => {
    const availableCouriers = state.couriers;
    if (availableCouriers.length === 0) return;

    const weekShifts = state.shifts.filter(s => s.date >= weekStartKey && s.date <= weekEndKey && s.date >= todayKey);
    let courierIndex = 0;
    let assigned = 0;

    for (const shift of weekShifts) {
      const template = visibleShiftTemplates.find(t => t.id === shift.templateId);
      if (!template) continue;

      for (const slot of template.slots) {
        const alreadyAssigned = shift.courierAssignments.some(a => a.slotId === slot.id && a.courierId);
        if (alreadyAssigned) continue;

        const courier = availableCouriers[courierIndex % availableCouriers.length];
        dispatch({
          type: 'ASSIGN_COURIER_TO_SHIFT',
          payload: { shiftId: shift.id, courierId: courier.id, slotId: slot.id },
        });
        courierIndex++;
        assigned++;
      }
    }

    if (assigned === 0) {
      toast.error('\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05e9\u05dc\u05d9\u05d7\u05d9\u05dd \u05d6\u05de\u05d9\u05e0\u05d9\u05dd \u05dc\u05e1\u05d9\u05d3\u05d5\u05e8 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9.');
    }
  };

  const selectedDayLabel = selectedDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const selectedDaySummaryItems: InfoBarItem[] = [
    { label: '\u05ea\u05d0\u05d9\u05dd', value: selectedDaySummary.totalSlots },
    { label: '\u05de\u05d0\u05d5\u05d9\u05e9', value: selectedDaySummary.staffedSlots, tone: 'success' },
    { label: '\u05e4\u05e0\u05d5\u05d9\u05d9\u05dd', value: selectedDaySummary.emptySlots, tone: 'muted' },
    { label: '\u05e4\u05e2\u05d9\u05dc\u05d9\u05dd', value: selectedDaySummary.activeAssignments, tone: 'info' },
    { label: '\u05de\u05ea\u05d5\u05db\u05e0\u05e0\u05d9\u05dd', value: selectedDaySummary.plannedAssignments, tone: 'warning' },
  ];

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-app-surface" dir="rtl">
        <PageToolbar
          periodControl={
            <ToolbarWeekPicker
              selectedDate={selectedDate}
              onDateChange={(date) => {
                setSelectedDate(date);
                setSelectedCell(null);
              }}
            />
          }
          actions={
            <>
              <ToolbarIconButton onClick={handleAutoArrange} label={'\u05e1\u05d9\u05d3\u05d5\u05e8 \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9 \u05dc\u05e9\u05d1\u05d5\u05e2'}>
                <CalendarDays className="h-4 w-4 text-app-brand" />
              </ToolbarIconButton>
              <ToolbarIconButton onClick={handleOpenCreateTemplate} label={'\u05de\u05e9\u05de\u05e8\u05ea \u05d7\u05d3\u05e9\u05d4'}>
                <Plus className="h-4 w-4" />
              </ToolbarIconButton>
              <ToolbarIconButton onClick={handleGoToCouriers} label={'\u05e9\u05dc\u05d9\u05d7 \u05d7\u05d3\u05e9'}>
                <UserPlus className="h-4 w-4" />
              </ToolbarIconButton>
            </>
          }
        />

        <InfoBar
          leadLabel={'\u05d9\u05d5\u05dd \u05e0\u05d1\u05d7\u05e8'}
          leadValue={selectedDayLabel}
          items={selectedDaySummaryItems}
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-b border-[#e5e5e5] bg-white dark:border-app-border dark:bg-app-surface">
          <div className="flex-1 overflow-x-auto overflow-y-auto bg-white overscroll-contain dark:bg-app-surface" dir="rtl">
            <div className="w-full min-w-[700px] lg:min-w-[960px] xl:min-w-[1040px]" dir="rtl">
              <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-[#d4d4d4] bg-white dark:border-app-border dark:bg-app-surface">
                {weekDays.map(({ date, dayKey }) => {
                  const isSelected = dayKey === selectedDateKey;
                  const isToday = dayKey === todayKey;

                  return (
                    <button
                      key={dayKey}
                      onClick={() => setSelectedDate(date)}
                      className={`relative border-l border-[#e5e5e5] px-3 py-3 text-center transition-colors dark:border-app-border ${
                        isSelected
                          ? 'bg-[#0d0d12] text-white dark:bg-app-surface dark:text-[#fafafa]'
                          : 'bg-[#fafafa] text-[#737373] dark:bg-app-surface dark:text-[#737373] hover:bg-[#f0f0f0] dark:hover:bg-[#161616]'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#9fe870]" />
                      )}
                      <div className="text-[11px] font-medium">{DAY_LABELS[date.getDay() as DayOfWeek]}</div>
                      <div className={`mt-1 text-sm font-semibold ${isSelected ? 'text-white dark:text-[#fafafa]' : ''}`}>{date.getDate()}</div>
                      {isToday ? <div className={`mt-1 text-[10px] font-medium ${isSelected ? 'text-white/70 dark:text-[#a3a3a3]' : 'text-[#9fe870]'}`}>{'\u05d4\u05d9\u05d5\u05dd'}</div> : null}
                    </button>
                  );
                })}
              </div>

              <div className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                {visibleShiftTemplates.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                    <div className="text-base font-semibold text-[#0d0d12] dark:text-[#fafafa]">{'\u05d0\u05d9\u05df \u05e2\u05d3\u05d9\u05d9\u05df \u05de\u05e9\u05de\u05e8\u05d5\u05ea'}</div>
                    <div className="max-w-sm text-sm text-[#737373] dark:text-[#a3a3a3]">
                      {'\u05e6\u05d5\u05e8 \u05de\u05e9\u05de\u05e8\u05ea \u05e8\u05d0\u05e9\u05d5\u05e0\u05d4, \u05d4\u05d5\u05e1\u05e3 \u05dc\u05d4 \u05ea\u05d0\u05d9\u05dd, \u05d5\u05d0\u05d6 \u05ea\u05d5\u05db\u05dc \u05dc\u05d4\u05ea\u05d7\u05d9\u05dc \u05dc\u05d0\u05d9\u05d9\u05e9 \u05d0\u05d5\u05ea\u05d4 \u05dc\u05d0\u05d5\u05e8\u05da \u05db\u05dc \u05d4\u05e9\u05d1\u05d5\u05e2.'}
                    </div>
                    <button
                      type="button"
                      onClick={openCreateTemplate}
                      className="text-sm font-medium text-[#16a34a] transition-colors hover:text-[#15803d] dark:text-[#9fe870] dark:hover:text-[#b6f58f]"
                    >
                      <span>{'\u05de\u05e9\u05de\u05e8\u05ea \u05d7\u05d3\u05e9\u05d4'}</span>
                    </button>
                  </div>
                ) : visibleShiftTemplates.map((template, templateIndex) => (
                  <section key={template.id}>
                    <div className="relative grid grid-cols-7 border-b border-[#e5e5e5] dark:border-app-border">
                        <div
                        className={`col-span-7 flex items-center justify-center px-12 py-2.5 cursor-pointer select-none transition-[filter] hover:brightness-[0.99] dark:hover:brightness-110 ${(template.name === 'בלת"ם' ? EMERGENCY_SHIFT_ROW_STYLE : SHIFT_TYPE_ROW_STYLES[template.type]).shell}`}
                          onClick={() => toggleTemplateCollapsed(template.id)}
                        >
                        <div className={`truncate text-center text-[14px] font-semibold tracking-wide ${(template.name === 'בלת"ם' ? EMERGENCY_SHIFT_ROW_STYLE : SHIFT_TYPE_ROW_STYLES[template.type]).name}`}>
                            {template.name}
                          </div>
                        </div>
                      <button
                        type="button"
                        onClick={() => toggleTemplateCollapsed(template.id)}
                        className="absolute left-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-[4px] p-1.5 text-[#a3a3a3] transition-colors hover:bg-[#e5e5e5] dark:text-[#525252] dark:hover:bg-[#1e1e1e]"
                      >
                        {collapsedTemplates[template.id] ? (
                          <Plus className="h-4 w-4 shrink-0" />
                        ) : (
                          <Minus className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditTemplate(template)}
                        className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-[4px] p-1.5 text-[#a3a3a3] transition-colors hover:bg-[#e5e5e5] dark:text-[#525252] dark:hover:bg-[#1e1e1e]"
                      >
                        <Menu className="h-4 w-4" />
                      </button>
                      <div className="absolute left-10 top-1/2 flex -translate-y-1/2 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveTemplate(template.id, 'up')}
                          disabled={templateIndex === 0}
                          className="inline-flex items-center justify-center rounded-[4px] p-1.5 text-[#a3a3a3] transition-colors hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#525252] dark:hover:bg-[#1e1e1e]"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTemplate(template.id, 'down')}
                          disabled={templateIndex === visibleShiftTemplates.length - 1}
                          className="inline-flex items-center justify-center rounded-[4px] p-1.5 text-[#a3a3a3] transition-colors hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#525252] dark:hover:bg-[#1e1e1e]"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {!collapsedTemplates[template.id] &&
                      template.slots.map((slot) => (
                        <div key={slot.id} className="grid grid-cols-7 border-b border-[#f1f1f1] last:border-b-0 dark:border-app-border">
                          {weekDays.map(({ date, dayKey }) => {
                            const shift = shiftsByTemplateAndDay.get(`${template.id}:${dayKey}`) ?? null;
                            const assignment = shift ? getLatestSlotAssignment(shift.courierAssignments, slot.id) : null;
                            const courier = assignment
                              ? state.couriers.find((item) => item.id === assignment.courierId) ?? null
                              : null;
                            const workedMinutes = assignment ? getAssignmentWorkedMinutes(assignment) : 0;
                            const assignmentStateLabel = getAssignmentStateLabel(assignment);
                            const assignmentTimeRange = formatAssignmentTimeRange(assignment);
                            const isSelected =
                              selectedCell?.shiftId === shift?.id && selectedCell?.slotId === slot.id;

                            return (
                              <button
                                key={`${template.id}-${slot.id}-${dayKey}`}
                                onClick={(e) => {
                                  if (!shift) return;
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setPopoverAnchor({ cx: rect.left + rect.width / 2, cy: rect.bottom });
                                  setSelectedDate(date);
                                  setSelectedCell({
                                    shiftId: shift.id,
                                    templateId: template.id,
                                    slotId: slot.id,
                                    dayKey,
                                  });
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!shift || !assignment?.courierId) return;
                                setCellContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  shiftId: shift.id,
                                  assignmentId: assignment.id,
                                  started: !!(assignment.startedAt && !assignment.endedAt),
                                  ended: !!assignment.endedAt,
                                  offline: courier?.status === 'offline',
                                  dayKey,
                                });
                              }}
                                className={`h-[72px] border-l border-[#ececec] p-0 text-center transition-colors dark:border-app-border flex flex-col overflow-hidden lg:h-[82px] ${
                                  isSelected
                                    ? 'bg-[#f5f5f5] ring-inset ring-1 ring-[#d4d4d4] dark:bg-app-surface dark:ring-[#333333]'
                                    : 'bg-white hover:bg-[#fafafa] dark:bg-app-surface dark:hover:bg-[#1a1a1a]'
                                }`}
                              >
                                <>
                                  {/* Courier name row */}
                                  <div className="w-full h-1/2 bg-[#f0f0f0] dark:bg-app-surface flex items-center justify-center px-2 shrink-0">
                                    {courier ? (
                                      <div className="truncate text-[12px] font-semibold text-[#0d0d12] dark:text-[#e5e5e5] leading-none w-full text-center">
                                        {courier.name}
                                      </div>
                                    ) : null}
                                  </div>
                                  {/* Divider */}
                                  <div className="w-full h-px bg-[#e5e5e5] dark:bg-[#262626] shrink-0" />
                                  {/* Shift time row */}
                                  <div className="w-full flex-1 flex items-center justify-center gap-1 px-2" dir="ltr">
                                    {(() => {
                                      const fmtTime = (d: Date) => new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                                      const startLabel = assignment?.startedAt ? fmtTime(assignment.startedAt) : template.startTime;
                                      const endLabel   = assignment?.endedAt   ? fmtTime(assignment.endedAt)   : template.endTime;
                                      return (
                                        <>
                                          <span className={`text-[12px] font-semibold font-mono leading-none px-1 py-0.5 rounded ${
                                            courier && assignment?.startedAt
                                              ? 'bg-[#16a34a]/15 text-[#16a34a] dark:bg-[#4ade80]/15 dark:text-[#4ade80]'
                                              : 'text-[#c5c5c5] dark:text-[#404040]'
                                          }`}>
                                            {startLabel}
                                          </span>
                                          <span className="text-[#d4d4d4] dark:text-[#333] text-[12px]">-</span>
                                          <span className={`text-[12px] font-semibold font-mono leading-none px-1 py-0.5 rounded ${
                                            courier && assignment?.endedAt
                                              ? 'bg-[#16a34a]/15 text-[#16a34a] dark:bg-[#4ade80]/15 dark:text-[#4ade80]'
                                              : 'text-[#c5c5c5] dark:text-[#404040]'
                                          }`}>
                                            {endLabel}
                                          </span>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </>
                              </button>
                            );
                          })}

                        </div>
                      ))}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>

      {selectedCell && selectedShift && selectedSlot && selectedCellPopoverStyle && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={closeSelectedCell} />
          <div
            className="fixed z-50 overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-app-border dark:bg-app-surface"
            style={selectedCellPopoverStyle}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0d0d12] dark:text-[#fafafa]">{'\u05e9\u05d9\u05d5\u05da \u05dc\u05ea\u05d0'}</h3>
                <div className="mt-1 text-sm text-[#737373] dark:text-[#a3a3a3]">
                  {selectedTemplate?.name}
                </div>
                <div className="mt-1 text-[11px] text-[#8a8a8a] dark:text-[#777777]">
                  {selectedShift.startTime} - {selectedShift.endTime} | {new Date(selectedShift.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>

              <button onClick={closeSelectedCell} className="rounded-[4px] p-2 text-[#737373] dark:text-[#a3a3a3]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-[4px] border border-[#e5e5e5] bg-[#fafafa] p-3 dark:border-app-border dark:bg-app-surface">
              <div className="text-xs text-[#737373] dark:text-[#a3a3a3]">{'\u05de\u05e6\u05d1 \u05d4\u05ea\u05d0'}</div>
              <div className="mt-1 text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">
                {selectedCourier ? selectedCourier.name : '\u05e4\u05e0\u05d5\u05d9'}
              </div>
              <div className="mt-1 text-[11px] text-[#8a8a8a] dark:text-[#777777]">
                {selectedAssignment
                  ? formatAssignmentTimeRange(selectedAssignment) ?? formatWorkedDuration(getAssignmentWorkedMinutes(selectedAssignment))
                  : `${selectedShift.startTime} - ${selectedShift.endTime}`}
              </div>
              {selectedAssignment ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedOpenAssignment?.startedAt && !selectedOpenAssignment.endedAt ? (
                    <button
                      onClick={endSelectedAssignment}
                      className="inline-flex items-center gap-2 rounded-[4px] border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:text-amber-400"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{'\u05e1\u05d9\u05d9\u05dd \u05de\u05e9\u05de\u05e8\u05ea'}</span>
                    </button>
                  ) : selectedOpenAssignment ? (
                    <button
                      onClick={clearSelectedAssignment}
                      className="inline-flex items-center gap-2 rounded-[4px] border border-red-200 px-3 py-2 text-xs font-medium text-red-600 dark:border-red-500/20 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{'\u05e0\u05e7\u05d4 \u05d0\u05d9\u05d5\u05e9'}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedAssignmentCompleted ? (
              <div className="mt-4 rounded-[4px] border border-[#e5e5e5] bg-[#fafafa] px-3 py-3 text-xs leading-5 text-[#737373] dark:border-app-border dark:bg-app-surface dark:text-[#a3a3a3]">
                {'\u05de\u05e9\u05de\u05e8\u05ea \u05e9\u05d4\u05e1\u05ea\u05d9\u05d9\u05de\u05d4 \u05e0\u05e2\u05d5\u05dc\u05d4 \u05dc\u05e2\u05e8\u05d9\u05db\u05d4. \u05e8\u05d9\u05e9\u05d5\u05dd \u05d4\u05e9\u05e2\u05d5\u05ea \u05e0\u05e9\u05de\u05e8, \u05d5\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05e9\u05e0\u05d5\u05ea \u05db\u05d0\u05df \u05d0\u05ea \u05d4\u05d0\u05d9\u05d5\u05e9.'}
              </div>
            ) : (
              <>
            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" />
              <input
                value={popupSearch}
                onChange={(e) => setPopupSearch(e.target.value)}
                placeholder={'\u05d7\u05e4\u05e9 \u05e9\u05dc\u05d9\u05d7'}
                className="w-full rounded-[4px] border border-[#e5e5e5] bg-[#fafafa] py-2.5 pr-9 pl-3 text-sm dark:border-app-border dark:bg-app-surface"
              />
            </div>

            <div className="mt-3 max-h-[200px] overflow-auto rounded-[4px] border border-[#e5e5e5] dark:border-app-border">
              <div className="divide-y divide-[#e5e5e5] dark:divide-[#262626]">
                {popupCouriers.map((courier) => {
                  const isAssigned = selectedOpenAssignment?.courierId === courier.id;
                  const isBusy = !isAssigned && busyCourierIds.has(courier.id);

                  return (
                    <div key={courier.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${isBusy ? 'opacity-40' : ''}`}>
                      <div className="min-w-0 flex-1 flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${courier.status === 'offline' ? 'bg-[#d4d4d4] dark:bg-[#525252]' : 'bg-[#22c55e]'}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{courier.name}</div>
                          <div className="mt-0.5 text-[11px] text-[#8a8a8a] dark:text-[#777777]">
                            {isBusy ? '\u05de\u05e9\u05d5\u05d1\u05e5 \u05d1\u05de\u05e9\u05de\u05e8\u05ea \u05d0\u05d7\u05e8\u05ea' : courier.status === 'offline' ? '\u05dc\u05d0 \u05de\u05d7\u05d5\u05d1\u05e8' : '\u05de\u05d7\u05d5\u05d1\u05e8'}
                          </div>
                        </div>
                      </div>

                      {isAssigned ? (
                        <div className="rounded-[4px] bg-[#f5f5f5] px-3 py-1.5 text-xs font-medium text-[#737373] dark:bg-app-surface dark:text-[#a3a3a3]">
                          {'\u05de\u05e9\u05d5\u05d9\u05da'}
                        </div>
                      ) : isBusy ? (
                        <div className="rounded-[4px] bg-[#f5f5f5] px-3 py-1.5 text-xs font-medium text-[#737373] dark:bg-app-surface dark:text-[#a3a3a3]">
                          {'\u05ea\u05e4\u05d5\u05e1'}
                        </div>
                      ) : (
                        <button
                          onClick={() => assignCourierToSelectedCell(courier.id)}
                          className="rounded-[4px] bg-[#9fe870] px-3 py-1.5 text-xs font-semibold text-[#0d0d12]"
                        >
                          {'\u05d1\u05d7\u05e8'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>
          </div>
        </>
      , document.body)}

      {courierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={closeCourierModal}>
          <div
            className="w-full max-w-md rounded-[4px] border border-[#e5e5e5] bg-white p-5 dark:border-app-border dark:bg-app-surface"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#0d0d12] dark:text-[#fafafa]">{'\u05d4\u05d5\u05e1\u05e3 \u05e9\u05dc\u05d9\u05d7 \u05d7\u05d3\u05e9'}</div>
                <div className="mt-1 text-sm text-[#737373] dark:text-[#a3a3a3]">{'\u05de\u05de\u05dc\u05d0\u05d9\u05dd \u05e4\u05e8\u05d8\u05d9\u05dd \u05d1\u05e1\u05d9\u05e1\u05d9\u05d9\u05dd \u05db\u05d3\u05d9 \u05dc\u05d4\u05d5\u05e1\u05d9\u05e3 \u05d0\u05d5\u05ea\u05d5 \u05dc\u05de\u05e2\u05e8\u05db\u05ea.'}</div>
              </div>
              <button
                type="button"
                onClick={closeCourierModal}
                className="rounded-[4px] p-2 text-[#737373] transition-colors hover:bg-[#f5f5f5] dark:text-[#a3a3a3] dark:hover:bg-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{'\u05e9\u05dd \u05de\u05dc\u05d0'}</label>
                <input
                  value={newCourier.name}
                  onChange={(event) => setNewCourier((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={'\u05db\u05ea\u05d5\u05d1 \u05e9\u05dd \u05de\u05dc\u05d0'}
                  className="w-full rounded-[4px] border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5 text-sm text-[#0d0d12] outline-none transition-colors focus:border-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-[#fafafa]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#0d0d12] dark:text-[#fafafa]">{'\u05d8\u05dc\u05e4\u05d5\u05df'}</label>
                <input
                  value={newCourier.phone}
                  onChange={(event) => setNewCourier((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder={'\u05db\u05ea\u05d5\u05d1 \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df'}
                  className="w-full rounded-[4px] border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5 text-sm text-[#0d0d12] outline-none transition-colors focus:border-[#9fe870] dark:border-app-border dark:bg-app-surface dark:text-[#fafafa]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCourierModal}
                className="rounded-[4px] border border-[#e5e5e5] px-4 py-2.5 text-sm font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:border-app-border dark:text-[#d4d4d4] dark:hover:bg-[#111111]"
              >
                {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
              </button>
              <button
                type="button"
                onClick={addCourier}
                disabled={!newCourier.name.trim() || !newCourier.phone.trim()}
                className="rounded-[4px] bg-[#9fe870] px-4 py-2.5 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#8dd960] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {'\u05d4\u05d5\u05e1\u05e3 \u05e9\u05dc\u05d9\u05d7'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context menu for shift cell actions */}
      {cellContextMenu && createPortal(
        <div
          className="fixed inset-0 z-[9999]"
          onClick={() => setCellContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setCellContextMenu(null); }}
        >
          <div
            className="absolute min-w-[170px] bg-white dark:bg-app-surface border border-[#e5e5e5] dark:border-app-border rounded-xl shadow-2xl overflow-hidden"
            style={getContextMenuStyle(cellContextMenu)}
            onClick={(e) => e.stopPropagation()}
          >
            {cellContextMenu.started ? (
              <button
                onClick={() => {
                  dispatch({ type: 'END_SHIFT_ASSIGNMENT', payload: { shiftId: cellContextMenu.shiftId, assignmentId: cellContextMenu.assignmentId } });
                  setCellContextMenu(null);
                }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-right"
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{'\u05e1\u05d9\u05d9\u05dd \u05de\u05e9\u05de\u05e8\u05ea'}</span>
                  </button>
            ) : !cellContextMenu.ended && !cellContextMenu.offline && cellContextMenu.dayKey === todayKey ? (
              <>
                <button
                  onClick={() => {
                    dispatch({ type: 'START_SHIFT_ASSIGNMENT', payload: { shiftId: cellContextMenu.shiftId, assignmentId: cellContextMenu.assignmentId } });
                    setCellContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors text-right"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{'\u05d4\u05ea\u05d7\u05dc \u05de\u05e9\u05de\u05e8\u05ea'}</span>
                  </button>
                <div className="border-t border-[#f0f0f0] dark:border-app-border" />
              </>
            ) : null}
          {!cellContextMenu.started && !cellContextMenu.ended && (
            <button
              onClick={() => {
                dispatch({ type: 'REMOVE_COURIER_FROM_SHIFT', payload: { shiftId: cellContextMenu.shiftId, assignmentId: cellContextMenu.assignmentId } });
                setCellContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-right"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>{'\u05d4\u05e1\u05e8 \u05e9\u05d9\u05d1\u05d5\u05e5'}</span>
            </button>
          )}
        </div>
        </div>,
        document.body
      )}

      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={closeTemplateModal}>
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-app-border dark:bg-app-surface"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#f0f0f0] dark:border-[#1a1a1a] px-6 py-5">
              <div>
                <h3 className="text-[17px] font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                  {editingTemplate ? '\u05e2\u05e8\u05d9\u05db\u05ea \u05de\u05e9\u05de\u05e8\u05ea' : '\u05e6\u05d5\u05e8 \u05de\u05e9\u05de\u05e8\u05ea'}
                </h3>
                <p className="mt-0.5 text-[13px] text-[#737373] dark:text-[#666]">
                  {editingTemplate
                    ? '\u05db\u05d0\u05df \u05de\u05e0\u05d4\u05dc\u05d9\u05dd \u05d0\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05dd \u05d5\u05d0\u05ea \u05d4\u05ea\u05d0\u05d9\u05dd \u05e9\u05dc \u05d4\u05de\u05e9\u05de\u05e8\u05ea'
                    : '\u05d9\u05d5\u05e6\u05e8\u05d9\u05dd \u05de\u05e9\u05de\u05e8\u05ea \u05d7\u05d3\u05e9\u05d4 \u05d5\u05de\u05d5\u05e1\u05d9\u05e4\u05d9\u05dd \u05dc\u05d4 \u05ea\u05d0\u05d9\u05dd \u05e9\u05de\u05e9\u05ea\u05db\u05e4\u05dc\u05d9\u05dd \u05dc\u05d0\u05d5\u05e8\u05da \u05db\u05dc \u05d4\u05e9\u05d1\u05d5\u05e2'}
                </p>
              </div>
              <button
                onClick={closeTemplateModal}
                className="mt-0.5 rounded-lg p-1.5 text-[#a3a3a3] transition-colors hover:bg-[#f5f5f5] dark:text-[#555] dark:hover:bg-[#1a1a1a]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#525252] dark:text-[#a3a3a3]">{'\u05e9\u05dd \u05d4\u05de\u05e9\u05de\u05e8\u05ea'}</label>
                <input
                  value={templateDraft.name}
                  onChange={(e) => setTemplateDraft((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm text-[#0d0d12] outline-none transition-colors focus:border-[#9fe870] focus:ring-2 focus:ring-[#9fe870]/20 dark:border-app-border dark:bg-app-surface dark:text-[#fafafa] placeholder:text-[#b0b0b0] dark:placeholder:text-[#444]"
                  placeholder={'\u05dc\u05de\u05e9\u05dc: \u05de\u05e9\u05de\u05e8\u05ea \u05d1\u05d5\u05e7\u05e8'}
                />
              </div>

              {/* Times */}
              <div className="space-y-3">
                <label className="text-[13px] font-medium text-[#525252] dark:text-[#a3a3a3]">{'\u05e9\u05e2\u05d5\u05ea \u05d4\u05de\u05e9\u05de\u05e8\u05ea'}</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="text-[12px] text-[#a3a3a3] dark:text-[#555] text-center">{'\u05e9\u05e2\u05ea \u05d4\u05ea\u05d7\u05dc\u05d4'}</div>
                    <TimePicker
                      value={templateDraft.startTime}
                      onChange={(v) => setTemplateDraft((prev) => ({ ...prev, startTime: v }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[12px] text-[#a3a3a3] dark:text-[#555] text-center">{'\u05e9\u05e2\u05ea \u05e1\u05d9\u05d5\u05dd'}</div>
                    <TimePicker
                      value={templateDraft.endTime}
                      onChange={(v) => setTemplateDraft((prev) => ({ ...prev, endTime: v }))}
                    />
                  </div>
                </div>
              </div>

              {/* Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="text-[13px] font-medium text-[#525252] dark:text-[#a3a3a3]">{'\u05db\u05de\u05d5\u05ea \u05e9\u05dc\u05d9\u05d7\u05d9\u05dd \u05d1\u05de\u05e9\u05de\u05e8\u05ea'}</label>
                    <p className="mt-0.5 text-[11px] text-[#a3a3a3] dark:text-[#555]">{'\u05db\u05dc \u05de\u05e1\u05e4\u05e8 \u05de\u05d9\u05d9\u05e6\u05d2 \u05de\u05e7\u05d5\u05dd \u05e9\u05d9\u05d1\u05d5\u05e5 \u05d0\u05d7\u05d3 \u05d1\u05de\u05e9\u05de\u05e8\u05ea'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={addDraftSlot}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-[12px] font-medium text-[#525252] transition-colors hover:bg-[#f0f0f0] dark:border-app-border dark:bg-app-surface dark:text-[#a3a3a3] dark:hover:bg-[#1a1a1a]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {'\u05d4\u05d5\u05e1\u05e3 \u05ea\u05d0'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {templateDraft.slots.map((slot, index) => (
                    <div key={slot.id} className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-2 dark:border-app-border dark:bg-app-surface">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-semibold text-[#737373] dark:bg-app-surface dark:text-[#a3a3a3]">
                        {index + 1}
                      </div>
                      {templateDraft.slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDraftSlot(slot.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addDraftSlot}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d4d4d4] bg-[#fafafa] px-3 py-3 text-sm text-[#a3a3a3] transition-colors hover:bg-[#f5f5f5] hover:text-[#737373] dark:border-app-border dark:bg-[#0d0d0d] dark:text-[#555] dark:hover:bg-[#111111] dark:hover:text-[#737373]"
                >
                  <Plus className="h-4 w-4" />
                  {'\u05d4\u05d5\u05e1\u05e3 \u05ea\u05d0 \u05e0\u05d5\u05e1\u05e3'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#f0f0f0] dark:border-[#1a1a1a] px-6 py-4">
              <div>
                {editingTemplate && (
                  <button
                    onClick={() => deleteTemplate(editingTemplate.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200/70 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-500/10 dark:text-red-400 dark:hover:bg-red-500/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {'\u05de\u05d7\u05e7 \u05de\u05e9\u05de\u05e8\u05ea'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeTemplateModal}
                  className="rounded-xl border border-[#e5e5e5] px-4 py-2.5 text-sm font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5] dark:border-app-border dark:text-[#a3a3a3] dark:hover:bg-[#1a1a1a]"
                >
                  {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
                </button>
                <button
                  onClick={saveTemplate}
                  className="rounded-xl bg-[#9fe870] px-5 py-2.5 text-sm font-semibold text-[#0d0d12] transition-colors hover:bg-[#8dd960]"
                >
                  {editingTemplate ? '\u05e9\u05de\u05d5\u05e8' : '\u05e6\u05d5\u05e8 \u05de\u05e9\u05de\u05e8\u05ea'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};



