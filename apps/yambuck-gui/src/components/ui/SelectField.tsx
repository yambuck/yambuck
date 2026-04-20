import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  control,
  label,
  menu,
  option as optionClass,
  optionHighlighted,
  optionSelected,
  placeholderLabel,
  root,
} from "./selectField.css";

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  disabled?: boolean;
  id?: string;
  name?: string;
  class?: string;
};

export const SelectField = ({
  value,
  onValueChange,
  options,
  disabled = false,
  id,
  name,
  class: className,
}: SelectFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const listboxId = useMemo(() => `${id ?? name ?? "select-field"}-listbox`, [id, name]);

  const enabledOptions = useMemo(
    () => options.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled),
    [options],
  );

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  const closeMenu = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const openMenu = () => {
    if (disabled || enabledOptions.length === 0) {
      return;
    }
    const selectedEnabled = enabledOptions.find(({ index }) => index === selectedIndex);
    setHighlightedIndex(selectedEnabled ? selectedEnabled.index : enabledOptions[0].index);
    setIsOpen(true);
  };

  const commitIndex = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }
    onValueChange(option.value);
    closeMenu();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current || rootRef.current.contains(target)) {
        return;
      }
      closeMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const moveHighlight = (direction: 1 | -1) => {
    if (enabledOptions.length === 0) {
      return;
    }

    if (highlightedIndex < 0) {
      setHighlightedIndex(enabledOptions[0].index);
      return;
    }

    const currentEnabledIndex = enabledOptions.findIndex(({ index }) => index === highlightedIndex);
    const nextEnabledIndex =
      currentEnabledIndex < 0
        ? 0
        : (currentEnabledIndex + direction + enabledOptions.length) % enabledOptions.length;

    setHighlightedIndex(enabledOptions[nextEnabledIndex].index);
  };

  return (
    <span
      ref={rootRef}
      class={`select-field ${root}${className ? ` ${className}` : ""}`}
      id={id}
      data-no-drag="true"
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!isOpen) {
            openMenu();
          } else {
            moveHighlight(1);
          }
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          if (!isOpen) {
            openMenu();
          } else {
            moveHighlight(-1);
          }
          return;
        }

        if (event.key === "Home" && isOpen && enabledOptions.length > 0) {
          event.preventDefault();
          setHighlightedIndex(enabledOptions[0].index);
          return;
        }

        if (event.key === "End" && isOpen && enabledOptions.length > 0) {
          event.preventDefault();
          setHighlightedIndex(enabledOptions[enabledOptions.length - 1].index);
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!isOpen) {
            openMenu();
          } else if (highlightedIndex >= 0) {
            commitIndex(highlightedIndex);
          }
        }
      }}
    >
      <button
        type="button"
        class={`select-field-control ${control}`}
        disabled={disabled}
        name={name}
        aria-haspopup="listbox"
        aria-expanded={isOpen ? "true" : "false"}
        aria-controls={listboxId}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
      >
        <span class={`select-field-label ${label}${selectedOption ? "" : ` is-placeholder ${placeholderLabel}`}`}>
          {selectedOption ? selectedOption.label : "Select option"}
        </span>
      </button>

      {isOpen ? (
        <div class={`select-field-menu ${menu}`} role="listbox" id={listboxId}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                class={`select-field-option ${optionClass}${isSelected ? ` ${optionSelected}` : ""}${isHighlighted ? ` ${optionHighlighted}` : ""}`}
                role="option"
                aria-selected={isSelected ? "true" : "false"}
                disabled={option.disabled}
                onMouseEnter={() => {
                  if (!option.disabled) {
                    setHighlightedIndex(index);
                  }
                }}
                onClick={() => commitIndex(index)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </span>
  );
};
