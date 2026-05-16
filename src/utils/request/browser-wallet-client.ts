import { numberToHex, type Chain } from "viem";
import type { WalletTransactionClient } from "./request-types";

type BrowserWalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type CreateBrowserWalletTransactionClientInput = BrowserWalletProvider | null | undefined;

export function createBrowserWalletTransactionClient(provider: CreateBrowserWalletTransactionClientInput): WalletTransactionClient {
  if (!provider?.request) {
    throw new Error("Injected wallet provider is required.");
  }

  return {
    switchChain: async ({ id }) => {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: numberToHex(id) }]
      });
    },
    addChain: async ({ chain }) => {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: numberToHex(chain.id),
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: getRpcUrls(chain)
          }
        ]
      });
    },
    sendTransaction: async ({ account, to, data }) => {
      const transactionHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to,
            data
          }
        ]
      });

      if (typeof transactionHash !== "string" || !transactionHash.startsWith("0x")) {
        throw new Error("Wallet did not return a transaction hash.");
      }

      return transactionHash as `0x${string}`;
    }
  };
}

function getRpcUrls(chain: Chain) {
  return chain.rpcUrls.default.http.length > 0 ? [...chain.rpcUrls.default.http] : [];
}
