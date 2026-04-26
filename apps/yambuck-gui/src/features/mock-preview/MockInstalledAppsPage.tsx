import { InstalledAppsPage } from "../installed/InstalledAppsPage";
import { appText } from "../../i18n/app";
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
    onRefresh={() => onToast("info", appText("toast.mockListRefreshed"))}
    onOpenDetails={onOpenDetails}
  />
);
