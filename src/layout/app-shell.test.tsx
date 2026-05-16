import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deploySteps } from "@/config/deploy-steps-config";
import { renderWithProviders } from "@/test/render";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders header and progress", () => {
    renderWithProviders(
      <AppShell
        currentStep="upload"
        completedSteps={[]}
        walletLabel="Connect Wallet"
        onConnectWallet={vi.fn()}
        onCopyWalletAddress={vi.fn()}
        onDisconnectWallet={vi.fn()}
        onOpenSettings={vi.fn()}
        onStepBack={vi.fn()}
      >
        <p>Upload content</p>
      </AppShell>
    );

    expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
    expect(screen.getByText(deploySteps[0].label)).toBeInTheDocument();
    expect(screen.getByText("Upload content")).toBeInTheDocument();
  });
});
