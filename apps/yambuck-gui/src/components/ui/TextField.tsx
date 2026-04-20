import type { JSX } from "preact";
import { input } from "./textField.css";

type TextFieldProps = {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: "text" | "search";
  class?: string;
};

export const TextField = ({
  value,
  onInput,
  placeholder,
  type = "text",
  class: className,
}: TextFieldProps) => (
  <input
    type={type}
    class={`text-field ${input}${className ? ` ${className}` : ""}`}
    placeholder={placeholder}
    value={value}
    onInput={(event: JSX.TargetedEvent<HTMLInputElement, Event>) => onInput((event.currentTarget as HTMLInputElement).value)}
  />
);
