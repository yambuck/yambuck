import type { ComponentChildren } from "preact";
import type { AppPage } from "../types/app";

type RenderPage = () => ComponentChildren;

type AppPageRendererProps = {
  page: AppPage;
  renderInstaller: RenderPage;
  renderInstalled: RenderPage;
  renderInstalledReview: RenderPage;
  renderInstalledUninstall: RenderPage;
  renderPackageBuilder: RenderPage;
  renderSettings: RenderPage;
  renderUiDebugLab: RenderPage;
  renderMockInstalled: RenderPage;
  renderMockInstalledReview: RenderPage;
  renderMockInstalledUninstall: RenderPage;
  renderMockInstallFlow: RenderPage;
  renderMockPreview: RenderPage;
};

export const AppPageRenderer = ({
  page,
  renderInstaller,
  renderInstalled,
  renderInstalledReview,
  renderInstalledUninstall,
  renderPackageBuilder,
  renderSettings,
  renderUiDebugLab,
  renderMockInstalled,
  renderMockInstalledReview,
  renderMockInstalledUninstall,
  renderMockInstallFlow,
  renderMockPreview,
}: AppPageRendererProps) => {
  if (page === "installer") {
    return <>{renderInstaller()}</>;
  }
  if (page === "installed") {
    return <>{renderInstalled()}</>;
  }
  if (page === "installedReview") {
    return <>{renderInstalledReview()}</>;
  }
  if (page === "installedUninstall") {
    return <>{renderInstalledUninstall()}</>;
  }
  if (page === "packageBuilder") {
    return <>{renderPackageBuilder()}</>;
  }
  if (page === "settings") {
    return <>{renderSettings()}</>;
  }
  if (page === "uiDebugLab") {
    return <>{renderUiDebugLab()}</>;
  }
  if (page === "mockInstalled") {
    return <>{renderMockInstalled()}</>;
  }
  if (page === "mockInstalledReview") {
    return <>{renderMockInstalledReview()}</>;
  }
  if (page === "mockInstalledUninstall") {
    return <>{renderMockInstalledUninstall()}</>;
  }
  if (page === "mockInstallFlow") {
    return <>{renderMockInstallFlow()}</>;
  }
  return <>{renderMockPreview()}</>;
};
