import type { ComponentChildren } from "preact";
import { checkbox, label, root } from "./checkboxField.css";

type CheckboxFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ComponentChildren;
  disabled?: boolean;
  class?: string;
};

export const CheckboxField = ({
  checked,
  onChange,
  children,
  disabled = false,
  class: className,
}: CheckboxFieldProps) => (
  <label class={`checkbox-field ${root}${className ? ` ${className}` : ""}`}>
    <input
      class={checkbox}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange((event.currentTarget as HTMLInputElement).checked)}
    />
    <span class={label}>{children}</span>
  </label>
);
