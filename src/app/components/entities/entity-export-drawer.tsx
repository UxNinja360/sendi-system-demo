import React from 'react';
import { FileText } from 'lucide-react';
import { EntitySidePanelHeader } from './entity-side-panel-header';

type EntityExportAction = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  meta?: string;
  onClick: () => void;
};

type EntityExportDrawerProps = {
  title?: string;
  onClose: () => void;
  actions: EntityExportAction[];
};

export const EntityExportDrawer: React.FC<EntityExportDrawerProps> = ({
  title = '\u05d9\u05d9\u05e6\u05d5\u05d0',
  onClose,
  actions,
}) => {
  return (
    <>
      <EntitySidePanelHeader
        icon={<FileText className="w-4 h-4" />}
        title={title}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="w-full text-right rounded-2xl border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#0f0f0f] p-4 transition-all hover:border-[#9fe870]/50 hover:bg-[#f8fff2] dark:hover:bg-[#11180c]"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#9fe870]/15 text-[#6bc84a]">
                {action.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#0d0d12] dark:text-[#fafafa]">
                  {action.title}
                </div>
                <div className="mt-1 text-xs text-[#737373] dark:text-[#a3a3a3]">
                  {action.description}
                </div>
                {action.meta ? (
                  <div className="mt-3 text-[11px] text-[#a3a3a3]">
                    {action.meta}
                  </div>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
};
