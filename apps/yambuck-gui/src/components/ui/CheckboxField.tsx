import type { ComponentChildren } from "preact";

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
  <label class={`checkbox-field${className ? ` ${className}` : ""}`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange((event.currentTarget as HTMLInputElement).checked)}
    />
    <span>{children}</span>
  </label>
);
