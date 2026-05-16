import type { ReactNode } from "react";
import { deploySteps } from "@/config/deploy-steps-config";
import type { DeployStepId } from "@/types/deploy";
import { AppHeader } from "@/components/shared/app-header";
import { ProgressSteps } from "@/components/shared/progress-steps";

type AppShellProps = {
  children: ReactNode;
  currentStep: DeployStepId;
  completedSteps: DeployStepId[];
  walletLabel: string;
  walletAddress?: string;
  onConnectWallet: () => void;
  onCopyWalletAddress: () => void;
  onDisconnectWallet: () => void;
  onOpenSettings: () => void;
  onStepBack: (step: DeployStepId) => void;
};

export function AppShell({
  children,
  currentStep,
  completedSteps,
  walletLabel,
  walletAddress,
  onConnectWallet,
  onCopyWalletAddress,
  onDisconnectWallet,
  onOpenSettings,
  onStepBack
}: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader
        walletLabel={walletLabel}
        walletAddress={walletAddress}
        onConnectWallet={onConnectWallet}
        onCopyWalletAddress={onCopyWalletAddress}
        onDisconnectWallet={onDisconnectWallet}
        onOpenSettings={onOpenSettings}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <section className="border-b bg-card px-6 py-5">
          <ProgressSteps steps={deploySteps} currentStep={currentStep} completedSteps={completedSteps} onStepBack={onStepBack} />
        </section>
        <section className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</section>
      </main>
    </div>
  );
}
