import { Button } from "../../../components/ui/Button";
import { SelectField } from "../../../components/ui/SelectField";
import { TextField } from "../../../components/ui/TextField";
import { appText } from "../../../i18n/app";
import { BuilderFieldLabel } from "./BuilderFieldLabel";
import type { BuilderArch, BuilderTarget } from "../builderTypes";
import {
  fieldStack,
  inlineActionButton,
  sectionBody,
  stepButton,
  stepButtonActive,
  targetCard,
  targetCardBody,
  targetCardHeader,
  targetSummary,
  targetSummaryMatch,
  targetSummaryMeta,
} from "../packageBuilderPage.css";

type BuilderTargetCardProps = {
  index: number;
  target: BuilderTarget;
  targetId: string;
  isActive: boolean;
  canRemove: boolean;
  isBusy: boolean;
  hasGui: boolean;
  hasCli: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onBrowseBinary: () => void;
  onSetField: <Key extends keyof BuilderTarget>(key: Key, value: BuilderTarget[Key]) => void;
  payloadRoot: string;
};

export const BuilderTargetCard = ({
  index,
  target,
  targetId,
  isActive,
  canRemove,
  isBusy,
  hasGui,
  hasCli,
  onToggle,
  onRemove,
  onBrowseBinary,
  onSetField,
  payloadRoot,
}: BuilderTargetCardProps) => (
  <section class={targetCard}>
    <div class={targetCardHeader}>
      <button
        type="button"
        class={`${stepButton}${isActive ? ` ${stepButtonActive}` : ""}`}
        onClick={onToggle}
      >
        <span class={targetSummary}>{appText("builder.targets.item", { index: index + 1 })} - {target.arch}</span>
        <span class={targetSummaryMeta}>
          {target.variant.trim() || "default"} | {appText(`builder.targets.desktop.${target.desktopEnvironment}`)}
        </span>
        <span class={targetSummaryMatch}>
          {appText("builder.targets.matches", {
            arch: target.arch,
            desktop: appText(`builder.targets.desktop.${target.desktopEnvironment}`),
          })}
        </span>
      </button>
      <Button onClick={onRemove} disabled={isBusy || !canRemove}>{appText("builder.targets.remove")}</Button>
    </div>

    {isActive ? (
      <div class={targetCardBody}>
        <p class={sectionBody}>{appText("builder.targets.idReadOnly", { id: targetId })}</p>

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

        <label class={fieldStack}>
          <BuilderFieldLabel label={appText("builder.fields.variant")} help={appText("builder.help.variant")} />
          <TextField value={target.variant} onInput={(value) => onSetField("variant", value)} />
        </label>

        <label class={fieldStack}>
          <BuilderFieldLabel label={appText("builder.fields.desktopEnvironment")} help={appText("builder.help.desktopEnvironment")} />
          <SelectField
            value={target.desktopEnvironment}
            onValueChange={(value) => onSetField("desktopEnvironment", value as BuilderTarget["desktopEnvironment"])}
            options={[
              { value: "all", label: appText("builder.targets.desktop.all") },
              { value: "x11", label: appText("builder.targets.desktop.x11") },
              { value: "wayland", label: appText("builder.targets.desktop.wayland") },
            ]}
          />
        </label>

        <p class={sectionBody}>{appText("builder.targets.payloadRootReadOnly", { path: payloadRoot })}</p>

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
          <Button class={inlineActionButton} fullWidthOnSmall={false} onClick={onBrowseBinary} disabled={isBusy}>{appText("builder.files.browseBinary")}</Button>
        </div>
      </div>
    ) : null}
  </section>
);
