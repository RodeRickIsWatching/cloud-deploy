import type { AbiFunction } from "viem";

export type WorkbenchLayout = {
  leftWidth: number;
  leftTopHeight: number;
  rightTopHeight: number;
};

export type DeployHistoryStatus = "submitted" | "success" | "failed";

export type WorkbenchEnv = {
  rpcEndpoint: string;
  lyquidId?: string;
  walletAddress?: string;
  chainId?: number;
  contractAddress?: string;
  buildMethod?: string;
  deployMethod?: string;
  buildMethodAbiItem?: AbiFunction | Record<string, unknown>;
  deployMethodAbiItem?: AbiFunction | Record<string, unknown>;
};

export type DeployHistoryRecord = {
  id: string;
  txHash: `0x${string}`;
  timestamp: number;
  targetFile: string;
  status: DeployHistoryStatus;
  env: WorkbenchEnv;
};

export type WorkbenchTabKind = "file-detail" | "build-run" | "deploy-run" | "deploy-history";
export type WorkbenchRunStatus = "idle" | "loading" | "success" | "error";

export type WorkbenchTab = {
  id: string;
  kind: WorkbenchTabKind;
  title: string;
  createdAt: number;
  status?: WorkbenchRunStatus;
  targetFile?: string;
  env?: WorkbenchEnv;
  raw?: unknown;
  transactionRaw?: unknown;
  error?: string;
};
