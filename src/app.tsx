import HomePage from "@/pages/index";
import LegacyPage from "@/pages/legacy";
import { Web3Provider } from "@/components/providers/web3-provider";
import { routes } from "@/config/routes-config";

function getRoutePath(pathname: string) {
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/$/, "");
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (basePath && normalizedPathname.startsWith(`${basePath}/`)) {
    return normalizedPathname.slice(basePath.length);
  }

  if (normalizedPathname.endsWith(routes.legacy)) {
    return routes.legacy;
  }

  return normalizedPathname;
}

export function App() {
  const Page = getRoutePath(window.location.pathname) === routes.legacy ? LegacyPage : LegacyPage;

  return (
    <Web3Provider>
      <Page />
    </Web3Provider>
  );
}
