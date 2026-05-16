import type { Chain } from "viem";
import type { NormalizedAbiMethod, ParsedAbi } from "@/types/abi";

export type WalletTransactionClient = {
  sendTransaction: (request: { account?: `0x${string}`; to: `0x${string}`; data: `0x${string}`; chain?: Chain }) => Promise<`0x${string}`>;
  switchChain?: (request: { id: number }) => Promise<void>;
  addChain?: (request: { chain: Chain }) => Promise<void>;
};

export type ReceiptPublicClient = {
  waitForTransactionReceipt?: (request: { hash: `0x${string}` }) => Promise<unknown>;
};

export type RequestSenderContext = {
  rpcEndpoint: string;
  lyquidId?: string;
  accountAddress?: `0x${string}`;
  walletClient?: WalletTransactionClient | null;
  publicClient?: ReceiptPublicClient | null;
  offChainFetch: typeof fetch;
};

export type SelectedMethodRequest = {
  parsedAbi: ParsedAbi;
  selectedMethod: string;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSenderInput = {
  method: NormalizedAbiMethod;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSender = (input: MethodSenderInput) => Promise<unknown>;
