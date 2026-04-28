import { IconFileText, IconPlus, IconX } from "@tabler/icons-preact";
import { CheckboxField } from "../../../components/ui/CheckboxField";
import { SelectField } from "../../../components/ui/SelectField";
import { TextField } from "../../../components/ui/TextField";
import { appText } from "../../../i18n/app";
import { BuilderFieldLabel } from "./BuilderFieldLabel";
import type { BuilderArch, BuilderOs, BuilderTarget } from "../builderTypes";
import {
  assetThumbAdd,
  assetThumbAddIcon,
  assetThumbDocIcon,
  assetThumbOpen,
  assetThumbPlaceholder,
  assetThumbRemove,
  assetThumbTile,
  assetThumbTileCompact,
  compactCheckbox,
  fieldStack,
  sectionBody,
  targetBinaryHint,
} from "../packageBuilderPage.css";

type BuilderTargetCardProps = {
  target: BuilderTarget;
  isBusy: boolean;
  hasGui: boolean;
  hasCli: boolean;
  binaryTargetPath: string | null;
  binarySourceName: string | null;
  onBrowseBinary: () => void;
  onClearBinary: () => void;
  onSetField: <Key extends keyof BuilderTarget>(key: Key, value: BuilderTarget[Key]) => void;
};

const desktopChecksFromValue = (value: BuilderTarget["desktopEnvironment"]): { x11: boolean; wayland: boolean } => {
  if (value === "x11") {
    return { x11: true, wayland: false };
  }
  if (value === "wayland") {
    return { x11: false, wayland: true };
  }
  return { x11: true, wayland: true };
};

const desktopValueFromChecks = (x11: boolean, wayland: boolean): BuilderTarget["desktopEnvironment"] => {
  if (x11 && wayland) {
    return "all";
  }
  if (x11) {
    return "x11";
  }
  if (wayland) {
    return "wayland";
  }
  return "all";
};

export const BuilderTargetCard = ({
  target,
  isBusy,
  hasGui,
  hasCli,
  binaryTargetPath,
  binarySourceName,
  onBrowseBinary,
  onClearBinary,
  onSetField,
}: BuilderTargetCardProps) => {
  const desktopChecks = desktopChecksFromValue(target.desktopEnvironment);

  return (
    <>
      <label class={fieldStack}>
        <BuilderFieldLabel label={appText("builder.fields.os")} help={appText("builder.help.os")} />
        <SelectField
          value={target.os}
          onValueChange={(value) => onSetField("os", value as BuilderOs)}
          options={[
            { value: "linux", label: appText("builder.targets.os.linux") },
            { value: "windows", label: appText("builder.targets.os.windows") },
            { value: "macos", label: appText("builder.targets.os.macos") },
          ]}
        />
      </label>

      <label class={fieldStack}>
        <BuilderFieldLabel label={appText("builder.fields.arch")} help={appText("builder.help.arch")} />
        <SelectField
          value={target.arch}
          onValueChange={(value) => onSetField("arch", value as BuilderArch)}
          options={[
            { value: "x86_64", label: "x86_64" },
            { value: "aarch64", label: "aarch64" },
            { value: "riscv64", label: "riscv64" },
          ]}
        />
      </label>

      {target.os === "linux" ? (
        <div class={fieldStack}>
          <BuilderFieldLabel label={appText("builder.fields.desktopEnvironment")} help={appText("builder.help.desktopEnvironment")} />
          <CheckboxField
            class={compactCheckbox}
            checked={desktopChecks.x11}
            onChange={(checked) => onSetField("desktopEnvironment", desktopValueFromChecks(checked, desktopChecks.wayland))}
          >
            {appText("builder.targets.desktop.x11")}
          </CheckboxField>
          <CheckboxField
            class={compactCheckbox}
            checked={desktopChecks.wayland}
            onChange={(checked) => onSetField("desktopEnvironment", desktopValueFromChecks(desktopChecks.x11, checked))}
          >
            {appText("builder.targets.desktop.wayland")}
          </CheckboxField>
        </div>
      ) : (
        <p class={sectionBody}>{appText("builder.targets.osUnsupportedInline")}</p>
      )}

      {hasGui ? (
        <label class={fieldStack}>
          <BuilderFieldLabel label={appText("builder.fields.guiEntrypoint")} help={appText("builder.help.guiEntrypoint")} />
          <TextField value={target.guiEntrypoint} onInput={(value) => onSetField("guiEntrypoint", value)} />
        </label>
      ) : null}

      {hasCli ? (
        <label class={fieldStack}>
          <BuilderFieldLabel label={appText("builder.fields.cliEntrypoint")} help={appText("builder.help.cliEntrypoint")} />
          <TextField value={target.cliEntrypoint} onInput={(value) => onSetField("cliEntrypoint", value)} />
        </label>
      ) : null}

      <div class={fieldStack}>
        <BuilderFieldLabel label={appText("builder.fields.binaryUpload")} help={appText("builder.help.binaryUpload")} />
        <div class={`${assetThumbTile} ${assetThumbTileCompact}`}>
          {binaryTargetPath ? (
            <button class={assetThumbOpen} type="button" onClick={onBrowseBinary} title={appText("builder.targets.binaryReplace")}>
              <div class={assetThumbPlaceholder}>
                <span class={assetThumbDocIcon}><IconFileText size={54} stroke={1.8} /></span>
                <span>{binarySourceName ?? appText("builder.files.kind.binary")}</span>
                <span class={targetBinaryHint}>{binaryTargetPath}</span>
              </div>
            </button>
          ) : (
            <button class={assetThumbAdd} type="button" onClick={onBrowseBinary} title={appText("builder.files.browseBinary")} disabled={isBusy}>
              <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
            </button>
          )}
          {binaryTargetPath ? (
            <button class={assetThumbRemove} type="button" onClick={onClearBinary} title={appText("builder.files.remove")}>
              <IconX size={14} stroke={2.4} />
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
};
