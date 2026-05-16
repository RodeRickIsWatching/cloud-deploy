import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { DeployStep } from "./deploy-step";
import { ReviewStep } from "./review-step";

describe("ReviewStep and DeployStep", () => {
  it("renders review payload actions", () => {
    renderWithProviders(
      <ReviewStep
        reviewPayload={{ hashes: { sourceHash: "0x1234567890abcdef" }, payload: { ok: true } }}
        onCopy={vi.fn()}
        onDownload={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText("Copy JSON")).toBeInTheDocument();
    expect(screen.getByText("Download JSON")).toBeInTheDocument();
  });

  it("deploys normally when a Lyquid ID is set", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    renderWithProviders(<DeployStep isWalletConnected result={null} onDeploy={onDeploy} onConnectWallet={vi.fn()} error={null} />);

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(screen.queryByText("Deploy as update to this Lyquid?")).not.toBeInTheDocument();
    expect(onDeploy).toHaveBeenCalledTimes(1);
  });

  it("asks the user to connect a wallet before deploying", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    const onConnectWallet = vi.fn();
    renderWithProviders(<DeployStep isWalletConnected={false} result={null} onDeploy={onDeploy} onConnectWallet={onConnectWallet} error={null} />);

    await user.click(screen.getByRole("button", { name: "Deploy" }));
    expect(screen.getByText("Connect wallet to deploy")).toBeInTheDocument();
    expect(onDeploy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Connect Wallet" }));
    expect(onConnectWallet).toHaveBeenCalledTimes(1);
  });
});
