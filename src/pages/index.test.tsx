import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { renderWithProviders } from "@/test/render";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { useSettingsStore } from "@/store/settings-store";
import HomePage from "./index";

const fetchRpcTransactionMock = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined }),
  useConnect: () => ({ connect: vi.fn() }),
  useDisconnect: () => ({ disconnect: vi.fn() })
}));

vi.mock("wagmi/connectors", () => ({
  injected: () => ({ id: "injected" })
}));

vi.mock("@/utils/request/rpc-transaction-client", () => ({
  fetchRpcTransaction: fetchRpcTransactionMock
}));

describe("HomePage", () => {
  function folderFile(contents: string, name: string, path: string) {
    const file = new File([contents], name);
    Object.defineProperty(file, "webkitRelativePath", {
      value: path
    });
    return file;
  }

  beforeEach(() => {
    fetchRpcTransactionMock.mockReset();
    useDeploySessionStore.setState(useDeploySessionStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });
  });

  it("renders upload as the first step", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
    expect(screen.getByLabelText("Project folder")).toBeInTheDocument();
  });

  it("moves from upload to build", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await user.upload(screen.getByLabelText("Project folder"), [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ]);
    await user.click(await screen.findByRole("button", { name: "Select demo/Cargo.toml" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });

  it("updates a pending deploy transaction when the configured RPC can return it", async () => {
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    fetchRpcTransactionMock.mockResolvedValue({
      hash: transactionHash,
      input: "0xabcdef"
    });
    useDeploySessionStore.setState({
      currentStep: "deploy",
      deployResult: {
        status: "submitted",
        transactionHash,
        raw: {
          transactionHash,
          transaction: null,
          transactionLookupPending: true
        }
      }
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(fetchRpcTransactionMock).toHaveBeenCalledWith({
        rpcEndpoint: "http://localhost:8545",
        transactionHash,
        offChainFetch: expect.any(Function)
      });
    });
    await waitFor(() => {
      expect(useDeploySessionStore.getState().deployResult?.raw).toMatchObject({
        transaction: {
          hash: transactionHash,
          input: "0xabcdef"
        },
        transactionLookupPending: false
      });
    });
    expect(screen.getByLabelText("Transaction found")).toBeInTheDocument();
  });
});
