import { InstalledAppsPage } from "../installed/InstalledAppsPage";
import { mockInstalledApps } from "../../mocks/mockData";
import type { InstalledApp } from "../../types/app";

type MockInstalledAppsPageProps = {
  onToast: (kind: "info" | "success" | "warning" | "error", message: string) => void;
  onOpenDetails: (app: InstalledApp) => void;
};

export const MockInstalledAppsPage = ({
  onToast,
  onOpenDetails,
}: MockInstalledAppsPageProps) => (
  <InstalledAppsPage
    loadingInstalled={false}
    installedApps={mockInstalledApps}
    onRefresh={() => onToast("info", "Mock list refreshed.")}
    onOpenDetails={onOpenDetails}
  />
);
