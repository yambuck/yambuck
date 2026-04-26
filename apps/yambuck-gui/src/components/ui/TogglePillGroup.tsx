type TogglePillItem = {
  id: string;
  label: string;
  active: boolean;
  onSelect: () => void;
  controlsId?: string;
};

type TogglePillBehavior = "tabs" | "buttons";

type TogglePillGroupProps = {
  items: TogglePillItem[];
  class?: string;
  dataNoDrag?: boolean;
  behavior?: TogglePillBehavior;
  ariaLabel?: string;
};

export const TogglePillGroup = ({
  items,
  class: className,
  dataNoDrag = true,
  behavior = "buttons",
  ariaLabel,
}: TogglePillGroupProps) => (
  <div
    class={className}
    data-no-drag={dataNoDrag ? "true" : undefined}
    role={behavior === "tabs" ? "tablist" : undefined}
    aria-label={behavior === "tabs" ? ariaLabel : undefined}
  >
    {items.map((item) => (
      <button
        key={item.id}
        id={item.id}
        type="button"
        class={`toggle-pill ${item.active ? "active" : ""}`}
        onClick={item.onSelect}
        role={behavior === "tabs" ? "tab" : undefined}
        aria-selected={behavior === "tabs" ? item.active : undefined}
        aria-controls={behavior === "tabs" ? item.controlsId : undefined}
        aria-pressed={behavior === "buttons" ? item.active : undefined}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export type { TogglePillItem };
