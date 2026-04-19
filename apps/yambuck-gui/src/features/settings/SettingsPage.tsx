import type { SettingsTab, SystemInfo } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";

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
  <Panel class="settings-page-panel">
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
          <Button onClick={onCheckForUpdates} disabled={checkingUpdates}>
            {checkingUpdates ? "Checking..." : "Check now"}
          </Button>
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
            <Button onClick={onLoadDebugData} disabled={loadingDebug}>Refresh</Button>
            <Button onClick={onCopySystemInfo}>Copy system info</Button>
            <Button onClick={onOpenMockPreview}>Open mock app page</Button>
          </div>
        </section>

        <section class="debug-section">
          <h2>Logs</h2>
          <p>Timestamped events for update checks and installer actions.</p>
          <pre class="log-view">{logText || "No logs yet."}</pre>
          <div class="actions start compact">
            <Button onClick={onCopyLogs}>Copy logs</Button>
            <Button onClick={onClearLogs}>Clear logs</Button>
          </div>
        </section>

        <section class="debug-section">
          <h2>Scroll test card A</h2>
          <p>Temporary filler content to validate long-page behavior in the Debug tab.</p>
          <div class="debug-scroll-probe" aria-label="Debug scroll probe content card A">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sed mauris tristique, lacinia nunc et, lacinia lacus. Curabitur tempus neque sem, vitae vehicula nibh viverra non. Pellentesque eu ultrices mauris.</p>
            <p>Vivamus ut mattis lectus. Vestibulum vulputate interdum feugiat. Duis vel augue sed tortor iaculis volutpat. Mauris euismod, mi in malesuada tincidunt, lectus arcu posuere justo, ac mollis dolor velit id lacus.</p>
            <p>Quisque faucibus consequat velit, non interdum erat tincidunt sed. Nullam vitae justo tortor. Donec faucibus, lectus eu dignissim congue, augue magna venenatis est, quis dignissim nisi ipsum ut turpis.</p>
            <p>Nam in massa commodo, porttitor nisi a, tristique lectus. Praesent ut sem id neque posuere mattis. Donec lacinia nibh id leo efficitur, quis consequat elit condimentum. Donec tempor imperdiet lorem.</p>
            <p>Etiam at augue a arcu aliquet lacinia. Curabitur eleifend iaculis velit, vitae ultrices elit accumsan ut. Integer dignissim sem at nunc pellentesque, at convallis risus egestas. Nulla facilisi.</p>
            <p>Sed facilisis velit sed tellus bibendum, non volutpat orci pellentesque. Integer feugiat malesuada sem, eu consequat risus viverra at. Aliquam luctus risus id tortor mattis, et iaculis justo convallis.</p>
            <p>Integer placerat, sem sed mattis semper, augue elit luctus eros, in sollicitudin erat felis at erat. Proin faucibus, turpis a gravida blandit, mi risus rutrum justo, in fermentum augue quam et purus.</p>
            <p>Vestibulum ut ex sit amet purus gravida luctus. Suspendisse non massa justo. Aenean non tempus urna. Nunc semper, nunc sed viverra gravida, sem magna consectetur neque, nec viverra mauris risus ac nibh.</p>
          </div>
        </section>

        <section class="debug-section">
          <h2>Scroll test card B</h2>
          <p>Additional filler content to force overflow and exercise shell/footer spacing behavior.</p>
          <div class="debug-scroll-probe" aria-label="Debug scroll probe content card B">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec bibendum quam in risus posuere, id feugiat nulla pretium. Pellentesque at interdum elit, sit amet pellentesque orci.</p>
            <p>Morbi congue interdum arcu, et pellentesque lacus lacinia non. Integer eget ex turpis. Sed mollis tortor ac magna scelerisque, vel consectetur nulla sagittis. Duis in nisi lorem.</p>
            <p>Aliquam erat volutpat. Cras gravida ornare neque in mattis. Quisque feugiat, magna id faucibus posuere, justo odio consequat leo, id faucibus lorem arcu vel sapien.</p>
            <p>Mauris ultricies sem nibh, eget tempor sapien commodo et. Fusce aliquet sodales massa in facilisis. Ut pretium tempor velit, in fermentum leo tincidunt non.</p>
            <p>Curabitur tincidunt, metus ac ultrices luctus, leo lorem gravida nibh, nec tristique justo felis ac urna. Suspendisse finibus ligula in porta consectetur. Quisque malesuada posuere eros.</p>
            <p>Vestibulum finibus posuere posuere. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec feugiat, magna ac posuere varius, velit lectus iaculis sem, vel eleifend sem tortor non turpis.</p>
            <p>Sed posuere tellus ac purus gravida, sed tristique lacus malesuada. Donec vitae sodales urna. In tristique urna turpis, eu hendrerit lectus tristique in. In mollis rhoncus ultrices.</p>
            <p>Pellentesque sit amet magna ac ipsum luctus tincidunt. Integer sed libero sem. Ut feugiat erat id mauris porta, a faucibus mi porta. Integer cursus eu enim eu molestie.</p>
          </div>
        </section>
      </div>
    )}
  </Panel>
);
