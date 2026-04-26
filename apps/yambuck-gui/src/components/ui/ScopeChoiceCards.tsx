import { card, cardActive, group } from "./scopeChoiceCards.css";

type ScopeChoiceOption = {
  value: string;
  title: string;
  description: string;
};

type ScopeChoiceCardsProps = {
  value: string;
  options: ScopeChoiceOption[];
  onValueChange: (value: string) => void;
  name: string;
  class?: string;
  legend?: string;
  ariaLabel?: string;
};

export const ScopeChoiceCards = ({
  value,
  options,
  onValueChange,
  name,
  class: className,
  legend,
  ariaLabel,
}: ScopeChoiceCardsProps) => (
  <fieldset class={`${group}${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
    {legend ? <legend>{legend}</legend> : null}
    {options.map((option) => (
      <label
        key={option.value}
        class={`${card}${value === option.value ? ` ${cardActive}` : ""}`}
      >
        <input
          type="radio"
          name={name}
          checked={value === option.value}
          onChange={() => onValueChange(option.value)}
        />
        <span>{option.title}</span>
        <small>{option.description}</small>
      </label>
    ))}
  </fieldset>
);

export type { ScopeChoiceOption };
