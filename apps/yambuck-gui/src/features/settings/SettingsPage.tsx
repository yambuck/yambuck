import type { SettingsTab, SystemInfo } from "../../types/app";

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
  onCopyLogs,
  onClearLogs,
}: SettingsPageProps) => (
  <section class="panel">
    <h1>Settings</h1>
    <p class="subtitle">Configure Yambuck behavior and inspect diagnostics.</p>

    <div class="settings-tabs" data-no-drag="true">
      <button
        class={`toggle-pill ${settingsTab === "general" ? "active" : ""}`}
        onClick={() => onChangeSettingsTab("general")}
      >
        General
      </button>
      <button
        class={`toggle-pill ${settingsTab === "debug" ? "active" : ""}`}
        onClick={() => onChangeSettingsTab("debug")}
      >
        Debug
      </button>
    </div>

    {settingsTab === "general" ? (
      <div class="settings-grid">
        <article class="setting-card">
          <h2>Updates</h2>
          <p>Update checks are enabled on startup and can be run manually.</p>
          <button class="button ghost" onClick={onCheckForUpdates} disabled={checkingUpdates}>
            {checkingUpdates ? "Checking..." : "Check now"}
          </button>
        </article>
        <article class="setting-card">
          <h2>Install behavior</h2>
          <p>Default install scope is per-user. System scope requires elevation.</p>
        </article>
      </div>
    ) : (
      <div class="debug-stack">
        <section class="debug-section">
          <h2>System info</h2>
          {loadingDebug ? <p>Loading runtime data...</p> : null}
          {systemInfo ? (
            <ul class="system-info-list">
              <li>Version: <code>{systemInfo.appVersion}</code></li>
              <li>Distro: <code>{systemInfo.distro}</code></li>
              <li>Kernel: <code>{systemInfo.kernelVersion}</code></li>
              <li>Desktop: <code>{systemInfo.desktopEnvironment}</code></li>
              <li>Session: <code>{systemInfo.sessionType}</code></li>
              <li>Arch: <code>{systemInfo.arch}</code></li>
              <li>Install Path: <code>{systemInfo.installPath}</code></li>
              <li>Update Feed: <code>{systemInfo.updateFeedUrl}</code></li>
            </ul>
          ) : null}
          <div class="actions start compact">
            <button class="button ghost" onClick={onLoadDebugData} disabled={loadingDebug}>
              Refresh
            </button>
            <button class="button ghost" onClick={onCopySystemInfo}>
              Copy system info
            </button>
            <button class="button ghost" onClick={onOpenMockPreview}>
              Open mock app page
            </button>
          </div>
        </section>

        <section class="debug-section">
          <h2>Logs</h2>
          <p>Timestamped events for update checks and installer actions.</p>
          <pre class="log-view">{logText || "No logs yet."}</pre>
          <div class="actions start compact">
            <button class="button ghost" onClick={onCopyLogs}>
              Copy logs
            </button>
            <button class="button ghost" onClick={onClearLogs}>
              Clear logs
            </button>
          </div>
        </section>
      </div>
    )}
  </section>
);
