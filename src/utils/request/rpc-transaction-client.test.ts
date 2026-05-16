import { describe, expect, it, vi } from "vitest";
import { fetchRpcTransaction } from "./rpc-transaction-client";

describe("rpc-transaction-client", () => {
  it("fetches transaction details by hash from the configured RPC endpoint", async () => {
    const offChainFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: "2.0",
          id: "transaction",
          result: {
            hash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
            from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            input: "0xabcdef"
          }
        })
    } as Response);

    await expect(
      fetchRpcTransaction({
        rpcEndpoint: "http://127.0.0.1:10087/api",
        transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
        offChainFetch
      })
    ).resolves.toMatchObject({
      hash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
      input: "0xabcdef"
    });

    expect(offChainFetch).toHaveBeenCalledWith(
      "/__cloud-deploy-proxy?target=http%3A%2F%2F127.0.0.1%3A10087%2Fapi",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "transaction",
          method: "eth_getTransactionByHash",
          params: ["0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318"]
        })
      })
    );
  });
});
