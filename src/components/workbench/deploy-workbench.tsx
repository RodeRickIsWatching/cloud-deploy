import type { ReactNode } from "react";
import type { WorkbenchLayout } from "@/types/workbench";
import { clampRatio } from "@/utils/workbench-layout-utils";
import { ResizeHandle } from "./resizable-panels";

type DeployWorkbenchProps = {
  layout: WorkbenchLayout;
  onLayoutChange: (layout: Partial<WorkbenchLayout>) => void;
  resourcePane: ReactNode;
  historyPane: ReactNode;
  tabsPane: ReactNode;
  actionsPane: ReactNode;
};

export function DeployWorkbench({ layout, onLayoutChange, resourcePane, historyPane, tabsPane, actionsPane }: DeployWorkbenchProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <section className="flex min-h-0 flex-col border-r bg-card" style={{ width: `${layout.leftWidth}%` }}>
        <div className="min-h-0 overflow-hidden" style={{ height: `${layout.leftTopHeight}%` }}>
          {resourcePane}
        </div>
        <ResizeHandle
          ariaLabel="Resize left panes"
          orientation="horizontal"
          onDrag={({ deltaY }) => onLayoutChange({ leftTopHeight: clampRatio(layout.leftTopHeight + deltaY / 6) })}
        />
        <div className="min-h-0 flex-1 overflow-hidden">{historyPane}</div>
      </section>
      <ResizeHandle ariaLabel="Resize left and right panes" onDrag={({ deltaX }) => onLayoutChange({ leftWidth: clampRatio(layout.leftWidth + deltaX / 12) })} />
      <section className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="min-h-0 overflow-hidden" style={{ height: `${layout.rightTopHeight}%` }}>
          {tabsPane}
        </div>
        <ResizeHandle
          ariaLabel="Resize right panes"
          orientation="horizontal"
          onDrag={({ deltaY }) => onLayoutChange({ rightTopHeight: clampRatio(layout.rightTopHeight + deltaY / 6) })}
        />
        <div className="min-h-0 flex-1 overflow-hidden border-t bg-card">{actionsPane}</div>
      </section>
    </div>
  );
}
