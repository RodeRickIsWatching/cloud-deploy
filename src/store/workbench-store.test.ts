import { beforeEach, describe, expect, it } from "vitest";
import { defaultWorkbenchLayout, deployHistoryLimit } from "@/config/workbench-config";
import { useWorkbenchStore } from "./workbench-store";

function historyRecord(index: number) {
  return {
    id: `history-${index}`,
    txHash: `0x${String(index).padStart(64, "0")}` as `0x${string}`,
    timestamp: 1778916000000 + index,
    targetFile: `demo-${index}/Cargo.toml`,
    status: "submitted" as const,
    env: {
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "Lyquid-demo",
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      chainId: 31337,
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      buildMethod: "build(bytes)",
      deployMethod: "deploy(bytes)",
      buildMethodAbiItem: { type: "function", name: "build", inputs: [] },
      deployMethodAbiItem: { type: "function", name: "deploy", inputs: [] }
    }
  };
}

describe("workbench-store", () => {
  beforeEach(() => {
    useWorkbenchStore.setState(useWorkbenchStore.getInitialState(), true);
  });

  it("updates split ratios", () => {
    useWorkbenchStore.getState().setLayout({ leftWidth: 32, leftTopHeight: 61, rightTopHeight: 72 });
    expect(useWorkbenchStore.getState().layout).toEqual({ leftWidth: 32, leftTopHeight: 61, rightTopHeight: 72 });
  });

  it("keeps the latest deploy history records first and caps at the configured limit", () => {
    Array.from({ length: deployHistoryLimit + 2 }, (_, index) => historyRecord(index)).forEach((record) => {
      useWorkbenchStore.getState().addDeployHistory(record);
    });

    const history = useWorkbenchStore.getState().deployHistory;
    expect(history).toHaveLength(deployHistoryLimit);
    expect(history[0].id).toBe(`history-${deployHistoryLimit + 1}`);
    expect(history[history.length - 1].id).toBe("history-2");
  });

  it("defaults to the configured layout", () => {
    expect(useWorkbenchStore.getState().layout).toEqual(defaultWorkbenchLayout);
  });
});
