import { Tooltip } from "../../../components/ui/Tooltip";
import { fieldHelp, fieldLabel, fieldLabelRow } from "../packageBuilderPage.css";

type BuilderFieldLabelProps = {
  label: string;
  help: string;
};

export const BuilderFieldLabel = ({ label, help }: BuilderFieldLabelProps) => (
  <div class={fieldLabelRow}>
    <span class={fieldLabel}>{label}</span>
    <Tooltip content={help} focusableTrigger>
      <span class={fieldHelp} aria-hidden="true">?</span>
    </Tooltip>
  </div>
);
