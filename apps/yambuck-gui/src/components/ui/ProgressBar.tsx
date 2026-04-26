import { bar, shell, valueText } from "./progressBar.css";

type ProgressBarProps = {
  value: number;
  class?: string;
  showValueLabel?: boolean;
  valueLabelSuffix?: string;
  ariaLabel?: string;
  ariaValueText?: string;
  valueLabelClass?: string;
};

const clamp = (value: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
};

export const ProgressBar = ({
  value,
  class: className,
  showValueLabel = true,
  valueLabelSuffix = "%",
  ariaLabel,
  ariaValueText,
  valueLabelClass,
}: ProgressBarProps) => {
  const normalized = clamp(value);

  return (
    <>
      <div
        class={`${shell}${className ? ` ${className}` : ""}`}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={normalized}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={ariaValueText}
      >
        <div class={bar} style={{ width: `${normalized}%` }} />
      </div>
      {showValueLabel ? <p class={`${valueText}${valueLabelClass ? ` ${valueLabelClass}` : ""}`}>{`${normalized}${valueLabelSuffix}`}</p> : null}
    </>
  );
};
