import { encodeFunctionData } from "viem";
import { fetchLyquidContractAddress } from "./lyquid-info-client";
import { fetchRpcChain } from "./rpc-chain-client";
import { fetchRpcTransaction } from "./rpc-transaction-client";
import type { MethodSenderInput, WalletTransactionClient } from "./request-types";

async function switchWalletToChain(walletClient: WalletTransactionClient, chain: Awaited<ReturnType<typeof fetchRpcChain>>) {
  if (!walletClient.switchChain) {
    return;
  }

  try {
    await walletClient.switchChain({ id: chain.id });
  } catch (error) {
    if (!walletClient.addChain) {
      throw error;
    }

    await walletClient.addChain({ chain });
    await walletClient.switchChain({ id: chain.id });
  }
}

export async function sendOnChainMethod({ method, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  if (!context.lyquidId) {
    throw new Error("Lyquid ID is required.");
  }

  if (!context.accountAddress) {
    throw new Error("Connected wallet address is required.");
  }

  if (!context.walletClient) {
    throw new Error("Wallet client is required.");
  }

  const chain = await fetchRpcChain({
    rpcEndpoint: context.rpcEndpoint,
    offChainFetch: context.offChainFetch
  });
  const contractAddress = await fetchLyquidContractAddress({
    rpcEndpoint: context.rpcEndpoint,
    lyquidId: context.lyquidId,
    offChainFetch: context.offChainFetch
  });

  if (!contractAddress) {
    throw new Error("Lyquid ID is not deployed or not visible to this node.");
  }

  const data = encodeFunctionData({
    abi: [method.abiItem],
    functionName: method.name,
    args
  });

  await switchWalletToChain(context.walletClient, chain);

  const transactionHash = await context.walletClient.sendTransaction({
    account: context.accountAddress,
    to: contractAddress,
    chain,
    data
  });
  const receipt = await context.publicClient?.waitForTransactionReceipt?.({ hash: transactionHash });
  let transaction: unknown = null;
  let transactionLookupError: string | undefined;

  try {
    transaction = await fetchRpcTransaction({
      rpcEndpoint: context.rpcEndpoint,
      transactionHash,
      offChainFetch: context.offChainFetch
    });
  } catch (error) {
    transactionLookupError = error instanceof Error ? error.message : "Failed to fetch RPC transaction.";
  }

  return {
    transactionHash,
    contractAddress,
    chainId: chain.id,
    method: method.signature,
    status: receipt && typeof receipt === "object" && "status" in receipt ? (receipt as { status?: unknown }).status : "submitted",
    receipt,
    transaction,
    transactionLookupPending: transaction === null,
    transactionLookupError,
    deployAbi: method.abiItem,
    submittedTransaction: {
      from: context.accountAddress,
      to: contractAddress,
      chainId: chain.id,
      calldata: data
    },
    data
  };
}
