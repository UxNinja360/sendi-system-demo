import React, { useState, useRef, useEffect } from 'react';
import { Delivery, Courier, DeliveryStatus } from '../types/delivery.types';
import {
  Copy,
  UserPlus,
  XCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Info,
  Edit,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EntityTableActionsCell,
  EntityTableRowCheckbox,
} from '../components/common/entity-table-shell';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import { ALL_COLUMNS, CUSTOM_COLUMN_IDS, COLUMN_MAP } from './column-defs';
import type { ColumnDef } from './column-defs';
import { STATUS_CONFIG, ALL_STATUSES } from './status-config';

export type RowHeight = 'compact' | 'normal' | 'comfortable';

interface DeliveryTableRowProps {
  delivery: Delivery;
  courier: Courier | null;
  timeRemaining: number | null;
  formatTime: (seconds: number) => string;
  visibleColumns: Set<string>;
  onNavigate: () => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDrawer: (id: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryStatus) => void;
  onCancelDelivery: (deliveryId: string) => void;
  onCompleteDelivery: (deliveryId: string) => void;
  onUnassignCourier?: (deliveryId: string) => void;
  onEditDelivery?: (deliveryId: string) => void;
  isDrawerTarget?: boolean;
  orderedColumns?: ColumnDef[];
  rowHeight?: RowHeight;
}

export const DeliveryTableRow: React.FC<DeliveryTableRowProps> = ({
  delivery,
  courier,
  timeRemaining,
  formatTime,
  visibleColumns,
  onNavigate,
  isSelected,
  onToggleSelect,
  onOpenDrawer,
  onStatusChange,
  onCancelDelivery,
  onCompleteDelivery,
  onUnassignCourier,
  onEditDelivery,
  isDrawerTarget,
  orderedColumns,
  rowHeight = 'normal',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setContextMenuPos(null);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const config = STATUS_CONFIG[delivery.status];
  const StatusIcon = config.icon;

  // Row height configuration
  const rowHeightConfig = {
    compact: { py: 'py-1.5', text: 'text-[11px]', iconSize: 'w-3 h-3', gap: 'gap-1' },
    normal: { py: 'py-2.5', text: 'text-xs', iconSize: 'w-3.5 h-3.5', gap: 'gap-1.5' },
    comfortable: { py: 'py-3.5', text: 'text-sm', iconSize: 'w-4 h-4', gap: 'gap-2' },
  };
  const heightClasses = rowHeightConfig[rowHeight];

  const handleStatusChange = (newStatus: DeliveryStatus) => {
    if (newStatus === delivery.status) return;
    if (newStatus === 'cancelled') {
      onCancelDelivery(delivery.id);
    } else if (newStatus === 'delivered') {
      onCompleteDelivery(delivery.id);
    } else {
      onStatusChange(delivery.id, newStatus);
    }
    setStatusDropdownOpen(false);
    toast.success(`סטטוס עודכן ל${STATUS_CONFIG[newStatus].label}`);
  };

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(delivery.orderNumber);
    toast.success(`מספר הזמנה ${delivery.orderNumber} הועתק`);
    setMenuOpen(false);
    setContextMenuPos(null);
  };

  const closeMenus = () => {
    setMenuOpen(false);
    setContextMenuPos(null);
    setStatusDropdownOpen(false);
  };

  // Custom cell renderers for special columns
  const renderCustomCell = (colId: string): React.ReactNode => {
    switch (colId) {
      case 'orderNumber':
        return (
          <td key={colId} className={`pr-2 pl-2 ${heightClasses.py}`}>
            <button
              onClick={() => onOpenDrawer(delivery.id)}
              className={`${heightClasses.text} text-[#0d0d12] dark:text-[#fafafa] font-medium hover:text-[#16a34a] dark:hover:text-[#9fe870] hover:underline underline-offset-2 transition-colors cursor-pointer whitespace-nowrap`}
            >
              {delivery.orderNumber}
            </button>
          </td>
        );

      case 'status':
        return (
          <td key={colId} className={`pr-2 pl-2 ${heightClasses.py} ${heightClasses.text}`}>
            <span className={`font-medium whitespace-nowrap ${config.tableColor}`}>
              {config.label}
            </span>
          </td>
        );

      case 'courier':
        return (
          <td key={colId} className={`pr-2 pl-2 ${heightClasses.py} ${heightClasses.text}`}>
            {courier ? (
              <span className="text-[#0d0d12] dark:text-[#fafafa] font-medium whitespace-nowrap">{courier.name}</span>
            ) : (
              <span className="text-[#737373] dark:text-[#a3a3a3]">-</span>
            )}
          </td>
        );

      case 'timeRemaining':
        return (
          <td key={colId} className={`pr-2 pl-2 ${heightClasses.py} ${heightClasses.text}`}>
            {timeRemaining !== null ? (
              <span className="text-[#3b82f6] dark:text-[#60a5fa] font-medium">{formatTime(timeRemaining)}</span>
            ) : (
              <span className="text-[#737373] dark:text-[#a3a3a3]">-</span>
            )}
          </td>
        );

      case 'price':
        return (
          <td key={colId} className={`pr-2 pl-2 ${heightClasses.py} ${heightClasses.text} text-[#16a34a] dark:text-[#22c55e] font-bold whitespace-nowrap`}>
            ₪{delivery.price}
          </td>
        );

      default:
        return null;
    }
  };

  // Style for text-based columns based on type
  const getTextStyle = (colId: string, type: string): string => {
    const col = COLUMN_MAP.get(colId);
    if (!col) return 'text-[#666d80] dark:text-[#a3a3a3]';

    // Bold primary fields
    if (['rest_name', 'client_name'].includes(colId)) {
      return 'text-[#0d0d12] dark:text-[#fafafa] font-medium';
    }
    // Money = green
    if (type === 'money') {
      return 'text-[#16a34a] dark:text-[#22c55e]';
    }
    // Mono for IDs
    if (colId.includes('_id') || colId === 'id' || colId.includes('Id') || colId === 'zipcode' || colId === 'sms_code') {
      return 'text-[#666d80] dark:text-[#a3a3a3] font-mono';
    }
    return 'text-[#666d80] dark:text-[#a3a3a3]';
  };

  return (
    <tr
      onContextMenu={(e) => {
        e.preventDefault();
        setStatusDropdownOpen(false);
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
      }}
      className={`group border-b border-[#e5e5e5] dark:border-[#262626] last:border-b-0 transition-colors ${
        isDrawerTarget
          ? 'bg-[#dcfce7]/50 dark:bg-[#14532d]/30'
          : isSelected
            ? 'bg-[#dbeafe]/50 dark:bg-[#1e3a8a]/20'
            : 'hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]'
      }`}
    >
      <EntityTableRowCheckbox
        checked={isSelected}
        onChange={() => onToggleSelect(delivery.id)}
      />

      {/* Data columns - driven by column-defs */}
      {(orderedColumns || ALL_COLUMNS).map(col => {
        if (!visibleColumns.has(col.id)) return null;

        // Custom columns get special rendering
        if (CUSTOM_COLUMN_IDS.has(col.id)) {
          return renderCustomCell(col.id);
        }

        // Generic rendering for all other columns
        const value = col.getValue(delivery, { courier, timeRemaining, formatTime });
        const textStyle = getTextStyle(col.id, col.type);
        const isLongText = ['text'].includes(col.type) && (
          col.id.includes('address') || col.id.includes('comment') || col.id.includes('remark') ||
          col.id.includes('feedback') || col.id.includes('answer') || col.id.includes('notes') ||
          col.id === 'api_str_order_id' || col.id === 'client_full_address'
        );

        return (
          <td
            key={col.id}
            className={`pr-2 pl-2 ${heightClasses.py} ${heightClasses.text} ${textStyle} whitespace-nowrap ${isLongText ? 'max-w-[180px] truncate' : ''}`}
          >
            {value}
          </td>
        );
      })}

      {/* Actions column */}
      <EntityTableActionsCell
        className={heightClasses.py}
        contentClassName="items-center justify-end gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-0.5" data-no-row-click>
          {/* Quick actions — visible on row hover */}
          <button
            onClick={() => onOpenDrawer(delivery.id)}
            style={{ display: 'none' }}
            className="p-1 rounded-lg hover:bg-[#f0fdf4] dark:hover:bg-[#052e16] text-[#16a34a] dark:text-[#9fe870] transition-opacity"
            title="פרטים מלאים"
          >
            <Info className={heightClasses.iconSize} />
          </button>
          {onEditDelivery && (
            <button
              onClick={() => onEditDelivery(delivery.id)}
              style={{ display: 'none' }}
              className="p-1 rounded-lg hover:bg-[#f0fdf4] dark:hover:bg-[#052e16] text-[#16a34a] dark:text-[#9fe870] transition-opacity"
              title="ערוך משלוח"
            >
              <Edit className={heightClasses.iconSize} />
            </button>
          )}
          <div className="relative" ref={menuRef}>
          <EntityRowActionTrigger
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              setContextMenuPos({ x: rect.left, y: rect.bottom + 4 });
              setMenuOpen(true);
            }}
            title={`פעולות למשלוח ${delivery.orderNumber}`}
          />
          {menuOpen && contextMenuPos && (
            <div
              className="fixed z-50 w-[220px] bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden py-1"
              style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            >
              {/* כותרת — מספר הזמנה + סטטוס */}
              <div className="px-3 py-2 border-b border-[#f5f5f5] dark:border-[#262626] mb-1">
                <p className="text-xs font-semibold text-[#0d0d12] dark:text-[#fafafa] truncate">#{delivery.orderNumber}</p>
                <p className={`text-[11px] font-medium mt-0.5 ${config.tableColor}`}>{config.label}</p>
              </div>
              <button
                onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                className="w-full text-right px-3 py-2.5 text-xs font-medium text-[#16a34a] dark:text-[#9fe870] hover:bg-[#f0fdf4] dark:hover:bg-[#052e16] transition-colors flex items-center gap-2.5"
              >
                <Info className="w-3.5 h-3.5" />
                <span>פרטים מלאים</span>
              </button>
              <button
                onClick={() => { onNavigate(); closeMenus(); }}
                className="w-full text-right px-3 py-2.5 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors flex items-center gap-2.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#737373]" />
                <span className="font-medium text-[#0d0d12] dark:text-[#fafafa]">צפה בעמוד מלא</span>
              </button>
              <button
                onClick={handleCopyOrderNumber}
                className="w-full text-right px-3 py-2.5 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors flex items-center gap-2.5"
              >
                <Copy className="w-3.5 h-3.5 text-[#737373]" />
                <span className="font-medium text-[#0d0d12] dark:text-[#fafafa]">העתק מספר הזמנה</span>
              </button>

              {onEditDelivery && (
                <>
                  <div className="h-px bg-[#e5e5e5] dark:bg-[#262626]" />
                  <button
                    onClick={() => { onEditDelivery(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs hover:bg-[#f5f5f5] dark:hover:bg-[#262626] transition-colors flex items-center gap-2.5"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#9fe870]" />
                    <span className="font-medium text-[#0d0d12] dark:text-[#fafafa]">ערוך משלוח</span>
                  </button>
                </>
              )}

              {delivery.status === 'pending' && (
                <>
                  <div className="h-px bg-[#e5e5e5] dark:bg-[#262626]" />
                  <button
                    onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs font-medium text-[#0fcdd3] hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center gap-2.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>שיבוץ שליח</span>
                  </button>
                  <button
                    onClick={() => { onCancelDelivery(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ביטול משלוח</span>
                  </button>
                </>
              )}

              {delivery.status === 'assigned' && (
                <>
                  <div className="h-px bg-[#e5e5e5] dark:bg-[#262626]" />
                  <button
                    onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs font-medium text-[#0fcdd3] hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center gap-2.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>שינוי שליח</span>
                  </button>
                  {onUnassignCourier && (
                    <button
                      onClick={() => { onUnassignCourier(delivery.id); closeMenus(); }}
                      className="w-full text-right px-3 py-2.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ביטול שיבוץ</span>
                    </button>
                  )}
                  <button
                    onClick={() => { onCancelDelivery(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ביטול משלוח</span>
                  </button>
                </>
              )}

              {(delivery.status === 'delivering') && (
                <>
                  <div className="h-px bg-[#e5e5e5] dark:bg-[#262626]" />
                  <button
                    onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs font-medium text-[#0fcdd3] hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center gap-2.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>שינוי שליח</span>
                  </button>
                  <button
                    onClick={() => { onCompleteDelivery(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>סימון כנמסר</span>
                  </button>
                  <button
                    onClick={() => { onCancelDelivery(delivery.id); closeMenus(); }}
                    className="w-full text-right px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ביטול משלוח</span>
                  </button>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </EntityTableActionsCell>
    </tr>
  );
};

