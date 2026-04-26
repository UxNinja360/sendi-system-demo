import React, { useState } from 'react';
import { Delivery, Courier, DeliveryStatus } from '../types/delivery.types';
import {
  Copy,
  UserPlus,
  XCircle,
  CheckCircle2,
  FileText,
  Info,
  Edit,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EntityActionMenu,
  EntityActionMenuDivider,
  EntityActionMenuHeader,
  EntityActionMenuItem,
  EntityActionMenuOverlay,
} from '../components/common/entity-action-menu';
import {
  EntityTableActionsCell,
  EntityTableRowCheckbox,
} from '../components/common/entity-table-shell';
import { EntityRowActionTrigger } from '../components/common/entity-row-action-trigger';
import {
  ENTITY_TABLE_DATA_CELL_CLASS,
  ENTITY_TABLE_ROW_CLASS,
} from '../components/common/entity-table-shared';
import { ALL_COLUMNS, CUSTOM_COLUMN_IDS, COLUMN_MAP } from './column-defs';
import type { ColumnDef } from './column-defs';
import { STATUS_CONFIG } from './status-config';
import { formatCurrency, getDeliveryCustomerCharge } from '../utils/delivery-finance';

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
}) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const config = STATUS_CONFIG[delivery.status];

  const dataCellClassName = `${ENTITY_TABLE_DATA_CELL_CLASS} text-xs`;

  const handleStatusChange = (newStatus: DeliveryStatus) => {
    if (newStatus === delivery.status) return;
    if (newStatus === 'cancelled') {
      onCancelDelivery(delivery.id);
    } else if (newStatus === 'delivered') {
      onCompleteDelivery(delivery.id);
    } else {
      onStatusChange(delivery.id, newStatus);
    }
  };

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(delivery.orderNumber);
    toast.success(`מספר הזמנה ${delivery.orderNumber} הועתק`);
    setContextMenuPos(null);
  };

  const closeMenus = () => {
    setContextMenuPos(null);
  };

  // Custom cell renderers for special columns
  const renderCustomCell = (colId: string): React.ReactNode => {
    switch (colId) {
      case 'orderNumber':
        return (
          <td key={colId} className={dataCellClassName}>
            <span
              className="text-xs text-[#0d0d12] dark:text-[#fafafa] font-medium whitespace-nowrap"
            >
              {delivery.orderNumber}
            </span>
          </td>
        );

      case 'status':
        return (
          <td key={colId} className={dataCellClassName}>
            <span className={`font-medium whitespace-nowrap ${config.tableColor}`}>
              {config.label}
            </span>
          </td>
        );

      case 'courier':
        return (
          <td key={colId} className={dataCellClassName}>
            {courier ? (
              <span className="text-[#0d0d12] dark:text-[#fafafa] font-medium whitespace-nowrap">{courier.name}</span>
            ) : (
              <span className="text-[#737373] dark:text-[#a3a3a3]">-</span>
            )}
          </td>
        );

      case 'timeRemaining':
        return (
          <td key={colId} className={dataCellClassName}>
            {timeRemaining !== null ? (
              <span className="text-[#3b82f6] dark:text-[#60a5fa] font-medium">{formatTime(timeRemaining)}</span>
            ) : (
              <span className="text-[#737373] dark:text-[#a3a3a3]">-</span>
            )}
          </td>
        );

      case 'price':
        return (
          <td key={colId} className={`${dataCellClassName} text-[#16a34a] dark:text-[#22c55e] font-bold whitespace-nowrap`}>
            {formatCurrency(getDeliveryCustomerCharge(delivery))}
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
      onClick={onNavigate}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      }}
      className={`${ENTITY_TABLE_ROW_CLASS} cursor-pointer ${
        isDrawerTarget
          ? 'bg-[#dcfce7]/50 hover:bg-[#dcfce7]/50 dark:bg-[#14532d]/30 dark:hover:bg-[#14532d]/30'
          : isSelected
            ? 'bg-[#dbeafe]/50 hover:bg-[#dbeafe]/50 dark:bg-[#1e3a8a]/20 dark:hover:bg-[#1e3a8a]/20'
            : ''
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
            className={`${dataCellClassName} ${textStyle} whitespace-nowrap ${isLongText ? 'max-w-[180px] truncate' : ''}`}
          >
            {value}
          </td>
        );
      })}

      {/* Actions column */}
      <EntityTableActionsCell
        contentClassName="items-center justify-end gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-0.5" data-no-row-click>
          <EntityRowActionTrigger
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              setContextMenuPos({ x: Math.max(8, rect.left - 180), y: rect.bottom + 8 });
            }}
            title={`פעולות למשלוח ${delivery.orderNumber}`}
          />
          <EntityActionMenuOverlay
            open={Boolean(contextMenuPos)}
            position={contextMenuPos}
            onClose={closeMenus}
          >
            {contextMenuPos ? (
              <EntityActionMenu
                style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <EntityActionMenuHeader
                  title={`#${delivery.orderNumber}`}
                  subtitle={<span className={`text-[11px] font-medium ${config.tableColor}`}>{config.label}</span>}
                />

                <EntityActionMenuItem
                  onClick={() => { onNavigate(); closeMenus(); }}
                  icon={<FileText className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />}
                >
                  פרטים מלאים
                </EntityActionMenuItem>
                <EntityActionMenuItem
                  onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                  icon={<Info className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#9fe870]" />}
                >
                  פתח פאנל צד
                </EntityActionMenuItem>
                <EntityActionMenuItem
                  onClick={handleCopyOrderNumber}
                  icon={<Copy className="w-3.5 h-3.5 text-[#737373] dark:text-[#a3a3a3]" />}
                >
                  העתק מספר הזמנה
                </EntityActionMenuItem>

              {onEditDelivery && (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => { onEditDelivery(delivery.id); closeMenus(); }}
                    icon={<Edit className="w-3.5 h-3.5 text-[#16a34a] dark:text-[#9fe870]" />}
                  >
                    ערוך משלוח
                  </EntityActionMenuItem>
                </>
              )}

              {delivery.status === 'pending' && (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                    icon={<UserPlus className="w-3.5 h-3.5 text-[#0fcdd3]" />}
                  >
                    שיבוץ שליח
                  </EntityActionMenuItem>
                  <EntityActionMenuItem
                    onClick={() => { onCancelDelivery(delivery.id); closeMenus(); }}
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    danger
                  >
                    ביטול משלוח
                  </EntityActionMenuItem>
                </>
              )}

              {delivery.status === 'assigned' && (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                    icon={<Edit className="w-3.5 h-3.5 text-[#0fcdd3]" />}
                  >
                    שינוי שליח
                  </EntityActionMenuItem>
                  {onUnassignCourier && (
                    <EntityActionMenuItem
                      onClick={() => { onUnassignCourier(delivery.id); closeMenus(); }}
                      icon={<RotateCcw className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
                    >
                      ביטול שיבוץ
                    </EntityActionMenuItem>
                  )}
                  <EntityActionMenuItem
                    onClick={() => { onCancelDelivery(delivery.id); closeMenus(); }}
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    danger
                  >
                    ביטול משלוח
                  </EntityActionMenuItem>
                </>
              )}

              {(delivery.status === 'delivering') && (
                <>
                  <EntityActionMenuDivider />
                  <EntityActionMenuItem
                    onClick={() => { onOpenDrawer(delivery.id); closeMenus(); }}
                    icon={<Edit className="w-3.5 h-3.5 text-[#0fcdd3]" />}
                  >
                    שינוי שליח
                  </EntityActionMenuItem>
                  <EntityActionMenuItem
                    onClick={() => { onCompleteDelivery(delivery.id); closeMenus(); }}
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  >
                    סימון כנמסר
                  </EntityActionMenuItem>
                  <EntityActionMenuItem
                    onClick={() => { onCancelDelivery(delivery.id); closeMenus(); }}
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    danger
                  >
                    ביטול משלוח
                  </EntityActionMenuItem>
                </>
              )}
              </EntityActionMenu>
            ) : null}
          </EntityActionMenuOverlay>
        </div>
      </EntityTableActionsCell>
    </tr>
  );
};

