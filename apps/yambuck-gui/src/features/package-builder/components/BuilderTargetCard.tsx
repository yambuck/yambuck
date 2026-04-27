import { IconChevronDown, IconChevronRight, IconFileText, IconPlus, IconX } from "@tabler/icons-preact";
import { Button } from "../../../components/ui/Button";
import { SelectField } from "../../../components/ui/SelectField";
import { TextField } from "../../../components/ui/TextField";
import { appText } from "../../../i18n/app";
import { BuilderFieldLabel } from "./BuilderFieldLabel";
import type { BuilderArch, BuilderTarget } from "../builderTypes";
import {
  assetThumbAdd,
  assetThumbAddIcon,
  assetThumbDocIcon,
  assetThumbOpen,
  assetThumbPlaceholder,
  assetThumbRemove,
  assetThumbTile,
  assetThumbTileCompact,
  fieldStack,
  sectionBody,
  targetBinaryHint,
  targetCard,
  targetCardBody,
  targetCardHeader,
  targetHeaderActions,
  targetSummary,
  targetSummaryButton,
  targetSummaryDetails,
  targetSummaryMeta,
  targetSummaryTop,
} from "../packageBuilderPage.css";

type BuilderTargetCardProps = {
  target: BuilderTarget;
  isActive: boolean;
  canRemove: boolean;
  isBusy: boolean;
  hasGui: boolean;
  hasCli: boolean;
  binaryTargetPath: string | null;
  binarySourceName: string | null;
  onToggle: () => void;
  onRemove: () => void;
  onBrowseBinary: () => void;
  onClearBinary: () => void;
  onSetField: <Key extends keyof BuilderTarget>(key: Key, value: BuilderTarget[Key]) => void;
  payloadRoot: string;
};

export const BuilderTargetCard = ({
  target,
  isActive,
  canRemove,
  isBusy,
  hasGui,
  hasCli,
  binaryTargetPath,
  binarySourceName,
  onToggle,
  onRemove,
  onBrowseBinary,
  onClearBinary,
  onSetField,
  payloadRoot,
}: BuilderTargetCardProps) => (
  <section class={targetCard}>
    <div class={targetCardHeader}>
      <button
        type="button"
        class={targetSummaryButton}
        onClick={onToggle}
        aria-expanded={isActive}
      >
        <span class={targetSummaryTop}>
          <span class={targetSummary}>linux / {target.arch} / {target.variant.trim() || "default"}</span>
        </span>
        <span class={targetSummaryDetails}>
          <span class={targetSummaryMeta}>{appText(`builder.targets.desktop.${target.desktopEnvironment}`)}</span>
          <span class={targetSummaryMeta}>{payloadRoot}</span>
        </span>
      </button>
      <div class={targetHeaderActions}>
        <Button onClick={onToggle} disabled={isBusy} fullWidthOnSmall={false}>
          {isActive ? (
            <><IconChevronDown size={14} stroke={2} /> {appText("builder.targets.collapse")}</>
          ) : (
            <><IconChevronRight size={14} stroke={2} /> {appText("builder.targets.expand")}</>
          )}
        </Button>
        <Button onClick={onRemove} disabled={isBusy || !canRemove} fullWidthOnSmall={false}>{appText("builder.targets.remove")}</Button>
      </div>
    </div>

    {isActive ? (
      <div class={targetCardBody}>
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
      </div>
    ) : null}
  </section>
);
