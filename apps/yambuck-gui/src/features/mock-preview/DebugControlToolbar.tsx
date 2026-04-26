import { TogglePillGroup } from "../../components/ui/TogglePillGroup";
import { TextField } from "../../components/ui/TextField";
import { appText } from "../../i18n/app";
import {
  header,
  label,
  scenarioPills,
  scenarioRow,
  shell,
  subtle,
  title,
  versionField,
  versionInput,
  versionRow,
} from "./DebugControlToolbar.css";

export type DebugInstallScenario = "new_install" | "update" | "reinstall" | "downgrade";

type DebugControlToolbarProps = {
  showScenarioControls: boolean;
  scenario: DebugInstallScenario;
  onSetScenario: (scenario: DebugInstallScenario) => void;
  existingVersion: string;
  incomingVersion: string;
  onSetExistingVersion: (version: string) => void;
  onSetIncomingVersion: (version: string) => void;
  onSetReinstallVersion: (version: string) => void;
};

export const DebugControlToolbar = ({
  showScenarioControls,
  scenario,
  onSetScenario,
  existingVersion,
  incomingVersion,
  onSetExistingVersion,
  onSetIncomingVersion,
  onSetReinstallVersion,
}: DebugControlToolbarProps) => {
  const isNewInstall = scenario === "new_install";
  const isReinstall = scenario === "reinstall";
  const scenarioHint = scenario === "new_install"
    ? appText("debugToolbar.scenario.newInstallHint")
    : scenario === "update"
      ? appText("debugToolbar.scenario.updateHint")
      : scenario === "reinstall"
        ? appText("debugToolbar.scenario.reinstallHint")
        : appText("debugToolbar.scenario.downgradeHint");

  return (
    <section class={`debug-control-toolbar ${shell}`} data-no-drag="true">
      <div class={header}>
        <p class={title}>{appText("debugToolbar.title")}</p>
        <p class={subtle}>{showScenarioControls ? appText("debugToolbar.subtitle") : appText("debugToolbar.empty")}</p>
      </div>

      {showScenarioControls ? (
        <>
          <div class={scenarioRow}>
            <p class={label}>{appText("debugToolbar.scenario.label")}</p>
            <TogglePillGroup
              class={scenarioPills}
              behavior="buttons"
              items={[
                {
                  id: "debug-scenario-new",
                  label: appText("debugToolbar.scenario.newInstall"),
                  active: scenario === "new_install",
                  onSelect: () => onSetScenario("new_install"),
                },
                {
                  id: "debug-scenario-update",
                  label: appText("debugToolbar.scenario.update"),
                  active: scenario === "update",
                  onSelect: () => onSetScenario("update"),
                },
                {
                  id: "debug-scenario-reinstall",
                  label: appText("debugToolbar.scenario.reinstall"),
                  active: scenario === "reinstall",
                  onSelect: () => onSetScenario("reinstall"),
                },
                {
                  id: "debug-scenario-downgrade",
                  label: appText("debugToolbar.scenario.downgrade"),
                  active: scenario === "downgrade",
                  onSelect: () => onSetScenario("downgrade"),
                },
              ]}
            />
          </div>
          <p class={subtle}>{scenarioHint}</p>

          {!isNewInstall && !isReinstall ? (
            <div class={versionRow}>
              <div class={versionField}>
                <p class={label}>{appText("debugToolbar.version.installed")}</p>
                <TextField
                  value={existingVersion}
                  onInput={onSetExistingVersion}
                  placeholder={appText("debugToolbar.version.installedPlaceholder")}
                  class={versionInput}
                  type="text"
                />
              </div>
              <div class={versionField}>
                <p class={label}>{appText("debugToolbar.version.package")}</p>
                <TextField
                  value={incomingVersion}
                  onInput={onSetIncomingVersion}
                  placeholder={appText("debugToolbar.version.packagePlaceholder")}
                  class={versionInput}
                  type="text"
                />
              </div>
            </div>
          ) : null}

          {isReinstall ? (
            <div class={versionField}>
              <p class={label}>{appText("debugToolbar.version.reinstall")}</p>
              <TextField
                value={incomingVersion}
                onInput={onSetReinstallVersion}
                placeholder={appText("debugToolbar.version.reinstallPlaceholder")}
                class={versionInput}
                type="text"
              />
            </div>
          ) : null}

          {isNewInstall ? <p class={subtle}>{appText("debugToolbar.version.newInstallHint")}</p> : null}
        </>
      ) : null}
    </section>
  );
};
