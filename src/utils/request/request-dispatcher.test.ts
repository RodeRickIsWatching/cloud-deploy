import { describe, expect, it, vi } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { parseAbiSource } from "@/utils/abi/abi-utils";
import { dispatchSelectedMethod } from "./request-dispatcher";
import type { RequestSenderContext } from "./request-types";

describe("request-dispatcher", () => {
  it("dispatches on-chain methods through the on-chain sender", async () => {
    const parsedAbi = parseAbiSource(lyquidTestAbi);
    const context: RequestSenderContext = {
      rpcEndpoint: "http://localhost:8545",
      accountAddress: "0x0000000000000000000000000000000000000001",
      walletClient: { sendTransaction: vi.fn() },
      publicClient: {},
      offChainFetch: vi.fn()
    };
    const onChainSender = vi.fn().mockResolvedValue({ raw: { chain: true } });
    const offChainSender = vi.fn();

    await dispatchSelectedMethod({
      parsedAbi,
      selectedMethod: "compileProject(bytes)",
      args: ["0x1234"],
      context,
      onChainSender,
      offChainSender
    });

    expect(onChainSender).toHaveBeenCalledTimes(1);
    expect(offChainSender).not.toHaveBeenCalled();
  });

  it("dispatches off-chain methods through the off-chain sender", async () => {
    const parsedAbi = parseAbiSource(lyquidTestAbi);
    const context: RequestSenderContext = {
      rpcEndpoint: "http://localhost:8545",
      accountAddress: undefined,
      walletClient: undefined,
      publicClient: undefined,
      offChainFetch: vi.fn()
    };
    const onChainSender = vi.fn();
    const offChainSender = vi.fn().mockResolvedValue({ raw: { offChain: true } });

    await dispatchSelectedMethod({
      parsedAbi,
      selectedMethod: "prepareProject(bytes32)",
      args: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      context,
      onChainSender,
      offChainSender
    });

    expect(offChainSender).toHaveBeenCalledTimes(1);
    expect(onChainSender).not.toHaveBeenCalled();
  });

  it("fails locally when selected method does not exist", async () => {
    await expect(
      dispatchSelectedMethod({
        parsedAbi: parseAbiSource(lyquidTestAbi),
        selectedMethod: "missing(bytes)",
        args: [],
        context: { rpcEndpoint: "", offChainFetch: vi.fn() },
        onChainSender: vi.fn(),
        offChainSender: vi.fn()
      })
    ).rejects.toThrow("Selected method does not exist.");
  });
});
