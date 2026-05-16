import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { WorkbenchTab } from "@/types/workbench";
import { RunOutputTab } from "./run-output-tab";

const baseTab: WorkbenchTab = {
  id: "build-1",
  kind: "build-run",
  title: "build_Cargo.toml_1778916000000",
  createdAt: 1778916000000,
  targetFile: "demo/Cargo.toml",
  status: "success",
  env: {
    rpcEndpoint: "http://localhost:8545",
    lyquidId: "Lyquid-demo",
    chainId: 31337,
    buildMethodAbiItem: { type: "function", name: "build", inputs: [] }
  },
  raw: { result: "0x1234" }
};

describe("RunOutputTab", () => {
  it("renders raw-first output, ABI item, env dialog, and copy actions", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    renderWithProviders(<RunOutputTab tab={baseTab} />);

    expect(screen.getByText("Raw Output")).toBeInTheDocument();
    expect(screen.getByText(/"result": "0x1234"/)).toBeInTheDocument();
    expect(screen.getByText("ABI Item")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy Raw" }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(baseTab.raw, null, 2));

    await user.click(screen.getByRole("button", { name: "Env" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/localhost:8545/)).toBeInTheDocument();
  });

  it("shows a spinning tx hash while lookup is pending and check state after details arrive", () => {
    const txHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    const deployTab: WorkbenchTab = {
      ...baseTab,
      id: "deploy-1",
      kind: "deploy-run",
      status: "loading",
      raw: { transactionHash: txHash }
    };
    const { rerender } = renderWithProviders(<RunOutputTab tab={deployTab} />);

    expect(screen.getByLabelText("Transaction lookup pending")).toBeInTheDocument();

    rerender(
      <RunOutputTab
        tab={{
          ...deployTab,
          status: "success",
          transactionRaw: { hash: txHash, from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" }
        }}
      />
    );

    expect(screen.getByLabelText("Transaction found")).toBeInTheDocument();
  });
});
