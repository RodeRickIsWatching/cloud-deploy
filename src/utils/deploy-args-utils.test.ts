import { describe, expect, it } from "vitest";
import { encodeAbiParameters } from "viem";
import type { NormalizedAbiMethod } from "@/types/abi";
import type { ReviewPayload, UploadedProject } from "@/types/deploy";
import { parseAbiSource } from "@/utils/abi/abi-utils";
import { prepareDeployMethodCall } from "./deploy-args-utils";

function methodFromAbi(source: string, signature: string): NormalizedAbiMethod {
  const method = parseAbiSource(source).methods.find((item) => item.signature === signature);
  if (!method) {
    throw new Error(`Missing test method ${signature}`);
  }
  return method;
}

function uploadedProject(): UploadedProject {
  return {
    metadata: { name: "constructor-demo-lyquid", fileCount: 1, totalSize: 12 },
    files: [],
    rootName: "constructor-demo-lyquid",
    tree: [],
    tomlFiles: [],
    selectedTomlPath: "examples/constructor-demo-lyquid/Cargo.toml"
  };
}

describe("deploy-args-utils", () => {
  it("prepares lyquid-deployer deploy arguments from the raw build JSON-RPC result", () => {
    const abi = JSON.stringify([
      {
        type: "function",
        name: "build",
        stateMutability: "view",
        inputs: [
          { name: "project", type: "bytes" },
          { name: "constructorInput", type: "bytes" },
          { name: "projectName", type: "string" }
        ],
        outputs: [
          { name: "code", type: "bytes" },
          { name: "sourceHash", type: "bytes32" },
          { name: "artifactHash", type: "bytes32" },
          { name: "targetAbi", type: "string" }
        ],
        "x-lyquid-transport": "off-chain"
      },
      {
        type: "function",
        name: "deploy",
        stateMutability: "nonpayable",
        inputs: [
          { name: "code", type: "bytes" },
          { name: "constructorInput", type: "bytes" },
          { name: "sourceHash", type: "bytes32" },
          { name: "artifactHash", type: "bytes32" },
          { name: "targetAbi", type: "string" },
          { name: "repoHint", type: "string" }
        ],
        outputs: [{ name: "lyquidId", type: "string" }]
      }
    ]);
    const buildMethod = methodFromAbi(abi, "build(bytes,bytes,string)");
    const deployMethod = methodFromAbi(abi, "deploy(bytes,bytes,bytes32,bytes32,string,string)");
    const sourceHash = "0x".padEnd(66, "1") as `0x${string}`;
    const artifactHash = "0x".padEnd(66, "2") as `0x${string}`;
    const buildResult = encodeAbiParameters(buildMethod.abiItem.outputs ?? [], [
      "0xabcdef",
      sourceHash,
      artifactHash,
      "[{\"type\":\"function\"}]"
    ]);
    const reviewPayload: ReviewPayload = {
      hashes: { sourceHash, artifactHash },
      payload: { jsonrpc: "2.0", id: "1", result: buildResult }
    };

    const { args } = prepareDeployMethodCall({
      buildMethod,
      deployMethod,
      project: uploadedProject(),
      reviewPayload
    });

    expect(args).toEqual([
      "0xabcdef",
      "0x",
      sourceHash,
      artifactHash,
      "[{\"type\":\"function\"}]",
      "examples/constructor-demo-lyquid/Cargo.toml"
    ]);
  });
});
