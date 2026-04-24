import type { ComponentChildren } from "preact";
import { logUiAction } from "../../lib/ui-log";
import { checkbox, label, root } from "./checkboxField.css";

type CheckboxFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ComponentChildren;
  disabled?: boolean;
  class?: string;
  logLabel?: string;
  disableToggleLog?: boolean;
};

export const CheckboxField = ({
  checked,
  onChange,
  children,
  disabled = false,
  class: className,
  logLabel,
  disableToggleLog = false,
}: CheckboxFieldProps) => (
  <label class={`checkbox-field ${root}${className ? ` ${className}` : ""}`}>
    <input
      class={checkbox}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => {
        const nextValue = (event.currentTarget as HTMLInputElement).checked;
        if (!disableToggleLog) {
          const defaultLabel = typeof children === "string" ? children : "checkbox-field";
          logUiAction("checkbox-toggle", {
            label: logLabel ?? defaultLabel,
            checked: nextValue,
          });
        }
        onChange(nextValue);
      }}
    />
    <span class={label}>{children}</span>
  </label>
);
