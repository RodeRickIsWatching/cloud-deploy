import { decodeFunctionResult, type AbiParameter } from "viem";
import type { NormalizedAbiMethod } from "@/types/abi";
import type { ReviewPayload, UploadedProject } from "@/types/deploy";

type PrepareDeployMethodCallInput = {
  buildMethod: NormalizedAbiMethod;
  deployMethod: NormalizedAbiMethod;
  project: UploadedProject | null;
  reviewPayload: ReviewPayload;
};

type BuildOutputValue = {
  name: string;
  type: string;
  value: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getBuildResultData(payload: unknown) {
  if (typeof payload === "string" && payload.startsWith("0x")) {
    return payload as `0x${string}`;
  }

  if (isRecord(payload) && typeof payload.result === "string" && payload.result.startsWith("0x")) {
    return payload.result as `0x${string}`;
  }

  throw new Error("Build result must include a hex JSON-RPC result before deploy.");
}

function normalizeDecodedOutputs(outputs: readonly AbiParameter[], decoded: unknown): BuildOutputValue[] {
  const values = outputs.length === 1 ? [decoded] : Array.isArray(decoded) ? decoded : [];

  if (values.length !== outputs.length) {
    throw new Error("Build result output count does not match the selected build method.");
  }

  return outputs.map((output, index) => ({
    name: output.name ?? `arg${index}`,
    type: output.type,
    value: values[index]
  }));
}

function findOutput(outputs: BuildOutputValue[], input: AbiParameter) {
  const name = (input.name ?? "").toLowerCase();
  const exactNameMatch = outputs.find((output) => output.name.toLowerCase() === name && output.type === input.type);

  if (exactNameMatch) {
    return exactNameMatch.value;
  }

  if (input.type === "bytes" && /code|bytecode/.test(name)) {
    return outputs.find((output) => output.type === "bytes" && /code|bytecode/.test(output.name.toLowerCase()))?.value;
  }

  if (input.type === "string" && /abi/.test(name)) {
    return outputs.find((output) => output.type === "string" && /abi/.test(output.name.toLowerCase()))?.value;
  }

  return undefined;
}

function unsupportedInput(input: AbiParameter, index: number) {
  const name = input.name || `arg${index}`;
  return new Error(`Deploy method input ${name}:${input.type} cannot be prepared from the build result.`);
}

export function prepareDeployMethodCall({ buildMethod, deployMethod, project, reviewPayload }: PrepareDeployMethodCallInput) {
  const buildResultData = getBuildResultData(reviewPayload.payload);
  const decoded = decodeFunctionResult({
    abi: [buildMethod.abiItem],
    functionName: buildMethod.name,
    data: buildResultData
  });
  const outputs = normalizeDecodedOutputs(buildMethod.abiItem.outputs ?? [], decoded);
  const args = (deployMethod.abiItem.inputs ?? []).map((input, index) => {
    const name = (input.name ?? "").toLowerCase();
    const outputValue = findOutput(outputs, input);

    if (outputValue !== undefined) {
      return outputValue;
    }

    if (input.type === "bytes" && /constructor/.test(name)) {
      return "0x";
    }

    if (input.type === "bytes32" && /source/.test(name) && reviewPayload.hashes.sourceHash) {
      return reviewPayload.hashes.sourceHash;
    }

    if (input.type === "bytes32" && /artifact/.test(name) && reviewPayload.hashes.artifactHash) {
      return reviewPayload.hashes.artifactHash;
    }

    if (input.type === "string" && /repo|hint|path|toml/.test(name)) {
      return project?.selectedTomlPath || project?.rootName || "";
    }

    throw unsupportedInput(input, index);
  });

  return { args };
}
