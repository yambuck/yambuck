import type { LogLevel, SettingsTab } from "../../types/app";
import type { DebugTools } from "../../hooks/useDebugTools";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { PanelHeader } from "../../components/ui/PanelHeader";
import { SelectField, type SelectFieldOption } from "../../components/ui/SelectField";
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

export type SettingsUpdates = {
  currentVersion: string | null;
  checking: boolean;
  lastCheckedLabel: string;
  onCheck: () => void;
};

export type SettingsUiLab = {
  onOpenMockPreview: () => void;
  onOpenMockInstalledApps: () => void;
  onOpenMockPackageBuilder: () => void;
  onOpenUiDebugLab: () => void;
};

type SettingsPageProps = {
  settingsTab: SettingsTab;
  onChangeSettingsTab: (tab: SettingsTab) => void;
  updates: SettingsUpdates;
  debug: DebugTools;
  uiLab: SettingsUiLab;
};

// Settings sections in the App Standard order: General, Updates, then Debug.
const SETTINGS_TABS: SettingsTab[] = ["general", "updates", "debug"];

const logLevelOptions: SelectFieldOption[] = [
  { value: "error", label: appText("settings.debug.logLevel.error") },
  { value: "warn", label: appText("settings.debug.logLevel.warn") },
  { value: "info", label: appText("settings.debug.logLevel.info") },
  { value: "debug", label: appText("settings.debug.logLevel.debug") },
  { value: "trace", label: appText("settings.debug.logLevel.trace") },
];

const actionRowClass = `actions start compact ${actions} ${actionsStart} ${actionsCompact}`;

const GeneralTab = () => (
  <div id="settings-general-panel" role="tabpanel" aria-labelledby="settings-general" class={`${settingsGrid} settings-grid`}>
    <article class={`${settingCard} setting-card`}>
      <h2>{appText("settings.general.installBehaviorTitle")}</h2>
      <p class={settingCardDescription}>{appText("settings.general.installBehaviorBody")}</p>
    </article>
  </div>
);

const UpdatesTab = ({ updates }: { updates: SettingsUpdates }) => (
  <div id="settings-updates-panel" role="tabpanel" aria-labelledby="settings-updates" class={`${settingsGrid} settings-grid`}>
    <article class={`${settingCard} setting-card`}>
      <h2>{appText("settings.updates.title")}</h2>
      <p class={settingCardDescription}>
        {updates.currentVersion
          ? appText("update.current", { version: updates.currentVersion })
          : appText("settings.updates.versionUnknown")}
      </p>
      <p class={settingCardDescription}>{appText("settings.updates.body")}</p>
      <p class={settingCardDescription}>{appText("update.lastChecked", { value: updates.lastCheckedLabel })}</p>
      <div class={actionRowClass}>
        <Button onClick={updates.onCheck} disabled={updates.checking}>
          {updates.checking ? appText("settings.updates.checking") : appText("settings.updates.checkNow")}
        </Button>
      </div>
    </article>
  </div>
);

const DebugTab = ({ debug, uiLab }: { debug: DebugTools; uiLab: SettingsUiLab }) => {
  const { systemInfo } = debug;
  return (
    <div id="settings-debug-panel" role="tabpanel" aria-labelledby="settings-debug" class={`${debugStack} debug-stack`}>
      <section class={`${debugSection} debug-section`}>
        <h2>{appText("settings.debug.logsTitle")}</h2>
        <p>{appText("settings.debug.logsBody")}</p>
        <div class={actionRowClass}>
          <Button onClick={() => void debug.copyLog()}>{appText("settings.debug.copyLog")}</Button>
          <Button onClick={() => void debug.openLog()}>{appText("settings.debug.openLog")}</Button>
          <Button onClick={() => void debug.openLogFolder()}>{appText("settings.debug.openLogFolder")}</Button>
        </div>

        <h3>{appText("settings.debug.systemInfoTitle")}</h3>
        {debug.loadingDebug ? <p>{appText("settings.debug.loadingRuntime")}</p> : null}
        {systemInfo ? (
          <ul class={`${systemInfoList} system-info-list`}>
            <li>
              {appText("settings.debug.version")}:{" "}
              <code class={systemInfoCode}>{`${systemInfo.appName} v${systemInfo.appVersion} (${systemInfo.buildProfile})`}</code>
            </li>
            <li>
              {appText("settings.debug.os")}:{" "}
              <code class={systemInfoCode}>{`${systemInfo.distribution} (${systemInfo.os}, kernel ${systemInfo.kernelVersion})`}</code>
            </li>
            <li>{appText("settings.debug.arch")}: <code class={systemInfoCode}>{systemInfo.architecture}</code></li>
            <li>
              {appText("settings.debug.desktop")}:{" "}
              <code class={systemInfoCode}>{`${systemInfo.desktop} (${systemInfo.sessionType})`}</code>
            </li>
            <li>{appText("settings.debug.installPath")}: <code class={systemInfoCode}>{systemInfo.executable}</code></li>
            <li>{appText("settings.debug.updateCheck")}: <code class={systemInfoCode}>{systemInfo.updateCheckUrl}</code></li>
          </ul>
        ) : null}
        <div class={actionRowClass}>
          <Button onClick={() => void debug.copySystemInfo()}>{appText("settings.debug.copySystemInfo")}</Button>
          <Button onClick={() => void debug.loadDebugData()} disabled={debug.loadingDebug}>
            {appText("settings.debug.refresh")}
          </Button>
        </div>

        <label for="settings-log-level">{appText("settings.debug.logLevel")}</label>
        <SelectField
          id="settings-log-level"
          name="log-level"
          value={debug.logLevel}
          options={logLevelOptions}
          logLabel="settings-log-level"
          onValueChange={(level) => void debug.changeLogLevel(level as LogLevel)}
        />

        <h3>{appText("settings.debug.logPreviewTitle")}</h3>
        <pre class={`${logView} log-view`}>{debug.logText || appText("settings.debug.noLogs")}</pre>
      </section>

      <section class={`${debugSection} debug-section`}>
        <h2>{appText("settings.debug.uiTitle")}</h2>
        <p>{appText("settings.debug.uiBody")}</p>
        <div class={actionRowClass}>
          <Button onClick={uiLab.onOpenMockPreview}>{appText("settings.debug.openMockApp")}</Button>
          <Button onClick={uiLab.onOpenMockInstalledApps}>{appText("settings.debug.openMockInstalled")}</Button>
          <Button onClick={uiLab.onOpenMockPackageBuilder}>{appText("settings.debug.openMockPackageBuilder")}</Button>
          <Button onClick={uiLab.onOpenUiDebugLab}>{appText("settings.debug.openUiLab")}</Button>
        </div>
      </section>
    </div>
  );
};

export const SettingsPage = ({ settingsTab, onChangeSettingsTab, updates, debug, uiLab }: SettingsPageProps) => (
  <Panel class={pagePanel}>
    <PanelHeader title={appText("settings.title")} />

    <TogglePillGroup
      class={`${tabs} settings-tabs`}
      behavior="tabs"
      ariaLabel={appText("settings.tabs.aria")}
      items={SETTINGS_TABS.map((tab) => ({
        id: `settings-${tab}`,
        label: appText(`settings.tabs.${tab}`),
        active: settingsTab === tab,
        controlsId: `settings-${tab}-panel`,
        onSelect: () => {
          logUiAction("settings-tab-change", { tab });
          onChangeSettingsTab(tab);
        },
      }))}
    />

    <p class={tabDescription}>{appText(`settings.description.${settingsTab}`)}</p>

    {settingsTab === "general" ? <GeneralTab /> : null}
    {settingsTab === "updates" ? <UpdatesTab updates={updates} /> : null}
    {settingsTab === "debug" ? <DebugTab debug={debug} uiLab={uiLab} /> : null}
  </Panel>
);
