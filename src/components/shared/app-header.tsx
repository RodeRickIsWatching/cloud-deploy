import { Settings } from "lucide-react";
import { useState } from "react";
import { appName } from "@/config/app-config";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  walletLabel: string;
  walletAddress?: string;
  onConnectWallet: () => void;
  onCopyWalletAddress?: () => void;
  onDisconnectWallet?: () => void;
  onOpenSettings: () => void;
};

export function AppHeader({
  walletLabel,
  walletAddress,
  onConnectWallet,
  onCopyWalletAddress,
  onDisconnectWallet,
  onOpenSettings
}: AppHeaderProps) {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  const handleWalletClick = () => {
    if (!walletAddress) {
      onConnectWallet();
      return;
    }

    setWalletMenuOpen((open) => !open);
  };

  return (
    <header className="flex h-toolbar items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{appName}</h1>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Button type="button" variant="outline" aria-expanded={walletAddress ? walletMenuOpen : undefined} onClick={handleWalletClick}>
            {walletLabel}
          </Button>
          {walletAddress && walletMenuOpen ? (
            <div role="menu" className="absolute right-0 z-10 mt-2 min-w-32 rounded-md border bg-popover p-1 shadow-panel">
              <Button
                type="button"
                role="menuitem"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setWalletMenuOpen(false);
                  onCopyWalletAddress?.();
                }}
              >
                Copy
              </Button>
              <Button
                type="button"
                role="menuitem"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setWalletMenuOpen(false);
                  onDisconnectWallet?.();
                }}
              >
                Logout
              </Button>
            </div>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
