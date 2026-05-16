import { describe, expect, it, vi } from "vitest";
import { createBrowserWalletTransactionClient } from "./browser-wallet-client";

describe("browser-wallet-client", () => {
  it("wraps an injected provider as a deploy wallet client", async () => {
    const request = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce("0xabc123");
    const walletClient = createBrowserWalletTransactionClient({
      request
    });
    const chain = {
      id: 31337,
      name: "Lyquid RPC 31337",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: {
          http: ["http://127.0.0.1:10087/api"]
        }
      }
    };

    await walletClient.switchChain?.({ id: chain.id });
    await walletClient.addChain?.({ chain });
    await expect(
      walletClient.sendTransaction({
        account: "0x1111111111111111111111111111111111111111",
        to: "0x2222222222222222222222222222222222222222",
        data: "0xabcdef",
        chain
      })
    ).resolves.toBe("0xabc123");

    expect(request).toHaveBeenNthCalledWith(1, {
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7a69" }]
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x7a69",
          chainName: "Lyquid RPC 31337",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["http://127.0.0.1:10087/api"]
        }
      ]
    });
    expect(request).toHaveBeenNthCalledWith(3, {
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          data: "0xabcdef"
        }
      ]
    });
  });
});
