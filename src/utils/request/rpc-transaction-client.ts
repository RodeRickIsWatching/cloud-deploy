import { getRequestEndpoint } from "./endpoint-utils";

type FetchRpcTransactionInput = {
  rpcEndpoint: string;
  transactionHash: `0x${string}`;
  offChainFetch: typeof fetch;
};

function getNetworkErrorReason(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Unknown network error";
}

function getRpcErrorMessage(raw: unknown) {
  if (!raw || typeof raw !== "object" || !("error" in raw)) {
    return null;
  }

  const error = (raw as { error?: unknown }).error;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "Failed to fetch RPC transaction.";
}

export async function fetchRpcTransaction({ rpcEndpoint, transactionHash, offChainFetch }: FetchRpcTransactionInput) {
  if (!rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const url = getRequestEndpoint(rpcEndpoint);
  let response: Response;
  let raw: unknown;

  try {
    response = await offChainFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "transaction",
        method: "eth_getTransactionByHash",
        params: [transactionHash]
      })
    });
    raw = await response.json();
  } catch (error) {
    throw Object.assign(new Error(`Network request failed for ${url}: ${getNetworkErrorReason(error)}.`), { cause: error });
  }

  const responseErrorMessage = getRpcErrorMessage(raw);

  if (!response.ok || responseErrorMessage) {
    throw new Error(responseErrorMessage ?? "Failed to fetch RPC transaction.");
  }

  if (!raw || typeof raw !== "object" || !("result" in raw)) {
    throw new Error("RPC transaction response is missing a result.");
  }

  return (raw as { result: unknown }).result;
}
