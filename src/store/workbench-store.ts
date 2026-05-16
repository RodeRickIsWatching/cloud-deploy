import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultWorkbenchLayout, deployHistoryLimit } from "@/config/workbench-config";
import { workbenchStorageKey, workbenchStorageVersion } from "@/config/storage-config";
import type { DeployHistoryRecord, WorkbenchLayout } from "@/types/workbench";

type WorkbenchState = {
  layout: WorkbenchLayout;
  deployHistory: DeployHistoryRecord[];
  setLayout: (layout: Partial<WorkbenchLayout>) => void;
  addDeployHistory: (record: DeployHistoryRecord) => void;
  clearDeployHistory: () => void;
};

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set) => ({
      layout: defaultWorkbenchLayout,
      deployHistory: [],
      setLayout: (layout) =>
        set((state) => ({
          layout: {
            ...state.layout,
            ...layout
          }
        })),
      addDeployHistory: (record) =>
        set((state) => ({
          deployHistory: [record, ...state.deployHistory.filter((item) => item.id !== record.id)].slice(0, deployHistoryLimit)
        })),
      clearDeployHistory: () => set({ deployHistory: [] })
    }),
    {
      name: workbenchStorageKey,
      version: workbenchStorageVersion,
      partialize: (state) => ({
        layout: state.layout,
        deployHistory: state.deployHistory
      })
    }
  )
);
