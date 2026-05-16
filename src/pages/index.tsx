import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ActionDeck } from "@/components/workbench/action-deck";
import { DeployHistoryPanel } from "@/components/workbench/deploy-history-panel";
import { DeployWorkbench } from "@/components/workbench/deploy-workbench";
import { FileDetailTab } from "@/components/workbench/file-detail-tab";
import { ResourceExplorer } from "@/components/workbench/resource-explorer";
import { RunOutputTab } from "@/components/workbench/run-output-tab";
import { WorkbenchTabs } from "@/components/workbench/workbench-tabs";
import { AppShell } from "@/layout/app-shell";
import { useSettingsStore } from "@/store/settings-store";
import { useWorkbenchStore } from "@/store/workbench-store";
import type { UploadedProject } from "@/types/deploy";
import type { DeployHistoryRecord, WorkbenchEnv, WorkbenchTab } from "@/types/workbench";
import { findMethod } from "@/utils/abi/abi-utils";
import { prepareBuildMethodCall } from "@/utils/build-args-utils";
import { prepareDeployMethodCall } from "@/utils/deploy-args-utils";
import { hashPayload } from "@/utils/hash-utils";
import { createBrowserWalletTransactionClient } from "@/utils/request/browser-wallet-client";
import { dispatchSelectedMethod } from "@/utils/request/request-dispatcher";
import { fetchRpcTransaction } from "@/utils/request/rpc-transaction-client";
import { type BrowserWindowWithWallet, type BuildCacheEntry, createRunTitle, findPendingTransactionTabs, getErrorMessage, getTxHash, isRecord } from "./workbench-page-utils";
import { WorkbenchSettingsDialog } from "./workbench-settings-dialog";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [project, setProject] = useState<UploadedProject | null>(null);
  const [selectedTomlPath, setSelectedTomlPath] = useState("");
  const [tabs, setTabs] = useState<WorkbenchTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [buildCache, setBuildCache] = useState<BuildCacheEntry | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const settings = useSettingsStore();
  const { layout, setLayout, deployHistory, addDeployHistory } = useWorkbenchStore();

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const connectWallet = () => connect({ connector: injected() });
  const copyWalletAddress = () => (account.address ? navigator.clipboard.writeText(account.address) : undefined);
  const currentProject = useMemo(
    () => (project ? { ...project, selectedTomlPath } : null),
    [project, selectedTomlPath]
  );

  const getEnv = (): WorkbenchEnv => {
    const buildMethod = settings.parsedAbi ? findMethod(settings.parsedAbi, settings.buildMethod) : null;
    const deployMethod = settings.parsedAbi ? findMethod(settings.parsedAbi, settings.deployMethod) : null;

    return {
      rpcEndpoint: settings.rpcEndpoint,
      lyquidId: settings.lyquidId,
      walletAddress: account.address,
      buildMethod: settings.buildMethod,
      deployMethod: settings.deployMethod,
      buildMethodAbiItem: buildMethod?.abiItem,
      deployMethodAbiItem: deployMethod?.abiItem
    };
  };

  const upsertTab = (tab: WorkbenchTab) => {
    setTabs((current) => [tab, ...current.filter((item) => item.id !== tab.id)]);
    setActiveTabId(tab.id);
  };

  const patchTab = (tabId: string, patch: Partial<WorkbenchTab>) => {
    setTabs((current) => current.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab)));
  };

  const openFileTab = (path: string) => {
    const now = Date.now();
    upsertTab({
      id: `file:${path}`,
      kind: "file-detail",
      title: path.split("/").pop() || path,
      createdAt: now,
      targetFile: path
    });
  };

  const closeTab = (tabId: string) => {
    setTabs((current) => {
      const nextTabs = current.filter((tab) => tab.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(nextTabs[0]?.id ?? null);
      }
      return nextTabs;
    });
  };

  const runBuild = async (options?: { silent?: boolean }) => {
    if (!settings.parsedAbi || !currentProject || !selectedTomlPath) {
      throw new Error("Upload a project, select a TOML target, and configure a valid ABI before build.");
    }

    const now = Date.now();
    const tabId = `build:${selectedTomlPath}:${now}`;
    const env = getEnv();
    if (!options?.silent) {
      upsertTab({ id: tabId, kind: "build-run", title: createRunTitle("build", selectedTomlPath, now), createdAt: now, targetFile: selectedTomlPath, status: "loading", env });
    }

    const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
    if (!buildMethod) {
      throw new Error("Selected build method does not exist.");
    }

    try {
      setIsBuilding(true);
      const { args, sourceHash } = await prepareBuildMethodCall({ method: buildMethod, project: currentProject });
    const raw = await dispatchSelectedMethod({
        parsedAbi: settings.parsedAbi,
        selectedMethod: settings.buildMethod,
        args,
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          lyquidId: settings.lyquidId,
          accountAddress: account.address,
          offChainFetch: (input, init) => fetch(input, init)
        }
      });
      const artifactHash = await hashPayload(raw);
      const reviewPayload = { hashes: { sourceHash, artifactHash }, payload: raw };
      if (!options?.silent) {
        setBuildCache({ targetFile: selectedTomlPath, reviewPayload });
      }
      if (!options?.silent) {
        patchTab(tabId, { status: "success", raw });
      }
      return reviewPayload;
    } catch (error) {
      if (!options?.silent) {
        patchTab(tabId, { status: "error", error: getErrorMessage(error, "Build failed.") });
      }
      throw error;
    } finally {
      setIsBuilding(false);
    }
  };

  const runDeploy = async () => {
    const now = Date.now();
    const tabId = `deploy:${selectedTomlPath || "target"}:${now}`;
    const env = getEnv();
    upsertTab({ id: tabId, kind: "deploy-run", title: createRunTitle("deploy", selectedTomlPath || "target", now), createdAt: now, targetFile: selectedTomlPath, status: "loading", env });

    try {
      setIsDeploying(true);
      if (!account.address) {
        throw new Error("Connect wallet before deploying.");
      }

      if (!settings.parsedAbi || !currentProject || !selectedTomlPath) {
        throw new Error("Upload a project, select a TOML target, and configure a valid ABI before deploy.");
      }

      const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
      const deployMethod = findMethod(settings.parsedAbi, settings.deployMethod);
      if (!buildMethod || !deployMethod) {
        throw new Error("Selected build or deploy method does not exist.");
      }

      const reviewPayload = buildCache?.targetFile === selectedTomlPath ? buildCache.reviewPayload : await runBuild({ silent: true });
      const { args } = prepareDeployMethodCall({ buildMethod, deployMethod, project: currentProject, reviewPayload });
      const raw = await dispatchSelectedMethod({
        parsedAbi: settings.parsedAbi,
        selectedMethod: settings.deployMethod,
        args,
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          lyquidId: settings.lyquidId,
          accountAddress: account.address,
          walletClient: createBrowserWalletTransactionClient((window as BrowserWindowWithWallet).ethereum),
          offChainFetch: (input, init) => fetch(input, init)
        }
      });
      const txHash = getTxHash(raw);
      const transactionRaw = isRecord(raw) && isRecord(raw.transaction) ? raw.transaction : undefined;

      patchTab(tabId, { status: transactionRaw ? "success" : "loading", raw, transactionRaw });
      if (txHash) {
        addDeployHistory({ id: `${txHash}:${now}`, txHash: txHash as `0x${string}`, timestamp: now, targetFile: selectedTomlPath, status: "submitted", env });
      }
    } catch (error) {
      patchTab(tabId, { status: "error", error: getErrorMessage(error, "Deploy failed.") });
    } finally {
      setIsDeploying(false);
    }
  };

  const openHistoryRecord = async (record: DeployHistoryRecord) => {
    const tabId = `history:${record.id}`;
    upsertTab({
      id: tabId,
      kind: "deploy-history",
      title: createRunTitle("history", record.targetFile, record.timestamp),
      createdAt: Date.now(),
      targetFile: record.targetFile,
      status: "loading",
      env: record.env,
      raw: { transactionHash: record.txHash }
    });

    try {
      const transactionRaw = await fetchRpcTransaction({ rpcEndpoint: record.env.rpcEndpoint, transactionHash: record.txHash, offChainFetch: (input, init) => fetch(input, init) });
      patchTab(tabId, { status: transactionRaw ? "success" : "loading", transactionRaw: transactionRaw ?? undefined });
    } catch (error) {
      patchTab(tabId, { status: "error", error: getErrorMessage(error, "Failed to fetch RPC transaction.") });
    }
  };

  useEffect(() => {
    const pendingTabs = findPendingTransactionTabs(tabs);
    if (pendingTabs.length === 0) {
      return undefined;
    }

    let cancelled = false;
    const lookupTransactions = async () => {
      await Promise.all(
        pendingTabs.map(async ({ tabId, transactionHash, rpcEndpoint }) => {
          try {
            const transactionRaw = await fetchRpcTransaction({ rpcEndpoint, transactionHash: transactionHash as `0x${string}`, offChainFetch: (input, init) => fetch(input, init) });
            if (!cancelled && transactionRaw) {
              patchTab(tabId, { status: "success", transactionRaw, error: undefined });
            }
          } catch (error) {
            if (!cancelled) {
              patchTab(tabId, { error: getErrorMessage(error, "Failed to fetch RPC transaction.") });
            }
          }
        })
      );
    };

    void lookupTransactions();
    const intervalId = window.setInterval(() => void lookupTransactions(), 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [tabs]);

  return (
    <>
      <AppShell
        showProgress={false}
        walletLabel={walletLabel}
        walletAddress={account.address}
        onConnectWallet={connectWallet}
        onCopyWalletAddress={copyWalletAddress}
        onDisconnectWallet={disconnect}
        onOpenSettings={() => setSettingsOpen(true)}
      >
        <DeployWorkbench
          layout={layout}
          onLayoutChange={setLayout}
          resourcePane={
            <ResourceExplorer
              project={project}
              selectedTomlPath={selectedTomlPath}
              onProjectChange={(nextProject) => {
                setProject(nextProject);
                setSelectedTomlPath("");
                setTabs([]);
                setActiveTabId(null);
              }}
              onSelectTarget={setSelectedTomlPath}
              onOpenFile={openFileTab}
            />
          }
          historyPane={<DeployHistoryPanel records={deployHistory} onOpenRecord={(record) => void openHistoryRecord(record)} />}
          tabsPane={
            <WorkbenchTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onActiveTabChange={setActiveTabId}
              onCloseTab={closeTab}
              renderTabContent={(tab) =>
                tab.kind === "file-detail" && currentProject ? (
                  <FileDetailTab path={tab.targetFile ?? ""} files={currentProject.files} tomlFiles={currentProject.tomlFiles} />
                ) : (
                  <RunOutputTab tab={tab} />
                )
              }
            />
          }
          actionsPane={<ActionDeck selectedTomlPath={selectedTomlPath} isBuilding={isBuilding} isDeploying={isDeploying} onBuild={() => void runBuild()} onDeploy={() => void runDeploy()} />}
        />
      </AppShell>
      <WorkbenchSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
