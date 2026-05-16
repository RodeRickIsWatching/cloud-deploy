import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { BuildStep } from "@/components/build-step";
import { DeployStep } from "@/components/deploy-step";
import { ReviewStep } from "@/components/review-step";
import { SettingsDialog } from "@/components/shared/settings-dialog";
import { UploadStep } from "@/components/upload-step";
import { AppShell } from "@/layout/app-shell";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { useSettingsStore } from "@/store/settings-store";
import type { DeployStepId } from "@/types/deploy";
import { findMethod } from "@/utils/abi/abi-utils";
import { prepareBuildMethodCall } from "@/utils/build-args-utils";
import { prepareDeployMethodCall } from "@/utils/deploy-args-utils";
import { downloadJson } from "@/utils/download-utils";
import { hashPayload } from "@/utils/hash-utils";
import { createBrowserWalletTransactionClient } from "@/utils/request/browser-wallet-client";
import { dispatchSelectedMethod } from "@/utils/request/request-dispatcher";
import { fetchRpcTransaction } from "@/utils/request/rpc-transaction-client";

type BrowserWindowWithWallet = Window & {
  ethereum?: Parameters<typeof createBrowserWalletTransactionClient>[0];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResultTransactionHash(raw: unknown, fallback?: string) {
  return fallback ?? (isRecord(raw) && typeof raw.transactionHash === "string" ? raw.transactionHash : undefined);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to fetch RPC transaction.";
}

const completedByStep: Record<DeployStepId, DeployStepId[]> = {
  upload: [],
  build: ["upload"],
  review: ["upload", "build"],
  deploy: ["upload", "build", "review"]
};

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const settings = useSettingsStore();
  const session = useDeploySessionStore();
  const deployRaw = session.deployResult?.raw;
  const deployTransactionHash = getResultTransactionHash(deployRaw, session.deployResult?.transactionHash);
  const deployTransactionFound = Boolean(isRecord(deployRaw) && isRecord(deployRaw.transaction));

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const canBuild = Boolean(session.uploadedProject && settings.parsedAbi && settings.buildMethod && !settings.methodErrors.buildMethod);
  const connectWallet = () => connect({ connector: injected() });
  const copyWalletAddress = () => (account.address ? navigator.clipboard.writeText(account.address) : undefined);

  useEffect(() => {
    if (session.currentStep !== "deploy" || !settings.rpcEndpoint || !deployTransactionHash?.startsWith("0x") || deployTransactionFound) {
      return undefined;
    }

    let cancelled = false;

    const mergeDeployRaw = (rawPatch: Record<string, unknown>) => {
      const latestResult = useDeploySessionStore.getState().deployResult;

      if (!latestResult || getResultTransactionHash(latestResult.raw, latestResult.transactionHash) !== deployTransactionHash) {
        return;
      }

      const latestRaw = isRecord(latestResult.raw) ? latestResult.raw : {};
      useDeploySessionStore.getState().setDeployResult({
        ...latestResult,
        raw: { ...latestRaw, ...rawPatch }
      });
    };

    const lookupTransaction = async () => {
      const latestRaw = useDeploySessionStore.getState().deployResult?.raw;

      if (isRecord(latestRaw) && isRecord(latestRaw.transaction)) {
        return;
      }

      try {
        const transaction = await fetchRpcTransaction({
          rpcEndpoint: settings.rpcEndpoint,
          transactionHash: deployTransactionHash as `0x${string}`,
          offChainFetch: (input, init) => fetch(input, init)
        });

        if (cancelled) {
          return;
        }

        if (transaction) {
          mergeDeployRaw({ transaction, transactionLookupPending: false, transactionLookupError: undefined });
          return;
        }

        mergeDeployRaw({ transactionLookupPending: true });
      } catch (error) {
        if (!cancelled) {
          mergeDeployRaw({ transactionLookupPending: true, transactionLookupError: getErrorMessage(error) });
        }
      }
    };

    void lookupTransaction();
    const intervalId = window.setInterval(() => void lookupTransaction(), 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [deployTransactionFound, deployTransactionHash, session.currentStep, settings.rpcEndpoint]);

  const handleBuild = async () => {
    if (!settings.parsedAbi || !session.uploadedProject) {
      session.setCurrentError("Upload and valid ABI settings are required.");
      return;
    }

    try {
      setIsBuilding(true);
      session.setCurrentError(null);
      const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
      if (!buildMethod) {
        session.setCurrentError("Selected build method does not exist.");
        return;
      }

      const { args, sourceHash } = await prepareBuildMethodCall({
        method: buildMethod,
        project: session.uploadedProject
      });
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

      session.setBuildResult({
        hashes: { sourceHash, artifactHash },
        logs: [],
        payload: raw,
        raw
      });
    } catch (error) {
      session.setCurrentError(error instanceof Error ? error.message : "Build failed.");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDeploy = async () => {
    if (!account.address) {
      session.setCurrentError("Connect wallet before deploying.");
      return;
    }

    if (!settings.parsedAbi || !session.reviewPayload) {
      session.setCurrentError("Review payload is required before deploy.");
      return;
    }

    try {
      setIsDeploying(true);
      session.setCurrentError(null);
      const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
      const deployMethod = findMethod(settings.parsedAbi, settings.deployMethod);

      if (!buildMethod || !deployMethod) {
        session.setCurrentError("Selected deploy method does not exist.");
        return;
      }

      const { args } = prepareDeployMethodCall({
        buildMethod,
        deployMethod,
        project: session.uploadedProject,
        reviewPayload: session.reviewPayload
      });
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
      const signedPayloadHash = await hashPayload(raw);
      const transactionHash = typeof raw === "object" && raw && "transactionHash" in raw ? String(raw.transactionHash) : undefined;
      const status = typeof raw === "object" && raw && "status" in raw ? String(raw.status) : "submitted";
      session.setDeployResult({
        transactionHash,
        status,
        signedPayloadHash,
        raw
      });
    } catch (error) {
      session.setCurrentError(error instanceof Error ? error.message : "Deploy failed.");
    } finally {
      setIsDeploying(false);
    }
  };

  let stepContent = (
    <DeployStep
      isWalletConnected={Boolean(account.address)}
      isDeploying={isDeploying}
      result={session.deployResult}
      onDeploy={handleDeploy}
      onConnectWallet={connectWallet}
      error={session.currentError}
    />
  );

  if (session.currentStep === "upload") {
    stepContent = <UploadStep project={session.uploadedProject} onUpload={session.setUploadedProject} onContinue={() => session.goToStep("build")} />;
  }

  if (session.currentStep === "build") {
    stepContent = (
      <BuildStep
        onBuild={handleBuild}
        canBuild={canBuild}
        isBuilding={isBuilding}
        error={session.currentError}
      />
    );
  }

  if (session.currentStep === "review") {
    stepContent = (
      <ReviewStep
        reviewPayload={session.reviewPayload}
        onCopy={() => navigator.clipboard.writeText(JSON.stringify(session.reviewPayload?.payload ?? {}, null, 2))}
        onDownload={() => downloadJson("cloud-deploy-payload.json", session.reviewPayload?.payload ?? {})}
        onContinue={() => session.goToStep("deploy")}
      />
    );
  }

  return (
    <>
      <AppShell
        currentStep={session.currentStep}
        completedSteps={completedByStep[session.currentStep]}
        walletLabel={walletLabel}
        walletAddress={account.address}
        onConnectWallet={connectWallet}
        onCopyWalletAddress={copyWalletAddress}
        onDisconnectWallet={disconnect}
        onOpenSettings={() => setSettingsOpen(true)}
        onStepBack={session.goToStep}
      >
        {stepContent}
      </AppShell>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={{
          rpcEndpoint: settings.rpcEndpoint,
          lyquidId: settings.lyquidId,
          abi: settings.abi,
          buildMethod: settings.buildMethod,
          deployMethod: settings.deployMethod
        }}
        methodOptions={settings.methodOptions}
        methodErrors={settings.methodErrors}
        onSave={settings.saveSettings}
      />
    </>
  );
}
