import { IconCheck, IconCopy } from "@tabler/icons-preact";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { copyPlainText } from "../../utils/clipboard";
import { copyAffordance, ddText, dtText, field, help, term, tooltip as tooltipClass } from "./metaField.css";

type MetaFieldProps = {
  label: string;
  tooltip: string;
  value: ComponentChildren;
  copyValue?: string;
  copyEnabled?: boolean;
  onCopySuccess?: (label: string) => void;
};

export const MetaField = ({
  label,
  tooltip,
  value,
  copyValue,
  copyEnabled = true,
  onCopySuccess,
}: MetaFieldProps) => {
  const [copied, setCopied] = useState(false);
  const copiedResetTimer = useRef<number | null>(null);
  const fallbackValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const resolvedCopyValue = copyValue ?? fallbackValue;
  const isCopyable = copyEnabled && resolvedCopyValue.trim().length > 0;

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current !== null) {
        window.clearTimeout(copiedResetTimer.current);
      }
    };
  }, []);

  const handleCopy = async (event: MouseEvent) => {
    if (!isCopyable) {
      return;
    }

    const eventTarget = event.target;
    const target = eventTarget instanceof Element
      ? eventTarget
      : eventTarget instanceof Node
        ? eventTarget.parentElement
        : null;
    if (!target) {
      return;
    }

    if (target.closest("a, button, input, select, textarea, [data-no-copy='true']")) {
      return;
    }

    try {
      await copyPlainText(resolvedCopyValue);
      setCopied(true);
      if (copiedResetTimer.current !== null) {
        window.clearTimeout(copiedResetTimer.current);
      }
      copiedResetTimer.current = window.setTimeout(() => {
        setCopied(false);
        copiedResetTimer.current = null;
      }, 1200);
      onCopySuccess?.(label);
    } catch {
      // copy is a hidden convenience feature; silently ignore failures
    }
  };

  return (
    <div class={`meta-field ${field}`} data-copyable={isCopyable ? "true" : "false"} onClick={(event) => void handleCopy(event)}>
      <dt class={dtText}>
        <span class={`meta-term ${term}`} tabIndex={0}>
          {label}
          <span class={`meta-help ${help}`} aria-hidden="true">?</span>
          <span class={`meta-tooltip ${tooltipClass}`} role="tooltip">{tooltip}</span>
        </span>
        {isCopyable ? (
          <span class={copyAffordance} data-state={copied ? "copied" : "idle"} aria-hidden="true">
            {copied ? <IconCheck size={16} stroke={2.2} /> : <IconCopy size={16} stroke={2.2} />}
          </span>
        ) : null}
      </dt>
      <dd class={ddText}>{value}</dd>
    </div>
  );
};
