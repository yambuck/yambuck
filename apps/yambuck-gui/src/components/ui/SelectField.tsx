import type { ComponentChildren, JSX } from "preact";

type SelectFieldProps = {
  value: string;
  onChange: (event: JSX.TargetedEvent<HTMLSelectElement, Event>) => void;
  children: ComponentChildren;
  disabled?: boolean;
  id?: string;
  name?: string;
  class?: string;
};

export const SelectField = ({
  value,
  onChange,
  children,
  disabled = false,
  id,
  name,
  class: className,
}: SelectFieldProps) => (
  <span class={`select-field${className ? ` ${className}` : ""}`}>
    <select
      class="select-field-control"
      value={value}
      onChange={onChange}
      disabled={disabled}
      id={id}
      name={name}
    >
      {children}
    </select>
  </span>
);
