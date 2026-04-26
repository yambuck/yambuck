import type { JSX } from "preact";
import {
  description,
  group,
  option,
  optionActive,
  optionInput,
  optionsTrack,
  slider,
} from "./scopeChoiceCards.css";

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
}: ScopeChoiceCardsProps) => {
  const activeIndex = options.findIndex((option) => option.value === value);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const selectedOption = options[safeActiveIndex] ?? options[0] ?? null;
  const sliderStyle: JSX.CSSProperties = {
    width: `calc((100% - 8px) / ${Math.max(options.length, 1)})`,
    transform: `translateX(${safeActiveIndex * 100}%)`,
  };
  const optionsTrackStyle: JSX.CSSProperties = {
    gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))`,
  };

  return (
    <fieldset class={`${group}${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
      {legend ? <legend>{legend}</legend> : null}
      <div class={optionsTrack} style={optionsTrackStyle}>
        <div class={slider} style={sliderStyle} aria-hidden="true" />
        {options.map((choice) => (
          <label key={choice.value} class={`${option}${value === choice.value ? ` ${optionActive}` : ""}`}>
            <input
              class={optionInput}
              type="radio"
              name={name}
              checked={value === choice.value}
              onChange={() => onValueChange(choice.value)}
            />
            <span>{choice.title}</span>
          </label>
        ))}
      </div>
      {selectedOption ? <p class={description}>{selectedOption.description}</p> : null}
    </fieldset>
  );
};

export type { ScopeChoiceOption };
