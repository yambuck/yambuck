import type { SettingsTab, SystemInfo } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { TogglePillGroup } from "../../components/ui/TogglePillGroup";
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
  onOpenUiDebugLab,
  onCopyLogs,
  onClearLogs,
}: SettingsPageProps) => (
  <Panel class={pagePanel}>
    <h1>Settings</h1>

    <TogglePillGroup
      class={`${tabs} settings-tabs`}
      behavior="tabs"
      ariaLabel="Settings sections"
      items={[
        {
          id: "settings-general",
          label: "General",
          active: settingsTab === "general",
          controlsId: "settings-general-panel",
          onSelect: () => {
            logUiAction("settings-tab-change", { tab: "general" });
            onChangeSettingsTab("general");
          },
        },
        {
          id: "settings-debug",
          label: "Debug",
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
        ? "Configure update checks and install behavior defaults."
        : "Inspect runtime details, logs, and mock UI screens."}
    </p>

    {settingsTab === "general" ? (
      <div id="settings-general-panel" role="tabpanel" aria-labelledby="settings-general" class={`${settingsGrid} settings-grid`}>
        <article class={`${settingCard} setting-card`}>
          <h2>Updates</h2>
          <p class={settingCardDescription}>Update checks are enabled on startup and can be run manually.</p>
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onCheckForUpdates} disabled={checkingUpdates}>
              {checkingUpdates ? "Checking..." : "Check now"}
            </Button>
          </div>
        </article>
        <article class={`${settingCard} setting-card`}>
          <h2>Install behavior</h2>
          <p class={settingCardDescription}>Default install scope is per-user. System scope requires elevation.</p>
        </article>
      </div>
    ) : (
      <div id="settings-debug-panel" role="tabpanel" aria-labelledby="settings-debug" class={`${debugStack} debug-stack`}>
        <section class={`${debugSection} debug-section`}>
          <h2>System info</h2>
          {loadingDebug ? <p>Loading runtime data...</p> : null}
          {systemInfo ? (
            <ul class={`${systemInfoList} system-info-list`}>
              <li>Version: <code class={systemInfoCode}>{systemInfo.appVersion}</code></li>
              <li>Distro: <code class={systemInfoCode}>{systemInfo.distro}</code></li>
              <li>Kernel: <code class={systemInfoCode}>{systemInfo.kernelVersion}</code></li>
              <li>Desktop: <code class={systemInfoCode}>{systemInfo.desktopEnvironment}</code></li>
              <li>Session: <code class={systemInfoCode}>{systemInfo.sessionType}</code></li>
              <li>Arch: <code class={systemInfoCode}>{systemInfo.arch}</code></li>
              <li>Install Path: <code class={systemInfoCode}>{systemInfo.installPath}</code></li>
              <li>Update Feed: <code class={systemInfoCode}>{systemInfo.updateFeedUrl}</code></li>
            </ul>
          ) : null}
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onLoadDebugData} disabled={loadingDebug}>Refresh</Button>
            <Button onClick={onCopySystemInfo}>Copy system info</Button>
          </div>
        </section>

        <section class={`${debugSection} debug-section`}>
          <h2>Logs</h2>
          <p>Timestamped events for update checks and installer actions.</p>
          <pre class={`${logView} log-view`}>{logText || "No logs yet."}</pre>
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onCopyLogs}>Copy logs</Button>
            <Button onClick={onClearLogs}>Clear logs</Button>
          </div>
        </section>

        <section class={`${debugSection} debug-section`}>
          <h2>UI debugging</h2>
          <p>Open realistic mock screens that reuse production components and styling paths.</p>
          <div class={`actions start compact ${actions} ${actionsStart} ${actionsCompact}`}>
            <Button onClick={onOpenMockPreview}>Open mock app page</Button>
            <Button onClick={onOpenMockInstalledApps}>Open mock installed list</Button>
            <Button onClick={onOpenUiDebugLab}>Open UI debugging lab</Button>
          </div>
        </section>
      </div>
    )}
  </Panel>
);
