import type { JSX } from "preact";
import { WindowControls } from "../components/ui/WindowControls";
import { TogglePillGroup } from "../components/ui/TogglePillGroup";
import { appText } from "../i18n/app";
import type { AppPage } from "../types/app";
import appIcon from "../../src-tauri/icons/icon-source.svg";

type AppTopBarProps = {
  page: AppPage;
  isMaximized: boolean;
  onTitlebarMouseDown: (event: MouseEvent) => Promise<void>;
  onNavigateInstaller: () => void;
  onNavigateInstalled: () => void;
  onNavigatePackageBuilder: () => void;
  onOpenSettings: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
};

export const AppTopBar = ({
  page,
  isMaximized,
  onTitlebarMouseDown,
  onNavigateInstaller,
  onNavigateInstalled,
  onNavigatePackageBuilder,
  onOpenSettings,
  onMinimize,
  onToggleMaximize,
  onClose,
}: AppTopBarProps) => (
  <header class="topbar" onMouseDown={(event: JSX.TargetedMouseEvent<HTMLElement>) => void onTitlebarMouseDown(event as unknown as MouseEvent)}>
    <div class="topbar-left" data-no-drag="true">
      <img class="topbar-app-icon" src={appIcon} alt="Yambuck" />
      <TogglePillGroup
        class="topbar-nav"
        behavior="buttons"
        ariaLabel={appText("app.nav.primaryAria")}
        items={[
          {
            id: "installer",
            label: appText("app.nav.installer"),
            active: page === "installer",
            onSelect: onNavigateInstaller,
          },
          {
            id: "installed-apps",
            label: appText("app.nav.installedApps"),
            active: page === "installed" || page === "installedReview" || page === "installedUninstall",
            onSelect: onNavigateInstalled,
          },
          {
            id: "package-builder",
            label: appText("app.nav.packageBuilder"),
            active: page === "packageBuilder",
            onSelect: onNavigatePackageBuilder,
          },
        ]}
      />
    </div>
    <WindowControls
      settingsActive={page === "settings" || page === "uiDebugLab"}
      isMaximized={isMaximized}
      onOpenSettings={onOpenSettings}
      onMinimize={onMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
    />
  </header>
);
