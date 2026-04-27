import type { SettingsTab, SystemInfo } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { PanelHeader } from "../../components/ui/PanelHeader";
import { TogglePillGroup } from "../../components/ui/TogglePillGroup";
import { appText } from "../../i18n/app";
import { logUiAction } from "../../lib/ui-log";
import {
  debugSection,
  debugStack,
  logView,
  pagePanel,
  settingCard,
  settingCardDescription,
  settingsGrid,
  systemInfoCode,
  systemInfoList,
  tabDescription,
  tabs,
} from "./settingsPage.css";
import { actions, actionsCompact, actionsStart } from "../shared/packageUi.css";

type SettingsPageProps = {
  settingsTab: SettingsTab;
  onChangeSettingsTab: (tab: SettingsTab) => void;
  checkingUpdates: boolean;
  onCheckForUpdates: () => void;
  loadingDebug: boolean;
  systemInfo: SystemInfo | null;
  logText: string;
  onLoadDebugData: () => void;
  onCopySystemInfo: () => void;
  onOpenMockPreview: () => void;
  onOpenMockInstalledApps: () => void;
  onOpenMockPackageBuilder: () => void;
  onOpenUiDebugLab: () => void;
  onCopyLogs: () => void;
  onClearLogs: () => void;
};

export const SettingsPage = ({
  settingsTab,
  onChangeSettingsTab,
  checkingUpdates,
  onCheckForUpdates,
  loadingDebug,
  systemInfo,
  logText,
  onLoadDebugData,
  onCopySystemInfo,
  onOpenMockPreview,
  onOpenMockInstalledApps,
  onOpenMockPackageBuilder,
  onOpenUiDebugLab,
  onCopyLogs,
  onClearLogs,
}: SettingsPageProps) => (
  <Panel class={pagePanel}>
    <PanelHeader title={appText("settings.title")} />

    <TogglePillGroup
      class={`${tabs} settings-tabs`}
      behavior="tabs"
      ariaLabel={appText("settings.tabs.aria")}
      items={[
        {
          id: "settings-general",
          label: appText("settings.tabs.general"),
          active: settingsTab === "general",
          controlsId: "settings-general-panel",
          onSelect: () => {
            logUiAction("settings-tab-change", { tab: "general" });
            onChangeSettingsTab("general");
          },
        },
        {
          id: "settings-debug",
          label: appText("settings.tabs.debug"),
          active: settingsTab === "debug",
          controlsId: "settings-debug-panel",
          onSelect: () => {
            logUiAction("settings-tab-change", { tab: "debug" });
            onChangeSettingsTab("debug");
          },
        },
      ]}
    />

    <p class={tabDescription}>
      {settingsTab === "general"
        ? appText("settings.description.general")
        : appText("settings.description.debug")}
    </p>

    {settingsTab === "general" ? (
      <div id="settings-general-panel" role="tabpanel" aria-labelledby="settings-general" class={`${settingsGrid} settings-grid`}>
        <article class={`${settingCard} setting-card`}>
          <h2>{appText("settings.general.updatesTitle")}</h2>
          <p class={settingCardDescription}>{appText("settings.general.updatesBody")}</p>
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onCheckForUpdates} disabled={checkingUpdates}>
              {checkingUpdates ? appText("settings.general.checking") : appText("settings.general.checkNow")}
            </Button>
          </div>
        </article>
        <article class={`${settingCard} setting-card`}>
          <h2>{appText("settings.general.installBehaviorTitle")}</h2>
          <p class={settingCardDescription}>{appText("settings.general.installBehaviorBody")}</p>
        </article>
      </div>
    ) : (
      <div id="settings-debug-panel" role="tabpanel" aria-labelledby="settings-debug" class={`${debugStack} debug-stack`}>
        <section class={`${debugSection} debug-section`}>
          <h2>{appText("settings.debug.systemInfoTitle")}</h2>
          {loadingDebug ? <p>{appText("settings.debug.loadingRuntime")}</p> : null}
          {systemInfo ? (
            <ul class={`${systemInfoList} system-info-list`}>
              <li>{appText("settings.debug.version")}: <code class={systemInfoCode}>{systemInfo.appVersion}</code></li>
              <li>{appText("settings.debug.distro")}: <code class={systemInfoCode}>{systemInfo.distro}</code></li>
              <li>{appText("settings.debug.kernel")}: <code class={systemInfoCode}>{systemInfo.kernelVersion}</code></li>
              <li>{appText("settings.debug.desktop")}: <code class={systemInfoCode}>{systemInfo.desktopEnvironment}</code></li>
              <li>{appText("settings.debug.session")}: <code class={systemInfoCode}>{systemInfo.sessionType}</code></li>
              <li>{appText("settings.debug.arch")}: <code class={systemInfoCode}>{systemInfo.arch}</code></li>
              <li>{appText("settings.debug.installPath")}: <code class={systemInfoCode}>{systemInfo.installPath}</code></li>
              <li>{appText("settings.debug.updateFeed")}: <code class={systemInfoCode}>{systemInfo.updateFeedUrl}</code></li>
            </ul>
          ) : null}
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onLoadDebugData} disabled={loadingDebug}>{appText("settings.debug.refresh")}</Button>
            <Button onClick={onCopySystemInfo}>{appText("settings.debug.copySystemInfo")}</Button>
          </div>
        </section>

        <section class={`${debugSection} debug-section`}>
          <h2>{appText("settings.debug.logsTitle")}</h2>
          <p>{appText("settings.debug.logsBody")}</p>
          <pre class={`${logView} log-view`}>{logText || appText("settings.debug.noLogs")}</pre>
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onCopyLogs}>{appText("settings.debug.copyLogs")}</Button>
            <Button onClick={onClearLogs}>{appText("settings.debug.clearLogs")}</Button>
          </div>
        </section>

        <section class={`${debugSection} debug-section`}>
          <h2>{appText("settings.debug.uiTitle")}</h2>
          <p>{appText("settings.debug.uiBody")}</p>
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onOpenMockPreview}>{appText("settings.debug.openMockApp")}</Button>
            <Button onClick={onOpenMockInstalledApps}>{appText("settings.debug.openMockInstalled")}</Button>
            <Button onClick={onOpenMockPackageBuilder}>{appText("settings.debug.openMockPackageBuilder")}</Button>
            <Button onClick={onOpenUiDebugLab}>{appText("settings.debug.openUiLab")}</Button>
          </div>
        </section>
      </div>
    )}
  </Panel>
);
